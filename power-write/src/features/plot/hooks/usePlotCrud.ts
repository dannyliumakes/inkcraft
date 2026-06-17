import type { PlotScene } from '../../../shared/types/project'

export function usePlotCrud(
  _localScenes: Record<string, PlotScene[]>,
  updateScenes: (fn: (prev: Record<string, PlotScene[]>) => Record<string, PlotScene[]>) => void,
) {
  function addSceneDirect(chapterId: string) {
    updateScenes((prev) => {
      const scenes = [...(prev[chapterId] ?? [])]
      const newScene: PlotScene = {
        id: `scene_${Date.now()}`,
        title: '未輸入文字',
        summary: '',
        imageAssetId: null,
        tags: [],
        order: scenes.length,
      }
      return { ...prev, [chapterId]: [...scenes, newScene] }
    })
  }

  function updateSceneTitle(sceneId: string, chapterId: string, title: string) {
    updateScenes((prev) => {
      const scenes = (prev[chapterId] ?? []).map((s) =>
        s.id === sceneId ? { ...s, title } : s
      )
      return { ...prev, [chapterId]: scenes }
    })
  }

  function deleteScene(sceneId: string, chapterId: string) {
    updateScenes((prev) => {
      const scenes = (prev[chapterId] ?? []).filter((s) => s.id !== sceneId)
      return { ...prev, [chapterId]: scenes }
    })
  }

  return { addSceneDirect, updateSceneTitle, deleteScene }
}
