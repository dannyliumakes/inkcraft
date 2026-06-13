import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useManuscriptStore } from '../../manuscript/manuscriptStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { createMilestone } from '../../overview/milestoneService'
import { saveProject } from '../../../shared/services/projectRepo'
import { Button, Input } from '../../../shared/components/ui'

interface Props { onClose: () => void }

const styles = {
  panel: 'fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l border-gray-100 z-40 flex flex-col',
  panelHeader: 'flex items-center justify-between px-4 py-3 border-b',
  closeBtn: 'p-1 rounded hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-400',
  inputArea: 'p-4 border-b',
  inputActions: 'flex gap-2',
  list: 'flex-1 overflow-y-auto p-4 space-y-3',
  empty: 'text-sm text-placeholder text-center mt-8',
  milestoneItem: 'p-3 bg-gray-50 rounded-lg',
  milestoneLabel: 'font-medium text-sm',
  milestoneDate: 'text-xs text-placeholder mt-1',
}

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
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className="font-semibold">{t('milestone.title')}</h2>
        <button onClick={onClose} aria-label={t('milestone.close')} className={styles.closeBtn}>✕</button>
      </div>

      <div className={styles.inputArea}>
        {showInput ? (
          <div className="space-y-2">
            <Input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={t('milestone.placeholder')}
            />
            <div className={styles.inputActions}>
              <Button onClick={handleCreate} disabled={creating || !label.trim()} loading={creating} size="sm">
                {creating ? t('milestone.creating') : t('milestone.confirm')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowInput(false)}>{t('milestone.cancel')}</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setShowInput(true)}>
            {t('milestone.create_btn')}
          </Button>
        )}
      </div>

      <div className={styles.list}>
        {milestones.length === 0 ? (
          <p className={styles.empty}>{t('milestone.empty')}</p>
        ) : milestones.map(m => (
          <div key={m.id} className={styles.milestoneItem}>
            <div className={styles.milestoneLabel}>{m.label}</div>
            <div className={styles.milestoneDate}>{fmt(m.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
