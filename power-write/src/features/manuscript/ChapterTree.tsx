import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Project, Chapter, Act } from '../../shared/types/project'
import { makeDefaultScene } from '../../shared/types/project'
import { createTextFile, trashFile } from '../../shared/services/drive'
import { saveProject } from '../../shared/services/projectRepo'
import { getAccessToken } from '../../shared/stores/authStore'
import { Input, DropdownMenu } from '../../shared/components/ui'

interface Props {
  project: Project
  activeChapterId: string | null
  onSelectChapter: (ch: Chapter) => void
  onProjectUpdate: (p: Project) => void
}

// ── flat list types ───────────────────────────────────────────────────────────

type FlatItem =
  | { kind: 'act'; id: string; item: Act }
  | { kind: 'chapter'; id: string; item: Chapter }

function buildFlatList(project: Project): FlatItem[] {
  return [
    ...(project.acts ?? []).map((a): FlatItem => ({ kind: 'act', id: a.id, item: a })),
    ...project.chapters.map((c): FlatItem => ({ kind: 'chapter', id: c.id, item: c })),
  ].sort((a, b) => a.item.order - b.item.order)
}

function applyReorder(project: Project, reordered: FlatItem[]): Project {
  const numbered = reordered.map((fi, i) => ({ ...fi, item: { ...fi.item, order: i + 1 } }))
  return {
    ...project,
    acts: numbered.filter((fi) => fi.kind === 'act').map((fi) => fi.item as Act),
    chapters: numbered.filter((fi) => fi.kind === 'chapter').map((fi) => fi.item as Chapter),
    updatedAt: new Date().toISOString(),
    rev: project.rev + 1,
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toOrdinal(n: number) {
  const map: Record<number, string> = {
    1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
    6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
  }
  return map[n] ?? String(n)
}

// ── DeleteConfirmPopup ────────────────────────────────────────────────────────

const popupStyles = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/30',
  box: 'bg-white rounded-2xl shadow-xl p-6 w-80 flex flex-col gap-4',
  msg: 'text-sm text-muted leading-relaxed',
  actions: 'flex justify-end gap-2',
  cancel: 'px-4 py-1.5 text-sm rounded-lg border border-gray-200 text-secondary hover:bg-gray-50',
  confirm: 'px-4 py-1.5 text-sm rounded-lg bg-danger text-white hover:opacity-90',
}

function DeleteConfirmPopup({
  message, onConfirm, onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className={popupStyles.overlay} onClick={onCancel}>
      <div className={popupStyles.box} onClick={(e) => e.stopPropagation()}>
        <p className={popupStyles.msg}>{message}</p>
        <div className={popupStyles.actions}>
          <button className={popupStyles.cancel} onClick={onCancel}>取消</button>
          <button className={popupStyles.confirm} onClick={onConfirm}>刪除</button>
        </div>
      </div>
    </div>
  )
}

// ── DotsTrigger ───────────────────────────────────────────────────────────────

function DotsTrigger() {
  return (
    <button
      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-placeholder opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="更多"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="3" r="1.2" fill="currentColor"/>
        <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
        <circle cx="7" cy="11" r="1.2" fill="currentColor"/>
      </svg>
    </button>
  )
}

// ── DragHandle ────────────────────────────────────────────────────────────────

function DragHandle(props: Record<string, unknown>) {
  return (
    <span
      {...props}
      className="w-4 h-4 flex items-center justify-center text-placeholder cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
    >
      <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
        <circle cx="3" cy="2" r="1" fill="currentColor"/>
        <circle cx="7" cy="2" r="1" fill="currentColor"/>
        <circle cx="3" cy="6" r="1" fill="currentColor"/>
        <circle cx="7" cy="6" r="1" fill="currentColor"/>
        <circle cx="3" cy="10" r="1" fill="currentColor"/>
        <circle cx="7" cy="10" r="1" fill="currentColor"/>
      </svg>
    </span>
  )
}

// ── SortableActRow ────────────────────────────────────────────────────────────

const actRowStyles = {
  row: (isDragging: boolean) =>
    `group flex items-center gap-1 px-2 py-2 select-none ${isDragging ? 'opacity-40' : ''}`,
  ordinal: 'text-[10px] text-placeholder shrink-0',
  title: 'flex-1 text-sm font-medium text-muted truncate',
}

interface SortableActRowProps {
  act: Act
  actIdx: number
  editingActId: string | null
  editingActTitle: string
  onEditingActIdChange: (id: string | null) => void
  onEditingActTitleChange: (title: string) => void
  onCommitRename: (act: Act) => void
  onDelete: () => void
}

function SortableActRow({
  act, actIdx, editingActId, editingActTitle,
  onEditingActIdChange, onEditingActTitleChange, onCommitRename, onDelete,
}: SortableActRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: act.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const isEditing = editingActId === act.id

  return (
    <div ref={setNodeRef} style={style}>
      <div className={actRowStyles.row(isDragging)}>
        <DragHandle {...attributes} {...listeners} />
        <span className={actRowStyles.ordinal}>第{toOrdinal(actIdx + 1)}幕</span>
        {isEditing ? (
          <Input
            className="flex-1 text-sm"
            value={editingActTitle}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onEditingActTitleChange(e.target.value)}
            onBlur={() => onCommitRename(act)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename(act)
              if (e.key === 'Escape') onEditingActIdChange(null)
            }}
          />
        ) : (
          <span
            className={actRowStyles.title}
            onDoubleClick={() => { onEditingActIdChange(act.id); onEditingActTitleChange(act.title) }}
          >
            {act.title}
          </span>
        )}
        <DropdownMenu
          trigger={<DotsTrigger />}
          items={[{ label: '刪除', onClick: onDelete, variant: 'danger' }]}
        />
      </div>
    </div>
  )
}

