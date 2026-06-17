import { useManuscriptStore } from '../../manuscript/manuscriptStore'
import type { Scene } from '../../../shared/types/project'

export function usePlotProject() {
  const project = useManuscriptStore((s) => s.project)
  const setProject = useManuscriptStore((s) => s.setProject)

  const localScenes: Record<string, Scene[]> = {}
  if (project) {
    for (const ch of project.chapters) {
      localScenes[ch.id] = [...(ch.scenes ?? [])].sort((a, b) => a.order - b.order)
    }
  }

  const chapters = project
    ? [...project.chapters].sort((a, b) => a.order - b.order)
    : []

  return { project, chapters, localScenes, onProjectUpdate: setProject }
}
