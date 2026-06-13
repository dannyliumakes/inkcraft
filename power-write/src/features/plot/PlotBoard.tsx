import { useCallback, useMemo, useState } from 'react'
import { useBeforeUnload } from 'react-router-dom'
import { DndContext, DragOverlay } from '@dnd-kit/core'

import { Button } from '../../shared/components/ui'
import SceneCard from './components/SceneCard'
import ActSection from './components/ActSection'
import SceneModal from './SceneModal'
import { usePlotProject } from './hooks/usePlotProject'
import { usePlotDnd } from './hooks/usePlotDnd'
import { usePlotCrud } from './hooks/usePlotCrud'

export default function PlotBoard() {
  const { book, localActs, dirty, saving, saveError, updateActs, handleSave } = usePlotProject()

  const allChapters = useMemo(() => localActs.flatMap((a) => a.chapters), [localActs])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    localActs.forEach((a) => a.chapters.forEach((ch) => ch.scenes.forEach((s) => s.tags.forEach((t) => set.add(t)))))
    return Array.from(set).sort()
  }, [localActs])

  const { sensors, activeScene, handleDragStart, handleDragOver, handleDragEnd } =
    usePlotDnd(localActs, allChapters, updateActs)

  const {
    modalChapterId, editingScene,
    openAddScene, openEditScene, handleSaveScene, closeModal,
    addAct, addChapterToAct, renameChapter, renameAct,
  } = usePlotCrud(localActs, updateActs)

  useBeforeUnload(useCallback((e) => {
    if (dirty) { e.preventDefault(); e.returnValue = '' }
  }, [dirty]))

  const [tagFilter, setTagFilter] = useState('')

  const filteredActs = useMemo(() => {
    if (!tagFilter) return localActs
    return localActs.map((a) => ({
      ...a,
      chapters: a.chapters.map((ch) => ({
        ...ch,
        scenes: ch.scenes.filter((s) => s.tags.includes(tagFilter)),
      })),
    }))
  }, [localActs, tagFilter])

  if (!book) return <div className="p-8 text-gray-400">找不到作品</div>

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-bold text-[#181c1e]">情節規劃看板</h1>
        <div className="flex-1" />
        {dirty && <span className="text-xs text-amber-500 font-medium">有未儲存變更</span>}
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#4c5354] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30"
          >
            <option value="">全部標籤</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <Button variant="ghost" onClick={addAct}>＋ 新增幕</Button>
        <Button onClick={handleSave} disabled={!dirty || saving} loading={saving}>儲存變更</Button>
      </div>

      {saveError && (
        <div className="bg-red-50 border-b border-red-100 px-8 py-2 text-sm text-red-500">{saveError}</div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-8">
          {filteredActs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#a0aec0]">
              <p className="text-lg mb-4">尚無情節結構</p>
              <Button onClick={addAct}>＋ 新增第一幕</Button>
            </div>
          ) : (
            filteredActs.map((act, actIndex) => (
              <ActSection
                key={act.id}
                act={act}
                actIndex={actIndex}
                onAddChapter={() => addChapterToAct(actIndex)}
                onAddScene={openAddScene}
                onEditScene={openEditScene}
                onRenameChapter={renameChapter}
                onRenameAct={renameAct}
              />
            ))
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
          bookFolderId={book.id}
          onSave={handleSaveScene}
          onClose={closeModal}
          defaultChapterId={modalChapterId}
        />
      )}
    </div>
  )
}
