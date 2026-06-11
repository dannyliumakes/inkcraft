import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findOrCreateRootFolder, createFolder, createTextFile, updateFileContent } from '../../services/drive'
import { getAccessToken } from '../../stores/authStore'
import type { Project } from '../../types/project'

interface Props {
  onClose: () => void
}

export default function CreateBookModal({ onClose }: Props) {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

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
      const project: Project = {
        id: bookFolderId,
        title: title.trim(),
        manuscriptFolderId,
        assetsFolderId,
        projectFileId: '',
        chapters: [
          { id: 'ch_001', title: '第一章', order: 0, fileId: chapterFileId, wordCount: 0, rev: 0 },
        ],
        characters: [],
        notes: '',
        todos: [],
        dailyWordGoal: 3000,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">
        <h2 className="text-xl font-bold text-[#181c1e] mb-6">建立新作品</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#4c5354] mb-1">作品名稱</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入作品標題…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#181c1e] placeholder-[#6d6d6d] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30"
              autoFocus
              disabled={submitting}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-[#4c5354] hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-5 py-2.5 rounded-full text-sm font-medium bg-[#181c1e] text-white hover:bg-[#2e3538] disabled:opacity-50 transition-colors"
            >
              {submitting ? '建立中…' : '建立'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
