import { useCallback, useEffect } from 'react'
import { useManuscriptStore } from '../manuscriptStore'
import { useAuthStore } from '../../../shared/stores/authStore'
import { downloadText } from '../../../shared/services/drive'
import { expandDriveUrls } from '../lib/driveImageHelpers'
import type { Chapter, Project, Scene } from '../../../shared/types/project'

function parseScenesFromMd(raw: string, scenes: Scene[]): Map<string, string> {
  const result = new Map<string, string>()
  const hasSeparators = /<!--\s*scene:[^\s>]+\s*-->/.test(raw)

  // migration: no scenes defined or no separator markers in file
  if (scenes.length === 0 || !hasSeparators) {
    const fallbackId = scenes[0]?.id ?? 'scene_migrated'
    result.set(fallbackId, raw)
    return result
  }

  // Split by scene markers: parts = [before_first, id1, content1, id2, content2, ...]
  const parts = raw.split(/<!--\s*scene:([^\s>]+)\s*-->/)
  for (let i = 1; i < parts.length; i += 2) {
    const sceneId = parts[i].trim()
    const content = (parts[i + 1] ?? '').trim()
    result.set(sceneId, content)
  }

  return result
}

async function fetchAndProcessChapter(ch: Chapter, token: string) {
  const rawText = await downloadText(token, ch.fileId)
  const scenes: Scene[] = (ch as Chapter & { scenes?: Scene[] }).scenes ?? []
  const parsedContents = parseScenesFromMd(rawText, scenes)

  const drivePattern = /!\[([^\]]*)\]\(drive:([^)]+)\)/g
  const blobPattern = /!\[([^\]]*)\]\((blob:[^)]+)\)/g
  const blobToAssetMap = new Map<string, string>()
  const expandedMap = new Map<string, string>()

  for (const [sceneId, content] of parsedContents) {
    const rawMatches = [...content.matchAll(drivePattern)]
    const expandedContent = await expandDriveUrls(content, token)
    const expandedMatches = [...expandedContent.matchAll(blobPattern)]
    rawMatches.forEach((rm, i) => {
      const assetId = rm[2]
      const blobUrl = expandedMatches[i]?.[1]
      if (blobUrl) blobToAssetMap.set(blobUrl, assetId)
    })
    expandedMap.set(sceneId, expandedContent)
  }

  return { sceneContents: expandedMap, blobToAssetMap }
}

export function useChapterLoader(blobToAssetRef: React.MutableRefObject<Map<string, string>>) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const {
    project,
    activeChapterId,
    chapterCache,
    setActiveChapter,
    setSceneContents,
    setSaveStatus,
    setCachedChapter,
  } = useManuscriptStore()

  const loadChapter = useCallback(async (ch: Chapter, _proj: Project, token: string) => {
    setActiveChapter(ch.id)
    setSaveStatus('idle')

    const cached = chapterCache.get(ch.id)
    if (cached) {
      blobToAssetRef.current = new Map(cached.blobToAssetMap)
      setSceneContents(cached.sceneContents)
      return
    }

    try {
      const result = await fetchAndProcessChapter(ch, token)
      setCachedChapter(ch.id, result)
      blobToAssetRef.current = new Map(result.blobToAssetMap)
      setSceneContents(result.sceneContents)
    } catch (e) {
      console.error('Failed to load chapter', e)
    }
  }, [chapterCache, setActiveChapter, setSaveStatus, setSceneContents, setCachedChapter, blobToAssetRef])

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
