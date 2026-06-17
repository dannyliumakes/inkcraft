import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { findOrCreateRootFolder, createFolder, createTextFile, updateFileContent } from '../../../shared/services/drive'
import { getAccessToken } from '../../../shared/stores/authStore'
import type { Project } from '../../../shared/types/project'
import { Button, Input, Modal } from '../../../shared/components/ui'

interface Props {
  onClose: () => void
}

export default function CreateBookModal({ onClose }: Props) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const token = getAccessToken()
    if (!token) return

    setSubmitting(true)
    setError(null)
    try {
      const rootId = await findOrCreateRootFolder(token)
      const bookFolderId = await createFolder(token, title.trim(), rootId)
      const manuscriptFolderId = await createFolder(token, 'manuscript', bookFolderId)
      const assetsFolderId = await createFolder(token, 'assets', bookFolderId)

      const chapterFileId = await createTextFile(
        token, 'ch_001.md', manuscriptFolderId, '', 'text/markdown'
      )

      const now = new Date().toISOString()
      const defaultAct = { id: 'act_001', title: '我的幕次', order: 1 }
      const project: Project = {
        id: bookFolderId,
        title: title.trim(),
        manuscriptFolderId,
        assetsFolderId,
        projectFileId: '',
        acts: [defaultAct],
        chapters: [
          { id: 'ch_001', title: '我的章節', order: 1, actId: 'act_001', fileId: chapterFileId, wordCount: 0, rev: 0, scenes: [] },
        ],
        characters: [],
        research: [],
        notes: '',
        todos: [],
        plotBoard: { scenes: {} },
        dailyWordGoal: 3000,
        projectWordGoal: 80000,
        wordHistory: [],
        milestones: [],
        updatedAt: now,
        rev: 0,
      }

      const projectFileId = await createTextFile(
        token, 'project.json', bookFolderId, JSON.stringify({ ...project, projectFileId: '__placeholder__' }), 'application/json'
      )

      // update with correct projectFileId
      const finalProject: Project = { ...project, projectFileId }
      await updateFileContent(token, projectFileId, JSON.stringify(finalProject))

      navigate(`/book/${bookFolderId}/manuscript`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立失敗，請再試一次')
      setSubmitting(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={t('shelf.create_title')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('shelf.book_name_placeholder')}
          autoFocus
          disabled={submitting}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3 justify-end mt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            {t('shelf.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !title.trim()} loading={submitting}>
            {submitting ? t('shelf.creating') : t('shelf.create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
