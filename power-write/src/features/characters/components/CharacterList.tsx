import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Character, Project } from '../../../shared/types/project'
import { getAccessToken } from '../../../shared/stores/authStore'
import { useShelfStore } from '../../shelf/shelfStore'
import { loadProject, saveProject } from '../../../shared/services/projectRepo'
import { getImageUrl } from '../../../shared/services/assets'
import { Button, Modal, Badge } from '../../../shared/components/ui'
import CharacterModal from './CharacterModal'

const portraitStyles = {
  placeholder: 'w-full h-full flex items-center justify-center bg-accent-light',
}

const cardStyles = {
  root: 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150',
  portrait: 'h-48 overflow-hidden bg-accent-light',
  body: 'p-4',
  nameRow: 'flex items-center gap-2 mb-1',
  aliases: 'text-xs text-placeholder mb-2 truncate',
  description: 'text-sm text-secondary line-clamp-2',
}

const pageStyles = {
  root: 'p-8',
  topBar: 'flex items-center justify-between mb-6 gap-4 flex-wrap',
  filterBar: 'flex items-center bg-accent-light rounded-full p-1 gap-1',
  filterBtn: (active: boolean) =>
    `px-3 py-1 rounded-full text-sm font-medium transition-colors ${
      active ? 'bg-muted text-white' : 'text-muted hover:bg-accent-softer'
    }`,
  grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5',
  cardWrap: 'group relative',
  deleteBtn: 'absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 shadow text-placeholder hover:text-danger hidden group-hover:flex items-center justify-center text-sm transition-colors',
  empty: 'flex flex-col items-center justify-center h-48 text-placeholder gap-2',
  emptyText: 'text-sm',
  loadingState: 'flex items-center justify-center h-64 text-placeholder text-sm',
  errorState: 'flex items-center justify-center h-64 text-danger text-sm',
  deleteMsg: 'text-sm text-secondary mb-6',
  deleteActions: 'flex justify-end gap-3',
}

// ─── Portrait card component ─────────────────────────────────────────────────

function PortraitImage({ assetId }: { assetId: string | null }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!assetId) return
    const token = getAccessToken()
    if (!token) return
    getImageUrl(token, assetId).then(setUrl).catch(() => setUrl(null))
  }, [assetId])

  if (url) {
    return <img src={url} alt="portrait" className="w-full h-full object-cover" />
  }
  return (
    <div className={portraitStyles.placeholder}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="15" r="7" stroke="var(--color-placeholder)" strokeWidth="1.5" />
        <path d="M4 36c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="var(--color-placeholder)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ─── Character card ──────────────────────────────────────────────────────────

function CharacterCard({
  character,
  onClick,
}: {
  character: Character
  onClick: () => void
}) {
  return (
    <div onClick={onClick} className={cardStyles.root}>
      <div className={cardStyles.portrait}>
        <PortraitImage assetId={character.portraitAssetId} />
      </div>
      <div className={cardStyles.body}>
        <div className={cardStyles.nameRow}>
          <h3 className="card-title truncate">{character.name}</h3>
          {character.label && <Badge>{character.label}</Badge>}
        </div>
        {character.aliases.length > 0 && (
          <p className={cardStyles.aliases}>
            {character.aliases.slice(0, 2).join('、')}
            {character.aliases.length > 2 && ` +${character.aliases.length - 2}`}
          </p>
        )}
        {character.description && (
          <p className={cardStyles.description}>{character.description}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main list ───────────────────────────────────────────────────────────────

export default function CharacterList() {
  const { bookId } = useParams<{ bookId: string }>()
  const books = useShelfStore((s) => s.books)
  const book = books.find((b) => b.id === bookId)

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterLabel, setFilterLabel] = useState<string>('全部')
  const [modalChar, setModalChar] = useState<Character | null | undefined>(undefined) // undefined = closed
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null)

  // Load project
  useEffect(() => {
    if (!book) return
    const token = getAccessToken()
    if (!token) { setError('未登入'); setLoading(false); return }
    setLoading(true)
    loadProject(token, book.projectFileId)
      .then(setProject)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [book])

  // Derived label tabs
  const labelTabs = useMemo(() => {
    if (!project) return ['全部']
    const labels = Array.from(
      new Set(project.characters.map((c) => c.label).filter(Boolean)),
    )
    return ['全部', ...labels]
  }, [project])

  // Filtered characters
  const filtered = useMemo(() => {
    if (!project) return []
    const chars = [...project.characters].sort((a, b) => a.order - b.order)
    if (filterLabel === '全部') return chars
    return chars.filter((c) => c.label === filterLabel)
  }, [project, filterLabel])

  async function handleSave(updated: Character) {
    if (!project || !book) return
    const token = getAccessToken()
    if (!token) return

    const idx = project.characters.findIndex((c) => c.id === updated.id)
    const newChars =
      idx >= 0
        ? project.characters.map((c) => (c.id === updated.id ? updated : c))
        : [...project.characters, updated]

    const newProject = { ...project, characters: newChars }
    setProject(newProject)
    setModalChar(undefined)
    await saveProject(token, newProject)
  }

  async function handleDelete(char: Character) {
    if (!project || !book) return
    const token = getAccessToken()
    if (!token) return

    const newChars = project.characters
      .filter((c) => c.id !== char.id)
      .map((c, i) => ({ ...c, order: i }))
    const newProject = { ...project, characters: newChars }
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
        <h1 className="page-title">角色資料</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className={pageStyles.filterBar}>
            {labelTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterLabel(tab)}
                className={pageStyles.filterBtn(filterLabel === tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <Button onClick={() => setModalChar(null)}>
            <span className="text-base leading-none">＋</span>
            新增角色
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={pageStyles.empty}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="14" r="8" stroke="var(--color-stroke-empty)" strokeWidth="1.5" />
            <path d="M4 36c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="var(--color-stroke-empty)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className={pageStyles.emptyText}>
            {filterLabel === '全部' ? '尚無角色，點擊「＋ 新增角色」開始' : `「${filterLabel}」分類下無角色`}
          </span>
        </div>
      ) : (
        <div className={pageStyles.grid}>
          {filtered.map((char) => (
            <div key={char.id} className={pageStyles.cardWrap}>
              <CharacterCard character={char} onClick={() => setModalChar(char)} />
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(char) }}
                className={pageStyles.deleteBtn}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {modalChar !== undefined && (
        <CharacterModal
          character={modalChar}
          bookFolderId={book?.id ?? ''}
          totalCharacters={project.characters.length}
          onSave={handleSave}
          onClose={() => setModalChar(undefined)}
        />
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="刪除角色">
        <p className={pageStyles.deleteMsg}>
          確定要刪除「{deleteTarget?.name}」嗎？此操作無法復原。
        </p>
        <div className={pageStyles.deleteActions}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)}>刪除</Button>
        </div>
      </Modal>
    </div>
  )
}
