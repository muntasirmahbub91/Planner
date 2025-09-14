#!/usr/bin/env bash
set -euo pipefail
css="src/App.css"
[ -f "$css" ] || touch "$css"

block='
/* fixed footer that covers the iOS home indicator area */
.BottomBarFixed{
  position:fixed; left:0; right:0; bottom:0;
  height:var(--bar-h);
  padding-bottom:env(safe-area-inset-bottom);
  background:#111; color:#fff;
  z-index:10000;
}
.BottomBarFixed__inner{ height:var(--bar-h); }
'
grep -q "fixed footer that covers" "$css" || printf "%s\n" "$block" >> "$css"

git add "$css"
git commit -m "pwa: fixed footer with safe-area padding and high z-index"
