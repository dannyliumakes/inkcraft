import { useEffect, useState } from 'react'
import { useManuscriptStore } from '../../manuscript/manuscriptStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'
import type { PlotScene } from '../../../shared/types/project'

export function usePlotProject() {
  const project = useManuscriptStore((s) => s.project)
  const setProject = useManuscriptStore((s) => s.setProject)

  const [localScenes, setLocalScenes] = useState<Record<string, PlotScene[]>>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!project) return
    setLocalScenes(project.plotBoard?.scenes ?? {})
  }, [project])

  function updateScenes(fn: (prev: Record<string, PlotScene[]>) => Record<string, PlotScene[]>) {
    setLocalScenes((prev) => fn(prev))
    setDirty(true)
  }

  async function handleSave() {
    if (!project) return
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = { ...project, plotBoard: { scenes: localScenes } }
      await saveProject(token, updated)
      setProject(updated)
      setDirty(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const chapters = project
    ? [...project.chapters].sort((a, b) => a.order - b.order)
    : []

  return { project, chapters, localScenes, dirty, saving, saveError, updateScenes, handleSave }
}
