import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RequireAuth } from '../../services/auth'
import { findOrCreateRootFolder, listChildren, trashFile, downloadText, updateFileContent } from '../../services/drive'
import { loadProject } from '../../services/projectRepo'
import { getAccessToken } from '../../stores/authStore'
import { useShelfStore } from '../../stores/shelfStore'
import type { ShelfBook } from '../../stores/shelfStore'
import CreateBookModal from './CreateBookModal'

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
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="relative bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col overflow-hidden"
      style={{ height: 500 }}
      onClick={onOpen}
    >
      {/* Cover area */}
      <div className="flex-1 bg-gradient-to-br from-[#e8eaff] to-[#d4d8f5] flex items-center justify-center">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="12" y="8" width="40" height="48" rx="4" fill="#b0b8f0"/>
          <rect x="16" y="12" width="32" height="3" rx="1.5" fill="white" opacity="0.6"/>
          <rect x="16" y="18" width="24" height="2" rx="1" fill="white" opacity="0.4"/>
          <rect x="16" y="23" width="28" height="2" rx="1" fill="white" opacity="0.4"/>
        </svg>
      </div>

      {/* Bottom info */}
      <div className="px-5 py-4 flex flex-col gap-1">
        <h3 className="text-lg font-medium text-[#181c1e] truncate">{book.title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#6d6d6d]">最後編輯：{relativeTime(book.updatedAt)}</span>
          <button
            className="text-xs text-[#4c5354] hover:text-[#181c1e] font-medium"
            onClick={(e) => { e.stopPropagation(); onOpen() }}
          >
            開啟編輯 →
          </button>
        </div>
      </div>

      {/* Three-dot menu */}
      <button
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm"
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
        aria-label="更多選項"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3" r="1.5" fill="#4c5354"/>
          <circle cx="8" cy="8" r="1.5" fill="#4c5354"/>
          <circle cx="8" cy="13" r="1.5" fill="#4c5354"/>
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
              className="w-full text-left px-4 py-2 text-sm text-[#181c1e] hover:bg-gray-50"
              onClick={() => { setMenuOpen(false); onRename() }}
            >
              重新命名
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
              onClick={() => { setMenuOpen(false); onDelete() }}
            >
              刪除
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── NewBookCard ───────────────────────────────────────────────────────────────

function NewBookCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="bg-[#f2f4ff] rounded-3xl border-2 border-dashed border-[#b0b8f0] flex flex-col items-center justify-center gap-4 hover:bg-[#e8eaff] transition-colors"
      style={{ height: 500 }}
      onClick={onClick}
    >
      <div className="w-16 h-16 rounded-full bg-[#7c6ee0] flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 6h12l4 4v16H8V6z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M16 12v8M12 16h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-[#4c5354]">展開新的故事</p>
        <p className="text-sm text-[#6d6d6d] mt-1">點擊此處開始</p>
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
  const [title, setTitle] = useState(book.title)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8">
        <h2 className="text-lg font-bold text-[#181c1e] mb-5">重新命名</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#181c1e] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30"
          autoFocus
        />
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-medium text-[#4c5354] hover:bg-gray-100">取消</button>
          <button
            onClick={() => title.trim() && onSave(title.trim())}
            disabled={!title.trim()}
            className="px-5 py-2.5 rounded-full text-sm font-medium bg-[#181c1e] text-white hover:bg-[#2e3538] disabled:opacity-50"
          >儲存</button>
        </div>
      </div>
    </div>
  )
}

// ── TopNav ────────────────────────────────────────────────────────────────────

function TopNav() {
  return (
    <nav className="bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4 sticky top-0 z-30">
      <span
        className="font-black text-[32px] text-[#181c1e] tracking-tight mr-6"
        style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
      >
        Power write
      </span>
      <div className="flex-1" />
      {/* Notification bell */}
      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 0 0-6-6z" stroke="#181c1e" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8 16.5a2 2 0 0 0 4 0" stroke="#181c1e" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#4c5354]">使用者</span>
        <div className="w-8 h-8 rounded-full bg-[#e8eaff] flex items-center justify-center text-[#7c6ee0] font-bold text-sm">U</div>
      </div>
    </nav>
  )
}

// ── ShelfContent ──────────────────────────────────────────────────────────────

function ShelfContent() {
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
    <div className="min-h-screen bg-[#f8f8f8]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      <TopNav />

      <main className="max-w-[1280px] mx-auto px-8 py-10">
        {/* Header row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm text-[#6d6d6d] mb-1">{formatDate(today)}</p>
            <h1 className="text-[28px] font-bold text-[#181c1e]">我的作品集</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-[#181c1e] text-white text-sm font-medium rounded-full hover:bg-[#2e3538] transition-colors"
          >
            建立新作品
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-[#4c5354]/30 border-t-[#4c5354] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 384px))' }}>
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={() => navigate(`/book/${book.id}/manuscript`)}
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
