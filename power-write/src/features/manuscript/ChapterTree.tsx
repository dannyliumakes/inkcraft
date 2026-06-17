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
import type { Project, Chapter, Act, Scene } from '../../shared/types/project'
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

// ── helpers ──────────────────────────────────────────────────────────────────

function toOrdinal(n: number) {
  const map: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十' }
  return map[n] ?? String(n)
}

function chapterLabel(globalIdx: number) {
  return `第${toOrdinal(globalIdx + 1)}章`
}

function actLabel(order: number) {
  return `第${toOrdinal(order)}幕`
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

function DeleteConfirmPopup({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
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

// ── DotsMenuTrigger ───────────────────────────────────────────────────────────

const dotsTriggerClass = 'w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-placeholder opacity-0 group-hover:opacity-100 transition-opacity'

function DotsTrigger() {
  return (
    <button className={dotsTriggerClass} aria-label="更多">
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

// ── PlotSceneRow ──────────────────────────────────────────────────────────────

const sceneStyles = {
  row: 'flex items-center gap-1 pl-10 pr-2 py-1 select-none',
  label: 'text-[10px] text-placeholder shrink-0',
}

// 場景沒有標題／摘要，僅以序號呈現，與情節看板、原稿編輯器同步。
function PlotSceneRow({ idx }: { scene: Scene; idx: number }) {
  return (
    <div className={sceneStyles.row}>
      <span className={sceneStyles.label}>場景{idx + 1}</span>
    </div>
  )
}

// ── SortableChapter ───────────────────────────────────────────────────────────

const chapterStyles = {
  row: (isActive: boolean, isDragging: boolean) =>
    `group flex items-center gap-1 pl-6 pr-2 py-2 cursor-pointer select-none ${
      isDragging ? 'opacity-40' : isActive ? 'bg-accent-softer' : 'hover:bg-gray-50'
    }`,
  label: 'text-[10px] text-placeholder shrink-0',
  title: (isActive: boolean) => `flex-1 text-sm truncate ${isActive ? 'text-muted font-medium' : 'text-secondary'}`,
  wordCount: 'text-xs text-placeholder shrink-0',
}

interface SortableChapterProps {
  chapter: Chapter
  globalIdx: number
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
  plotScenes: Scene[]
}

function SortableChapter({
  chapter,
  globalIdx,
  isActive,
  onSelect,
  onDelete,
  onRename,
  plotScenes,
}: SortableChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id, data: { actId: chapter.actId } })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(chapter.title)

  function commitRename() {
    setEditing(false)
    if (editVal.trim() && editVal !== chapter.title) onRename(editVal.trim())
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className={chapterStyles.row(isActive, isDragging)} onClick={onSelect}>
        <DragHandle {...attributes} {...listeners} />
        <span className={chapterStyles.label}>{chapterLabel(globalIdx)}</span>
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
            className={chapterStyles.title(isActive)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditVal(chapter.title) }}
          >
            {chapter.title}
          </span>
        )}
        {chapter.wordCount > 0 && <span className={chapterStyles.wordCount}>{chapter.wordCount}字</span>}
        <DropdownMenu
          trigger={<DotsTrigger />}
          items={[{ label: '刪除', onClick: onDelete, variant: 'danger' }]}
        />
      </div>

      {plotScenes.map((sc, si) => (
        <PlotSceneRow key={sc.id} scene={sc} idx={si} />
      ))}
    </div>
  )
}

// ── SortableActSection ────────────────────────────────────────────────────────

interface SortableActSectionProps {
  act: Act
  editingActId: string | null
  editingActTitle: string
  onEditingActIdChange: (id: string | null) => void
  onEditingActTitleChange: (title: string) => void
  onCommitRename: (act: Act) => void
  onDelete: () => void
  children: React.ReactNode
}

function SortableActSection({
  act,
  editingActId,
  editingActTitle,
  onEditingActIdChange,
  onEditingActTitleChange,
  onCommitRename,
  onDelete,
  children,
}: SortableActSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: act.id, data: { type: 'act' } })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const isEditing = editingActId === act.id

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : ''}>
      <div className={actSectionStyles.header}>
        <DragHandle {...attributes} {...listeners} />
        <span className={actSectionStyles.label}>{actLabel(act.order)}</span>
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
            className={actSectionStyles.title}
            onDoubleClick={() => { onEditingActIdChange(act.id); onEditingActTitleChange(act.title) }}
          >
            {act.title}
          </span>
        )}
        <div className={actSectionStyles.dots}>
          <DropdownMenu
            trigger={<DotsTrigger />}
            items={[{ label: '刪除', onClick: onDelete, variant: 'danger' }]}
          />
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Act section styles ────────────────────────────────────────────────────────

