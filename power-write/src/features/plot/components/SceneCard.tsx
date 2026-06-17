import { useRef, useState } from 'react'
import { DropdownMenu } from '../../../shared/components/ui'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PlotScene } from '../../../shared/types/project'

interface Props {
  scene: PlotScene
  onSave?: (title: string) => void
  onDelete?: () => void
  overlay?: boolean
}

const styles = {
  root: (overlay: boolean, isDragging: boolean) =>
    `bg-white rounded-xl border p-3 shadow-sm select-none min-h-[96px] flex flex-col gap-2 ${
      overlay ? 'rotate-2 shadow-lg border-accent-border' :
      isDragging ? 'opacity-30 border-gray-100' :
      'border-gray-100 hover:border-accent-border transition-colors'
    }`,
  topRow: 'flex items-start gap-2',
  dragHandle: 'mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0',
  textWrap: 'flex-1 min-w-0',
  text: (isDefault: boolean) =>
    `text-sm leading-relaxed line-clamp-4 ${isDefault ? 'text-placeholder italic' : 'text-primary'}`,
  textarea: 'w-full text-sm leading-relaxed text-primary bg-transparent outline-none resize-none min-h-[80px]',
  dotsBtn: 'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-placeholder opacity-0 group-hover:opacity-100 transition-opacity',
  tags: 'flex flex-wrap gap-1',
  tag: 'text-[10px] bg-accent-light text-muted px-1.5 py-0.5 rounded-full',
}

export default function SceneCard({ scene, onSave, onDelete, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id })
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(scene.title)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isDefault = scene.title === '未輸入文字'

  function startEdit() {
    if (overlay) return
    setEditVal(isDefault ? '' : scene.title)
    setEditing(true)
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }, 0)
  }

  function commitEdit() {
    setEditing(false)
    const trimmed = editVal.trim()
    const next = trimmed || '未輸入文字'
    if (next !== scene.title) onSave?.(next)
  }

  return (
    <div ref={setNodeRef} style={style} className={`group relative ${styles.root(overlay, isDragging && !overlay)}`}>
      <div className={styles.topRow}>
        <button
          {...listeners}
          {...attributes}
          className={styles.dragHandle}
          tabIndex={-1}
          aria-label="拖曳"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <svg width="12" height="14" viewBox="0 0 10 12" fill="currentColor">
            <circle cx="3" cy="2" r="1" />
            <circle cx="7" cy="2" r="1" />
            <circle cx="3" cy="6" r="1" />
            <circle cx="7" cy="6" r="1" />
            <circle cx="3" cy="10" r="1" />
            <circle cx="7" cy="10" r="1" />
          </svg>
        </button>

        <div className={styles.textWrap} onClick={startEdit}>
          {editing ? (
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
                if (e.key === 'Escape') { setEditing(false) }
              }}
            />
          ) : (
            <p className={styles.text(isDefault)}>{scene.title}</p>
          )}
        </div>

        {!overlay && (
          <DropdownMenu
            trigger={
              <button className={styles.dotsBtn} aria-label="更多">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="3" r="1.2" fill="currentColor"/>
                  <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
                  <circle cx="7" cy="11" r="1.2" fill="currentColor"/>
                </svg>
              </button>
            }
            items={[{ label: '刪除', onClick: () => onDelete?.(), variant: 'danger' }]}
            minWidth="min-w-[88px]"
          />
        )}
      </div>

      {scene.tags.length > 0 && (
        <div className={styles.tags}>
          {scene.tags.map((t) => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
