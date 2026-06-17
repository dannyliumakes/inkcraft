import { useCallback, useEffect, useRef } from 'react'
import { useManuscriptStore } from '../manuscriptStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { updateFileContent } from '../../../shared/services/drive'
import { saveProject } from '../../../shared/services/projectRepo'
import { takeSnapshot } from '../../overview/wordSnapshot'
import { countWords } from '../../../lib/wordCount'
import { collapseBlobUrls } from '../lib/driveImageHelpers'
import type { Project, Scene } from '../../../shared/types/project'

function serializeScenesToMd(scenes: Scene[], contents: Map<string, string>): string {
  return scenes
    .sort((a, b) => a.order - b.order)
    .map((s) => `<!-- scene:${s.id} -->\n${contents.get(s.id) ?? ''}`)
    .join('\n\n')
}

export function useAutosave(
  blobToAssetRef: React.MutableRefObject<Map<string, string>>,
) {
  const {
    setSaveStatus,
    setLastSavedAt,
    setProject,
  } = useManuscriptStore()

  const projectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerSave = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    const state = useManuscriptStore.getState()
    const { project: proj, activeChapterId: chId, sceneContents } = state
    if (!proj || !chId) return

    const ch = proj.chapters.find((c) => c.id === chId)
    if (!ch) return

    const scenes: Scene[] = (ch as typeof ch & { scenes?: Scene[] }).scenes ?? []

    setSaveStatus('saving')

    const rawMd = serializeScenesToMd(scenes, sceneContents)
    const md = collapseBlobUrls(rawMd, blobToAssetRef.current)

    // Word count: sum across all scenes
    let wc = 0
    for (const content of sceneContents.values()) {
      wc += countWords(content)
    }

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
        triggerSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [triggerSave])

  // Save when tab loses visibility (switching apps, closing tab, switching device)
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        triggerSave()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [triggerSave])

  return { triggerSave }
}
