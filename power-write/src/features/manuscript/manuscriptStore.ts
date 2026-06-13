import { create } from 'zustand'
import type { Project } from '../../shared/types/project'

export type SaveStatus = 'idle' | 'typing' | 'saving' | 'saved' | 'error'

export interface CachedChapter {
  expandedText: string
  blobToAssetMap: Map<string, string>
  headRevisionId: string
}

interface ManuscriptState {
  project: Project | null
  loadedBookId: string | null
  projectLoading: boolean
  activeChapterId: string | null
  chapterContent: string
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  focusMode: boolean
  headRevisionId: string | null
  chapterCache: Map<string, CachedChapter>

  setProject: (p: Project) => void
  setLoadedBookId: (id: string | null) => void
  setProjectLoading: (loading: boolean) => void
  setActiveChapter: (id: string) => void
  setChapterContent: (md: string) => void
  setSaveStatus: (s: SaveStatus) => void
  setLastSavedAt: (d: Date) => void
  toggleFocusMode: () => void
  setHeadRevisionId: (rev: string | null) => void
  setCachedChapter: (id: string, data: CachedChapter) => void
  updateChapterWordCount: (chapterId: string, count: number) => void
}

export const useManuscriptStore = create<ManuscriptState>()((set) => ({
  project: null,
  loadedBookId: null,
  projectLoading: false,
  activeChapterId: null,
  chapterContent: '',
  saveStatus: 'idle',
  lastSavedAt: null,
  focusMode: false,
  headRevisionId: null,
  chapterCache: new Map(),

  setProject: (p) => set({ project: p }),
  setLoadedBookId: (id) => set({ loadedBookId: id }),
  setProjectLoading: (loading) => set({ projectLoading: loading }),
  setActiveChapter: (id) => set({ activeChapterId: id }),
  setChapterContent: (md) => set({ chapterContent: md }),
  setSaveStatus: (s) => set({ saveStatus: s }),
  setLastSavedAt: (d) => set({ lastSavedAt: d }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  setHeadRevisionId: (rev) => set({ headRevisionId: rev }),
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