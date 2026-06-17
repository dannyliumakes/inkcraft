import { useEffect, useRef } from 'react'
import { useManuscriptStore } from '../../manuscript/manuscriptStore'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'
import type { PlotScene } from '../../../shared/types/project'

export function usePlotProject() {
  const project = useManuscriptStore((s) => s.project)
  const setProject = useManuscriptStore((s) => s.setProject)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ensure plotBoard is initialised when project first loads
  useEffect(() => {
    if (!project || project.plotBoard?.scenes) return
    setProject({ ...project, plotBoard: { scenes: {} } })
  }, [project, setProject])

  const localScenes: Record<string, PlotScene[]> = project?.plotBoard?.scenes ?? {}

  function updateScenes(fn: (prev: Record<string, PlotScene[]>) => Record<string, PlotScene[]>) {
    if (!project) return
    const next = fn(localScenes)
    const updated = { ...project, plotBoard: { scenes: next } }
    setProject(updated)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const token = getAccessToken()
      if (!token) return
      try {
        await saveProject(token, updated)
      } catch (e) {
        console.error('Plot board save failed', e)
      }
    }, 2000)
  }

  const chapters = project
    ? [...project.chapters].sort((a, b) => a.order - b.order)
    : []

  return { project, chapters, localScenes, updateScenes }
}
