import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import CharacterCount from '@tiptap/extension-character-count'

import { useManuscriptStore } from './manuscriptStore'
import { getAccessToken } from '../../shared/stores/authStore'
import { saveProject } from '../../shared/services/projectRepo'
import { countWords } from '../../lib/wordCount'
import { CustomImage } from '../../lib/customImage'
import ChapterTree from './ChapterTree'
import SidePanel from './components/SidePanel'
import EditorToolbar from './components/EditorToolbar'
import { useChapterLoader } from './hooks/useChapterLoader'
import { useAutosave } from './hooks/useAutosave'
import { useEditorImageUpload } from './hooks/useEditorImageUpload'
import type { Project, ChapterScene } from '../../shared/types/project'

const styles = {
  root: 'flex h-full',
  sidebar: (open: boolean) => `${open ? 'w-64' : 'hidden'} shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden`,
  sidebarInner: 'flex-1 overflow-hidden flex flex-col',
  sidebarLoading: 'p-4 text-xs text-placeholder',
  characterPanel: 'border-t border-gray-100 p-3',
  characterLabel: 'text-xs font-semibold text-placeholder uppercase tracking-wide mb-2',
  characterName: 'text-sm text-secondary truncate',
  characterLink: 'text-xs text-accent mt-2 hover:underline focus-visible:ring-2 focus-visible:ring-blue-400',
  center: 'flex-1 flex flex-col overflow-hidden bg-surface',
  editorScroll: 'flex-1 overflow-y-auto py-10 px-4',
  editorCardWrap: 'flex justify-center',
  editorCard: 'w-full max-w-[720px] bg-white rounded-3xl shadow-sm px-12 pt-10 pb-6',
  addSceneDivider: 'mt-8 flex flex-col items-center gap-2',
  addSceneLine: 'w-full border-t border-dashed border-gray-200',
  addSceneBtn: 'flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-200 text-xs text-placeholder hover:border-accent-border hover:text-accent transition-colors',
  editorLoading: 'text-placeholder text-sm',
  rightPanel: 'w-80 shrink-0 bg-white border-l border-gray-100 overflow-y-auto',
}

export default function ManuscriptPage() {
  const { t } = useTranslation()
  const { bookId } = useParams<{ bookId: string }>()

  const {
    project,
    activeChapterId,
    chapterContent,
    saveStatus,
    lastSavedAt,
    focusMode,
    setProject,
    setSaveStatus,
    updateChapterWordCount,
    toggleFocusMode,
  } = useManuscriptStore()

  const [chapterTitle, setChapterTitle] = useState('')
  const [editingChapterTitle, setEditingChapterTitle] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const blobToAssetRef = useRef<Map<string, string>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { loadChapter } = useChapterLoader(blobToAssetRef)

  // Keep chapter title in sync when active chapter changes
  useEffect(() => {
    if (!project || !activeChapterId) return
    const ch = project.chapters.find((c) => c.id === activeChapterId)
    if (ch) setChapterTitle(ch.title)
  }, [activeChapterId, project])

  // ── Tiptap editor ────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Markdown,
      CharacterCount,
      CustomImage.configure({ inline: false, allowBase64: true }),
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

  const editorRef = useRef(editor)
  useEffect(() => { editorRef.current = editor }, [editor])

  // Update editor content on chapter switch
  useEffect(() => {
    if (editor && chapterContent !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (editor.storage as any).markdown?.getMarkdown?.() ?? ''
      if (current !== chapterContent) {
        editor.commands.setContent(chapterContent)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterContent])

  const { triggerSave } = useAutosave(editorRef, blobToAssetRef)

  // F11 / Ctrl+. focus mode shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F11' || ((e.metaKey || e.ctrlKey) && e.key === '.')) {
        e.preventDefault()
        toggleFocusMode()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleFocusMode])

  const { fileInputRef, handleImageFileSelected } = useEditorImageUpload(bookId, blobToAssetRef, editorRef as React.MutableRefObject<ReturnType<typeof useEditor>>)

  // ── Chapter title rename ─────────────────────────────────────────────────────
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

  const activeChapter = project?.chapters.find((c) => c.id === activeChapterId)
  const wordCount = activeChapter?.wordCount ?? 0

  const handleAddScene = useCallback(() => {
    if (!editor || !project || !activeChapterId) return
    // insert horizontal rule at end of document then focus
    editor.chain().focus().setHorizontalRule().run()
    // scroll to bottom after insertion
    setTimeout(() => {
      const el = editor.view.dom
      el.scrollIntoView({ block: 'end', behavior: 'smooth' })
    }, 50)
    // add scene entry to chapter
    const chapter = project.chapters.find((c) => c.id === activeChapterId)
    if (!chapter) return
    const newScene: ChapterScene = {
      id: `sc_${Date.now()}`,
      title: `場景 ${(chapter.scenes?.length ?? 0) + 2}`,
      order: (chapter.scenes?.length ?? 0) + 1,
    }
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((c) =>
        c.id === activeChapterId ? { ...c, scenes: [...(c.scenes ?? []), newScene] } : c
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    setProject(updated)
    const token = getAccessToken()
    if (token) saveProject(token, updated)
  }, [editor, project, activeChapterId, setProject])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={styles.root} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      {!focusMode && (
        <aside className={styles.sidebar(sidebarOpen)}>
          <div className={styles.sidebarInner}>
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
              <div className={styles.sidebarLoading}>{t('manuscript.loading_chapter')}</div>
            )}
          </div>

          {project && project.characters.length > 0 && (
            <div className={styles.characterPanel}>
              <p className={styles.characterLabel}>角色</p>
              <ul className="space-y-1">
                {project.characters.slice(0, 3).map((ch) => (
                  <li key={ch.id} className={styles.characterName}>{ch.name}</li>
                ))}
              </ul>
              <button className={styles.characterLink}>
                {t('manuscript.view_all_characters')}
              </button>
            </div>
          )}
        </aside>
      )}

      <div className={styles.center}>
        <EditorToolbar
          titleProps={{
            value: chapterTitle,
            editing: editingChapterTitle,
            onChange: setChapterTitle,
            onStartEdit: () => setEditingChapterTitle(true),
            onBlur: saveChapterTitle,
            onKeyDown: (e) => {
              if (e.key === 'Enter') saveChapterTitle()
              if (e.key === 'Escape') setEditingChapterTitle(false)
            },
          }}
          wordCount={wordCount}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          focusMode={focusMode}
          sidebarOpen={sidebarOpen}
          activeChapterId={activeChapterId}
          fileInputRef={fileInputRef}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onRetry={() => triggerSave(editor)}
          onInsertImage={() => fileInputRef.current?.click()}
          onToggleFocus={toggleFocusMode}
          onImageChange={handleImageFileSelected}
        />

        <div className={styles.editorScroll}>
          <div className={styles.editorCardWrap}>
          <div className={styles.editorCard}>
            {editor ? (
              <>
                <EditorContent
                  editor={editor}
                  className="prose prose-lg max-w-none focus:outline-none tiptap-editor"
                />
                {activeChapterId && (
                  <div className={styles.addSceneDivider}>
                    <div className={styles.addSceneLine} />
                    <button className={styles.addSceneBtn} onClick={handleAddScene}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      新增場景
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.editorLoading}>{t('manuscript.loading_editor')}</p>
            )}
          </div>
          </div>
        </div>
      </div>

      {!focusMode && project && (
        <aside className={styles.rightPanel}>
          <SidePanel project={project} onProjectUpdate={setProject} />
        </aside>
      )}
    </div>
  )
}
