import type { Project } from '../types/project';

export function takeSnapshot(project: Project): Project {
  const todayTotal = project.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date());

  const history = [...(project.wordHistory ?? [])];
  const idx = history.findIndex(h => h.date === today);
  if (idx >= 0) {
    history[idx] = { date: today, total: todayTotal };
  } else {
    history.push({ date: today, total: todayTotal });
  }
  // Keep last 90 days
  const trimmed = history.slice(-90);
  return { ...project, wordHistory: trimmed };
}
