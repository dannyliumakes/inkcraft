import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useShelfStore } from '../../shelf/shelfStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { loadProject, saveProject } from '../../../shared/services/projectRepo'
import type { PlotAct, Project } from '../../../shared/types/project'

export function usePlotProject() {
  const { bookId } = useParams<{ bookId: string }>()
  const shelf = useShelfStore((s) => s.books)
  const book = shelf.find((b) => b.id === bookId)

  const [project, setProject] = useState<Project | null>(null)
  const [localActs, setLocalActs] = useState<PlotAct[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!book) return
    const token = getAccessToken()
    if (!token) return
    loadProject(token, book.projectFileId).then((p) => {
      setProject(p)
      setLocalActs(p.plotBoard?.acts ?? [])
    }).catch(console.error)
  }, [book])

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
      const updated: Project = { ...project, plotBoard: { acts: localActs } }
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
