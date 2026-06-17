import { useState } from 'react'
import { PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { Project, Scene } from '../../../shared/types/project'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'

export function usePlotDnd(
  project: Project | null,
  localScenes: Record<string, Scene[]>,
  onProjectUpdate: (p: Project) => void,
) {
  const [activeScene, setActiveScene] = useState<Scene | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function findContainer(sceneId: string): string | null {
    for (const [chId, scenes] of Object.entries(localScenes)) {
      if (scenes.some((s) => s.id === sceneId)) return chId
    }
    return null
  }

  function applyAndSave(updatedScenes: Record<string, Scene[]>) {
    if (!project) return
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((ch) =>
        updatedScenes[ch.id] !== undefined
          ? { ...ch, scenes: updatedScenes[ch.id].map((s, i) => ({ ...s, order: i + 1 })) }
          : ch
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    const token = getAccessToken()
    if (token) saveProject(token, updated).catch((e) => console.error('Plot DnD save failed', e))
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

    const fromScenes = [...(localScenes[fromChId] ?? [])]
    const toScenes = [...(localScenes[toChId] ?? [])]
    const sceneIdx = fromScenes.findIndex((s) => s.id === active.id)
    if (sceneIdx === -1) return
    const [moved] = fromScenes.splice(sceneIdx, 1)
    const overIdx = toScenes.findIndex((s) => s.id === over.id)
    if (overIdx !== -1) toScenes.splice(overIdx, 0, moved)
    else toScenes.push(moved)

    applyAndSave({ ...localScenes, [fromChId]: fromScenes, [toChId]: toScenes })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveScene(null)
    if (!over || active.id === over.id) return
    const chId = findContainer(active.id as string)
    if (!chId) return
    const scenes = [...(localScenes[chId] ?? [])]
    const oldIdx = scenes.findIndex((s) => s.id === active.id)
    const newIdx = scenes.findIndex((s) => s.id === over.id)
    if (oldIdx !== -1 && newIdx !== -1) {
      applyAndSave({ ...localScenes, [chId]: arrayMove(scenes, oldIdx, newIdx) })
    }
  }

  return { sensors, activeScene, handleDragStart, handleDragOver, handleDragEnd }
}
