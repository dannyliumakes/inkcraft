import { useState } from 'react'
import { PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { PlotScene } from '../../../shared/types/project'

export function usePlotDnd(
  localScenes: Record<string, PlotScene[]>,
  updateScenes: (fn: (prev: Record<string, PlotScene[]>) => Record<string, PlotScene[]>) => void,
) {
  const [activeScene, setActiveScene] = useState<PlotScene | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function findContainer(sceneId: string): string | null {
    for (const [chId, scenes] of Object.entries(localScenes)) {
      if (scenes.some((s) => s.id === sceneId)) return chId
    }
    return null
  }

  function handleDragStart({ active }: DragStartEvent) {
    const chId = findContainer(active.id as string)
    if (!chId) return
    const scene = localScenes[chId]?.find((s) => s.id === active.id)
    if (scene) setActiveScene(scene)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const fromChId = findContainer(active.id as string)
    if (!fromChId) return

    let toChId = findContainer(over.id as string)
    if (!toChId && localScenes[over.id as string] !== undefined) toChId = over.id as string
    if (!toChId || toChId === fromChId) return

    updateScenes((prev) => {
      const fromScenes = [...(prev[fromChId] ?? [])]
      const toScenes = [...(prev[toChId!] ?? [])]
      const sceneIdx = fromScenes.findIndex((s) => s.id === active.id)
      if (sceneIdx === -1) return prev
      const [moved] = fromScenes.splice(sceneIdx, 1)
      const overIdx = toScenes.findIndex((s) => s.id === over.id)
      if (overIdx !== -1) toScenes.splice(overIdx, 0, moved)
      else toScenes.push(moved)
      return { ...prev, [fromChId]: fromScenes, [toChId!]: toScenes }
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveScene(null)
    if (!over || active.id === over.id) return
    const chId = findContainer(active.id as string)
    if (!chId) return
    updateScenes((prev) => {
      const scenes = [...(prev[chId] ?? [])]
      const oldIdx = scenes.findIndex((s) => s.id === active.id)
      const newIdx = scenes.findIndex((s) => s.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        return { ...prev, [chId]: arrayMove(scenes, oldIdx, newIdx) }
      }
      return prev
    })
  }

  return { sensors, activeScene, handleDragStart, handleDragOver, handleDragEnd }
}