const actSectionStyles = {
  header: 'group flex items-center gap-1 px-2 py-2 select-none',
  label: 'text-[10px] text-placeholder shrink-0',
  title: 'flex-1 text-sm font-medium text-muted truncate',
  dots: 'ml-auto',
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
  // delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // act inline editing
  const [editingActId, setEditingActId] = useState<string | null>(null)
  const [editingActTitle, setEditingActTitle] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const acts = [...(project.acts ?? [])].sort((a, b) => a.order - b.order)

  function chaptersForAct(actId: string) {
    return project.chapters.filter((c) => c.actId === actId).sort((a, b) => a.order - b.order)
  }

  // ── add handlers (optimistic) ─────────────────────────────────────────────

  function handleAddAct() {
    const token = getAccessToken()
    if (!token) return
    const newOrder = acts.length > 0 ? acts[acts.length - 1].order + 1 : 1
    const newAct: Act = { id: `act_${Date.now()}`, title: '我的幕次', order: newOrder }
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

    // use first act, or create one inline if none exists
    let targetProject = project
    let targetActId: string
    if ((project.acts ?? []).length === 0) {
      const newAct: Act = { id: `act_${Date.now()}`, title: '我的幕次', order: 1 }
      targetProject = { ...project, acts: [newAct] }
      targetActId = newAct.id
    } else {
      targetActId = acts[acts.length - 1].id
    }

    const actChapters = chaptersForAct(targetActId)
    const newOrder = actChapters.length > 0 ? actChapters[actChapters.length - 1].order + 1 : 1
    const newId = `ch_${Date.now()}`

    // placeholder fileId shown immediately; real Drive file created in background
    const newChapter: Chapter = {
      id: newId,
      title: '我的章節',
      order: newOrder,
      actId: targetActId,
      fileId: '',
      wordCount: 0,
      rev: 0,
      scenes: [makeDefaultScene()],
    }
    const optimistic: Project = {
      ...targetProject,
      chapters: [...targetProject.chapters, newChapter],
      updatedAt: new Date().toISOString(),
      rev: targetProject.rev + 1,
    }
    onProjectUpdate(optimistic)

    // create Drive file in background, then patch real fileId and save
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
        const updated: Project = {
          ...project,
          acts: project.acts.filter((a) => a.id !== act.id),
          chapters: project.chapters.filter((c) => c.actId !== act.id),
          updatedAt: new Date().toISOString(),
          rev: project.rev + 1,
        }
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
        const updated: Project = {
          ...project,
          chapters: project.chapters.filter((c) => c.id !== ch.id),
          updatedAt: new Date().toISOString(),
          rev: project.rev + 1,
        }
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

  // ── drag-end (acts + chapters) ────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const token = getAccessToken()
    if (!token) return

    // act drag — only allow dropping onto another act
    if (active.data.current?.type === 'act') {
      if (over.data.current?.type !== 'act') return
      const oldIdx = acts.findIndex((a) => a.id === active.id)
      const newIdx = acts.findIndex((a) => a.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return
      const reordered = arrayMove(acts, oldIdx, newIdx).map((a, i) => ({ ...a, order: i + 1 }))
      const updated: Project = { ...project, acts: reordered, updatedAt: new Date().toISOString(), rev: project.rev + 1 }
      onProjectUpdate(updated)
      saveProject(token, updated)
      return
    }

    // chapter drag
    const sourceActId = active.data.current?.actId as string | undefined
    const targetActId = over.data.current?.actId as string | undefined
    if (!sourceActId || !targetActId) return

    if (sourceActId === targetActId) {
      const actChapters = chaptersForAct(sourceActId)
      const oldIdx = actChapters.findIndex((c) => c.id === active.id)
      const newIdx = actChapters.findIndex((c) => c.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return
      const reordered = arrayMove(actChapters, oldIdx, newIdx).map((c, i) => ({ ...c, order: i + 1 }))
      const updatedChapters = project.chapters.map((c) => reordered.find((r) => r.id === c.id) ?? c)
      const updated: Project = { ...project, chapters: updatedChapters, updatedAt: new Date().toISOString(), rev: project.rev + 1 }
      onProjectUpdate(updated)
      saveProject(token, updated)
    } else {
      const targetActChapters = chaptersForAct(targetActId)
      const overIdx = targetActChapters.findIndex((c) => c.id === over.id)
      const insertOrder = overIdx >= 0 ? targetActChapters[overIdx].order + 0.5 : (targetActChapters[targetActChapters.length - 1]?.order ?? 0) + 1

      const withoutActive = project.chapters.filter((c) => c.id !== active.id)
      const movedChapter = { ...project.chapters.find((c) => c.id === active.id)!, actId: targetActId, order: insertOrder }
      const newTargetChapters = [...withoutActive.filter((c) => c.actId === targetActId), movedChapter]
        .sort((a, b) => a.order - b.order)
        .map((c, i) => ({ ...c, order: i + 1 }))
      const updatedChapters = [
        ...withoutActive.filter((c) => c.actId !== targetActId),
        ...newTargetChapters,
      ]
      const updated: Project = { ...project, chapters: updatedChapters, updatedAt: new Date().toISOString(), rev: project.rev + 1 }
      onProjectUpdate(updated)
      saveProject(token, updated)
    }
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
          {acts.length === 0 && (
            <p className={styles.emptyMsg}>{t('chapter_tree.empty')}</p>
          )}

          <SortableContext items={acts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            {acts.map((act) => {
              const actChapters = chaptersForAct(act.id)
              return (
                <SortableActSection
                  key={act.id}
                  act={act}
                  editingActId={editingActId}
                  editingActTitle={editingActTitle}
                  onEditingActIdChange={setEditingActId}
                  onEditingActTitleChange={setEditingActTitle}
                  onCommitRename={commitActRename}
                  onDelete={() => confirmDeleteAct(act)}
                >
                  <SortableContext
                    items={actChapters.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {actChapters.map((ch, actLocalIdx) => (
                      <SortableChapter
                        key={ch.id}
                        chapter={ch}
                        globalIdx={actLocalIdx}
                        isActive={activeChapterId === ch.id}
                        onSelect={() => onSelectChapter(ch)}
                        onDelete={() => confirmDeleteChapter(ch)}
                        onRename={(title) => handleRenameChapter(ch, title)}
                        plotScenes={[...(ch.scenes ?? [])].sort((a, b) => a.order - b.order)}
                      />
                    ))}
                  </SortableContext>
                </SortableActSection>
              )
            })}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  )
}
