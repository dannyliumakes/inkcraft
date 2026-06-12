import { create } from 'zustand'
import type { Project } from '../types/project'

export type SaveStatus = 'idle' | 'typing' | 'saving' | 'saved' | 'error'

interface ManuscriptState {
  project: Project | null
  activeChapterId: string | null
  chapterContent: string
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  focusMode: boolean
  // headRevisionId of active chapter (for conflict detection)
  headRevisionId: string | null

  setProject: (p: Project) => void
  setActiveChapter: (id: string) => void
  setChapterContent: (md: string) => void
  setSaveStatus: (s: SaveStatus) => void
  setLastSavedAt: (d: Date) => void
  toggleFocusMode: () => void
  setHeadRevisionId: (rev: string | null) => void
  updateChapterWordCount: (chapterId: string, count: number) => void
}

export const useManuscriptStore = create<ManuscriptState>()((set) => ({
  project: null,
  activeChapterId: null,
  chapterContent: '',
  saveStatus: 'idle',
  lastSavedAt: null,
  focusMode: false,
  headRevisionId: null,

  setProject: (p) => set({ project: p }),
  setActiveChapter: (id) => set({ activeChapterId: id }),
  setChapterContent: (md) => set({ chapterContent: md }),
  setSaveStatus: (s) => set({ saveStatus: s }),
  setLastSavedAt: (d) => set({ lastSavedAt: d }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  setHeadRevisionId: (rev) => set({ headRevisionId: rev }),
  updateChapterWordCount: (chapterId, count) =>
    set((state) => {
      if (!state.project) return {}
      const chapters = state.project.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, wordCount: count } : ch,
      )
      return { project: { ...state.project, chapters } }
    }),
}))
