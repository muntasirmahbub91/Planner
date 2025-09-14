#!/usr/bin/env bash
set -euo pipefail

css="src/App.css"

# Append once, idempotent
grep -q "/* pwa-bottom-bar-fix */" "$css" || cat >>"$css" <<'CSS'

/* pwa-bottom-bar-fix */
.BottomBarFixed{position:fixed;left:0;right:0;bottom:env(safe-area-inset-bottom,0);z-index:1000;}
.BottomBarFixed__inner{
  height:72px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;
  padding:10px 16px calc(10px + env(safe-area-inset-bottom,0)) 16px;
  background:#0a0a0a;border-top:1px solid #111;border-top-left-radius:12px;border-top-right-radius:12px;
}
.page,.app{min-height:100svh;}
.viewSlot{min-height:calc(100svh - var(--footer-h,72px));}
CSS

echo "Patched $css"
