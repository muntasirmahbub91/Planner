#!/usr/bin/env bash
set -euo pipefail

# Go to repo root
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

CSS_FILE="src/App.css"
MARKER="pwa-bottom-gap-fix-2"

# Ensure CSS file exists
if [[ ! -f "$CSS_FILE" ]]; then
  echo "/* App.css */" > "$CSS_FILE"
fi

# Append fix only once
if ! grep -q "$MARKER" "$CSS_FILE"; then
  cat >> "$CSS_FILE" <<'CSS'

/* pwa-bottom-gap-fix-2 */
.BottomBarFixed{
  position: fixed;
  left: 0; right: 0;
  bottom: 0 !important;
  background: var(--bottom) !important;
  padding-bottom: env(safe-area-inset-bottom, 0) !important;
  z-index: 1000;
}

.BottomBarFixed__inner{
  padding-bottom: 10px !important; /* keep interior spacing only */
}

@supports (height: 100svh){
  .page, .app { height: 100svh; }
}
CSS
  echo "➜ Added CSS fix to $CSS_FILE"
else
  echo "✓ CSS fix already present in $CSS_FILE"
fi

# Commit & push
git add "$CSS_FILE"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git commit -m "fix(pwa): anchor bottom bar; paint safe-area; use svh" || true
git push -u origin "$BRANCH"

# Optional deploy when flag is passed
if [[ "${1:-}" == "--deploy" ]]; then
  npx vercel --prod
fi

echo "Done. Current branch: $BRANCH"
echo "Use: scripts/fix-bottom-gap.sh --deploy  # to trigger a Vercel prod deploy"
