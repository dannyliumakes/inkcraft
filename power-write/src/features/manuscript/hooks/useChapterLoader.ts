import { useCallback, useEffect } from 'react'
import { useManuscriptStore } from '../manuscriptStore'
import { useAuthStore } from '../../../shared/stores/authStore'
import { downloadText } from '../../../shared/services/drive'
import { expandDriveUrls } from '../lib/driveImageHelpers'
import type { Chapter, Project } from '../../../shared/types/project'

async function fetchAndProcessChapter(ch: Chapter, token: string) {
  const rawText = await downloadText(token, ch.fileId)
  const expandedText = await expandDriveUrls(rawText, token)
  const drivePattern = /!\[([^\]]*)\]\(drive:([^)]+)\)/g
  const blobPattern = /!\[([^\]]*)\]\((blob:[^)]+)\)/g
  const rawMatches = [...rawText.matchAll(drivePattern)]
  const expandedMatches = [...expandedText.matchAll(blobPattern)]
  const blobToAssetMap = new Map<string, string>()
  rawMatches.forEach((rm, i) => {
    const assetId = rm[2]
    const blobUrl = expandedMatches[i]?.[1]
    if (blobUrl) blobToAssetMap.set(blobUrl, assetId)
  })
  return { expandedText, blobToAssetMap }
}

export function useChapterLoader(blobToAssetRef: React.MutableRefObject<Map<string, string>>) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const {
    project,
    activeChapterId,
    chapterCache,
    setActiveChapter,
    setChapterContent,
    setSaveStatus,
    setCachedChapter,
  } = useManuscriptStore()

  const loadChapter = useCallback(async (ch: Chapter, _proj: Project, token: string) => {
    setActiveChapter(ch.id)
    setSaveStatus('idle')

    const cached = chapterCache.get(ch.id)
    if (cached) {
      blobToAssetRef.current = new Map(cached.blobToAssetMap)
      setChapterContent(cached.expandedText)
      return
    }

    try {
      const result = await fetchAndProcessChapter(ch, token)
      setCachedChapter(ch.id, result)
      blobToAssetRef.current = new Map(result.blobToAssetMap)
      setChapterContent(result.expandedText)
    } catch (e) {
      console.error('Failed to load chapter', e)
    }
  }, [chapterCache, setActiveChapter, setSaveStatus, setChapterContent, setCachedChapter, blobToAssetRef])

  // Auto-select first chapter when project loads, then background-prefetch the rest
  useEffect(() => {
    if (!project || activeChapterId || !accessToken) return
    const token = accessToken
    const sorted = [...project.chapters].sort((a, b) => a.order - b.order)
    const [first, ...rest] = sorted
    if (!first) return

    loadChapter(first, project, token).then(() => {
      // Background prefetch remaining chapters without blocking the editor
      rest.forEach((ch) => {
        if (chapterCache.has(ch.id)) return
        fetchAndProcessChapter(ch, token)
          .then((result) => setCachedChapter(ch.id, result))
          .catch(() => { /* silently skip, will retry on user click */ })
      })
    })
  }, [project, activeChapterId, accessToken, loadChapter, chapterCache, setCachedChapter])

  return { loadChapter }
}
