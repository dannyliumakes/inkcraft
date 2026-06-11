import { NavLink, Outlet, useParams } from 'react-router-dom';

const tabs = [
  { key: 'manuscript', label: '原稿', path: '' },
  { key: 'plot',       label: '情節', path: 'plot' },
  { key: 'characters', label: '角色', path: 'characters' },
  { key: 'research',   label: '研究', path: 'research' },
  { key: 'overview',   label: '總覽', path: 'overview' },
] as const;

export default function BookLayout() {
  const { bookId } = useParams<{ bookId: string }>();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      <nav className="bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4 sticky top-0 z-30">
        {/* Logo */}
        <span
          className="font-black text-[32px] text-[#181c1e] tracking-tight mr-6"
          style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
        >
          Power write
        </span>

        {/* Tab pill bar */}
        <div className="flex items-center bg-[#f2f4ff] rounded-full p-1 gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path === '' ? `/book/${bookId}` : `/book/${bookId}/${tab.path}`}
              end={tab.path === ''}
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#4c5354] text-white'
                    : 'text-[#4c5354] hover:bg-[#e0e4ff]'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <div className="flex-1" />

        {/* Notification bell */}
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 0 0-6-6z" stroke="#181c1e" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 16.5a2 2 0 0 0 4 0" stroke="#181c1e" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#4c5354]">使用者</span>
          <div className="w-8 h-8 rounded-full bg-[#e8eaff] flex items-center justify-center text-[#7c6ee0] font-bold text-sm">U</div>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
