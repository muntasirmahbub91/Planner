#!/usr/bin/env bash
set -euo pipefail
css="src/App.css"
[ -f "$css" ] || touch "$css"

block='
/* prevent iOS zoom on focus by keeping controls >=16px */
input, select, textarea, button { font-size:16px; }
'
grep -q "prevent iOS zoom" "$css" || printf "%s\n" "$block" >> "$css"

git add "$css"
git commit -m "pwa: prevent iOS focus zoom by enforcing 16px controls"
