import { useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useShelfStore } from '../../shelf/shelfStore'
import { useManuscriptStore } from '../manuscriptStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { loadProject } from '../../../shared/services/projectRepo'
import { downloadText, getHeadRevisionId } from '../../../shared/services/drive'
import { expandDriveUrls } from '../lib/driveImageHelpers'
import type { Chapter, Project } from '../../../shared/types/project'

export function useChapterLoader(blobToAssetRef: React.MutableRefObject<Map<string, string>>) {
  const { bookId } = useParams<{ bookId: string }>()
  const shelf = useShelfStore((s) => s.books)
  const {
    setProject,
    setActiveChapter,
    setChapterContent,
    setSaveStatus,
    setHeadRevisionId,
  } = useManuscriptStore()

  const loadChapter = useCallback(async (ch: Chapter, _proj: Project, token: string) => {
    setActiveChapter(ch.id)
    setSaveStatus('idle')
    blobToAssetRef.current = new Map()
    try {
      const [rawText, revId] = await Promise.all([
        downloadText(token, ch.fileId),
        getHeadRevisionId(token, ch.fileId),
      ])
      setHeadRevisionId(revId)
      const expandedText = await expandDriveUrls(rawText, token)
      const drivePattern = /!\[([^\]]*)\]\(drive:([^)]+)\)/g
      const blobPattern = /!\[([^\]]*)\]\((blob:[^)]+)\)/g
      const rawMatches = [...rawText.matchAll(drivePattern)]
      const expandedMatches = [...expandedText.matchAll(blobPattern)]
      rawMatches.forEach((rm, i) => {
        const assetId = rm[2]
        const blobUrl = expandedMatches[i]?.[1]
        if (blobUrl) blobToAssetRef.current.set(blobUrl, assetId)
      })
      setChapterContent(expandedText)
    } catch (e) {
      console.error('Failed to load chapter', e)
    }
  }, [setActiveChapter, setSaveStatus, setHeadRevisionId, setChapterContent, blobToAssetRef])

  // Load project on mount and auto-select first chapter
  useEffect(() => {
    if (!bookId) return
    const token = getAccessToken()
    if (!token) return
    const book = shelf.find((b) => b.id === bookId)
    if (!book) return

    loadProject(token, book.projectFileId).then((p) => {
      setProject(p)
      const first = [...p.chapters].sort((a, b) => a.order - b.order)[0]
      if (first) loadChapter(first, p, token)
    }).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  return { loadChapter }
}
