import { useEffect, useRef, useState } from 'react'
import type { PlotChapter, PlotScene } from '../../types/project'
import { getAccessToken } from '../../stores/authStore'
import { uploadImage } from '../../services/assets'
import { getImageUrl } from '../../services/assets'

interface Props {
  scene?: PlotScene | null
  chapters: PlotChapter[]
  bookFolderId: string
  onSave: (scene: PlotScene, chapterId: string) => void
  onClose: () => void
  defaultChapterId?: string
}

export default function SceneModal({
  scene,
  chapters,
  bookFolderId,
  onSave,
  onClose,
  defaultChapterId,
}: Props) {
  const [title, setTitle] = useState(scene?.title ?? '')
  const [summary, setSummary] = useState(scene?.summary ?? '')
  const [tags, setTags] = useState<string[]>(scene?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [chapterId, setChapterId] = useState(
    scene?.chapterRef ?? defaultChapterId ?? chapters[0]?.id ?? ''
  )
  const [imageAssetId, setImageAssetId] = useState<string | null>(scene?.imageAssetId ?? null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load image preview
  useEffect(() => {
    if (!imageAssetId) return
    const token = getAccessToken()
    if (!token) return
    getImageUrl(token, imageAssetId).then(setImageUrl).catch(() => setImageUrl(null))
  }, [imageAssetId])

  // Escape closes
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const token = getAccessToken()
    if (!token) return
    setUploading(true)
    setError(null)
    try {
      const assetId = await uploadImage(token, file, bookFolderId)
      setImageAssetId(assetId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const saved: PlotScene = {
      id: scene?.id ?? `scene_${Date.now()}`,
      title: title.trim(),
      summary,
      imageAssetId,
      tags,
      chapterRef: chapterId || undefined,
      order: scene?.order ?? 0,
    }
    onSave(saved, chapterId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#181c1e] mb-6">
          {scene ? '編輯場景' : '新增場景'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#4c5354] mb-1">
              場景標題 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入場景標題…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#181c1e] placeholder-[#6d6d6d] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30"
              autoFocus
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-[#4c5354] mb-1">摘要</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="場景摘要…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#181c1e] placeholder-[#6d6d6d] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30 resize-none"
            />
          </div>

          {/* Chapter */}
          {chapters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#4c5354] mb-1">章節</label>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#181c1e] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30"
              >
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#4c5354] mb-1">標籤</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 bg-[#f2f4ff] text-[#4c5354] text-xs px-2 py-1 rounded-full"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-red-500 text-[#4c5354]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="新增標籤…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#181c1e] placeholder-[#6d6d6d] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-xl text-sm bg-[#f2f4ff] text-[#4c5354] hover:bg-[#e0e4ff] transition-colors"
              >
                新增
              </button>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-[#4c5354] mb-1">場景圖片</label>
            {imageUrl && (
              <img
                src={imageUrl}
                alt="scene"
                className="w-full h-32 object-cover rounded-xl mb-2"
              />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-[#6d6d6d] hover:border-[#4c5354] hover:text-[#4c5354] transition-colors disabled:opacity-50"
            >
              {uploading ? '上傳中…' : imageAssetId ? '更換圖片' : '上傳圖片'}
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-[#4c5354] hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2.5 rounded-full text-sm font-medium bg-[#181c1e] text-white hover:bg-[#2e3538] disabled:opacity-50 transition-colors"
            >
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
