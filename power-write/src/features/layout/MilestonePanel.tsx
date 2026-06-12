import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useManuscriptStore } from '../../stores/manuscriptStore'
import { getAccessToken } from '../../stores/authStore'
import { createMilestone } from '../../services/milestoneService'
import { saveProject } from '../../services/projectRepo'

interface Props { onClose: () => void }

export default function MilestonePanel({ onClose }: Props) {
  const { t } = useTranslation()
  const project = useManuscriptStore(s => s.project)
  const setProject = useManuscriptStore(s => s.setProject)
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [showInput, setShowInput] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!project) return null

  const milestones = [...(project.milestones ?? [])].reverse()
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))

  const handleCreate = async () => {
    if (!label.trim()) return
    const token = getAccessToken()
    if (!token) return
    setCreating(true)
    try {
      const updated = await createMilestone(token, project, label.trim(), saveProject)
      setProject(updated)
      setLabel('')
      setShowInput(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l border-gray-100 z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold">{t('milestone.title')}</h2>
        <button onClick={onClose} aria-label={t('milestone.close')} className="p-1 rounded hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-400">✕</button>
      </div>

      <div className="p-4 border-b">
        {showInput ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={t('milestone.placeholder')}
              className="w-full border rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !label.trim()}
                className="flex-1 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 focus-visible:ring-2"
              >
                {creating ? t('milestone.creating') : t('milestone.confirm')}
              </button>
              <button onClick={() => setShowInput(false)} className="px-3 text-sm text-gray-500 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-400">{t('milestone.cancel')}</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 focus-visible:ring-2"
          >
            {t('milestone.create_btn')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {milestones.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-8">{t('milestone.empty')}</p>
        ) : milestones.map(m => (
          <div key={m.id} className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-sm">{m.label}</div>
            <div className="text-xs text-gray-400 mt-1">{fmt(m.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
