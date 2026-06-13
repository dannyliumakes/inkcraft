import { useState } from 'react'
import type { PlotScene } from '../../../shared/types/project'

export function usePlotCrud(
  _localScenes: Record<string, PlotScene[]>,
  updateScenes: (fn: (prev: Record<string, PlotScene[]>) => Record<string, PlotScene[]>) => void,
) {
  const [modalChapterId, setModalChapterId] = useState<string | null>(null)
  const [editingScene, setEditingScene] = useState<PlotScene | null | undefined>(undefined)

  function openAddScene(chapterId: string) {
    setModalChapterId(chapterId)
    setEditingScene(null)
  }

  function openEditScene(scene: PlotScene, chapterId: string) {
    setModalChapterId(chapterId)
    setEditingScene(scene)
  }

  function handleSaveScene(scene: PlotScene, chapterId: string) {
    updateScenes((prev) => {
      const scenes = [...(prev[chapterId] ?? [])]
      const idx = scenes.findIndex((s) => s.id === scene.id)
      if (idx !== -1) scenes[idx] = scene
      else scenes.push({ ...scene, order: scenes.length })
      return { ...prev, [chapterId]: scenes }
    })
    setEditingScene(undefined)
    setModalChapterId(null)
  }

  function closeModal() {
    setEditingScene(undefined)
    setModalChapterId(null)
  }

  return { modalChapterId, editingScene, openAddScene, openEditScene, handleSaveScene, closeModal }
}
