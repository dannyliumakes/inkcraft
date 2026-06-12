import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useManuscriptStore } from '../manuscript/manuscriptStore';
import { getAccessToken } from '../../shared/stores/authStore';
import { saveProject } from '../../shared/services/projectRepo';
import { getDailyOutput, getWeekTotal, getRemainingGoal } from '../../lib/wordStats';
import { downloadManuscript } from '../../shared/services/exportService';
import { Button, Input } from '../../shared/components/ui';

export default function Overview() {
  const { t } = useTranslation();
  const project = useManuscriptStore(s => s.project);
  const setProject = useManuscriptStore(s => s.setProject);
  const [goalInput, setGoalInput] = useState<string>('');
  const [dailyGoalInput, setDailyGoalInput] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  if (!project) return <div className="p-8 text-gray-400">{t('overview.loading')}</div>;

  const history = project.wordHistory ?? [];
  const weekData = getDailyOutput(history, 7);
  const weekTotal = getWeekTotal(history);
  const remaining = getRemainingGoal(history, project.projectWordGoal ?? 80000);
  const todayOutput = weekData[weekData.length - 1]?.output ?? 0;
  const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadManuscript(project);
    } finally {
      setExporting(false);
    }
  };

  const handleSaveGoal = async (field: 'projectWordGoal' | 'dailyWordGoal', rawVal: string) => {
    const v = parseInt(rawVal);
    if (!isNaN(v) && v > 0) {
      const token = getAccessToken();
      if (!token) return;
      const updated = { ...project, [field]: v };
      setProject(updated);
      await saveProject(token, updated);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('overview.title')}</h1>
        <Button onClick={handleExport} disabled={exporting} loading={exporting}>
          {t('overview.export')}
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">{t('overview.chart_title')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('overview.chart_subtitle')}</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekData}>
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [fmt(v), '字數']} />
            <Bar dataKey="output" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{fmt(todayOutput)}</div>
            <div className="text-sm text-gray-500">{t('overview.today')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{fmt(weekTotal)}</div>
            <div className="text-sm text-gray-500">{t('overview.week_total')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{fmt(remaining)}</div>
            <div className="text-sm text-gray-500">{t('overview.remaining_goal')}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{t('overview.goal_settings')}</h2>
        <div className="space-y-4">
          <Input
            label={t('overview.project_goal')}
            type="number"
            defaultValue={project.projectWordGoal ?? 80000}
            onChange={e => setGoalInput(e.target.value)}
            onBlur={() => handleSaveGoal('projectWordGoal', goalInput)}
            className="w-48"
          />
          <Input
            label={t('overview.daily_goal')}
            type="number"
            defaultValue={project.dailyWordGoal ?? 1000}
            onChange={e => setDailyGoalInput(e.target.value)}
            onBlur={() => handleSaveGoal('dailyWordGoal', dailyGoalInput)}
            className="w-48"
          />
        </div>
      </div>
    </div>
  );
}
