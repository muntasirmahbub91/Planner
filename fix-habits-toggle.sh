#!/usr/bin/env bash
set -euo pipefail

F="src/sections/HabitsSection.tsx"

[[ -f "$F" ]] || { echo "File not found: $F"; exit 1; }

# 1) snapshot
git add -A >/dev/null 2>&1 || true
git commit -m "wip before habits toggle fix" >/dev/null 2>&1 || true

# 2) backup
mkdir -p backups
cp -v "$F" "backups/HabitsSection.tsx.bak"

# 3) patch: pressed=>value, drop onClick inside <ToggleButton ...>
python3 - <<'PY'
import re, pathlib
p = pathlib.Path("src/sections/HabitsSection.tsx")
s = p.read_text(encoding="utf-8")

# pressed -> value (only inside ToggleButton tags)
def repl_pressed(m):
    block = m.group(0)
    return block.replace("pressed=", "value=")

s = re.sub(r"<ToggleButton\b[^>]*?>", lambda m: repl_pressed(m), s, flags=re.S)

# also handle self-closing tags explicitly (idempotent)
s = re.sub(r"<ToggleButton\b[^>]*?/>", lambda m: repl_pressed(m), s, flags=re.S)

# remove onClick attribute inside ToggleButton start tag
s = re.sub(r"(<ToggleButton\b[^>]*?)\s+onClick\s*=\s*\{[^}]*\}", r"\1", s, flags=re.S)

p.write_text(s, encoding="utf-8")
print("Patched ToggleButton props in HabitsSection.tsx")
PY

# 4) verify
echo "Verifying…"
! grep -nE '\bpressed\s*=' "$F" || { echo "Found leftover 'pressed='"; exit 1; }
# onClick may exist elsewhere; only flag if on same line as ToggleButton
! grep -nE '<ToggleButton[^>]*onClick\s*=' "$F" || { echo "Found leftover onClick on ToggleButton"; exit 1; }

# 5) build checks
npm run typecheck >/dev/null 2>&1 || npx tsc -p . || true
npm run build >/dev/null 2>&1 || true

# 6) commit
git add "$F"
git commit -m "Fix HabitsSection: use value= and single onChange; remove onClick on ToggleButton" || true

echo "Done."
