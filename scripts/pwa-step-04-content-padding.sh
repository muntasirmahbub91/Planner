#!/usr/bin/env bash
set -euo pipefail
css="src/App.css"
[ -f "$css" ] || touch "$css"

block='
:root { --bar-h: 64px; }
/* keep content clear of the fixed bar + safe area */
.page { padding-bottom: calc(var(--bar-h) + env(safe-area-inset-bottom)); }
'
grep -q "--bar-h" "$css" || printf "%s\n" "$block" >> "$css"

git add "$css"
git commit -m "pwa: add content padding for fixed bottom bar + safe area"
