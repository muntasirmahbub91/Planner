#!/usr/bin/env bash
set -euo pipefail
f="public/index.html"
[ -f "$f" ] || { echo "missing $f"; exit 1; }
node - <<'NODE'
const fs=require('fs'), p='public/index.html';
let s=fs.readFileSync(p,'utf8');

// ensure viewport-fit=cover
if(!/viewport-fit=cover/.test(s)){
  // remove existing viewport meta if any
  s=s.replace(/[\t ]*<meta[^>]*name=['"]viewport['"][^>]*>\s*\n?/i,'');
  s=s.replace(/<head[^>]*>/i, m => m + '\n  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
}
// apple PWA flags
if(!/apple-mobile-web-app-capable/.test(s)){
  s=s.replace(/<head[^>]*>/i, m => m + '\n  <meta name="apple-mobile-web-app-capable" content="yes">');
}
if(!/apple-mobile-web-app-status-bar-style/.test(s)){
  s=s.replace(/<head[^>]*>/i, m => m + '\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">');
}
fs.writeFileSync(p,s);
NODE

git add public/index.html
git commit -m "pwa: add viewport-fit and iOS web-app metas"
