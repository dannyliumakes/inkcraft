import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import CharacterCount from '@tiptap/extension-character-count'

import { useManuscriptStore } from '../../stores/manuscriptStore'
import { getAccessToken } from '../../stores/authStore'
import { useShelfStore } from '../../stores/shelfStore'
import {
  downloadText,
  updateFileContent,
  getHeadRevisionId,
} from '../../services/drive'
import { saveProject, loadProject } from '../../services/projectRepo'
import { takeSnapshot } from '../../services/wordSnapshot'
import { countWords } from '../../lib/wordCount'
import ChapterTree from './ChapterTree'
import type { Chapter, Project, Todo } from '../../types/project'

// ─── helpers ────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fmtTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Save-status tag ────────────────────────────────────────────────────────

function SaveTag({
  status,
  lastSavedAt,
  onRetry,
}: {
  status: string
  lastSavedAt: Date | null
  onRetry: () => void
}) {
  const { t } = useTranslation()
  if (status === 'idle') return null
  if (status === 'typing') return <span className="text-xs text-gray-400">{t('save.typing')}</span>
  if (status === 'saving') return <span className="text-xs text-gray-400">{t('save.saving')}</span>
  if (status === 'saved')
    return (
      <span className="text-xs text-green-600">
        {t('save.saved')} {lastSavedAt ? fmtTime(lastSavedAt) : ''}
      </span>
    )
  if (status === 'error')
    return (
      <button className="text-xs text-red-500 underline focus-visible:ring-2 focus-visible:ring-blue-400" onClick={onRetry}>
        {t('save.error')}
      </button>
    )
  return null
}

// ─── Right column ────────────────────────────────────────────────────────────

