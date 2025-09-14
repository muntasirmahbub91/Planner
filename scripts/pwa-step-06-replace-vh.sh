#!/usr/bin/env bash
set -euo pipefail
# replace 100vh with 100svh across src (skip node_modules)
find src -type f \( -name "*.css" -o -name "*.scss" -o -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  -not -path "*/node_modules/*" -print0 | xargs -0 perl -0777 -pi -e 's/100vh/100svh/g'

git add -A
git commit -m "pwa: swap 100vh -> 100svh for stable viewport"
