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
import type { Project, Scene } from '../../shared/types/project'


// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyles = {
  root: 'flex h-full',
  sidebar: (open: boolean) =>
    `${open ? 'w-64' : 'hidden'} shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden`,
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
  editorLoading: 'text-placeholder text-sm',
  rightPanel: 'w-80 shrink-0 bg-white border-l border-gray-100 overflow-y-auto',
  addSceneWrap: 'mt-8 flex flex-col items-center gap-2',
  addSceneLine: 'w-full border-t border-dashed border-gray-200',
  addSceneBtn:
    'flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-200 text-xs text-placeholder hover:border-accent-border hover:text-accent transition-colors',
}

const dividerStyles = {
  root: 'group flex items-center gap-3 my-6',
  line: 'flex-1 border-t border-gray-100',
  chip: 'flex items-center gap-2 px-3 py-1 rounded-full border border-gray-100 bg-white',
  label: 'text-xs text-placeholder',
  wordCount: 'text-xs text-secondary',
  deleteBtn:
    'opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 text-placeholder',
}

const sceneEditorStyles = {
  root: 'focus-within:outline-none',
  prose: 'prose prose-lg max-w-none focus:outline-none tiptap-editor',
}

// ── SceneDivider ──────────────────────────────────────────────────────────────
interface SceneDividerProps {
  sceneIndex: number   // 0-based; display as +1
  wordCount: number
  onDelete: () => void
}

