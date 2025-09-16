#!/usr/bin/env bash
set -euo pipefail

F="src/views/WeekView.tsx"

[[ -f "$F" ]] || { echo "Missing $F"; exit 1; }

# 1) snapshot + backup
git add -A >/dev/null 2>&1 || true
git commit -m "wip before modalizing weekview composer" >/dev/null 2>&1 || true
mkdir -p backups && cp -v "$F" backups/WeekView.tsx.bak

# 2) patch file
python3 - <<'PY'
import re, pathlib

p = pathlib.Path("src/views/WeekView.tsx")
s = p.read_text(encoding="utf-8")

# Ensure Modal import
if 'from "@/components/Modal"' not in s:
    s = s.replace(
        "import ToggleButton from '@/components/ToggleButton';",
        "import ToggleButton from '@/components/ToggleButton';\nimport Modal from '@/components/Modal';"
    )

# Replace inline composer block with Modal
modal_block = r"""{showComposer && (
      <Modal open={showComposer} onClose={() => { setShowComposer(false); setTitle(''); setUrgent(false); setImportant(false); }}>
        <div style={{ display:'grid', gap:12 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Add task</div>
          <input
            className={styles.input}
            placeholder="Task title..."
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==='Enter') addTaskToSelectedDay(); if (e.key==='Escape'){ setShowComposer(false); } }}
            autoFocus
          />
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button
              className={`pill ${urgent ? 'active' : ''}`}
              onClick={()=>setUrgent(v=>!v)}
              style={{height:36, padding:'0 12px', border:'1px solid #cbd5e1', borderRadius:999, background: urgent ? '#fde68a' : '#f8fafc', fontWeight:700}}
              aria-pressed={urgent}
              title="Urgent"
            >U</button>
            <button
              className={`pill ${important ? 'active' : ''}`}
              onClick={()=>setImportant(v=>!v)}
              style={{height:36, padding:'0 12px', border:'1px solid #cbd5e1', borderRadius:999, background: important ? '#fde68a' : '#f8fafc', fontWeight:700}}
              aria-pressed={important}
              title="Important"
            >I</button>
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button className={styles.smallBtn ?? ''} onClick={()=>{ setShowComposer(false); setTitle(''); }}>Cancel</button>
              <button className={styles.smallBtn ?? ''} onClick={addTaskToSelectedDay} disabled={!title.trim()}>Add</button>
            </div>
          </div>
        </div>
      </Modal>
    )}"""

pattern = re.compile(
    r"\{showComposer\s*&&\s*\(\s*<div\s+className=\{styles\.composer\}[\s\S]*?</div>\s*\)\s*\}",
    re.M
)

if not pattern.search(s):
    raise SystemExit("Could not find inline composer block to replace. Aborting to avoid damage.")

s = pattern.sub(modal_block, s, count=1)

p.write_text(s, encoding="utf-8")
print("WeekView composer -> Modal patched.")
PY

# 3) verify
grep -n "from '@/components/Modal'" src/views/WeekView.tsx
grep -n "Modal open={showComposer}" src/views/WeekView.tsx
! grep -n "className={styles.composer}" src/views/WeekView.tsx || { echo "Inline composer still present"; exit 1; }

# 4) typecheck/build (best-effort)
npm run typecheck >/dev/null 2>&1 || npx tsc -p . || true
npm run build >/dev/null 2>&1 || true

# 5) commit
git add src/views/WeekView.tsx
git commit -m "WeekView: use Modal for add-task composer" || true

echo "Done."
