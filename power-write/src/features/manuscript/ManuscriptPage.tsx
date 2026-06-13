import { useEffect, useRef, useState } from 'react'
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
import type { Project } from '../../shared/types/project'

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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-57px)]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* Left sidebar */}
      {!focusMode && (
        <aside className={`${sidebarOpen ? 'w-64' : 'hidden'} shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden`}>
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

          {project && project.characters.length > 0 && (
            <div className="border-t border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">角色</p>
              <ul className="space-y-1">
                {project.characters.slice(0, 3).map((ch) => (
                  <li key={ch.id} className="text-sm text-gray-600 truncate">{ch.name}</li>
                ))}
              </ul>
              <button className="text-xs text-[#7c6ee0] mt-2 hover:underline focus-visible:ring-2 focus-visible:ring-blue-400">
                {t('manuscript.view_all_characters')}
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Center column */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f8f8]">
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

      {/* Right panel */}
      {!focusMode && project && (
        <aside className="w-80 shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
          <SidePanel project={project} onProjectUpdate={setProject} />
        </aside>
      )}
    </div>
  )
}
