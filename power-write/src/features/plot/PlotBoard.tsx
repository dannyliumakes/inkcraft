import { useCallback, useMemo, useState } from 'react'
import { useBeforeUnload } from 'react-router-dom'
import { DndContext, DragOverlay } from '@dnd-kit/core'

import { Button } from '../../shared/components/ui'
import SceneCard from './components/SceneCard'
import ChapterColumn from './components/ChapterColumn'
import SceneModal from './SceneModal'
import { usePlotProject } from './hooks/usePlotProject'
import { usePlotDnd } from './hooks/usePlotDnd'
import { usePlotCrud } from './hooks/usePlotCrud'

const styles = {
  root: 'flex flex-col h-full',
  toolbar: 'bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4 flex-wrap',
  tagSelect: 'border border-gray-200 rounded-xl px-3 py-2 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-muted/30',
  errorBanner: 'bg-red-50 border-b border-red-100 px-8 py-2 text-sm text-red-500',
  scroll: 'flex-1 overflow-x-auto overflow-y-hidden px-8 py-6',
  columns: 'flex gap-4 h-full',
  empty: 'flex flex-col items-center justify-center h-64 text-placeholder',
}

export default function PlotBoard() {
  const { project, chapters, localScenes, dirty, saving, saveError, updateScenes, handleSave } = usePlotProject()
  const { sensors, activeScene, handleDragStart, handleDragOver, handleDragEnd } = usePlotDnd(localScenes, updateScenes)
  const { modalChapterId, editingScene, openAddScene, openEditScene, handleSaveScene, closeModal } = usePlotCrud(localScenes, updateScenes)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    Object.values(localScenes).forEach((scenes) => scenes.forEach((s) => s.tags.forEach((t) => set.add(t))))
    return Array.from(set).sort()
  }, [localScenes])

  const [tagFilter, setTagFilter] = useState('')

  useBeforeUnload(useCallback((e) => {
    if (dirty) { e.preventDefault(); e.returnValue = '' }
  }, [dirty]))

  if (!project) return <div className="p-8 text-placeholder">載入中…</div>

  const allChapters = chapters.flatMap((ch) => ({
    id: ch.id,
    title: ch.title,
    scenes: localScenes[ch.id] ?? [],
  }))

  return (
    <div className={styles.root} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      <div className={styles.toolbar}>
        <h1 className="section-title">情節規劃看板</h1>
        <div className="flex-1" />
        {dirty && <span className="text-xs text-amber-500 font-medium">有未儲存變更</span>}
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
        <Button onClick={handleSave} disabled={!dirty || saving} loading={saving}>儲存變更</Button>
      </div>

      {saveError && <div className={styles.errorBanner}>{saveError}</div>}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className={styles.scroll}>
          {chapters.length === 0 ? (
            <div className={styles.empty}>
              <p className="text-lg mb-2">尚無章節</p>
              <p className="text-sm">請先在「原稿」中新增章節</p>
            </div>
          ) : (
            <div className={styles.columns}>
              {chapters.map((ch) => {
                const scenes = tagFilter
                  ? (localScenes[ch.id] ?? []).filter((s) => s.tags.includes(tagFilter))
                  : (localScenes[ch.id] ?? [])
                return (
                  <ChapterColumn
                    key={ch.id}
                    chapterId={ch.id}
                    title={ch.title}
                    scenes={scenes}
                    onAddScene={openAddScene}
                    onEditScene={openEditScene}
                  />
                )
              })}
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
        />
      )}
    </div>
  )
}
