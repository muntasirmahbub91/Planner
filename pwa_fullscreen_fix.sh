#!/usr/bin/env bash
set -euo pipefail

echo "== PWA fullscreen fix =="

# 0) guards
test -f package.json || { echo "Run from project root (package.json not found)"; exit 1; }
mkdir -p public icons public/icons src

# 1) manifest (cache-busted via link tag; file name stays stable)
cat > public/manifest.webmanifest <<'JSON'
{
  "name": "Planner",
  "short_name": "Planner",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
JSON

# 2) vercel header for correct MIME (idempotent create/merge)
if [ ! -f vercel.json ]; then
  cat > vercel.json <<'JSON'
{ "headers": [ { "source": "/manifest.webmanifest", "headers": [ { "key": "Content-Type", "value": "application/manifest+json" } ] } ] }
JSON
else
  if ! grep -q '"manifest.webmanifest"' vercel.json 2>/dev/null; then
    tmp=$(mktemp)
    node - <<'NODE' < vercel.json > "$tmp"
const fs = require('fs');
const v = JSON.parse(fs.readFileSync(0,'utf8'));
v.headers = v.headers || [];
if (!v.headers.find(h => h.source === '/manifest.webmanifest')) {
  v.headers.push({source:'/manifest.webmanifest',headers:[{key:'Content-Type',value:'application/manifest+json'}]});
}
process.stdout.write(JSON.stringify(v,null,2));
NODE
    mv "$tmp" vercel.json
  fi
fi

# 3) index.html head tags (append if missing)
IDX="index.html"
test -f "$IDX" || IDX="public/index.html"
if [ -f "$IDX" ]; then
  add_if_missing () { grep -qF "$2" "$1" || sed -i '' "s#</head>#$2\n</head>#g" "$1"; }
  add_if_missing "$IDX" '<link rel="manifest" href="/manifest.webmanifest?v=2">'
  add_if_missing "$IDX" '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  add_if_missing "$IDX" '<meta name="theme-color" content="#0a0a0a">'
  add_if_missing "$IDX" '<meta name="apple-mobile-web-app-capable" content="yes">'
  add_if_missing "$IDX" '<meta name="apple-mobile-web-app-title" content="Planner">'
  add_if_missing "$IDX" '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
  add_if_missing "$IDX" '<link rel="apple-touch-icon" href="/icons/icon-192.png">'
else
  echo "index.html not found; skipping head tag injection."
fi

# 4) viewport fix + PWA class
cat > src/pwa-viewport.ts <<'TS'
// set --vh for browsers lacking 100svh and toggle .pwa for standalone
const setVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};
setVH();
window.addEventListener('resize', setVH);

const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
document.documentElement.classList.toggle('pwa', !!standalone);
TS

# 5) import viewport + register SW in main entry
MAIN=""
for f in src/main.tsx src/main.ts src/main.jsx src/index.tsx; do
  [ -f "$f" ] && MAIN="$f" && break
done
if [ -n "$MAIN" ]; then
  grep -q "pwa-viewport" "$MAIN" || sed -i '' '1i\
import "./pwa-viewport";
' "$MAIN"
  if ! grep -q "serviceWorker.register" "$MAIN"; then
    cat >> "$MAIN" <<'TS'

// Register a basic service worker at root scope
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}
TS
  fi
else
  echo "main entry not found; add import './pwa-viewport' and SW register manually."
fi

# 6) minimal SW (cache-bust friendly, safe no-op)
cat > public/sw.js <<'JS'
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { clients.claim(); });
self.addEventListener('fetch', () => {}); // network by default
JS

# 7) CSS to ensure full-height and safe-area when installed
CSS_FILE="src/App.css"
[ -f "$CSS_FILE" ] || CSS_FILE="src/styles.css"
[ -f "$CSS_FILE" ] || CSS_FILE="src/index.css"
if [ -f "$CSS_FILE" ]; then
  if ! grep -q "--vh" "$CSS_FILE"; then
    cat >> "$CSS_FILE" <<'CSS'

/* --- PWA fullscreen support --- */
html, body, #root { height: 100%; }
.page, .app { min-height: 100%; }

@supports (height: 100svh) {
  .page, .app { min-height: 100svh; }
}
@supports not (height: 100svh) {
  .page, .app { min-height: calc(var(--vh, 1vh) * 100); }
}

/* notch padding when installed */
.pwa .app { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
CSS
  fi
else
  echo "No global CSS found; create one and include the PWA block above."
fi

# 8) icons notice
for p in public/icons/icon-192.png public/icons/icon-512.png public/icons/maskable-192.png public/icons/maskable-512.png; do
  [ -f "$p" ] || MISSING=1
done
if [ "${MISSING:-0}" = "1" ]; then
  echo "Note: public/icons/* PNGs missing. Add 192/512 and maskable variants for best install UX."
fi

# 9) git commit (no deploy)
git add -A
git commit -m "chore(pwa): fullscreen, manifest, SW, viewport vars" || true

echo "Done. Push to trigger Vercel, or run: npx vercel --prod --confirm"
