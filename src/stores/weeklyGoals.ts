type GoalsMap = Record<string, string[]>; // key = weekStartMs string

const LS_KEY = 'plannerx.weeklyGoals.v1';

function load(): GoalsMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) as GoalsMap : {};
  } catch {
    return {};
  }
}
function save(map: GoalsMap) {
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

export function getGoals(weekStartMs: number): string[] {
  const map = load();
  return map[String(weekStartMs)] ?? [];
}

export function addGoal(weekStartMs: number, text: string): string[] {
  const map = load();
  const k = String(weekStartMs);
  const cur = (map[k] ?? []).slice(0, 3);
  const t = text.trim();
  if (!t) return cur;
  if (cur.length >= 3) return cur;
  if (cur.includes(t)) return cur;
  const next = [...cur, t];
  map[k] = next;
  save(map);
  return next;
}

export function removeGoal(weekStartMs: number, text: string): string[] {
  const map = load();
  const k = String(weekStartMs);
  const cur = map[k] ?? [];
  const next = cur.filter(g => g !== text);
  map[k] = next;
  save(map);
  return next;
}