function SidePanel({ project, onProjectUpdate }: { project: Project; onProjectUpdate: (p: Project) => void }) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState(project.notes)
  const [newTodo, setNewTodo] = useState('')

  async function saveNotes() {
    const token = getAccessToken()
    if (!token) return
    const updated: Project = { ...project, notes, updatedAt: new Date().toISOString(), rev: project.rev + 1 }
    onProjectUpdate(updated)
    await saveProject(token, updated)
  }

  async function toggleTodo(id: string) {
    const token = getAccessToken()
    if (!token) return
    const updated: Project = {
      ...project,
      todos: project.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    await saveProject(token, updated)
  }

  async function addTodo() {
    if (!newTodo.trim()) return
    const token = getAccessToken()
    if (!token) return
    const todo: Todo = { id: `todo_${Date.now()}`, text: newTodo.trim(), done: false }
    const updated: Project = {
      ...project,
      todos: [...project.todos, todo],
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    setNewTodo('')
    await saveProject(token, updated)
  }

  async function adjustGoal() {
    const val = window.prompt('輸入每日目標字數：', String(project.dailyWordGoal))
    if (!val) return
    const n = parseInt(val, 10)
    if (isNaN(n) || n <= 0) return
    const token = getAccessToken()
    if (!token) return
    const updated: Project = {
      ...project,
      dailyWordGoal: n,
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    await saveProject(token, updated)
  }

  const totalWords = project.chapters.reduce((acc, ch) => acc + ch.wordCount, 0)
  const goal = project.dailyWordGoal || 1000
  const progress = Math.min(100, Math.round((totalWords / goal) * 100))

  return (
    <div className="flex flex-col gap-0 h-full overflow-y-auto">
      {/* Notes */}
      <section className="p-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('manuscript.notes')}</h3>
        <textarea
          className="w-full text-sm text-gray-700 bg-transparent resize-none outline-none min-h-[120px]"
          placeholder={t('manuscript.notes_placeholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
        />
      </section>

      {/* Todos */}
      <section className="p-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('manuscript.todos')}</h3>
        <ul className="space-y-1.5 mb-2">
          {project.todos.map((todo) => (
            <li key={todo.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
                className="accent-[#7c6ee0] w-3.5 h-3.5 shrink-0"
              />
              <span className={`text-sm ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {todo.text}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#7c6ee0]"
            placeholder={t('manuscript.todo_placeholder')}
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
          />
          <button
            className="px-2 py-1 bg-[#7c6ee0] text-white text-xs rounded hover:bg-[#6a5ec8] focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={addTodo}
          >
            {t('manuscript.todo_add')}
          </button>
        </div>
      </section>

      {/* Daily goal */}
      <section className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('manuscript.daily_goal')}</h3>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-700">{totalWords} / {goal} 字</span>
          <button className="text-xs text-[#7c6ee0] hover:underline focus-visible:ring-2 focus-visible:ring-blue-400" onClick={adjustGoal}>
            {t('manuscript.adjust_goal')}
          </button>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7c6ee0] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{t('manuscript.complete_pct', { pct: progress })}</p>
      </section>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ManuscriptPage() {
  const { t } = useTranslation()
  const { bookId } = useParams<{ bookId: string }>()
  const shelf = useShelfStore((s) => s.books)

  const {
    project,
    activeChapterId,
    chapterContent,
    saveStatus,
    lastSavedAt,
    focusMode,
    setProject,
    setActiveChapter,
    setChapterContent,
    setSaveStatus,
    setLastSavedAt,
    toggleFocusMode,
    setHeadRevisionId,
    updateChapterWordCount,
  } = useManuscriptStore()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const projectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')
  const [editingChapterTitle, setEditingChapterTitle] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ── Load project on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return
    const token = getAccessToken()
    if (!token) return

    // Find book in shelf to get projectFileId
    const book = shelf.find((b) => b.id === bookId)
    if (!book) return

    loadProject(token, book.projectFileId).then((p) => {
      setProject(p)
      // Auto-select first chapter
      const first = [...p.chapters].sort((a, b) => a.order - b.order)[0]
      if (first) loadChapter(first, p, token)
    }).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  // ── Load chapter from Drive ──────────────────────────────────────────────
  const loadChapter = useCallback(async (ch: Chapter, _proj: Project, token: string) => {
    setActiveChapter(ch.id)
    setChapterTitle(ch.title)
    setSaveStatus('idle')
    try {
      const [text, revId] = await Promise.all([
        downloadText(token, ch.fileId),
        getHeadRevisionId(token, ch.fileId),
      ])
      setHeadRevisionId(revId)
      setChapterContent(text)
    } catch (e) {
      console.error('Failed to load chapter', e)
    }
  }, [setActiveChapter, setSaveStatus, setHeadRevisionId, setChapterContent])

  // ── Tiptap editor ────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Markdown,
      CharacterCount,
    ],
    content: chapterContent,
    onUpdate: ({ editor: ed }) => {
      setSaveStatus('typing')
      const wc = countWords(ed.getText())
      if (activeChapterId) updateChapterWordCount(activeChapterId, wc)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        triggerSave(ed)
      }, 3000)
    },
  })

  // Update editor content when chapterContent changes (chapter switch)
  useEffect(() => {
    if (editor && chapterContent !== undefined) {
      // Only update if the content actually differs from current markdown
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (editor.storage as any).markdown?.getMarkdown?.() ?? ''
      if (current !== chapterContent) {
        editor.commands.setContent(chapterContent)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterContent])

  // ── Save logic ───────────────────────────────────────────────────────────
  const triggerSave = useCallback(async (ed: typeof editor) => {
    if (!ed) return
    const token = getAccessToken()
    if (!token) return
    const state = useManuscriptStore.getState()
    const { project: proj, activeChapterId: chId, headRevisionId: localRev } = state
    if (!proj || !chId) return

    const ch = proj.chapters.find((c) => c.id === chId)
    if (!ch) return

    // Conflict detection
    try {
      const remoteRev = await getHeadRevisionId(token, ch.fileId)
      if (localRev && remoteRev !== localRev) {
        const overwrite = window.confirm(
          '⚠ 雲端版本已更新，確定要覆蓋嗎？\n按「取消」將重新載入雲端版本。',
        )
        if (!overwrite) {
          const text = await downloadText(token, ch.fileId)
          setChapterContent(text)
          setHeadRevisionId(remoteRev)
          return
        }
      }
    } catch (e) {
      console.error('Conflict check failed', e)
    }

    setSaveStatus('saving')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md = (ed.storage as any).markdown.getMarkdown() as string
    const wc = countWords(ed.getText())

    try {
      await updateFileContent(token, ch.fileId, md)
      const now = new Date()
      setLastSavedAt(now)
      setSaveStatus('saved')

      // Update project.json with new word count
      const updatedProject: Project = {
        ...proj,
        chapters: proj.chapters.map((c) =>
          c.id === chId ? { ...c, wordCount: wc } : c,
        ),
        updatedAt: now.toISOString(),
        rev: proj.rev + 1,
      }
      setProject(updatedProject)

      if (projectDebounceRef.current) clearTimeout(projectDebounceRef.current)
      projectDebounceRef.current = setTimeout(async () => {
        try {
          const snapshotProject = takeSnapshot(updatedProject)
          setProject(snapshotProject)
          await saveProject(token, snapshotProject)
        } catch (e) {
          console.error('Failed to save project.json', e)
        }
      }, 5000)
    } catch (e) {
      console.error('Save failed', e)
      setSaveStatus('error')
    }
  }, [setSaveStatus, setLastSavedAt, setChapterContent, setHeadRevisionId, setProject])

  // Cmd/Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (debounceRef.current) clearTimeout(debounceRef.current)
        triggerSave(editor)
      }
      if (e.key === 'F11' || ((e.metaKey || e.ctrlKey) && e.key === '.')) {
        e.preventDefault()
        toggleFocusMode()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor, triggerSave, toggleFocusMode])

  // ── Chapter title rename ─────────────────────────────────────────────────
  async function saveChapterTitle() {
    if (!project || !activeChapterId) return
    const token = getAccessToken()
    if (!token) return
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((c) =>
        c.id === activeChapterId ? { ...c, title: chapterTitle } : c,
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    setProject(updated)
    setEditingChapterTitle(false)
    await saveProject(token, updated)
  }

  // Word count for active chapter
  const activeChapter = project?.chapters.find((c) => c.id === activeChapterId)
  const wordCount = activeChapter?.wordCount ?? 0

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-57px)]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* Left column */}
      {!focusMode && (
        <aside className={`${sidebarOpen ? 'w-64' : 'hidden'} shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden`}>
          {/* Chapter tree */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {project ? (
              <ChapterTree
                project={project}
                activeChapterId={activeChapterId}
                onSelectChapter={(ch) => {
                  const token = getAccessToken()
                  if (!token || !project) return
                  loadChapter(ch, project, token)
                }}
                onProjectUpdate={setProject}
              />
            ) : (
              <div className="p-4 text-xs text-gray-400">{t('manuscript.loading_chapter')}</div>
            )}
          </div>

          {/* Character list */}
          {project && project.characters.length > 0 && (
            <div className="border-t border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">角色</p>
              <ul className="space-y-1">
                {project.characters.slice(0, 3).map((ch) => (
                  <li key={ch.id} className="text-sm text-gray-600 truncate">
                    {ch.name}
                  </li>
                ))}
              </ul>
              <button className="text-xs text-[#7c6ee0] mt-2 hover:underline focus-visible:ring-2 focus-visible:ring-blue-400">{t('manuscript.view_all_characters')}</button>
            </div>
          )}
        </aside>
      )}

      {/* Center column */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f8f8]">
        {/* Top app bar */}
        <div className="bg-white shadow-sm px-6 py-3 flex items-center gap-4 shrink-0 z-10">
          {/* Sidebar toggle (visible when not in focus mode) */}
          {!focusMode && (
            <button
              title={sidebarOpen ? '收起側欄' : '展開側欄'}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
              onClick={() => setSidebarOpen(o => !o)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          {/* Chapter title */}
          {editingChapterTitle ? (
            <input
              className="text-lg font-semibold text-[#181c1e] border-b border-[#7c6ee0] outline-none bg-transparent"
              value={chapterTitle}
              autoFocus
              onChange={(e) => setChapterTitle(e.target.value)}
              onBlur={saveChapterTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveChapterTitle()
                if (e.key === 'Escape') setEditingChapterTitle(false)
              }}
            />
          ) : (
            <h2
              className="text-lg font-semibold text-[#181c1e] cursor-pointer hover:text-[#7c6ee0] transition-colors"
              onClick={() => setEditingChapterTitle(true)}
            >
              {chapterTitle || (activeChapterId ? t('manuscript.untitled') : t('manuscript.select_chapter'))}
            </h2>
          )}

          <span className="text-sm text-gray-400 ml-2">{wordCount.toLocaleString()} {t('chapter_tree.word_count_unit')}</span>

          <div className="flex-1" />

          <SaveTag
            status={saveStatus}
            lastSavedAt={lastSavedAt}
            onRetry={() => triggerSave(editor)}
          />

          {/* Focus mode toggle */}
          <button
            title={t('manuscript.focus_mode')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              focusMode ? 'bg-[#7c6ee0] text-white' : 'hover:bg-gray-100 text-gray-400'
            }`}
            onClick={toggleFocusMode}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 5V2h3M12 2h3v3M1 11v3h3M12 14h3v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto flex justify-center py-10 px-4">
          <div className="w-full max-w-[720px] bg-white rounded-3xl shadow-sm px-12 py-10 min-h-full">
            {editor ? (
              <EditorContent
                editor={editor}
                className="prose prose-lg max-w-none focus:outline-none tiptap-editor"
              />
            ) : (
              <p className="text-gray-400 text-sm">{t('manuscript.loading_editor')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Right column */}
      {!focusMode && project && (
        <aside className="w-80 shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
          <SidePanel project={project} onProjectUpdate={setProject} />
        </aside>
      )}
    </div>
  )
}