// ── SortableChapterRow ────────────────────────────────────────────────────────

const chapterRowStyles = {
  row: (isActive: boolean, isDragging: boolean) =>
    `group flex items-center gap-1 pl-6 pr-2 py-2 cursor-pointer select-none ${
      isDragging ? 'opacity-40' : isActive ? 'bg-accent-softer' : 'hover:bg-gray-50'
    }`,
  ordinal: 'text-[10px] text-placeholder shrink-0',
  title: (isActive: boolean) =>
    `flex-1 text-sm truncate ${isActive ? 'text-muted font-medium' : 'text-secondary'}`,
  wordCount: 'text-xs text-placeholder shrink-0',
}

interface SortableChapterRowProps {
  chapter: Chapter
  chapterIdx: number
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}

function SortableChapterRow({
  chapter, chapterIdx, isActive, onSelect, onDelete, onRename,
}: SortableChapterRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chapter.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(chapter.title)

  function commitRename() {
    setEditing(false)
    if (editVal.trim() && editVal !== chapter.title) onRename(editVal.trim())
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className={chapterRowStyles.row(isActive, isDragging)} onClick={onSelect}>
        <DragHandle {...attributes} {...listeners} />
        <span className={chapterRowStyles.ordinal}>第{toOrdinal(chapterIdx + 1)}章</span>
        {editing ? (
          <Input
            className="flex-1 text-sm"
            value={editVal}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span
            data-testid="chapter-title"
            className={chapterRowStyles.title(isActive)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditVal(chapter.title) }}
          >
            {chapter.title}
          </span>
        )}
        {chapter.wordCount > 0 && (
          <span className={chapterRowStyles.wordCount}>{chapter.wordCount}字</span>
        )}
        <DropdownMenu
          trigger={<DotsTrigger />}
          items={[{ label: '刪除', onClick: onDelete, variant: 'danger' }]}
        />
      </div>
    </div>
  )
}

// ── Main styles ───────────────────────────────────────────────────────────────

const styles = {
  root: 'flex flex-col h-full',
  header: 'flex items-center gap-1 px-3 py-2 border-b border-gray-100',
  headerLabel: 'field-label flex-1 uppercase tracking-wide',
  addBtn: 'relative flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 text-placeholder text-xs',
  list: 'flex-1 overflow-y-auto',
  emptyMsg: 'text-xs text-placeholder text-center mt-6 px-3',
}

// ── ChapterTree ───────────────────────────────────────────────────────────────

