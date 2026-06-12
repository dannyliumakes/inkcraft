import { create } from 'zustand'

export interface ShelfBook {
  id: string          // Drive folder ID
  title: string
  coverAssetId?: string
  updatedAt: string
  projectFileId: string
}

interface ShelfState {
  books: ShelfBook[]
  loading: boolean
  error: string | null
  setBooks: (books: ShelfBook[]) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  addBook: (book: ShelfBook) => void
  removeBook: (id: string) => void
  updateBook: (id: string, patch: Partial<ShelfBook>) => void
}

export const useShelfStore = create<ShelfState>()((set) => ({
  books: [],
  loading: false,
  error: null,
  setBooks: (books) => set({ books }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addBook: (book) => set((s) => ({ books: [...s.books, book] })),
  removeBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id) })),
  updateBook: (id, patch) =>
    set((s) => ({ books: s.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
}))
