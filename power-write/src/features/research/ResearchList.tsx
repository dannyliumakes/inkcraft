import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { ResearchItem, Project } from '../../types/project'
import { getAccessToken } from '../../stores/authStore'
import { useShelfStore } from '../../stores/shelfStore'
import { loadProject, saveProject } from '../../services/projectRepo'
import { getImageUrl } from '../../services/assets'
import ResearchModal from './ResearchModal'

// ─── Image component ──────────────────────────────────────────────────────────

function ResearchImage({ assetId }: { assetId: string | null }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!assetId) return
    const token = getAccessToken()
    if (!token) return
    getImageUrl(token, assetId).then(setUrl).catch(() => setUrl(null))
  }, [assetId])

  if (url) {
    return <img src={url} alt="research" className="w-full h-full object-cover" />
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#f2f4ff]">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="3" y="7" width="26" height="18" rx="2" stroke="#a0aec0" strokeWidth="1.5" />
        <circle cx="11" cy="13" r="2.5" stroke="#a0aec0" strokeWidth="1.5" />
        <path d="M3 22l7-5 5 4 4-3 10 7" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ResearchCard({
  item,
  onTagClick,
  onClick,
}: {
  item: ResearchItem
  onTagClick: (tag: string) => void
  onClick: () => void
}) {
  return (
    <div
      className="break-inside-avoid bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 mb-4"
      onClick={onClick}
    >
      {/* Image — 16:9 */}
      <div className="w-full aspect-video overflow-hidden bg-[#f2f4ff]">
        <ResearchImage assetId={item.imageAssetId} />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[#181c1e] text-base mb-1 truncate">{item.title}</h3>

        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-3 mb-2">{item.description}</p>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {item.tags.map((tag, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); onTagClick(tag) }}
                className="text-xs bg-[#e8eaff] text-[#7c6ee0] rounded-full px-2.5 py-0.5 hover:bg-[#d0d4ff] transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-400 hover:text-gray-600 truncate block"
          >
            {item.sourceUrl}
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Main list ────────────────────────────────────────────────────────────────

export default function ResearchList() {
  const { bookId } = useParams<{ bookId: string }>()
  const books = useShelfStore((s) => s.books)
  const book = books.find((b) => b.id === bookId)

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [modalItem, setModalItem] = useState<ResearchItem | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<ResearchItem | null>(null)

  // Load project
  useEffect(() => {
    if (!book) return
    const token = getAccessToken()
    if (!token) { setError('未登入'); setLoading(false); return }
    setLoading(true)
    loadProject(token, book.projectFileId)
      .then((p) => {
        // Ensure research array exists (backward compat)
        setProject({ ...p, research: p.research ?? [] })
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [book])

  // Filtered items
  const filtered = useMemo(() => {
    if (!project) return []
    const items = [...(project.research ?? [])].sort((a, b) => a.order - b.order)
    if (!filterTag) return items
    return items.filter((r) => r.tags.includes(filterTag))
  }, [project, filterTag])

  function handleTagClick(tag: string) {
    setFilterTag((prev) => (prev === tag ? null : tag))
  }

  async function handleSave(updated: ResearchItem) {
    if (!project || !book) return
    const token = getAccessToken()
    if (!token) return

    const research = project.research ?? []
    const idx = research.findIndex((r) => r.id === updated.id)
    const newResearch =
      idx >= 0
        ? research.map((r) => (r.id === updated.id ? updated : r))
        : [...research, updated]

    const newProject = { ...project, research: newResearch }
    setProject(newProject)
    setModalItem(undefined)
    await saveProject(token, newProject)
  }

  async function handleDelete(target: ResearchItem) {
    if (!project || !book) return
    const token = getAccessToken()
    if (!token) return

    const newResearch = (project.research ?? [])
      .filter((r) => r.id !== target.id)
      .map((r, i) => ({ ...r, order: i }))
    const newProject = { ...project, research: newResearch }
    setProject(newProject)
    setDeleteTarget(null)
    await saveProject(token, newProject)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">載入中…</div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm">
        {error ?? '找不到專案'}
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-[#181c1e]">研究素材與資料庫</h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tag filter */}
          {filterTag && (
            <div className="flex items-center gap-1.5 bg-[#f2f4ff] rounded-full px-3 py-1">
              <span className="text-sm text-[#7c6ee0]">#{filterTag}</span>
              <button
                onClick={() => setFilterTag(null)}
                className="text-gray-400 hover:text-red-400 text-xs ml-0.5"
              >
                ×
              </button>
            </div>
          )}

          {/* Add button */}
          <button
            onClick={() => setModalItem(null)}
            className="flex items-center gap-1.5 bg-[#4c5354] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#3a4041] transition-colors"
          >
            <span className="text-base leading-none">＋</span>
            新增素材
          </button>
        </div>
      </div>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="9" width="32" height="22" rx="3" stroke="#cbd5e0" strokeWidth="1.5" />
            <circle cx="13" cy="17" r="3" stroke="#cbd5e0" strokeWidth="1.5" />
            <path d="M4 27l9-6 6 5 5-4 12 9" stroke="#cbd5e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm">
            {filterTag ? `標籤「${filterTag}」下無素材` : '尚無素材，點擊「＋ 新增素材」開始'}
          </span>
        </div>
      ) : (
        <div style={{ columns: '3', gap: '1rem' }}>
          {filtered.map((item) => (
            <div key={item.id} className="group relative">
              <ResearchCard
                item={item}
                onTagClick={handleTagClick}
                onClick={() => setModalItem(item)}
              />
              {/* Delete button — appears on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 shadow text-gray-400 hover:text-red-500 hidden group-hover:flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Research modal */}
      {modalItem !== undefined && (
        <ResearchModal
          item={modalItem}
          bookFolderId={book?.id ?? ''}
          totalItems={project.research?.length ?? 0}
          onSave={handleSave}
          onClose={() => setModalItem(undefined)}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-[#181c1e] mb-2">刪除素材</h3>
            <p className="text-sm text-gray-500 mb-5">
              確定要刪除「{deleteTarget.title}」嗎？此操作無法復原。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-[#4c5354] hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