function SceneDivider({ sceneIndex, wordCount, onDelete }: SceneDividerProps) {
  return (
    <div className={dividerStyles.root}>
      <div className={dividerStyles.line} />
      <div className={dividerStyles.chip}>
        <span className={dividerStyles.label}>場景 {sceneIndex + 1}</span>
        <span className={dividerStyles.wordCount}>{wordCount} 字</span>
        <button
          className={dividerStyles.deleteBtn}
          onClick={onDelete}
          title="刪除場景"
          aria-label={`刪除場景 ${sceneIndex + 1}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 3h8M5 3V2h2v1M4.5 9.5l-.5-5M7.5 9.5l.5-5M2.5 3l.5 7h6l.5-7"
              stroke="var(--color-placeholder)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className={dividerStyles.line} />
    </div>
  )
}

// ── AddSceneButton ────────────────────────────────────────────────────────────
function AddSceneButton({ onClick }: { onClick: () => void }) {
  return (
    <div className={pageStyles.addSceneWrap}>
      <div className={pageStyles.addSceneLine} />
      <button className={pageStyles.addSceneBtn} onClick={onClick}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 1v10M1 6h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        新增場景
      </button>
    </div>
  )
}

// ── SceneEditor ───────────────────────────────────────────────────────────────
interface SceneEditorProps {
  scene: Scene
  initialContent: string
  blobToAssetRef: React.MutableRefObject<Map<string, string>>
  bookId: string | undefined
  onContentChange: (sceneId: string, content: string) => void
  onTriggerSave: () => void
}

function SceneEditor({
  scene,
  initialContent,
  onContentChange,
  onTriggerSave,
}: SceneEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Markdown,
      CharacterCount,
      CustomImage.configure({ inline: false, allowBase64: true }),
    ],
    content: initialContent,
    onUpdate: ({ editor: ed }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (ed.storage as any).markdown?.getMarkdown?.() ?? ed.getText()
      onContentChange(scene.id, md)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onTriggerSave()
      }, 3000)
    },
  })

  // Sync content when chapter switches (initialContent changes)
  useEffect(() => {
    if (!editor) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (editor.storage as any).markdown?.getMarkdown?.() ?? ''
    if (current !== initialContent) {
      editor.commands.setContent(initialContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className={sceneEditorStyles.root}>
      <EditorContent editor={editor} className={sceneEditorStyles.prose} />
    </div>
  )
}

// ── ManuscriptPage ────────────────────────────────────────────────────────────
export default function ManuscriptPage() {
  const { t } = useTranslation()
  const { bookId } = useParams<{ bookId: string }>()

  const {
    project,
    activeChapterId,
    saveStatus,
    lastSavedAt,
    focusMode,
    setProject,
    setSaveStatus,
    toggleFocusMode,
    // New store fields (added by parallel agent updating manuscriptStore)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sceneContents = new Map<string, string>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSceneContent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSceneContents,
  } = useManuscriptStore() as any

  const [chapterTitle, setChapterTitle] = useState('')
  const [editingChapterTitle, setEditingChapterTitle] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sceneWordCounts, setSceneWordCounts] = useState<Map<string, number>>(new Map())

  const blobToAssetRef = useRef<Map<string, string>>(new Map())
  // fileInputRef kept for EditorToolbar compatibility
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { loadChapter } = useChapterLoader(blobToAssetRef)
  const { triggerSave } = useAutosave(blobToAssetRef)

  // Keep chapter title in sync when active chapter changes
  useEffect(() => {
    if (!project || !activeChapterId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = project.chapters.find((c: any) => c.id === activeChapterId)
    if (ch) setChapterTitle(ch.title)
  }, [activeChapterId, project])

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

  // ── Chapter title rename ───────────────────────────────────────────────────
  async function saveChapterTitle() {
    if (!project || !activeChapterId) return
    const token = getAccessToken()
    if (!token) return
    const updated: Project = {
      ...project,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chapters: project.chapters.map((c: any) =>
        c.id === activeChapterId ? { ...c, title: chapterTitle } : c,
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    setProject(updated)
    setEditingChapterTitle(false)
    await saveProject(token, updated)
  }

  // ── Content change handler ─────────────────────────────────────────────────
  const handleContentChange = useCallback((sceneId: string, content: string) => {
    if (setSceneContent) setSceneContent(sceneId, content)
    setSaveStatus('typing')
    const wc = countWords(content)
    setSceneWordCounts((prev) => {
      const next = new Map(prev)
      next.set(sceneId, wc)
      return next
    })
  }, [setSceneContent, setSaveStatus])

  // ── Add scene ──────────────────────────────────────────────────────────────
  const handleAddScene = useCallback(() => {
    if (!project || !activeChapterId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chapter = project.chapters.find((c: any) => c.id === activeChapterId)
    if (!chapter) return

    const scenes: Scene[] = chapter.scenes ?? []
    const newScene: Scene = {
      id: `sc_${Date.now()}`,
      order:
        scenes.length > 0
          ? Math.max(...scenes.map((s: Scene) => s.order)) + 1
          : 1,
    }

    const updated: Project = {
      ...project,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chapters: project.chapters.map((c: any) =>
        c.id === activeChapterId
          ? { ...c, scenes: [...scenes, newScene] }
          : c,
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    setProject(updated)
    const token = getAccessToken()
    if (token) saveProject(token, updated)
  }, [project, activeChapterId, setProject])

  // ── Delete scene ───────────────────────────────────────────────────────────
  const handleDeleteScene = useCallback((scene: Scene) => {
    if (!project || !activeChapterId) return
    if (!window.confirm(`確認刪除「場景 ${scene.order}」？此操作無法還原。`)) return

    const updated: Project = {
      ...project,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chapters: project.chapters.map((c: any) =>
        c.id === activeChapterId
          ? { ...c, scenes: (c.scenes ?? []).filter((s: Scene) => s.id !== scene.id) }
          : c,
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    setProject(updated)

    // Remove from sceneContents
    if (setSceneContents && sceneContents) {
      const next = new Map(sceneContents)
      next.delete(scene.id)
      setSceneContents(next)
    }

    // Remove from local word counts
    setSceneWordCounts((prev) => {
      const next = new Map(prev)
      next.delete(scene.id)
      return next
    })

    const token = getAccessToken()
    if (token) saveProject(token, updated)
  }, [project, activeChapterId, setProject, sceneContents, setSceneContents])

  // ── Derived values ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeChapter = project?.chapters.find((c: any) => c.id === activeChapterId)
  const scenes: Scene[] = activeChapter
    ? [...(activeChapter.scenes ?? [])].sort((a: Scene, b: Scene) => a.order - b.order)
    : []

  const totalWordCount = Array.from(sceneWordCounts.values()).reduce((sum, n) => sum + n, 0)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={pageStyles.root} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      {!focusMode && (
        <aside className={pageStyles.sidebar(sidebarOpen)}>
          <div className={pageStyles.sidebarInner}>
            {project ? (
              <ChapterTree
                project={project}
                activeChapterId={activeChapterId}
                onSelectChapter={(ch: any) => {
                  const token = getAccessToken()
                  if (!token || !project) return
                  loadChapter(ch, project, token)
                }}
                onProjectUpdate={setProject}
              />
            ) : (
              <div className={pageStyles.sidebarLoading}>{t('manuscript.loading_chapter')}</div>
            )}
          </div>

          {project && project.characters.length > 0 && (
            <div className={pageStyles.characterPanel}>
              <p className={pageStyles.characterLabel}>角色</p>
              <ul className="space-y-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {project.characters.slice(0, 3).map((ch: any) => (
                  <li key={ch.id} className={pageStyles.characterName}>{ch.name}</li>
                ))}
              </ul>
              <button className={pageStyles.characterLink}>
                {t('manuscript.view_all_characters')}
              </button>
            </div>
          )}
        </aside>
      )}

      <div className={pageStyles.center}>
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
          wordCount={totalWordCount}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          focusMode={focusMode}
          sidebarOpen={sidebarOpen}
          activeChapterId={activeChapterId}
          fileInputRef={fileInputRef}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onRetry={() => triggerSave()}
          onInsertImage={() => fileInputRef.current?.click()}
          onToggleFocus={toggleFocusMode}
          onImageChange={() => { /* image upload handled per-scene in future */ }}
        />

        <div className={pageStyles.editorScroll}>
          <div className={pageStyles.editorCardWrap}>
            <div className={pageStyles.editorCard}>
              {activeChapterId ? (
                <>
                  {scenes.map((scene, i) => (
                    <div key={scene.id}>
                      {i > 0 && (
                        <SceneDivider
                          sceneIndex={i}
                          wordCount={sceneWordCounts.get(scene.id) ?? 0}
                          onDelete={() => handleDeleteScene(scene)}
                        />
                      )}
                      <SceneEditor
                        scene={scene}
                        initialContent={sceneContents?.get?.(scene.id) ?? ''}
                        blobToAssetRef={blobToAssetRef}
                        bookId={bookId}
                        onContentChange={handleContentChange}
                        onTriggerSave={() => triggerSave()}
                      />
                    </div>
                  ))}

                  {scenes.length === 0 && (
                    <SceneEditor
                      scene={{ id: '_empty', order: 0 }}
                      initialContent=""
                      blobToAssetRef={blobToAssetRef}
                      bookId={bookId}
                      onContentChange={handleContentChange}
                      onTriggerSave={() => triggerSave()}
                    />
                  )}

                  <AddSceneButton onClick={handleAddScene} />
                </>
              ) : (
                <p className={pageStyles.editorLoading}>{t('manuscript.loading_editor')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {!focusMode && project && (
        <aside className={pageStyles.rightPanel}>
          <SidePanel project={project} onProjectUpdate={setProject} />
        </aside>
      )}
    </div>
  )
}
