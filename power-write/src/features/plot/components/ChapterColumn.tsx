import { useEffect, useRef, useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { PlotChapter, PlotScene } from '../../../shared/types/project'
import { Input } from '../../../shared/components/ui'
import SceneCard from './SceneCard'

interface Props {
  chapter: PlotChapter
  onAddScene: (chapterId: string) => void
  onEditScene: (scene: PlotScene, chapterId: string) => void
  onRenameChapter: (chapterId: string, title: string) => void
}

const styles = {
  root: 'flex-shrink-0 w-[340px] bg-surface rounded-2xl border border-gray-100 flex flex-col',
  header: 'px-4 pt-4 pb-2',
  titleBtn: 'text-sm font-semibold text-primary hover:text-muted text-left w-full',
  sceneCount: 'text-xs text-placeholder mt-0.5',
  body: 'flex-1 px-3 pb-2 flex flex-col gap-2 overflow-y-auto',
  footer: 'px-3 pb-3',
  addBtn: 'w-full py-2 rounded-xl text-xs text-secondary hover:bg-white hover:text-muted border-2 border-dashed border-gray-200 hover:border-accent-border transition-colors',
}

export default function ChapterColumn({ chapter, onAddScene, onEditScene, onRenameChapter }: Props) {
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
    <div className={styles.root} style={{ minHeight: 120 }}>
      <div className={styles.header}>
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
            className={styles.titleBtn}
            onClick={() => setEditing(true)}
            title="點擊重新命名"
          >
            {chapter.title}
          </button>
        )}
        <p className={styles.sceneCount}>{chapter.scenes.length} 個場景</p>
      </div>

      <div className={styles.body} style={{ maxHeight: 480 }}>
        <SortableContext items={sceneIds} strategy={verticalListSortingStrategy}>
          {chapter.scenes.map((scene) => (
            <SceneCard key={scene.id} scene={scene} onEdit={() => onEditScene(scene, chapter.id)} />
          ))}
        </SortableContext>
      </div>

      <div className={styles.footer}>
        <button
          onClick={() => onAddScene(chapter.id)}
          className={styles.addBtn}
        >
          ＋ 新增場景
        </button>
      </div>
    </div>
  )
}
