#!/usr/bin/env bash
set -euo pipefail
f="public/manifest.json"
[ -f "$f" ] || { echo "missing $f"; exit 1; }
node - <<'NODE'
const fs=require('fs'), p='public/manifest.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.display = 'standalone';
j.theme_color = '#111111';
j.background_color = '#111111';
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
NODE

git add public/manifest.json
git commit -m "pwa: manifest display=standalone, theme/background #111111"
