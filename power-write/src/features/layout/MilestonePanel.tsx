import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useManuscriptStore } from '../manuscript/manuscriptStore'
import { getAccessToken } from '../../shared/stores/authStore'
import { createMilestone } from '../overview/milestoneService'
import { saveProject } from '../../shared/services/projectRepo'
import { Button, Input } from '../../shared/components/ui'

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
            <Input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={t('milestone.placeholder')}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating || !label.trim()} loading={creating} size="sm">
                {creating ? t('milestone.creating') : t('milestone.confirm')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowInput(false)}>{t('milestone.cancel')}</Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowInput(true)}
          >
            {t('milestone.create_btn')}
          </Button>
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
