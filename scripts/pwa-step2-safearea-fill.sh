#!/usr/bin/env bash
set -euo pipefail

CSS="src/App.css"
[[ -f "$CSS" ]] || { echo "/* auto-created */" > "$CSS"; }

if ! grep -q '/* safe-area fill */' "$CSS"; then
cat >> "$CSS" <<'CSS'
/* safe-area fill */
body::after{
  content:"";
  position:fixed;
  left:0; right:0; bottom:0;
  height: env(safe-area-inset-bottom);
  background:#111;
  pointer-events:none;
  z-index:9998;
}
CSS
fi
echo "✅ Step 2 appended to $CSS"
