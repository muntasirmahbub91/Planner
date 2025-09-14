import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type EditPayload = {
  date?: string; // YYYY-MM-DD
  urgent: boolean;
  important: boolean;
}

// Singleton modal root
let host: HTMLDivElement | null = null
let root: ReturnType<typeof createRoot> | null = null

function ensureRoot() {
  if (!host) {
    host = document.createElement('div')
    host.id = 'planner-edit-modal-root'
    document.body.appendChild(host)
    root = createRoot(host)
  }
}

function Modal({ onClose, onSave, initial }: {
  onClose: () => void,
  onSave: (p: EditPayload) => void,
  initial: EditPayload
}) {
  const [date, setDate] = useState<string | undefined>(initial.date)
  const [urgent, setUrgent] = useState<boolean>(initial.urgent)
  const [important, setImportant] = useState<boolean>(initial.important)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'grid', placeItems: 'center', zIndex: 9999
  }
  const card: React.CSSProperties = {
    width: 'min(520px, 92vw)', background: '#fff', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    padding: 20
  }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
  const title: React.CSSProperties = { fontWeight: 800, fontSize: 20 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' as const }
  const pill: React.CSSProperties = (active => ({
    border: '1px solid rgba(0,0,0,0.12)', padding: '8px 14px', borderRadius: 999,
    background: active ? 'rgba(58,123,213,0.12)' : '#fff', fontWeight: 600, cursor: 'pointer'
  })) as any
  const btn: React.CSSProperties = { padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer' }
  const primary: React.CSSProperties = { ...btn, background: '#3a7bd5', color: '#fff', border: 'none' }

  return (
    <div style={overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <div style={title}>Edit task</div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={row}>
          <label style={{ fontWeight: 700, minWidth: 80 }}>Date</label>
          <input
            type="date"
            value={date ?? ''}
            onChange={e => setDate(e.currentTarget.value || undefined)}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.2)' }}
          />
        </div>

        <div style={row}>
          <label style={{ fontWeight: 700, minWidth: 80 }}>Flags</label>
          <button type="button" onClick={() => setUrgent(u => !u)} style={pill(urgent)} aria-pressed={urgent}>Urgent</button>
          <button type="button" onClick={() => setImportant(i => !i)} style={pill(important)} aria-pressed={important}>Important</button>
        </div>

        <div style={{ ...row, justifyContent: 'flex-end' }}>
          <button style={btn} onClick={onClose}>Cancel</button>
          <button
            style={primary}
            onClick={() => onSave({ date, urgent, important })}
          >Save</button>
        </div>
      </div>
    </div>
  )
}

export function openTaskEditModal(initial?: Partial<EditPayload>) {
  ensureRoot()
  const seed: EditPayload = {
    date: initial?.date,
    urgent: !!initial?.urgent,
    important: !!initial?.important,
  }
  const close = () => root?.render(<></>)
  const save = (p: EditPayload) => {
    // Broadcast for your stores to handle. Consumers can update the currently selected task.
    window.dispatchEvent(new CustomEvent('planner:task-edit', { detail: p }))
    close()
  }
  root!.render(<Modal onClose={close} onSave={save} initial={seed} />)
}

// Expose imperative handle for ad-hoc usage from anywhere
;(window as any).PlannerOpenTaskEdit = openTaskEditModal

// Auto-wire any visible "Edit" button inside a Tasks section.
// This is defensive and idempotent. If your TasksSection handles onClick itself, this will be ignored.
function isTasksEditButton(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  const text = (el.textContent || '').trim().toLowerCase()
  if (text !== 'edit') return false
  // Heuristic: heading "Tasks" nearby
  const section = el.closest('section,div,main,article')
  if (!section) return true
  const heading = section.querySelector('h1,h2,h3,h4')
  if (!heading) return true
  return (heading.textContent || '').trim().toLowerCase().startsWith('tasks')
}

document.addEventListener('click', (e) => {
  const target = e.target as Element
  const btn = target.closest('button, [role="button"]')
  if (btn && isTasksEditButton(btn)) {
    e.preventDefault()
    openTaskEditModal()
  }
}, { capture: true })
