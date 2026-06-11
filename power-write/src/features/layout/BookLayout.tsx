import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const tabs = [
  { key: 'manuscript', path: '' },
  { key: 'plot', path: 'plot' },
  { key: 'characters', path: 'characters' },
  { key: 'research', path: 'research' },
  { key: 'overview', path: 'overview' },
] as const;

export default function BookLayout() {
  const { bookId } = useParams<{ bookId: string }>();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center gap-4 border-b px-6 py-3">
        <span className="font-bold text-lg mr-4">{t('app.title')}</span>
        {tabs.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.path === '' ? `/book/${bookId}` : `/book/${bookId}/${tab.path}`}
            end={tab.path === ''}
            className={({ isActive }) =>
              `px-3 py-1 rounded text-sm ${isActive ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:text-gray-900'}`
            }
          >
            {t(`nav.${tab.key}`)}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
