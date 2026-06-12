import { useState } from 'react'
import type { Project, Chapter } from '../../types/project'
import { createTextFile, trashFile } from '../../services/drive'
import { saveProject } from '../../services/projectRepo'
import { getAccessToken } from '../../stores/authStore'

interface Props {
  project: Project
  activeChapterId: string | null
  onSelectChapter: (ch: Chapter) => void
  onProjectUpdate: (p: Project) => void
}

export default function ChapterTree({ project, activeChapterId, onSelectChapter, onProjectUpdate }: Props) {
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 flex-1 uppercase tracking-wide">目錄結構</span>
        <button
          title="新增資料夾"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400"
          disabled={loading}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7.5v3M6.5 9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          title="新增章節"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400"
          onClick={handleAddChapter}
          disabled={loading}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 2h5l3 3v9H4V2z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7v4M6 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-6 px-3">尚無章節，點擊上方按鈕新增</p>
        )}
        {sorted.map((ch, idx) => (
          <div
            key={ch.id}
            className={`group flex items-center gap-1 px-3 py-2 cursor-pointer select-none text-sm ${
              activeChapterId === ch.id
                ? 'bg-[#eef0ff] text-[#4c5354] font-medium'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            onClick={() => onSelectChapter(ch)}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0 text-gray-300">
              <rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3 4h7M3 6.5h5M3 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>

            {editingId === ch.id ? (
              <input
                className="flex-1 text-sm border border-[#7c6ee0] rounded px-1 outline-none"
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
              <span className="flex-1 truncate">{ch.title}</span>
            )}

            <span className="text-xs text-gray-400 shrink-0">{ch.wordCount > 0 ? `${ch.wordCount}字` : ''}</span>

            {/* Hover actions */}
            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                title="重命名"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400"
                onClick={() => { setEditingId(ch.id); setEditingTitle(ch.title) }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1 9.5h9M7.5 1.5l2 2L3 10H1V8L7.5 1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                title="上移"
                disabled={idx === 0}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 disabled:opacity-30"
                onClick={() => handleMove(ch, 'up')}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                title="下移"
                disabled={idx === sorted.length - 1}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 disabled:opacity-30"
                onClick={() => handleMove(ch, 'down')}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 2v6M8 5l-3 3-3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                title="刪除"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-400"
                onClick={() => handleDeleteChapter(ch)}
              >
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
