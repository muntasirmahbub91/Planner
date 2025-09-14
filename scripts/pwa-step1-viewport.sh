#!/usr/bin/env bash
set -euo pipefail

HTML=""
for f in index.html public/index.html; do
  [[ -f "$f" ]] && HTML="$f" && break
done
[[ -z "$HTML" ]] && { echo "❌ index.html not found (looked in ./ and ./public)"; exit 1; }

cp "$HTML" "$HTML.bak.$(date +%s)"

# Replace existing viewport or insert a new one before </head>
if grep -qi 'name=["'\'']viewport["'\'']' "$HTML"; then
  sed -i '' -E 's#<meta[^>]*name=["'"'"']viewport["'"'"'][^>]*>#<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">#g' "$HTML"
else
  awk 'BEGIN{ins=0}
       /<\/head>/ && !ins {print "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no\">"; ins=1}
       {print}' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"
fi
echo "✅ Step 1 applied to $HTML"
