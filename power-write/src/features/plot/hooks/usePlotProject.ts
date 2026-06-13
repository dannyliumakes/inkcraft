import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useShelfStore } from '../../shelf/shelfStore'
import { useManuscriptStore } from '../../manuscript/manuscriptStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'
import type { PlotAct } from '../../../shared/types/project'

export function usePlotProject() {
  const { bookId } = useParams<{ bookId: string }>()
  const shelf = useShelfStore((s) => s.books)
  const book = shelf.find((b) => b.id === bookId)

  const project = useManuscriptStore((s) => s.project)
  const setProject = useManuscriptStore((s) => s.setProject)

  const [localActs, setLocalActs] = useState<PlotAct[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync localActs from store when project loads
  useEffect(() => {
    if (!project) return
    setLocalActs(project.plotBoard?.acts ?? [])
  }, [project])

  function updateActs(fn: (acts: PlotAct[]) => PlotAct[]) {
    setLocalActs((prev) => fn(prev))
    setDirty(true)
  }

  async function handleSave() {
    if (!project) return
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = { ...project, plotBoard: { acts: localActs } }
      await saveProject(token, updated)
      setProject(updated)
      setDirty(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return { book, project, localActs, dirty, saving, saveError, updateActs, handleSave }
}
