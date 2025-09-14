#!/usr/bin/env bash
set -euo pipefail
css="src/App.css"
[ -f "$css" ] || touch "$css"

block='
/* PWA base shell */
html, body, #root { height:100%; margin:0; background:#111; }
.app { min-height:100svh; min-height:100dvh; height:auto; }
'
grep -q "PWA base shell" "$css" || printf "%s\n" "$block" >> "$css"

git add "$css"
git commit -m "pwa: base shell uses svh/dvh and dark background"
