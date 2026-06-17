import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useManuscriptSearch } from '../manuscript/useManuscriptSearch';
import { useManuscriptStore } from '../manuscript/manuscriptStore';
import { useShelfStore } from '../shelf/shelfStore';
import { useAuthStore } from '../../shared/stores/authStore';
import { LoginButton } from '../../shared/services/auth';
import { listChildren } from '../../shared/services/drive';
import { loadProject } from '../../shared/services/projectRepo';
import NotificationBell from './components/NotificationBell';

const tabs = [
  { key: 'manuscript', path: '' },
  { key: 'plot',       path: 'plot' },
  { key: 'characters', path: 'characters' },
  { key: 'research',   path: 'research' },
  { key: 'overview',   path: 'overview' },
] as const;

const searchStyles = {
  root: 'relative flex items-center',
  iconBtn: 'w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors',
  expandedWrap: 'flex items-center gap-2 bg-white border border-accent rounded-full px-3 py-1.5 shadow-sm min-w-[240px]',
  expandedIcon: 'shrink-0 text-placeholder',
  input: 'flex-1 text-sm outline-none bg-transparent text-primary placeholder-gray-400',
  clearBtn: 'text-placeholder hover:text-muted',
  dropdown: 'absolute top-full right-0 mt-2 w-[420px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden',
  dropdownScroll: 'max-h-[400px] overflow-y-auto',
  resultBtn: 'w-full text-left px-4 py-3 hover:bg-accent-light transition-colors border-b border-gray-50 last:border-0',
  resultTitle: 'text-sm font-semibold text-primary mb-0.5',
  resultSnippet: 'text-xs text-secondary leading-relaxed line-clamp-2',
  dropdownFooter: 'px-4 py-2 border-t border-gray-100 bg-gray-50',
  dropdownCount: 'text-xs text-placeholder',
  viewAllBtn: 'mt-1 text-xs text-accent hover:underline',
  emptyDropdown: 'absolute top-full right-0 mt-2 w-[320px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 px-4 py-6 text-center',
  emptyMsg: 'text-sm text-placeholder',
  emptyLink: 'mt-2 text-xs text-accent hover:underline',
}

