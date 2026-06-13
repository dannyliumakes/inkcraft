import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../../shared/services/auth'
import { findOrCreateRootFolder, listChildren, trashFile, downloadText, updateFileContent } from '../../shared/services/drive'
import { loadProject } from '../../shared/services/projectRepo'
import { getAccessToken } from '../../shared/stores/authStore'
import { useShelfStore } from './shelfStore'
import type { ShelfBook } from './shelfStore'
import { Button, Input, Modal, Spinner } from '../../shared/components/ui'
import CreateBookModal from './components/CreateBookModal'

// ── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins}分鐘前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小時前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

function formatDate(d: Date): string {
  const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`
}

// ── BookCard ─────────────────────────────────────────────────────────────────

function BookCard({ book, onOpen, onRename, onDelete }: {
  book: ShelfBook
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="relative bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col overflow-hidden"
      style={{ height: 500 }}
      onClick={onOpen}
    >
      {/* Cover area */}
      <div className="flex-1 bg-gradient-to-br from-accent-soft to-cover-light flex items-center justify-center">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="12" y="8" width="40" height="48" rx="4" fill="var(--color-cover)"/>
          <rect x="16" y="12" width="32" height="3" rx="1.5" fill="white" opacity="0.6"/>
          <rect x="16" y="18" width="24" height="2" rx="1" fill="white" opacity="0.4"/>
          <rect x="16" y="23" width="28" height="2" rx="1" fill="white" opacity="0.4"/>
        </svg>
      </div>

      {/* Bottom info */}
      <div className="px-5 py-4 flex flex-col gap-1">
        <h3 className="card-title truncate">{book.title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-secondary">{t('shelf.last_edited')}{relativeTime(book.updatedAt)}</span>
          <button
            className="text-xs text-muted hover:text-primary font-medium focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={(e) => { e.stopPropagation(); onOpen() }}
          >
            {t('shelf.open_edit')}
          </button>
        </div>
      </div>

      {/* Three-dot menu */}
      <button
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm"
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
        aria-label={t('shelf.more_options')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3" r="1.5" fill="var(--color-muted)"/>
          <circle cx="8" cy="8" r="1.5" fill="var(--color-muted)"/>
          <circle cx="8" cy="13" r="1.5" fill="var(--color-muted)"/>
        </svg>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
          <div
            className="absolute top-12 right-3 z-20 bg-white rounded-xl shadow-lg border border-gray-100 min-w-[120px] py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-gray-50"
              onClick={() => { setMenuOpen(false); onRename() }}
            >
              {t('shelf.rename')}
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
              onClick={() => { setMenuOpen(false); onDelete() }}
            >
              {t('shelf.delete')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── NewBookCard ───────────────────────────────────────────────────────────────

function NewBookCard({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      className="bg-accent-light rounded-3xl border-2 border-dashed border-cover flex flex-col items-center justify-center gap-4 hover:bg-accent-soft transition-colors"
      style={{ height: 500 }}
      onClick={onClick}
    >
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 6h12l4 4v16H8V6z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M16 12v8M12 16h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-muted">{t('shelf.new_story')}</p>
        <p className="text-sm text-secondary mt-1">{t('shelf.click_to_start')}</p>
      </div>
    </button>
  )
}

// ── RenameModal ───────────────────────────────────────────────────────────────

function RenameModal({ book, onClose, onSave }: {
  book: ShelfBook
  onClose: () => void
  onSave: (title: string) => void
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(book.title)
  return (
    <Modal open onClose={onClose} title={t('shelf.rename_title')}>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="flex gap-3 justify-end mt-5">
        <Button variant="ghost" onClick={onClose}>{t('shelf.cancel')}</Button>
        <Button onClick={() => title.trim() && onSave(title.trim())} disabled={!title.trim()}>{t('shelf.save')}</Button>
      </div>
    </Modal>
  )
}

// ── TopNav ────────────────────────────────────────────────────────────────────

function TopNav() {
  const { t } = useTranslation()
  return (
    <nav className="bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center gap-4 sticky top-0 z-30">
      <span
        className="font-black text-xl md:text-[32px] text-primary tracking-tight mr-2 md:mr-6"
        style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
      >
        Power write
      </span>
      <div className="flex-1" />
      {/* Notification bell */}
      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 0 0-6-6z" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8 16.5a2 2 0 0 0 4 0" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">{t('shelf.user')}</span>
        <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent font-bold text-sm">U</div>
      </div>
    </nav>
  )
}

// ── ShelfContent ──────────────────────────────────────────────────────────────

function ShelfContent() {
  const { t } = useTranslation()
  const { books, loading, error, setBooks, setLoading, setError, removeBook, updateBook } = useShelfStore()
  const [showCreate, setShowCreate] = useState(false)
  const [renaming, setRenaming] = useState<ShelfBook | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadShelf() {
      const token = getAccessToken()
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const rootId = await findOrCreateRootFolder(token)
        const folders = await listChildren(token, rootId, "mimeType='application/vnd.google-apps.folder'")

        const shelfBooks: ShelfBook[] = []
        await Promise.all(
          folders.map(async (folder) => {
            try {
              const children = await listChildren(token, folder.id, "name='project.json'")
              if (children.length === 0) return
              const projectFileId = children[0].id
              const project = await loadProject(token, projectFileId)
              shelfBooks.push({
                id: folder.id,
                title: project.title,
                coverAssetId: project.coverAssetId,
                updatedAt: project.updatedAt,
                projectFileId,
              })
            } catch {
              // skip folders that can't be read
            }
          })
        )

        shelfBooks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        setBooks(shelfBooks)
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗')
      } finally {
        setLoading(false)
      }
    }

    loadShelf()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete(book: ShelfBook) {
    if (!window.confirm(`確定要刪除「${book.title}」嗎？此操作無法復原。`)) return
    const token = getAccessToken()
    if (!token) return
    try {
      await trashFile(token, book.id)
      removeBook(book.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  async function handleRename(book: ShelfBook, newTitle: string) {
    const token = getAccessToken()
    if (!token) return
    try {
      const text = await downloadText(token, book.projectFileId)
      const project = JSON.parse(text)
      project.title = newTitle
      project.updatedAt = new Date().toISOString()
      await updateFileContent(token, book.projectFileId, JSON.stringify(project))
      updateBook(book.id, { title: newTitle, updatedAt: project.updatedAt })
    } catch (err) {
      alert(err instanceof Error ? err.message : '重新命名失敗')
    }
    setRenaming(null)
  }

  const today = new Date()

  return (
    <div className="min-h-screen bg-surface" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      <TopNav />

      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        {/* Header row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm text-secondary mb-1">{formatDate(today)}</p>
            <h1 className="page-title">{t('shelf.title')}</h1>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            {t('shelf.new_book')}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
<Spinner size="md" />
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={() => navigate(`/book/${book.id}`)}
                onRename={() => setRenaming(book)}
                onDelete={() => handleDelete(book)}
              />
            ))}
            <NewBookCard onClick={() => setShowCreate(true)} />
          </div>
        )}
      </main>

      {showCreate && <CreateBookModal onClose={() => setShowCreate(false)} />}
      {renaming && (
        <RenameModal
          book={renaming}
          onClose={() => setRenaming(null)}
          onSave={(title) => handleRename(renaming, title)}
        />
      )}
    </div>
  )
}

// ── ShelfPage (wrapped in RequireAuth) ────────────────────────────────────────

export default function ShelfPage() {
  return (
    <RequireAuth>
      <ShelfContent />
    </RequireAuth>
  )
}
