import type { Project } from '../types/project';
import { getDailyOutput } from '../lib/wordStats';

export interface Reminder {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export function checkReminders(project: Project): Reminder[] {
  const history = project.wordHistory ?? [];
  const dailyData = getDailyOutput(history, 7);
  const todayOutput = dailyData[dailyData.length - 1]?.output ?? 0;
  const dailyGoal = project.dailyWordGoal ?? 1000;
  const reminders: Reminder[] = [];

  if (todayOutput === 0) {
    reminders.push({ id: 'no-writing-today', message: '今日尚未寫作', type: 'warning' });
  } else if (todayOutput >= dailyGoal) {
    reminders.push({ id: 'daily-goal-reached', message: '已達成今日目標 🎉', type: 'success' });
  } else {
    const remaining = dailyGoal - todayOutput;
    const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n);
    reminders.push({
      id: 'keep-going',
      message: `今日已寫 ${fmt(todayOutput)} 字，距目標還差 ${fmt(remaining)} 字`,
      type: 'info',
    });
  }
  return reminders;
}
