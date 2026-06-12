import { useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NotificationBell from './NotificationBell';
import MilestonePanel from './MilestonePanel';

const tabs = [
  { key: 'manuscript', path: '' },
  { key: 'plot',       path: 'plot' },
  { key: 'characters', path: 'characters' },
  { key: 'research',   path: 'research' },
  { key: 'overview',   path: 'overview' },
] as const;

export default function BookLayout() {
  const { bookId } = useParams<{ bookId: string }>();
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* Mobile banner */}
      <div className="sm:hidden bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center">
        {t('mobile_banner')}
      </div>

      <nav className="bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center gap-2 md:gap-4 sticky top-0 z-30 overflow-hidden">
        {/* Logo */}
        <span
          className="font-black text-xl md:text-[32px] text-[#181c1e] tracking-tight mr-2 md:mr-6 shrink-0"
          style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
        >
          Power write
        </span>

        {/* Tab pill bar */}
        <div className="flex items-center bg-[#f2f4ff] rounded-full p-1 gap-0.5 md:gap-1 overflow-x-auto shrink min-w-0">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path === '' ? `/book/${bookId}` : `/book/${bookId}/${tab.path}`}
              end={tab.path === ''}
              className={({ isActive }) =>
                `px-2 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isActive
                    ? 'bg-[#4c5354] text-white'
                    : 'text-[#4c5354] hover:bg-[#e0e4ff]'
                }`
              }
            >
              {t(`nav.${tab.key}`)}
            </NavLink>
          ))}
        </div>

        <div className="flex-1 shrink-0" />

        {/* Milestone button */}
        <button
          onClick={() => setMilestoneOpen(o => !o)}
          className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-full border border-gray-200 text-[#4c5354] hover:bg-[#f2f4ff] transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-label={t('milestone.title')}
        >
          🏁 <span className="hidden md:inline">{t('nav.milestone')}</span>
        </button>

        {/* Notification bell */}
        <NotificationBell />

        {/* User */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <span className="hidden md:inline text-sm text-[#4c5354]">{t('nav.user')}</span>
          <div className="w-8 h-8 rounded-full bg-[#e8eaff] flex items-center justify-center text-[#7c6ee0] font-bold text-sm">U</div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {milestoneOpen && <MilestonePanel onClose={() => setMilestoneOpen(false)} />}
    </div>
  );
}
