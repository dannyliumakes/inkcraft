import { useState } from 'react'
import type { PlotAct, PlotScene } from '../../../shared/types/project'

export function usePlotCrud(
  localActs: PlotAct[],
  updateActs: (fn: (acts: PlotAct[]) => PlotAct[]) => void,
) {
  const [modalChapterId, setModalChapterId] = useState<string | null>(null)
  const [editingScene, setEditingScene] = useState<PlotScene | null | undefined>(undefined)

  function findChapterActIndex(chapterId: string) {
    for (let ai = 0; ai < localActs.length; ai++) {
      const ci = localActs[ai].chapters.findIndex((ch) => ch.id === chapterId)
      if (ci !== -1) return { actIndex: ai, chapterIndex: ci }
    }
    return null
  }

  // Scene
  function openAddScene(chapterId: string) {
    setModalChapterId(chapterId)
    setEditingScene(null)
  }

  function openEditScene(scene: PlotScene, chapterId: string) {
    setModalChapterId(chapterId)
    setEditingScene(scene)
  }

  function handleSaveScene(scene: PlotScene, chapterId: string) {
    updateActs((acts) => {
      const loc = findChapterActIndex(chapterId)
      if (!loc) return acts
      const next = acts.map((a) => ({ ...a, chapters: a.chapters.map((ch) => ({ ...ch, scenes: [...ch.scenes] })) }))
      const ch = next[loc.actIndex].chapters[loc.chapterIndex]
      const idx = ch.scenes.findIndex((s) => s.id === scene.id)
      if (idx !== -1) ch.scenes[idx] = scene
      else ch.scenes.push({ ...scene, order: ch.scenes.length })
      return next
    })
    setEditingScene(undefined)
    setModalChapterId(null)
  }

  function closeModal() {
    setEditingScene(undefined)
    setModalChapterId(null)
  }

  // Act / Chapter
  function addAct() {
    updateActs((acts) => [
      ...acts,
      {
        id: `act_${Date.now()}`,
        title: `第 ${acts.length + 1} 幕`,
        chapters: [{ id: `ch_${Date.now()}`, title: `第 1 章`, scenes: [] }],
      },
    ])
  }

  function addChapterToAct(actIndex: number) {
    updateActs((acts) => {
      const next = acts.map((a) => ({ ...a, chapters: [...a.chapters] }))
      const act = next[actIndex]
      act.chapters.push({ id: `ch_${Date.now()}`, title: `第 ${act.chapters.length + 1} 章`, scenes: [] })
      return next
    })
  }

  function renameChapter(chapterId: string, title: string) {
    updateActs((acts) =>
      acts.map((a) => ({ ...a, chapters: a.chapters.map((ch) => ch.id === chapterId ? { ...ch, title } : ch) }))
    )
  }

  function renameAct(actId: string, title: string) {
    updateActs((acts) => acts.map((a) => a.id === actId ? { ...a, title } : a))
  }

  return {
    modalChapterId, editingScene,
    openAddScene, openEditScene, handleSaveScene, closeModal,
    addAct, addChapterToAct, renameChapter, renameAct,
  }
}
