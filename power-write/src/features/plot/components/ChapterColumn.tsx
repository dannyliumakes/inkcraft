import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Scene } from '../../../shared/types/project'
import SceneCard from './SceneCard'

interface Props {
  chapterId: string
  title: string
  scenes: Scene[]
  onAddScene: (chapterId: string) => void
  onEditScene: (scene: Scene) => void
}

const styles = {
  root: 'flex-shrink-0 w-[340px] bg-surface rounded-2xl border border-gray-100 flex flex-col',
  header: 'px-4 pt-4 pb-2',
  title: 'text-sm font-semibold text-primary truncate',
  sceneCount: 'text-xs text-placeholder mt-0.5',
  body: 'flex-1 px-3 pb-2 flex flex-col gap-2 overflow-y-auto',
  footer: 'px-3 pb-3',
  addBtn: 'w-full py-2 rounded-xl text-xs text-secondary hover:bg-white hover:text-muted border-2 border-dashed border-gray-200 hover:border-accent-border transition-colors',
}

export default function ChapterColumn({ chapterId, title, scenes, onAddScene, onEditScene }: Props) {
  const sceneIds = scenes.map((s) => s.id)

  return (
    <div className={styles.root} style={{ minHeight: 120 }}>
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        <p className={styles.sceneCount}>{scenes.length} 個場景</p>
      </div>

      <div className={styles.body} style={{ maxHeight: 480 }}>
        <SortableContext items={sceneIds} strategy={verticalListSortingStrategy}>
          {scenes.map((scene) => (
            <SceneCard key={scene.id} scene={scene} onEdit={() => onEditScene(scene)} />
          ))}
        </SortableContext>
      </div>

      <div className={styles.footer}>
        <button onClick={() => onAddScene(chapterId)} className={styles.addBtn}>
          ＋ 新增場景
        </button>
      </div>
    </div>
  )
}
