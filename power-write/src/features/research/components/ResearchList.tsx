import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { ResearchItem, Project } from '../../../shared/types/project'
import { getAccessToken } from '../../../shared/stores/authStore'
import { useShelfStore } from '../../shelf/shelfStore'
import { loadProject, saveProject } from '../../../shared/services/projectRepo'
import { getImageUrl } from '../../../shared/services/assets'
import { Button, Modal, Badge } from '../../../shared/components/ui'
import ResearchModal from './ResearchModal'

const imageStyles = {
  placeholder: 'w-full h-full flex items-center justify-center bg-accent-light',
}

const cardStyles = {
  root: 'break-inside-avoid bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 mb-4',
  imageWrap: 'w-full aspect-video overflow-hidden bg-accent-light',
  body: 'p-4',
  description: 'text-sm text-secondary line-clamp-3 mb-2',
  tagRow: 'flex flex-wrap gap-1.5 mb-2',
  tagBtn: 'hover:opacity-80 transition-opacity',
  sourceUrl: 'text-xs text-placeholder hover:text-muted truncate block',
}

const pageStyles = {
  root: 'p-8',
  topBar: 'flex items-center justify-between mb-6 gap-4 flex-wrap',
  filterPill: 'flex items-center gap-1.5 bg-accent-light rounded-full px-3 py-1',
  filterTag: 'text-sm text-accent',
  filterRemove: 'text-placeholder hover:text-danger text-xs ml-0.5',
  cardWrap: 'group relative',
  deleteBtn: 'absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 shadow text-placeholder hover:text-danger hidden group-hover:flex items-center justify-center text-sm transition-colors',
  empty: 'flex flex-col items-center justify-center h-48 text-placeholder gap-2',
  emptyText: 'text-sm',
  loadingState: 'flex items-center justify-center h-64 text-placeholder text-sm',
  errorState: 'flex items-center justify-center h-64 text-danger text-sm',
  deleteMsg: 'text-sm text-secondary mb-6',
  deleteActions: 'flex justify-end gap-3',
}

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
    <div className={imageStyles.placeholder}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="3" y="7" width="26" height="18" rx="2" stroke="var(--color-placeholder)" strokeWidth="1.5" />
        <circle cx="11" cy="13" r="2.5" stroke="var(--color-placeholder)" strokeWidth="1.5" />
        <path d="M3 22l7-5 5 4 4-3 10 7" stroke="var(--color-placeholder)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
    <div className={cardStyles.root} onClick={onClick}>
      <div className={cardStyles.imageWrap}>
        <ResearchImage assetId={item.imageAssetId} />
      </div>
      <div className={cardStyles.body}>
        <h3 className="card-title mb-1 truncate">{item.title}</h3>
        {item.description && (
          <p className={cardStyles.description}>{item.description}</p>
        )}
        {item.tags.length > 0 && (
          <div className={cardStyles.tagRow}>
            {item.tags.map((tag, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); onTagClick(tag) }} className={cardStyles.tagBtn}>
                <Badge>{tag}</Badge>
              </button>
            ))}
          </div>
        )}
        {item.sourceUrl && (
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={cardStyles.sourceUrl}>
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
    return <div className={pageStyles.loadingState}>載入中…</div>
  }

  if (error || !project) {
    return <div className={pageStyles.errorState}>{error ?? '找不到專案'}</div>
  }

  return (
    <div className={pageStyles.root}>
      <div className={pageStyles.topBar}>
        <h1 className="page-title">研究素材與資料庫</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {filterTag && (
            <div className={pageStyles.filterPill}>
              <span className={pageStyles.filterTag}>#{filterTag}</span>
              <button onClick={() => setFilterTag(null)} className={pageStyles.filterRemove}>×</button>
            </div>
          )}
          <Button onClick={() => setModalItem(null)}>
            <span className="text-base leading-none">＋</span>
            新增素材
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={pageStyles.empty}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="9" width="32" height="22" rx="3" stroke="var(--color-stroke-empty)" strokeWidth="1.5" />
            <circle cx="13" cy="17" r="3" stroke="var(--color-stroke-empty)" strokeWidth="1.5" />
            <path d="M4 27l9-6 6 5 5-4 12 9" stroke="var(--color-stroke-empty)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={pageStyles.emptyText}>
            {filterTag ? `標籤「${filterTag}」下無素材` : '尚無素材，點擊「＋ 新增素材」開始'}
          </span>
        </div>
      ) : (
        <div style={{ columns: '3', gap: '1rem' }}>
          {filtered.map((item) => (
            <div key={item.id} className={pageStyles.cardWrap}>
              <ResearchCard item={item} onTagClick={handleTagClick} onClick={() => setModalItem(item)} />
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }}
                className={pageStyles.deleteBtn}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {modalItem !== undefined && (
        <ResearchModal
          item={modalItem}
          bookFolderId={book?.id ?? ''}
          totalItems={project.research?.length ?? 0}
          onSave={handleSave}
          onClose={() => setModalItem(undefined)}
        />
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="刪除素材">
        <p className={pageStyles.deleteMsg}>
          確定要刪除「{deleteTarget?.title}」嗎？此操作無法復原。
        </p>
        <div className={pageStyles.deleteActions}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)}>刪除</Button>
        </div>
      </Modal>
    </div>
  )
}
