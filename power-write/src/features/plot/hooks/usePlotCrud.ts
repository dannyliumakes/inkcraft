import type { Project, Scene } from '../../../shared/types/project'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'

export function usePlotCrud(project: Project | null, onProjectUpdate: (p: Project) => void) {
  function persist(updated: Project) {
    onProjectUpdate(updated)
    const token = getAccessToken()
    if (token) saveProject(token, updated).catch((e) => console.error('Plot board save failed', e))
  }

  // Add an empty scene to a chapter. Scenes carry no title/summary — content is
  // written in the manuscript editor — so this needs no modal.
  function addScene(chapterId: string) {
    if (!project) return
    const chapter = project.chapters.find((c) => c.id === chapterId)
    if (!chapter) return
    const scenes = chapter.scenes ?? []
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      order: scenes.length > 0 ? Math.max(...scenes.map((s) => s.order)) + 1 : 1,
    }
    persist({
      ...project,
      chapters: project.chapters.map((c) =>
        c.id === chapterId ? { ...c, scenes: [...scenes, newScene] } : c
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    })
  }

  function deleteScene(sceneId: string, chapterId: string) {
    if (!project) return
    persist({
      ...project,
      chapters: project.chapters.map((c) =>
        c.id === chapterId
          ? { ...c, scenes: (c.scenes ?? []).filter((s) => s.id !== sceneId) }
          : c
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    })
  }

  return { addScene, deleteScene }
}
