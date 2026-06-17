import { useMemo, useState } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'

import SceneCard from './components/SceneCard'
import ChapterColumn from './components/ChapterColumn'
import SceneModal from './SceneModal'
import { usePlotProject } from './hooks/usePlotProject'
import { usePlotDnd } from './hooks/usePlotDnd'
import { usePlotCrud } from './hooks/usePlotCrud'

function toOrdinal(n: number) {
  const map: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十' }
  return map[n] ?? String(n)
}

const styles = {
  root: 'flex flex-col h-full',
  toolbar: 'bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4 flex-wrap',
  tagSelect: 'border border-gray-200 rounded-xl px-3 py-2 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-muted/30',
  scroll: 'flex-1 overflow-x-auto overflow-y-auto px-8 py-6',
  board: 'flex flex-col gap-8 min-w-max',
  actSection: 'flex flex-col gap-3',
  actHeader: 'sticky left-0 z-10 self-start',
  actLabel: 'inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm',
  actOrdinal: 'text-xs text-placeholder',
  actTitle: 'text-sm font-semibold text-primary',
  actChapterCount: 'text-xs text-placeholder',
  columns: 'flex gap-4',
  empty: 'flex flex-col items-center justify-center h-64 text-placeholder',
}

export default function PlotBoard() {
  const { project, chapters, localScenes, onProjectUpdate } = usePlotProject()
  const { sensors, activeScene, handleDragStart, handleDragOver, handleDragEnd } = usePlotDnd(project, localScenes, onProjectUpdate)
  const { modalChapterId, editingScene, openEditScene, addScene, handleSaveScene, closeModal } = usePlotCrud(project, onProjectUpdate)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    Object.values(localScenes).forEach((scenes) => scenes.forEach((s) => s.tags.forEach((t) => set.add(t))))
    return Array.from(set).sort()
  }, [localScenes])

  const [tagFilter, setTagFilter] = useState('')

  if (!project) return <div className="p-8 text-placeholder">載入中…</div>

  const allChapters = chapters.map((ch) => ({ id: ch.id, title: ch.title }))
  const acts = [...(project.acts ?? [])].sort((a, b) => a.order - b.order)
  const actIds = new Set(acts.map((a) => a.id))
  const ungroupedChapters = chapters.filter((ch) => !ch.actId || !actIds.has(ch.actId))

  function renderChapterColumn(chId: string, chTitle: string) {
    const scenes = tagFilter
      ? (localScenes[chId] ?? []).filter((s) => s.tags.includes(tagFilter))
      : (localScenes[chId] ?? [])
    return (
      <ChapterColumn
        key={chId}
        chapterId={chId}
        title={chTitle}
        scenes={scenes}
        onAddScene={addScene}
        onEditScene={(scene) => openEditScene(scene, chId)}
      />
    )
  }

  return (
    <div className={styles.root} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      <div className={styles.toolbar}>
        <h1 className="section-title">情節規劃看板</h1>
        <div className="flex-1" />
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className={styles.tagSelect}
          >
            <option value="">全部標籤</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className={styles.scroll}>
          {chapters.length === 0 ? (
            <div className={styles.empty}>
              <p className="text-lg mb-2">尚無章節</p>
              <p className="text-sm">請先在「原稿」中新增章節</p>
            </div>
          ) : (
            <div className={styles.board}>
              {acts.map((act, i) => {
                const actChapters = chapters.filter((ch) => ch.actId === act.id)
                if (actChapters.length === 0) return null
                return (
                  <div key={act.id} className={styles.actSection}>
                    <div className={styles.actHeader}>
                      <div className={styles.actLabel}>
                        <span className={styles.actOrdinal}>第{toOrdinal(i + 1)}幕</span>
                        <span className={styles.actTitle}>{act.title}</span>
                        <span className={styles.actChapterCount}>{actChapters.length} 章</span>
                      </div>
                    </div>
                    <div className={styles.columns}>
                      {actChapters.map((ch) => renderChapterColumn(ch.id, ch.title))}
                    </div>
                  </div>
                )
              })}
              {ungroupedChapters.length > 0 && (
                <div className={styles.actSection}>
                  {acts.length > 0 && (
                    <div className={styles.actHeader}>
                      <div className={styles.actLabel}>
                        <span className={styles.actTitle}>未分幕</span>
                        <span className={styles.actChapterCount}>{ungroupedChapters.length} 章</span>
                      </div>
                    </div>
                  )}
                  <div className={styles.columns}>
                    {ungroupedChapters.map((ch) => renderChapterColumn(ch.id, ch.title))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DragOverlay>
          {activeScene ? <SceneCard scene={activeScene} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {editingScene !== undefined && modalChapterId && (
        <SceneModal
          scene={editingScene}
          chapters={allChapters}
          bookFolderId={project.id}
          onSave={handleSaveScene}
          onClose={closeModal}
          defaultChapterId={modalChapterId}
        />
      )}
    </div>
  )
}
