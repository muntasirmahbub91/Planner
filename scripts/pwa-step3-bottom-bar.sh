#!/usr/bin/env bash
set -euo pipefail

CSS="src/App.css"
[[ -f "$CSS" ]] || { echo "/* auto-created */" > "$CSS"; }

# Optional: comment out legacy conflicting rules
sed -i '' -E 's/^(\.BottomBarFixed[^\{]*\{.*)$/\/\* legacy \1/' "$CSS" || true

if ! grep -q '/* bottom bar fixed */' "$CSS"; then
cat >> "$CSS" <<'CSS'
/* bottom bar fixed */
.BottomBarFixed{
  position:fixed;
  left:0; right:0; bottom:0;
  z-index:9999;
  background:#111;
  padding:12px 16px;
  padding-bottom:calc(12px + env(safe-area-inset-bottom));
}
:root{ --bb-h:64px; }
main, .viewSlot, .band, .page{
  padding-bottom:calc(var(--bb-h) + env(safe-area-inset-bottom));
}
CSS
fi
echo "✅ Step 3 appended to $CSS"
