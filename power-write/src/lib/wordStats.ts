export interface DayOutput { day: string; output: number; }

export function getDailyOutput(history: { date: string; total: number }[], days = 7): DayOutput[] {
  const result: DayOutput[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(d);
    const dayLabel = new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Taipei' }).format(d);
    const idx = history.findIndex(h => h.date === dateStr);
    const entry = idx >= 0 ? history[idx] : undefined;
    const todayTotal = entry?.total ?? 0;
    const prevTotal = idx > 0 ? history[idx - 1].total : (entry ? 0 : 0);
    const output = Math.max(0, todayTotal - prevTotal);
    result.push({ day: dayLabel, output: entry ? output : 0 });
  }
  return result;
}

export function getWeekTotal(history: { date: string; total: number }[]): number {
  const now = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date()) + 'T00:00:00+08:00');
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const mondayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(monday);

  const weekEntries = history.filter(h => h.date >= mondayStr).sort((a, b) => a.date.localeCompare(b.date));
  let total = 0;
  for (let i = 0; i < weekEntries.length; i++) {
    const cur = weekEntries[i];
    const idxInFull = history.findIndex(h => h.date === cur.date);
    const prev = idxInFull > 0 ? history[idxInFull - 1].total : 0;
    total += Math.max(0, cur.total - prev);
  }
  return total;
}

export function getRemainingGoal(history: { date: string; total: number }[], projectWordGoal: number): number {
  if (history.length === 0) return Math.max(0, projectWordGoal);
  const latest = history[history.length - 1].total;
  return Math.max(0, projectWordGoal - latest);
}
