import { useState } from 'react'
import { PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { PlotAct, PlotChapter, PlotScene } from '../../../shared/types/project'

export function usePlotDnd(
  localActs: PlotAct[],
  allChapters: PlotChapter[],
  updateActs: (fn: (acts: PlotAct[]) => PlotAct[]) => void,
) {
  const [activeScene, setActiveScene] = useState<PlotScene | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function findChapterActIndex(chapterId: string): { actIndex: number; chapterIndex: number } | null {
    for (let ai = 0; ai < localActs.length; ai++) {
      const ci = localActs[ai].chapters.findIndex((ch) => ch.id === chapterId)
      if (ci !== -1) return { actIndex: ai, chapterIndex: ci }
    }
    return null
  }

  function findSceneContainer(sceneId: string): string | null {
    for (const act of localActs) {
      for (const ch of act.chapters) {
        if (ch.scenes.some((s) => s.id === sceneId)) return ch.id
      }
    }
    return null
  }

  function handleDragStart({ active }: DragStartEvent) {
    const chId = findSceneContainer(active.id as string)
    if (!chId) return
    const loc = findChapterActIndex(chId)
    if (!loc) return
    const scene = localActs[loc.actIndex].chapters[loc.chapterIndex].scenes.find((s) => s.id === active.id)!
    setActiveScene(scene)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const fromChId = findSceneContainer(active.id as string)
    if (!fromChId) return

    let toChId: string | null = findSceneContainer(over.id as string)
    if (!toChId) {
      const chExists = allChapters.some((ch) => ch.id === (over.id as string))
      if (chExists) toChId = over.id as string
    }
    if (!toChId || toChId === fromChId) return

    const fromLoc = findChapterActIndex(fromChId)
    const toLoc = findChapterActIndex(toChId)
    if (!fromLoc || !toLoc) return

    updateActs((acts) => {
      const next = acts.map((a) => ({ ...a, chapters: a.chapters.map((ch) => ({ ...ch, scenes: [...ch.scenes] })) }))
      const fromCh = next[fromLoc.actIndex].chapters[fromLoc.chapterIndex]
      const toCh = next[toLoc.actIndex].chapters[toLoc.chapterIndex]

      const sceneIdx = fromCh.scenes.findIndex((s) => s.id === active.id)
      if (sceneIdx === -1) return acts

      const [moved] = fromCh.scenes.splice(sceneIdx, 1)
      moved.chapterRef = toChId!

      const overIdx = toCh.scenes.findIndex((s) => s.id === over.id)
      if (overIdx !== -1) toCh.scenes.splice(overIdx, 0, moved)
      else toCh.scenes.push(moved)

      return next
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveScene(null)
    if (!over || active.id === over.id) return

    const chId = findSceneContainer(active.id as string)
    if (!chId) return
    const loc = findChapterActIndex(chId)
    if (!loc) return

    updateActs((acts) => {
      const next = acts.map((a) => ({ ...a, chapters: a.chapters.map((ch) => ({ ...ch, scenes: [...ch.scenes] })) }))
      const ch = next[loc.actIndex].chapters[loc.chapterIndex]
      const oldIdx = ch.scenes.findIndex((s) => s.id === active.id)
      const newIdx = ch.scenes.findIndex((s) => s.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        next[loc.actIndex].chapters[loc.chapterIndex].scenes = arrayMove(ch.scenes, oldIdx, newIdx)
      }
      return next
    })
  }

  return { sensors, activeScene, handleDragStart, handleDragOver, handleDragEnd }
}
