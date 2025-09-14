#!/usr/bin/env bash
set -euo pipefail
npm run build
# deploy if you use Vercel CLI and want prod
if command -v vercel >/dev/null 2>&1; then
  npx vercel --prod
else
  echo "Vercel CLI not found. Install with: npm i -g vercel"
fi