const layoutStyles = {
  root: 'h-screen flex flex-col bg-surface overflow-hidden',
  mobileBanner: 'sm:hidden bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center',
  nav: 'bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center gap-2 md:gap-4 sticky top-0 z-30 overflow-hidden',
  logo: 'font-black text-xl md:text-[32px] text-primary tracking-tight mr-2 md:mr-6 shrink-0',
  tabBar: 'flex items-center bg-accent-light rounded-full p-1 gap-0.5 md:gap-1 overflow-x-auto shrink min-w-0',
  tabLink: (isActive: boolean) =>
    `px-2 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-400 ${
      isActive ? 'bg-muted text-white' : 'text-muted hover:bg-accent-softer'
    }`,
  userRow: 'flex items-center gap-1 md:gap-2 shrink-0',
  userLabel: 'hidden md:inline text-sm text-muted',
  userAvatar: 'w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent font-bold text-sm',
  main: 'flex-1 overflow-hidden',
}

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
  const sceneContents = useManuscriptStore((s) => s.sceneContents);
  const activeChapterId = useManuscriptStore((s) => s.activeChapterId);
  const setActiveChapter = useManuscriptStore((s) => s.setActiveChapter);
  const setSaveStatus = useManuscriptStore((s) => s.setSaveStatus);

  const chapterContent = Array.from(sceneContents.values()).join('\n\n');

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

  const handleSelectChapter = useCallback((chapterId: string) => {
    closeSearch();
    if (!project) return;
    const ch = project.chapters.find((c) => c.id === chapterId);
    if (!ch) return;

    // Navigate to manuscript tab; useChapterLoader in ManuscriptPage handles the actual load
    navigate(`/book/${bookId}`);
    setActiveChapter(ch.id);
    setSaveStatus('idle');
  }, [project, bookId, navigate, setActiveChapter, setSaveStatus]);

  return (
    <div ref={containerRef} className={searchStyles.root}>
      {!open ? (
        <button title="搜尋原稿" onClick={openSearch} className={searchStyles.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="var(--color-muted)" strokeWidth="1.5"/>
            <path d="M12.5 12.5L16 16" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      ) : (
        <div className={searchStyles.expandedWrap}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className={searchStyles.expandedIcon}>
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜尋原稿..."
            value={query}
            onChange={handleChange}
            className={searchStyles.input}
          />
          {query && (
            <button onClick={() => { setQuery(''); setDebouncedQuery(''); }} className={searchStyles.clearBtn}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {open && results.length > 0 && (
        <div className={searchStyles.dropdown}>
          <div className={searchStyles.dropdownScroll}>
            {results.map((r) => (
              <button key={r.id} onClick={() => handleSelectChapter(r.id)} className={searchStyles.resultBtn}>
                <p className={searchStyles.resultTitle}>{r.title}</p>
                <p
                  className={searchStyles.resultSnippet}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </button>
            ))}
          </div>
          <div className={searchStyles.dropdownFooter}>
            <p className={searchStyles.dropdownCount}>{results.length} 個結果　按 Esc 關閉</p>
            <button
              onClick={() => { closeSearch(); navigate(`/book/${bookId}/search/${encodeURIComponent(debouncedQuery)}`); }}
              className={searchStyles.viewAllBtn}
            >
              在搜尋頁面中檢視全部
            </button>
          </div>
        </div>
      )}

      {open && debouncedQuery.trim() && results.length === 0 && (
        <div className={searchStyles.emptyDropdown}>
          <p className={searchStyles.emptyMsg}>找不到「{debouncedQuery}」的相關內容</p>
          <button
            onClick={() => { closeSearch(); navigate(`/book/${bookId}/search/${encodeURIComponent(debouncedQuery)}`); }}
            className={searchStyles.emptyLink}
          >
            在搜尋頁面中開啟
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function BookLayout() {
  const { bookId } = useParams<{ bookId: string }>();
  const { t } = useTranslation();

  const books = useShelfStore((s) => s.books);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { loadedBookId, setProject, setLoadedBookId, setProjectLoading } = useManuscriptStore();

  // Load project once per book — reactive to accessToken so hard-refresh works:
  // after the user re-authenticates, this effect re-fires and loads the project.
  useEffect(() => {
    if (!bookId || !accessToken || loadedBookId === bookId) return;

    setProjectLoading(true);

    async function resolveAndLoad() {
      const book = books.find((b) => b.id === bookId);
      if (book) return loadProject(accessToken!, book.projectFileId);
      // shelfStore empty (hard refresh) — find project.json directly in the folder
      const children = await listChildren(accessToken!, bookId!, "name='project.json'");
      if (!children.length) throw new Error('project.json not found');
      return loadProject(accessToken!, children[0].id);
    }

    resolveAndLoad()
      .then((p) => {
        setProject(p);
        setLoadedBookId(bookId);
      })
      .catch(console.error)
      .finally(() => setProjectLoading(false));
  }, [bookId, books, accessToken, loadedBookId, setProject, setLoadedBookId, setProjectLoading]);

  if (!accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="page-title">Power Write</h1>
        <p className="text-secondary">請重新登入以繼續</p>
        <LoginButton />
      </div>
    );
  }

  return (
    <div className={layoutStyles.root} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      <div className={layoutStyles.mobileBanner}>{t('mobile_banner')}</div>

      <nav className={layoutStyles.nav}>
        <span className={layoutStyles.logo} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
          Power write
        </span>

        <div className={layoutStyles.tabBar}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path === '' ? `/book/${bookId}` : `/book/${bookId}/${tab.path}`}
              end={tab.path === ''}
              className={({ isActive }) => layoutStyles.tabLink(isActive)}
            >
              {t(`nav.${tab.key}`)}
            </NavLink>
          ))}
        </div>

        <div className="flex-1 shrink-0" />

        <SearchBar />

        <NotificationBell />

        <div className={layoutStyles.userRow}>
          <span className={layoutStyles.userLabel}>{t('nav.user')}</span>
          <div className={layoutStyles.userAvatar}>U</div>
        </div>
      </nav>

      <main className={layoutStyles.main}>
        <Outlet />
      </main>

    </div>
  );
}
