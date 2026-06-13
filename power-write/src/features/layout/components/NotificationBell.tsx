import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useManuscriptStore } from '../../manuscript/manuscriptStore';
import { checkReminders, type Reminder } from '../../overview/reminderService';

const styles = {
  root: 'relative',
  bell: 'relative p-2 rounded-lg hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-400',
  badge: 'absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] rounded-full flex items-center justify-center leading-none',
  dropdown: 'absolute right-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50',
  empty: 'p-4 text-sm text-placeholder text-center',
  list: 'divide-y divide-gray-50',
  itemBase: 'flex items-start gap-2 px-4 py-3 text-sm rounded-xl',
  dismissBtn: 'shrink-0 opacity-60 hover:opacity-100 focus-visible:ring-1 focus-visible:ring-blue-400',
}

// TODO: replace with design tokens once reminder color tokens are added to index.css
const typeStyle: Record<Reminder['type'], string> = {
  success: 'text-green-700 bg-green-50',
  warning: 'text-orange-700 bg-orange-50',
  info: 'text-blue-700 bg-blue-50',
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const project = useManuscriptStore(s => s.project);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('dismissed-reminders') ?? '[]'));
    } catch { return new Set(); }
  });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project) return;
    const calc = () => setReminders(checkReminders(project));
    calc();
    const id = setInterval(calc, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [project]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visible = reminders.filter(r => !dismissed.has(r.id));

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    sessionStorage.setItem('dismissed-reminders', JSON.stringify([...next]));
  };

  return (
    <div className={styles.root} ref={ref}>
      <button
        aria-label={t('reminder.no_notifications') + ` (${visible.length})`}
        onClick={() => setOpen(o => !o)}
        className={styles.bell}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
        </svg>
        {visible.length > 0 && (
          <span className={styles.badge}>{visible.length}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          {visible.length === 0 ? (
            <p className={styles.empty}>{t('reminder.no_notifications')}</p>
          ) : (
            <ul className={styles.list}>
              {visible.map(r => (
                <li key={r.id} className={`${styles.itemBase} ${typeStyle[r.type]}`}>
                  <span className="flex-1">{r.message}</span>
                  <button
                    onClick={() => dismiss(r.id)}
                    aria-label={t('milestone.close')}
                    className={styles.dismissBtn}
                  >✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
