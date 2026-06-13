import { useCallback, useEffect } from 'react'
import { useManuscriptStore } from '../manuscriptStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { downloadText, getHeadRevisionId } from '../../../shared/services/drive'
import { expandDriveUrls } from '../lib/driveImageHelpers'
import type { Chapter, Project } from '../../../shared/types/project'

async function fetchAndProcessChapter(ch: Chapter, token: string) {
  const [rawText, headRevisionId] = await Promise.all([
    downloadText(token, ch.fileId),
    getHeadRevisionId(token, ch.fileId),
  ])
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
  return { expandedText, blobToAssetMap, headRevisionId }
}

export function useChapterLoader(blobToAssetRef: React.MutableRefObject<Map<string, string>>) {
  const {
    project,
    activeChapterId,
    chapterCache,
    setActiveChapter,
    setChapterContent,
    setSaveStatus,
    setHeadRevisionId,
    setCachedChapter,
  } = useManuscriptStore()

  const loadChapter = useCallback(async (ch: Chapter, _proj: Project, token: string) => {
    setActiveChapter(ch.id)
    setSaveStatus('idle')

    const cached = chapterCache.get(ch.id)
    if (cached) {
      blobToAssetRef.current = new Map(cached.blobToAssetMap)
      setHeadRevisionId(cached.headRevisionId)
      setChapterContent(cached.expandedText)
      return
    }

    try {
      const result = await fetchAndProcessChapter(ch, token)
      setCachedChapter(ch.id, result)
      blobToAssetRef.current = new Map(result.blobToAssetMap)
      setHeadRevisionId(result.headRevisionId)
      setChapterContent(result.expandedText)
    } catch (e) {
      console.error('Failed to load chapter', e)
    }
  }, [chapterCache, setActiveChapter, setSaveStatus, setHeadRevisionId, setChapterContent, setCachedChapter, blobToAssetRef])

  // Auto-select first chapter when project loads, then background-prefetch the rest
  useEffect(() => {
    if (!project || activeChapterId) return
    const token = getAccessToken()
    if (!token) return
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
  }, [project, activeChapterId, loadChapter, chapterCache, setCachedChapter])

  return { loadChapter }
}
