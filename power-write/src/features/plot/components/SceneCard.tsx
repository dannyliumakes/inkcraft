import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Scene } from '../../../shared/types/project'

interface Props {
  scene: Scene
  idx?: number      // 0-based; displayed as 場景 N (idx + 1)
  onOpen?: () => void
  overlay?: boolean
}

const styles = {
  root: (overlay: boolean) =>
    `bg-white rounded-xl border border-gray-100 p-3 shadow-sm select-none ${
      overlay ? 'rotate-2 shadow-lg' : 'hover:border-accent-border transition-colors cursor-pointer'
    }`,
  inner: 'flex items-center gap-2',
  dragHandle: 'text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0',
  label: 'flex-1 text-sm font-medium text-primary',
}

export default function SceneCard({ scene, idx = 0, onOpen, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.root(overlay)} onClick={onOpen}>
      <div className={styles.inner}>
        <button
          {...listeners}
          {...attributes}
          className={styles.dragHandle}
          tabIndex={-1}
          aria-label="拖曳"
          onClick={(e) => e.stopPropagation()}
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

        <span className={styles.label}>場景 {idx + 1}</span>
      </div>
    </div>
  )
}
