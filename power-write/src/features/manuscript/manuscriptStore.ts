import { create } from 'zustand'
import type { Project } from '../../shared/types/project'

export type SaveStatus = 'idle' | 'typing' | 'saving' | 'saved' | 'error'

export interface CachedChapter {
  sceneContents: Map<string, string>   // sceneId → markdown
  blobToAssetMap: Map<string, string>
}

interface ManuscriptState {
  project: Project | null
  loadedBookId: string | null
  projectLoading: boolean
  activeChapterId: string | null
  sceneContents: Map<string, string>
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  focusMode: boolean
  chapterCache: Map<string, CachedChapter>

  setProject: (p: Project) => void
  setLoadedBookId: (id: string | null) => void
  setProjectLoading: (loading: boolean) => void
  setActiveChapter: (id: string) => void
  setSceneContent: (sceneId: string, content: string) => void
  setSceneContents: (contents: Map<string, string>) => void
  setSaveStatus: (s: SaveStatus) => void
  setLastSavedAt: (d: Date) => void
  toggleFocusMode: () => void
  setCachedChapter: (id: string, data: CachedChapter) => void
  updateChapterWordCount: (chapterId: string, count: number) => void
}

export const useManuscriptStore = create<ManuscriptState>()((set) => ({
  project: null,
  loadedBookId: null,
  projectLoading: false,
  activeChapterId: null,
  sceneContents: new Map(),
  saveStatus: 'idle',
  lastSavedAt: null,
  focusMode: false,
  chapterCache: new Map(),

  setProject: (p) => set({ project: p }),
  setLoadedBookId: (id) => set({ loadedBookId: id }),
  setProjectLoading: (loading) => set({ projectLoading: loading }),
  setActiveChapter: (id) => set({ activeChapterId: id }),
  setSceneContent: (sceneId, content) =>
    set((state) => {
      const next = new Map(state.sceneContents)
      next.set(sceneId, content)
      return { sceneContents: next }
    }),
  setSceneContents: (contents) => set({ sceneContents: contents }),
  setSaveStatus: (s) => set({ saveStatus: s }),
  setLastSavedAt: (d) => set({ lastSavedAt: d }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  setCachedChapter: (id, data) =>
    set((state) => {
      const next = new Map(state.chapterCache)
      next.set(id, data)
      return { chapterCache: next }
    }),
  updateChapterWordCount: (chapterId, count) =>
    set((state) => {
      if (!state.project) return {}
      const chapters = state.project.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, wordCount: count } : ch,
      )
      return { project: { ...state.project, chapters } }
    }),
}))
