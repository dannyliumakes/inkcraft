import { useEffect, useRef, useState } from 'react'
import type { PlotAct, PlotScene } from '../../../shared/types/project'
import { Input } from '../../../shared/components/ui'
import ChapterColumn from './ChapterColumn'

interface Props {
  act: PlotAct
  actIndex: number
  onAddChapter: () => void
  onAddScene: (chapterId: string) => void
  onEditScene: (scene: PlotScene, chapterId: string) => void
  onRenameChapter: (chapterId: string, title: string) => void
  onRenameAct: (actId: string, title: string) => void
}

const styles = {
  header: 'flex items-center gap-3 mb-4',
  divider: 'h-px flex-1 bg-gray-200',
  actBtn: 'text-sm font-bold text-muted hover:text-primary px-2 py-1 rounded',
  body: 'flex gap-4 overflow-x-auto pb-2',
  addChapterBtn: 'flex-shrink-0 w-[200px] h-[80px] self-start rounded-2xl border-2 border-dashed border-gray-200 text-sm text-secondary hover:border-accent-border hover:text-muted transition-colors',
}

export default function ActSection({
  act, actIndex, onAddChapter, onAddScene, onEditScene, onRenameChapter, onRenameAct,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(act.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraftTitle(act.title) }, [act.title])
  useEffect(() => { if (editingTitle) inputRef.current?.focus() }, [editingTitle])

  function commitRename() {
    const t = draftTitle.trim()
    if (t && t !== act.title) onRenameAct(act.id, t)
    else setDraftTitle(act.title)
    setEditingTitle(false)
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.divider} />
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
            className={styles.actBtn}
            title="點擊重新命名"
          >
            第 {actIndex + 1} 幕 — {act.title}
          </button>
        )}
        <div className={styles.divider} />
      </div>

      <div className={styles.body}>
        {act.chapters.map((chapter) => (
          <ChapterColumn
            key={chapter.id}
            chapter={chapter}
            onAddScene={onAddScene}
            onEditScene={onEditScene}
            onRenameChapter={onRenameChapter}
          />
        ))}
        <button onClick={onAddChapter} className={styles.addChapterBtn}>
          ＋ 新增章節
        </button>
      </div>
    </div>
  )
}
