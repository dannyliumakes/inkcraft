import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project, Chapter } from '../../shared/types/project'
import { createTextFile, trashFile } from '../../shared/services/drive'
import { saveProject } from '../../shared/services/projectRepo'
import { getAccessToken } from '../../shared/stores/authStore'
import { Input } from '../../shared/components/ui'

interface Props {
  project: Project
  activeChapterId: string | null
  onSelectChapter: (ch: Chapter) => void
  onProjectUpdate: (p: Project) => void
}

const styles = {
  root: 'flex flex-col h-full',
  header: 'flex items-center gap-1 px-3 py-2 border-b border-gray-100',
  headerLabel: 'text-xs font-semibold text-placeholder flex-1 uppercase tracking-wide',
  headerBtn: 'w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-placeholder',
  list: 'flex-1 overflow-y-auto',
  emptyMsg: 'text-xs text-placeholder text-center mt-6 px-3',
  item: (isActive: boolean) =>
    `group flex items-center gap-1 px-3 py-2 cursor-pointer select-none text-sm ${
      isActive ? 'bg-accent-softer text-muted font-medium' : 'hover:bg-gray-50 text-secondary'
    }`,
  itemTitle: 'flex-1 truncate',
  itemWordCount: 'text-xs text-placeholder shrink-0',
  itemActions: 'hidden group-hover:flex items-center gap-0.5 shrink-0',
  actionBtn: 'w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-placeholder',
  actionBtnDisabled: 'w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-placeholder disabled:opacity-30',
  deleteBtn: 'w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-placeholder hover:text-danger',
}

export default function ChapterTree({ project, activeChapterId, onSelectChapter, onProjectUpdate }: Props) {
  const { t } = useTranslation()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const sorted = [...project.chapters].sort((a, b) => a.order - b.order)

  async function handleAddChapter() {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    try {
      const newId = `ch_${Date.now()}`
      const newOrder = sorted.length > 0 ? sorted[sorted.length - 1].order + 1 : 1
      const title = `第${newOrder}章`
      const fileId = await createTextFile(token, `${newId}.md`, project.manuscriptFolderId, '', 'text/markdown')
      const newChapter: Chapter = { id: newId, title, order: newOrder, fileId, wordCount: 0, rev: 0 }
      const updated: Project = {
        ...project,
        chapters: [...project.chapters, newChapter],
        updatedAt: new Date().toISOString(),
        rev: project.rev + 1,
      }
      await saveProject(token, updated)
      onProjectUpdate(updated)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteChapter(ch: Chapter) {
    if (!window.confirm(`確定要刪除「${ch.title}」嗎？`)) return
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    try {
      await trashFile(token, ch.fileId)
      const updated: Project = {
        ...project,
        chapters: project.chapters.filter((c) => c.id !== ch.id),
        updatedAt: new Date().toISOString(),
        rev: project.rev + 1,
      }
      await saveProject(token, updated)
      onProjectUpdate(updated)
    } finally {
      setLoading(false)
    }
  }

  async function handleRename(ch: Chapter) {
    const token = getAccessToken()
    if (!token) return
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((c) => c.id === ch.id ? { ...c, title: editingTitle } : c),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    await saveProject(token, updated)
    onProjectUpdate(updated)
    setEditingId(null)
  }

  async function handleMove(ch: Chapter, dir: 'up' | 'down') {
    const idx = sorted.findIndex((c) => c.id === ch.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const token = getAccessToken()
    if (!token) return

    const swapCh = sorted[swapIdx]
    const updatedChapters = project.chapters.map((c) => {
      if (c.id === ch.id) return { ...c, order: swapCh.order }
      if (c.id === swapCh.id) return { ...c, order: ch.order }
      return c
    })
    const updated: Project = {
      ...project,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    await saveProject(token, updated)
    onProjectUpdate(updated)
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{t('chapter_tree.header')}</span>
        <button title={t('chapter_tree.add_folder')} className={styles.headerBtn} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7.5v3M6.5 9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
        <button title={t('chapter_tree.add_chapter')} className={styles.headerBtn} onClick={handleAddChapter} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 2h5l3 3v9H4V2z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7v4M6 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.list}>
        {sorted.length === 0 && (
          <p className={styles.emptyMsg}>{t('chapter_tree.empty')}</p>
        )}
        {sorted.map((ch, idx) => (
          <div key={ch.id} className={styles.item(activeChapterId === ch.id)} onClick={() => onSelectChapter(ch)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0 text-placeholder">
              <rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3 4h7M3 6.5h5M3 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>

            {editingId === ch.id ? (
              <Input
                className="flex-1 text-sm"
                value={editingTitle}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleRename(ch)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(ch)
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
            ) : (
              <span className={styles.itemTitle}>{ch.title}</span>
            )}

            <span className={styles.itemWordCount}>{ch.wordCount > 0 ? `${ch.wordCount}${t('chapter_tree.word_count_unit')}` : ''}</span>

            <div className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
              <button
                title={t('chapter_tree.rename')}
                className={styles.actionBtn}
                onClick={() => { setEditingId(ch.id); setEditingTitle(ch.title) }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1 9.5h9M7.5 1.5l2 2L3 10H1V8L7.5 1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                </svg>
              </button>
              <button title={t('chapter_tree.move_up')} disabled={idx === 0} className={styles.actionBtnDisabled} onClick={() => handleMove(ch, 'up')}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button title={t('chapter_tree.move_down')} disabled={idx === sorted.length - 1} className={styles.actionBtnDisabled} onClick={() => handleMove(ch, 'down')}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 2v6M8 5l-3 3-3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button title={t('chapter_tree.delete')} className={styles.deleteBtn} onClick={() => handleDeleteChapter(ch)}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2.5h6M4 2.5V1.5h2v1M4.5 4.5v3M5.5 4.5v3M2.5 2.5l.5 6h4l.5-6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
