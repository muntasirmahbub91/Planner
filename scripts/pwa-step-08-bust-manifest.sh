#!/usr/bin/env bash
set -euo pipefail
f="public/index.html"
[ -f "$f" ] || { echo "missing $f"; exit 1; }
ts=$(date +%s)
# add or update ?v= query on the manifest link
if grep -q 'rel=["'\'']manifest["'\'']' "$f"; then
  # normalize any existing query, then apply new one
  sed -i '' -E 's|(rel=["'\''"]manifest["'\''"][^>]*href=["'\''"][^?"'\''"]+)(\?v=[0-9]+)?(["'\''"])|\1?v='"$ts"'\3|g' "$f"
else
  echo "No manifest link found in $f"; exit 1
fi

git add "$f"
git commit -m "pwa: cache-bust manifest link (?v=$ts)"
