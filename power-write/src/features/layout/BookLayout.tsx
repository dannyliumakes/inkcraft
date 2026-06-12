import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useManuscriptSearch } from '../../lib/useManuscriptSearch';
import { useManuscriptStore } from '../../stores/manuscriptStore';
import { getAccessToken } from '../../stores/authStore';
import { downloadText, getHeadRevisionId } from '../../services/drive';

const tabs = [
  { key: 'manuscript', label: '原稿', path: '' },
  { key: 'plot',       label: '情節', path: 'plot' },
  { key: 'characters', label: '角色', path: 'characters' },
  { key: 'research',   label: '研究', path: 'research' },
  { key: 'overview',   label: '總覽', path: 'overview' },
] as const;

// ─── Search bar ──────────────────────────────────────────────────────────────

function SearchBar() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const project = useManuscriptStore((s) => s.project);
  const chapterContent = useManuscriptStore((s) => s.chapterContent);
  const activeChapterId = useManuscriptStore((s) => s.activeChapterId);
  const setActiveChapter = useManuscriptStore((s) => s.setActiveChapter);
  const setChapterContent = useManuscriptStore((s) => s.setChapterContent);
  const setSaveStatus = useManuscriptStore((s) => s.setSaveStatus);
  const setHeadRevisionId = useManuscriptStore((s) => s.setHeadRevisionId);

  const { search } = useManuscriptSearch(project, chapterContent, activeChapterId);

  const results = debouncedQuery.trim() ? search(debouncedQuery) : [];

  // Debounce input
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  }

  // Open search bar
  function openSearch() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Close search
  function closeSearch() {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  }

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSearch();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Click outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const handleSelectChapter = useCallback(async (chapterId: string) => {
    closeSearch();
    if (!project) return;
    const ch = project.chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    const token = getAccessToken();
    if (!token) return;

    // Navigate to manuscript tab first
    navigate(`/book/${bookId}`);

    setActiveChapter(ch.id);
    setSaveStatus('idle');
    try {
      const [text, revId] = await Promise.all([
        downloadText(token, ch.fileId),
        getHeadRevisionId(token, ch.fileId),
      ]);
      setHeadRevisionId(revId);
      setChapterContent(text);
    } catch (e) {
      console.error('Failed to load chapter from search', e);
    }
  }, [project, bookId, navigate, setActiveChapter, setSaveStatus, setHeadRevisionId, setChapterContent]);

  return (
    <div ref={containerRef} className="relative flex items-center">
      {!open ? (
        <button
          title="搜尋原稿"
          onClick={openSearch}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="#4c5354" strokeWidth="1.5"/>
            <path d="M12.5 12.5L16 16" stroke="#4c5354" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-white border border-[#7c6ee0] rounded-full px-3 py-1.5 shadow-sm min-w-[240px]">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0 text-gray-400">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜尋原稿..."
            value={query}
            onChange={handleChange}
            className="flex-1 text-sm outline-none bg-transparent text-[#181c1e] placeholder-gray-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); setDebouncedQuery(''); }} className="text-gray-400 hover:text-gray-600">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-[420px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectChapter(r.id)}
                className="w-full text-left px-4 py-3 hover:bg-[#f2f4ff] transition-colors border-b border-gray-50 last:border-0"
              >
                <p className="text-sm font-semibold text-[#181c1e] mb-0.5">{r.title}</p>
                <p
                  className="text-xs text-gray-500 leading-relaxed line-clamp-2"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </button>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{results.length} 個結果　按 Esc 關閉</p>
          </div>
        </div>
      )}

      {/* No results */}
      {open && debouncedQuery.trim() && results.length === 0 && (
        <div className="absolute top-full right-0 mt-2 w-[320px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 px-4 py-6 text-center">
          <p className="text-sm text-gray-400">找不到「{debouncedQuery}」的相關內容</p>
        </div>
      )}
    </div>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

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

        {/* Search */}
        <SearchBar />

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
