#!/usr/bin/env bash
set -euo pipefail
shopt -s globstar nullglob

red(){ printf "\033[31m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }
green(){ printf "\033[32m%s\033[0m\n" "$*"; }

echo "== Scan: stores for in-place mutation and missing version bumps =="
issues=0
for f in src/stores/**/*.{ts,tsx,js,jsx} src/stores/*.{ts,tsx,js,jsx}; do
  [[ -e "$f" ]] || continue
  if grep -nE 'push\(|splice\(|sort\(|unshift\(|shift\(|pop\(|state\.[a-zA-Z0-9_]+\[[^]]+\]\s*=' "$f" >/dev/null; then
    yellow "Potential mutation in $f:"
    grep -nE 'push\(|splice\(|sort\(|unshift\(|shift\(|pop\(|state\.[a-zA-Z0-9_]+\[[^]]+\]\s*=' "$f" || true
    ((issues++))
  fi
  if ! grep -qE '\bver\b' "$f"; then
    yellow "No 'ver' field found in $f (add and bump it in add/update/remove)."
    ((issues++))
  fi
done

echo
echo "== Scan: components that read stores without subscribing (selector) =="
for f in src/**/*.{ts,tsx,js,jsx}; do
  [[ -e "$f" ]] || continue
  if grep -qE 'from\s+["'\'']@?/?.*stores/tasksStore' "$f"; then
    if grep -qE '\buseTasks\(\s*\)' "$f"; then
      yellow "Selectorless useTasks() in $f"
      ((issues++))
    fi
    if grep -q 'tasksOnDay\s*\(' "$f" >/dev/null && ! grep -q 'useTasks\s*(.*=>.*ver' "$f"; then
      yellow "tasksOnDay() used without subscribing to store 'ver' in $f"
      ((issues++))
    fi
  fi
  if grep -qE 'from\s+["'\'']@?/?.*stores/.*remind' "$f"; then
    if grep -qE '\buseReminders\(\s*\)' "$f"; then
      yellow "Selectorless useReminders() in $f"
      ((issues++))
    fi
  fi
done

echo
if ((issues==0)); then
  green "No obvious live-update issues found."
  exit 0
fi

red "$issues potential issue(s) found."
cat <<'GUIDE'

Fix guide (apply in the flagged files):

1) Make writes immutable and bump a version:
   set(state => ({ items: [...state.items, newItem], ver: (state.ver ?? 0) + 1 }))
   set(state => {
     const i = state.items.findIndex(t => t.id === id);
     if (i < 0) return state;
     const items = state.items.slice();
     items[i] = { ...state.items[i], ...patch };
     return { items, ver: (state.ver ?? 0) + 1 };
   })
   // and for remove:
   set(state => ({ items: state.items.filter(t => t.id !== id), ver: (state.ver ?? 0) + 1 }))

2) Subscribe with a selector in components and include 'ver' in derivations:
   const ver = useTasks(s => s.ver);
   const todays = useMemo(() => tasksOnDay(anchorMs) as Task[], [anchorMs, ver]);

Repeat the same pattern for reminders.
GUIDE
exit 1
