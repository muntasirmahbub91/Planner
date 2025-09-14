#!/usr/bin/env bash
set -euo pipefail

CSS="src/App.css"
MARK="/* __BOTTOM_BAR_OFFSET_PATCH__ */"

[[ -f "$CSS" ]] || { echo "Missing $CSS"; exit 1; }

if grep -q "$MARK" "$CSS"; then
  echo "Patch already present in $CSS"; exit 0
fi

cp "$CSS" "${CSS}.bak.$(date +%Y%m%d%H%M%S)"

cat >> "$CSS" <<'CSS_EOF'

/* __BOTTOM_BAR_OFFSET_PATCH__ */
:root{
  --bb-h: 72px;         /* bar height */
  --bb-offset: 30px;    /* push DOWN by 30px */
}
.BottomBarFixed{
  position: fixed !important;
  left: 0; right: 0; bottom: 0 !important;
}
@supports (padding: env(safe-area-inset-bottom)){
  .BottomBarFixed{
    padding-bottom: max(env(safe-area-inset-bottom), 0px) !important;
  }
  @media (display-mode: standalone){
    .BottomBarFixed{
      bottom: calc(-1 * env(safe-area-inset-bottom) - var(--bb-offset)) !important;
    }
  }
}
.page, .app, .viewSlot, main, .band, body{
  padding-bottom: calc(var(--bb-h) + env(safe-area-inset-bottom) + var(--bb-offset)) !important;
}
/* __BOTTOM_BAR_OFFSET_PATCH__ END */
CSS_EOF

echo "✔ Patched $CSS"