export default function ChapterTree({ project, activeChapterId, onSelectChapter, onProjectUpdate }: Props) {
  const { t } = useTranslation()
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [editingActId, setEditingActId] = useState<string | null>(null)
  const [editingActTitle, setEditingActTitle] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const flatList = buildFlatList(project)

  // running counters for display labels
  let actCounter = 0
  let chapterCounter = 0

  // ── add handlers ──────────────────────────────────────────────────────────

  function maxOrder() {
    return Math.max(0, ...flatList.map((fi) => fi.item.order))
  }

  function handleAddAct() {
    const token = getAccessToken()
    if (!token) return
    const newAct: Act = { id: `act_${Date.now()}`, title: '我的幕次', order: maxOrder() + 1 }
    const updated: Project = {
      ...project,
      acts: [...(project.acts ?? []), newAct],
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(updated)
    saveProject(token, updated)
  }

  function handleAddChapter() {
    const token = getAccessToken()
    if (!token) return
    const newId = `ch_${Date.now()}`
    const newChapter: Chapter = {
      id: newId,
      title: '我的章節',
      order: maxOrder() + 1,
      fileId: '',
      wordCount: 0,
      rev: 0,
      scenes: [makeDefaultScene()],
    }
    const optimistic: Project = {
      ...project,
      chapters: [...project.chapters, newChapter],
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    onProjectUpdate(optimistic)

    createTextFile(token, `${newId}.md`, project.manuscriptFolderId, '', 'text/markdown').then((fileId) => {
      const withFileId: Project = {
        ...optimistic,
        chapters: optimistic.chapters.map((c) => c.id === newId ? { ...c, fileId } : c),
      }
      onProjectUpdate(withFileId)
      saveProject(token, withFileId)
    })
  }

  // ── delete handlers ───────────────────────────────────────────────────────

  function confirmDeleteAct(act: Act) {
    setDeleteConfirm({
      message: t('chapter_tree.delete_confirm_act'),
      onConfirm: () => {
        setDeleteConfirm(null)
        const token = getAccessToken()
        if (!token) return
        // remove act from flat list and renormalize order
        const remaining = flatList.filter((fi) => fi.id !== act.id)
        const updated = applyReorder(project, remaining)
        onProjectUpdate(updated)
        saveProject(token, updated)
      },
    })
  }

  function confirmDeleteChapter(ch: Chapter) {
    setDeleteConfirm({
      message: t('chapter_tree.delete_confirm_chapter', { title: ch.title }),
      onConfirm: () => {
        setDeleteConfirm(null)
        const token = getAccessToken()
        if (!token) return
        const remaining = flatList.filter((fi) => fi.id !== ch.id)
        const updated = applyReorder(project, remaining)
        onProjectUpdate(updated)
        if (ch.fileId) trashFile(token, ch.fileId)
        saveProject(token, updated)
      },
    })
  }

  // ── rename act ────────────────────────────────────────────────────────────

  async function commitActRename(act: Act) {
    setEditingActId(null)
    if (!editingActTitle.trim() || editingActTitle === act.title) return
    const token = getAccessToken()
    if (!token) return
    const updated: Project = {
      ...project,
      acts: project.acts.map((a) => a.id === act.id ? { ...a, title: editingActTitle.trim() } : a),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    await saveProject(token, updated)
    onProjectUpdate(updated)
  }

  // ── rename chapter ────────────────────────────────────────────────────────

  async function handleRenameChapter(ch: Chapter, title: string) {
    const token = getAccessToken()
    if (!token) return
    const updated: Project = {
      ...project,
      chapters: project.chapters.map((c) => c.id === ch.id ? { ...c, title } : c),
      updatedAt: new Date().toISOString(),
      rev: project.rev + 1,
    }
    await saveProject(token, updated)
    onProjectUpdate(updated)
  }

  // ── drag-end ──────────────────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const token = getAccessToken()
    if (!token) return

    const oldIdx = flatList.findIndex((fi) => fi.id === active.id)
    const newIdx = flatList.findIndex((fi) => fi.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const reordered = arrayMove(flatList, oldIdx, newIdx)
    const updated = applyReorder(project, reordered)
    onProjectUpdate(updated)
    saveProject(token, updated)
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      {deleteConfirm && (
        <DeleteConfirmPopup
          message={deleteConfirm.message}
          onConfirm={deleteConfirm.onConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div className={styles.header}>
        <span className={styles.headerLabel}>{t('chapter_tree.header')}</span>
        <DropdownMenu
          trigger={
            <button className={styles.addBtn}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              新增
            </button>
          }
          items={[
            { label: t('chapter_tree.add_act'), onClick: handleAddAct },
            { label: t('chapter_tree.add_chapter'), onClick: handleAddChapter },
          ]}
          minWidth="min-w-[110px]"
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className={styles.list}>
          {flatList.length === 0 && (
            <p className={styles.emptyMsg}>{t('chapter_tree.empty')}</p>
          )}

          <SortableContext items={flatList.map((fi) => fi.id)} strategy={verticalListSortingStrategy}>
            {flatList.map((fi) => {
              if (fi.kind === 'act') {
                const idx = actCounter++
                return (
                  <SortableActRow
                    key={fi.id}
                    act={fi.item as Act}
                    actIdx={idx}
                    editingActId={editingActId}
                    editingActTitle={editingActTitle}
                    onEditingActIdChange={setEditingActId}
                    onEditingActTitleChange={setEditingActTitle}
                    onCommitRename={commitActRename}
                    onDelete={() => confirmDeleteAct(fi.item as Act)}
                  />
                )
              } else {
                const idx = chapterCounter++
                return (
                  <SortableChapterRow
                    key={fi.id}
                    chapter={fi.item as Chapter}
                    chapterIdx={idx}
                    isActive={activeChapterId === fi.id}
                    onSelect={() => onSelectChapter(fi.item as Chapter)}
                    onDelete={() => confirmDeleteChapter(fi.item as Chapter)}
                    onRename={(title) => handleRenameChapter(fi.item as Chapter, title)}
                  />
                )
              }
            })}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  )
}
