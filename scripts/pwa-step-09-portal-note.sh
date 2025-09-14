#!/usr/bin/env bash
set -euo pipefail
cat <<'MSG'
If the footer still sits behind OS chrome:
- Render <BottomBarFixed> via a React Portal into document.body.
- Ensure no ancestor has transform/filter/perspective/will-change.
- Keep footer CSS global and loaded last.
MSG
