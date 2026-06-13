import { useCallback, useEffect, useRef } from 'react'
import { useManuscriptStore } from '../manuscriptStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { updateFileContent } from '../../../shared/services/drive'
import { saveProject } from '../../../shared/services/projectRepo'
import { takeSnapshot } from '../../overview/wordSnapshot'
import { countWords } from '../../../lib/wordCount'
import { collapseBlobUrls } from '../lib/driveImageHelpers'
import type { Project } from '../../../shared/types/project'

export function useAutosave(
  editorRef: React.MutableRefObject<ReturnType<typeof import('@tiptap/react').useEditor> | null>,
  blobToAssetRef: React.MutableRefObject<Map<string, string>>,
) {
  const {
    setSaveStatus,
    setLastSavedAt,
    setProject,
  } = useManuscriptStore()

  const projectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerSave = useCallback(async (editor: ReturnType<typeof import('@tiptap/react').useEditor>) => {
    if (!editor) return
    const token = getAccessToken()
    if (!token) return
    const state = useManuscriptStore.getState()
    const { project: proj, activeChapterId: chId } = state
    if (!proj || !chId) return

    const ch = proj.chapters.find((c) => c.id === chId)
    if (!ch) return

    setSaveStatus('saving')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawMd = (editor.storage as any).markdown.getMarkdown() as string
    const md = collapseBlobUrls(rawMd, blobToAssetRef.current)
    const wc = countWords(editor.getText())

    try {
      await updateFileContent(token, ch.fileId, md)
      const now = new Date()
      setLastSavedAt(now)
      setSaveStatus('saved')

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
  }, [setSaveStatus, setLastSavedAt, setProject, blobToAssetRef])

  // Cmd/Ctrl+S shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        triggerSave(editorRef.current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [triggerSave, editorRef])

  // Save when tab loses visibility (switching apps, closing tab, switching device)
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        triggerSave(editorRef.current)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [triggerSave, editorRef])

  return { triggerSave }
}
