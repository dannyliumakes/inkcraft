import { useState } from 'react'
import type { Project, Scene } from '../../../shared/types/project'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'

export function usePlotCrud(project: Project | null, onProjectUpdate: (p: Project) => void) {
  const [modalChapterId, setModalChapterId] = useState<string | null>(null)
  const [editingScene, setEditingScene] = useState<Scene | null | undefined>(undefined)

  function openAddScene(chapterId: string) {
    setModalChapterId(chapterId)
    setEditingScene(null)
  }

  function openEditScene(scene: Scene, chapterId: string) {
    setModalChapterId(chapterId)
    setEditingScene(scene)
  }

  function addScene(chapterId: string) {
    if (!project) return
    const chapter = project.chapters.find((c) => c.id === chapterId)
    if (!chapter) return
    const scenes = chapter.scenes ?? []
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      title: '',
      summary: '',
      imageAssetId: null,
      tags: [],
      order: scenes.length > 0 ? Math.max(...scenes.map((s) => s.order)) + 1 : 1,
    }
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((c) =>
        c.id === chapterId ? { ...c, scenes: [...scenes, newScene] } : c
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    const token = getAccessToken()
    if (token) saveProject(token, updated).catch((e) => console.error('Plot board save failed', e))
  }

  function handleSaveScene(scene: Scene, chapterId: string) {
    if (!project) return
    const chapter = project.chapters.find((c) => c.id === chapterId)
    if (!chapter) return
    const scenes = chapter.scenes ?? []
    const idx = scenes.findIndex((s) => s.id === scene.id)
    const updatedScenes = idx !== -1
      ? scenes.map((s, i) => (i === idx ? scene : s))
      : [...scenes, { ...scene, order: scenes.length + 1 }]
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((c) =>
        c.id === chapterId ? { ...c, scenes: updatedScenes } : c
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    const token = getAccessToken()
    if (token) saveProject(token, updated).catch((e) => console.error('Plot board save failed', e))
    setEditingScene(undefined)
    setModalChapterId(null)
  }

  function updateSceneTitle(sceneId: string, chapterId: string, title: string) {
    if (!project) return
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((c) =>
        c.id === chapterId
          ? { ...c, scenes: (c.scenes ?? []).map((s) => (s.id === sceneId ? { ...s, title } : s)) }
          : c
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    const token = getAccessToken()
    if (token) saveProject(token, updated).catch((e) => console.error('Plot board save failed', e))
  }

  function deleteScene(sceneId: string, chapterId: string) {
    if (!project) return
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((c) =>
        c.id === chapterId
          ? { ...c, scenes: (c.scenes ?? []).filter((s) => s.id !== sceneId) }
          : c
      ),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    const token = getAccessToken()
    if (token) saveProject(token, updated).catch((e) => console.error('Plot board save failed', e))
  }

  function closeModal() {
    setEditingScene(undefined)
    setModalChapterId(null)
  }

  return {
    modalChapterId,
    editingScene,
    openAddScene,
    openEditScene,
    addScene,
    handleSaveScene,
    updateSceneTitle,
    deleteScene,
    closeModal,
  }
}
