import fs from "fs";
import path from "path";

const root = process.cwd();
const SRC = path.join(root, "src");
const UNUSED_DIR = path.join(root, ".unused", new Date().toISOString().replace(/[:.]/g, "-"));
const extsCode = [".tsx", ".ts", ".jsx", ".js", ".css"];
const extsAssets = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".mp3", ".mp4", ".wav", ".ogg", ".json"];
const extsAll = [...extsCode, ...extsAssets];

if (!fs.existsSync(SRC)) {
  console.error("src/ not found.");
  process.exit(1);
}

function listAllFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".env") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listAllFiles(full));
    else out.push(full);
  }
  return out;
}

// Resolve an import specifier into a file path inside src/
function resolveImport(fromFile, specRaw) {
  if (!specRaw) return null;
  let spec = specRaw.trim();
  // Strip query (?raw, ?url) and hash
  spec = spec.replace(/\?[\s\S]*$/, "").replace(/#.*$/, "");

  // Ignore bare module imports
  if (!spec.startsWith("./") && !spec.startsWith("../") && !spec.startsWith("@/") && !spec.startsWith("/src/")) {
    return null;
  }
  let target;
  if (spec.startsWith("@/")) {
    target = path.join(SRC, spec.slice(2));
  } else if (spec.startsWith("/src/")) {
    target = path.join(root, spec.slice(1));
  } else {
    target = path.resolve(path.dirname(fromFile), spec);
  }

  // If it already exists and has an extension, return
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;

  // Directory import → index.*
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const cand of ["index.tsx", "index.ts", "index.jsx", "index.js", "index.css"]) {
      const p = path.join(target, cand);
      if (fs.existsSync(p)) return p;
    }
  }

  // Try with known extensions
  for (const ext of extsAll) {
    const p = target + ext;
    if (fs.existsSync(p)) return p;
  }

  return null;
}

// Extract import-like specifiers from a file
function parseSpecifiers(file) {
  const src = fs.readFileSync(file, "utf8");
  /** @type {string[]} */
  let specs = [];

  if (/\.(tsx|ts|jsx|js)$/.test(file)) {
    const re1 = /\bimport\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
    const re2 = /\bexport\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
    const re3 = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
    const re4 = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
    const re5 = /new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g;
    let m;
    for (const re of [re1, re2, re3, re4, re5]) {
      while ((m = re.exec(src))) specs.push(m[1]);
    }
  } else if (/\.css$/.test(file)) {
    const reImp = /@import\s+['"]([^'"]+)['"]/g;
    const reUrl = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
    let m;
    while ((m = reImp.exec(src))) specs.push(m[1]);
    while ((m = reUrl.exec(src))) {
      const s = m[1];
      if (/^data:/.test(s)) continue;
      specs.push(s);
    }
  }
  return specs;
}

// Determine entry points
const entries = new Set();
const indexHtml = path.join(root, "index.html");
if (fs.existsSync(indexHtml)) {
  const html = fs.readFileSync(indexHtml, "utf8");
  const m = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i);
  if (m) {
    const p = resolveImport(indexHtml, m[1]) || path.join(root, m[1].replace(/^\//, ""));
    if (fs.existsSync(p)) entries.add(p);
  }
}
for (const ep of ["src/main.tsx", "src/main.ts", "src/App.tsx", "src/index.css"]) {
  const p = path.join(root, ep);
  if (fs.existsSync(p)) entries.add(p);
}

// Build graph
/** @type {Set<string>} */
const reachable = new Set();
const queue = [...entries];

while (queue.length) {
  const f = queue.shift();
  if (!f) continue;
  if (!fs.existsSync(f)) continue;
  if (!f.startsWith(SRC)) {
    // allow index.html or other roots to seed only
    if (!/\.(html|css|tsx|ts|jsx|js)$/.test(f)) continue;
  }
  if (reachable.has(f)) continue;
  reachable.add(f);

  if (!extsAll.some((ext) => f.endsWith(ext))) continue;

  const specs = parseSpecifiers(f);
  for (const s of specs) {
    const resolved = resolveImport(f, s);
    if (resolved && !reachable.has(resolved)) {
      queue.push(resolved);
    }
  }
}

// All candidate files inside src with known extensions, excluding .unused/ stash
const all = listAllFiles(SRC).filter((p) => {
  if (!extsAll.some((ext) => p.endsWith(ext))) return false;
  if (p.includes(path.sep + ".unused" + path.sep)) return false;
  return true;
});

const unused = all.filter((p) => !reachable.has(p));

// Print lists
console.log("Reachable files:", reachable.size);
console.log("Unused files:", unused.length);
unused.forEach((p) => console.log("UNUSED:", path.relative(root, p)));

// Move unused to .unused/<timestamp> safely
if (unused.length) {
  for (const srcPath of unused) {
    const rel = path.relative(SRC, srcPath);
    const dst = path.join(UNUSED_DIR, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    // If already moved, skip
    if (!fs.existsSync(srcPath)) continue;
    fs.renameSync(srcPath, dst);
  }
  // Remove now-empty directories inside src
  function removeEmptyDirs(dir) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    for (const e of fs.readdirSync(dir)) {
      const p = path.join(dir, e);
      if (fs.statSync(p).isDirectory()) removeEmptyDirs(p);
    }
    if (fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  }
  removeEmptyDirs(SRC);
  // Write log
  fs.mkdirSync(path.dirname(UNUSED_DIR), { recursive: true });
  fs.writeFileSync(path.join(UNUSED_DIR, "_log.json"), JSON.stringify({ movedAt: new Date().toISOString(), count: unused.length, files: unused.map((p) => path.relative(root, p)) }, null, 2));
  console.log(`Moved ${unused.length} unused file(s) to ${path.relative(root, UNUSED_DIR)}`);
} else {
  console.log("No unused files detected.");
}
