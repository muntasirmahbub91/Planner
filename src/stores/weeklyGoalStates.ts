type WeekMap = Record<string, boolean>;
type Store = Record<string, WeekMap>; // key: weekStartMs -> { goalText: checked }

const LS_KEY = 'plannerx.weeklyGoals.done.v1';

function load(): Store {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) as Store : {}; }
  catch { return {}; }
}
function save(s: Store) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }

export function listGoalStates(weekStartMs: number): WeekMap {
  const s = load(); return s[String(weekStartMs)] ?? {};
}
export function getGoalState(weekStartMs: number, text: string): boolean {
  const m = listGoalStates(weekStartMs); return !!m[text];
}
export function setGoalState(weekStartMs: number, text: string, checked: boolean): WeekMap {
  const s = load(); const k = String(weekStartMs);
  const m = { ...(s[k] ?? {}) };
  if (checked) m[text] = true; else delete m[text];
  s[k] = m; save(s); return m;
}
export function toggleGoalState(weekStartMs: number, text: string): WeekMap {
  const cur = getGoalState(weekStartMs, text);
  return setGoalState(weekStartMs, text, !cur);
}
export function purgeUnknown(weekStartMs: number, keep: string[]): WeekMap {
  const s = load(); const k = String(weekStartMs);
  const m = { ...(s[k] ?? {}) };
  for (const key of Object.keys(m)) if (!keep.includes(key)) delete m[key];
  s[k] = m; save(s); return m;
}
