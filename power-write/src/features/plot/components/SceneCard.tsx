import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Scene } from '../../../shared/types/project'

interface Props {
  scene: Scene
  onEdit?: () => void
  overlay?: boolean
}

const styles = {
  root: (overlay: boolean) =>
    `bg-white rounded-xl border border-gray-100 p-3 shadow-sm select-none ${
      overlay ? 'rotate-2 shadow-lg' : 'hover:border-accent-border transition-colors'
    }`,
  inner: 'flex items-start gap-2',
  dragHandle: 'mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0',
  content: 'flex-1 min-w-0',
  title: 'text-sm font-medium text-primary truncate',
  summary: 'text-xs text-secondary mt-0.5 line-clamp-2',
  tags: 'flex flex-wrap gap-1 mt-1.5',
  tag: 'text-[10px] bg-accent-light text-muted px-1.5 py-0.5 rounded-full',
  editBtn: 'flex-shrink-0 text-gray-300 hover:text-muted transition-colors',
}

export default function SceneCard({ scene, onEdit, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.root(overlay)}>
      <div className={styles.inner}>
        <button
          {...listeners}
          {...attributes}
          className={styles.dragHandle}
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

        <div className={styles.content}>
          <p className={styles.title}>{scene.title}</p>
          {scene.summary && (
            <p className={styles.summary}>{scene.summary}</p>
          )}
          {scene.tags.length > 0 && (
            <div className={styles.tags}>
              {scene.tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {onEdit && (
          <button onClick={onEdit} className={styles.editBtn} aria-label="編輯">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
