import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBeforeUnload, useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { PlotAct, PlotChapter, PlotScene, Project } from '../../shared/types/project'
import { getAccessToken } from '../../shared/stores/authStore'
import { useShelfStore } from '../shelf/shelfStore'
import { loadProject, saveProject } from '../../shared/services/projectRepo'
import { Button, Input } from '../../shared/components/ui'
import SceneModal from './SceneModal'

// ─── Scene Card ───────────────────────────────────────────────────────────────

function SceneCard({
  scene,
  onEdit,
  overlay = false,
}: {
  scene: PlotScene
  onEdit?: () => void
  overlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-gray-100 p-3 shadow-sm select-none ${
        overlay ? 'rotate-2 shadow-lg' : 'hover:border-[#c7cbff] transition-colors'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
          tabIndex={-1}
          aria-label="拖曳"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="4.5" cy="3" r="1.2" />
            <circle cx="9.5" cy="3" r="1.2" />
            <circle cx="4.5" cy="7" r="1.2" />
            <circle cx="9.5" cy="7" r="1.2" />
            <circle cx="4.5" cy="11" r="1.2" />
            <circle cx="9.5" cy="11" r="1.2" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#181c1e] truncate">{scene.title}</p>
          {scene.summary && (
            <p className="text-xs text-[#6d6d6d] mt-0.5 line-clamp-2">{scene.summary}</p>
          )}
          {scene.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {scene.tags.map((t) => (
                <span key={t} className="text-[10px] bg-[#f2f4ff] text-[#4c5354] px-1.5 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {onEdit && (
          <button
            onClick={onEdit}
            className="flex-shrink-0 text-gray-300 hover:text-[#4c5354] transition-colors"
            aria-label="編輯"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Chapter Column ───────────────────────────────────────────────────────────

function ChapterColumn({
  chapter,
  onAddScene,
  onEditScene,
  onRenameChapter,
}: {
  chapter: PlotChapter
  onAddScene: (chapterId: string) => void
  onEditScene: (scene: PlotScene, chapterId: string) => void
  onRenameChapter: (chapterId: string, title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(chapter.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const sceneIds = chapter.scenes.map((s) => s.id)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commitRename() {
    const t = draftTitle.trim()
    if (t && t !== chapter.title) onRenameChapter(chapter.id, t)
    else setDraftTitle(chapter.title)
    setEditing(false)
  }

  return (
    <div
      className="flex-shrink-0 w-[340px] bg-[#f8f8f8] rounded-2xl border border-gray-100 flex flex-col"
      style={{ minHeight: 120 }}
    >
      {/* Column header */}
      <div className="px-4 pt-4 pb-2">
        {editing ? (
          <Input
            ref={inputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setDraftTitle(chapter.title); setEditing(false) }
            }}
            className="w-full text-sm font-semibold"
          />
        ) : (
          <button
            className="text-sm font-semibold text-[#181c1e] hover:text-[#4c5354] text-left w-full"
            onClick={() => setEditing(true)}
            title="點擊重新命名"
          >
            {chapter.title}
          </button>
        )}
        <p className="text-xs text-[#a0aec0] mt-0.5">{chapter.scenes.length} 個場景</p>
      </div>

      {/* Scene list */}
      <div className="flex-1 px-3 pb-2 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 480 }}>
        <SortableContext items={sceneIds} strategy={verticalListSortingStrategy}>
          {chapter.scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onEdit={() => onEditScene(scene, chapter.id)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add scene button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onAddScene(chapter.id)}
          className="w-full py-2 rounded-xl text-xs text-[#6d6d6d] hover:bg-white hover:text-[#4c5354] border-2 border-dashed border-gray-200 hover:border-[#c7cbff] transition-colors"
        >
          ＋ 新增場景
        </button>
      </div>
    </div>
  )
}

// ─── Main PlotBoard ───────────────────────────────────────────────────────────

export default function PlotBoard() {
  const { bookId } = useParams<{ bookId: string }>()
  const shelf = useShelfStore((s) => s.books)
  const book = shelf.find((b) => b.id === bookId)

  const [project, setProject] = useState<Project | null>(null)
  const [localActs, setLocalActs] = useState<PlotAct[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Drag state
  const [activeScene, setActiveScene] = useState<PlotScene | null>(null)

  // Modal state
  const [modalChapterId, setModalChapterId] = useState<string | null>(null)
  const [editingScene, setEditingScene] = useState<PlotScene | null | undefined>(undefined) // undefined = closed

  // Tag filter
  const [tagFilter, setTagFilter] = useState<string>('')

  // Load project
  useEffect(() => {
    if (!book) return
    const token = getAccessToken()
    if (!token) return
    loadProject(token, book.projectFileId).then((p) => {
      setProject(p)
      setLocalActs(p.plotBoard?.acts ?? [])
    }).catch(console.error)
  }, [book])

  // Warn on navigate away with unsaved changes
  useBeforeUnload(
    useCallback(
      (e) => {
        if (dirty) {
          e.preventDefault()
          e.returnValue = ''
        }
      },
      [dirty]
    )
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // All chapters flat, for modal
  const allChapters = useMemo(
    () => localActs.flatMap((a) => a.chapters),
    [localActs]
  )

  // All unique tags, for filter dropdown
  const allTags = useMemo(() => {
    const set = new Set<string>()
    localActs.forEach((a) => a.chapters.forEach((ch) => ch.scenes.forEach((s) => s.tags.forEach((t) => set.add(t)))))
    return Array.from(set).sort()
  }, [localActs])

  // Helpers to mutate localActs immutably
  function updateActs(fn: (acts: PlotAct[]) => PlotAct[]) {
    setLocalActs((prev) => fn(prev))
    setDirty(true)
  }

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

  // ── Drag handlers ────────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    const chId = findSceneContainer(active.id as string)
    if (!chId) return
    const loc = findChapterActIndex(chId)
    if (!loc) return
    const scene = localActs[loc.actIndex].chapters[loc.chapterIndex].scenes.find(
      (s) => s.id === active.id
    )!
    setActiveScene(scene)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const fromChId = findSceneContainer(active.id as string)
    if (!fromChId) return

    // over could be a scene id or a chapter id
    let toChId: string | null = null
    // Try: over.id is a scene id
    toChId = findSceneContainer(over.id as string)
    // If not found, over.id might be the chapter container id itself
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
      if (overIdx !== -1) {
        toCh.scenes.splice(overIdx, 0, moved)
      } else {
        toCh.scenes.push(moved)
      }

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

  // ── Scene CRUD ────────────────────────────────────────────────────────────────

  function openAddScene(chapterId: string) {
    setModalChapterId(chapterId)
    setEditingScene(null) // null = new scene
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
      if (idx !== -1) {
        ch.scenes[idx] = scene
      } else {
        ch.scenes.push({ ...scene, order: ch.scenes.length })
      }
      return next
    })
    setEditingScene(undefined)
    setModalChapterId(null)
  }

  // ── Act / Chapter CRUD ────────────────────────────────────────────────────────

  function addAct() {
    updateActs((acts) => [
      ...acts,
      {
        id: `act_${Date.now()}`,
        title: `第 ${acts.length + 1} 幕`,
        chapters: [
          { id: `ch_${Date.now()}`, title: `第 1 章`, scenes: [] },
        ],
      },
    ])
  }

  function addChapterToAct(actIndex: number) {
    updateActs((acts) => {
      const next = acts.map((a) => ({ ...a, chapters: [...a.chapters] }))
      const act = next[actIndex]
      act.chapters.push({
        id: `ch_${Date.now()}`,
        title: `第 ${act.chapters.length + 1} 章`,
        scenes: [],
      })
      return next
    })
  }

  function renameChapter(chapterId: string, title: string) {
    updateActs((acts) =>
      acts.map((a) => ({
        ...a,
        chapters: a.chapters.map((ch) => ch.id === chapterId ? { ...ch, title } : ch),
      }))
    )
  }

  function renameAct(actId: string, title: string) {
    updateActs((acts) =>
      acts.map((a) => a.id === actId ? { ...a, title } : a)
    )
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!project) return
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated: Project = { ...project, plotBoard: { acts: localActs } }
      await saveProject(token, updated)
      setProject(updated)
      setDirty(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────────

  const filteredActs = useMemo(() => {
    if (!tagFilter) return localActs
    return localActs.map((a) => ({
      ...a,
      chapters: a.chapters.map((ch) => ({
        ...ch,
        scenes: ch.scenes.filter((s) => s.tags.includes(tagFilter)),
      })),
    }))
  }, [localActs, tagFilter])

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!book) {
    return <div className="p-8 text-gray-400">找不到作品</div>
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-bold text-[#181c1e]">情節規劃看板</h1>

        <div className="flex-1" />

        {dirty && (
          <span className="text-xs text-amber-500 font-medium">有未儲存變更</span>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#4c5354] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30"
          >
            <option value="">全部標籤</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        <Button variant="ghost" onClick={addAct}>
          ＋ 新增幕
        </Button>

        <Button onClick={handleSave} disabled={!dirty || saving} loading={saving}>
          儲存變更
        </Button>
      </div>

      {saveError && (
        <div className="bg-red-50 border-b border-red-100 px-8 py-2 text-sm text-red-500">{saveError}</div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-8">
          {filteredActs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#a0aec0]">
              <p className="text-lg mb-4">尚無情節結構</p>
              <Button onClick={addAct}>＋ 新增第一幕</Button>
            </div>
          ) : (
            filteredActs.map((act, actIndex) => (
              <ActSection
                key={act.id}
                act={act}
                actIndex={actIndex}
                onAddChapter={() => addChapterToAct(actIndex)}
                onAddScene={openAddScene}
                onEditScene={openEditScene}
                onRenameChapter={renameChapter}
                onRenameAct={renameAct}
              />
            ))
          )}
        </div>

        <DragOverlay>
          {activeScene ? <SceneCard scene={activeScene} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Scene Modal */}
      {editingScene !== undefined && modalChapterId && (
        <SceneModal
          scene={editingScene}
          chapters={allChapters}
          bookFolderId={bookId!}
          onSave={handleSaveScene}
          onClose={() => { setEditingScene(undefined); setModalChapterId(null) }}
          defaultChapterId={modalChapterId}
        />
      )}
    </div>
  )
}

// ─── Act Section ──────────────────────────────────────────────────────────────

function ActSection({
  act,
  actIndex,
  onAddChapter,
  onAddScene,
  onEditScene,
  onRenameChapter,
  onRenameAct,
}: {
  act: PlotAct
  actIndex: number
  onAddChapter: () => void
  onAddScene: (chapterId: string) => void
  onEditScene: (scene: PlotScene, chapterId: string) => void
  onRenameChapter: (chapterId: string, title: string) => void
  onRenameAct: (actId: string, title: string) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(act.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftTitle(act.title)
  }, [act.title])

  useEffect(() => {
    if (editingTitle) inputRef.current?.focus()
  }, [editingTitle])

  function commitRename() {
    const t = draftTitle.trim()
    if (t && t !== act.title) onRenameAct(act.id, t)
    else setDraftTitle(act.title)
    setEditingTitle(false)
  }

  return (
    <div>
      {/* Act header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-gray-200" />
        {editingTitle ? (
          <Input
            ref={inputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setDraftTitle(act.title); setEditingTitle(false) }
            }}
            className="text-sm font-bold w-40"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-sm font-bold text-[#4c5354] hover:text-[#181c1e] px-2 py-1 rounded"
            title="點擊重新命名"
          >
            第 {actIndex + 1} 幕 — {act.title}
          </button>
        )}
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Chapter columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {act.chapters.map((chapter) => (
          <ChapterColumn
            key={chapter.id}
            chapter={chapter}
            onAddScene={onAddScene}
            onEditScene={onEditScene}
            onRenameChapter={onRenameChapter}
          />
        ))}

        {/* Add chapter button */}
        <button
          onClick={onAddChapter}
          className="flex-shrink-0 w-[200px] h-[80px] self-start rounded-2xl border-2 border-dashed border-gray-200 text-sm text-[#6d6d6d] hover:border-[#c7cbff] hover:text-[#4c5354] transition-colors"
        >
          ＋ 新增章節
        </button>
      </div>
    </div>
  )
}
