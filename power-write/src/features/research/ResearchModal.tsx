import { useEffect, useRef, useState } from 'react'
import type { ResearchItem } from '../../types/project'
import { getAccessToken } from '../../stores/authStore'
import { uploadImage, getImageUrl } from '../../services/assets'

interface Props {
  item?: ResearchItem | null
  bookFolderId: string
  totalItems: number
  onSave: (item: ResearchItem) => void
  onClose: () => void
}

export default function ResearchModal({
  item,
  bookFolderId,
  totalItems,
  onSave,
  onClose,
}: Props) {
  const isNew = !item

  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [imageAssetId, setImageAssetId] = useState<string | null>(item?.imageAssetId ?? null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>(item?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState(item?.sourceUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [titleError, setTitleError] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // Load existing image
  useEffect(() => {
    if (!imageAssetId) return
    const token = getAccessToken()
    if (!token) return
    getImageUrl(token, imageAssetId).then(setImageUrl).catch(console.error)
  }, [imageAssetId])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const token = getAccessToken()
    if (!token) return
    setUploading(true)
    try {
      const assetId = await uploadImage(token, file, bookFolderId)
      setImageAssetId(assetId)
      const url = await getImageUrl(token, assetId)
      setImageUrl(url)
    } catch (err) {
      console.error('Image upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      setTags((prev) => [...prev, tagInput.trim()])
      setTagInput('')
    }
  }

  function handleSubmit() {
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    const saved: ResearchItem = {
      id: item?.id ?? `res_${Date.now()}`,
      title: title.trim(),
      description,
      imageAssetId,
      tags,
      sourceUrl: sourceUrl.trim() || undefined,
      order: item?.order ?? totalItems,
    }
    onSave(saved)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#181c1e]">
            {isNew ? '新增素材' : '編輯素材'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-2">圖片</label>
            <div
              className="w-full aspect-video rounded-xl bg-[#f2f4ff] flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-[#c0c8ff] hover:border-[#7c6ee0] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="research" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="3" y="7" width="26" height="18" rx="2" stroke="#a0aec0" strokeWidth="1.5" />
                    <circle cx="11" cy="13" r="2.5" stroke="#a0aec0" strokeWidth="1.5" />
                    <path d="M3 22l7-5 5 4 4-3 10 7" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs">{uploading ? '上傳中…' : '點擊上傳圖片'}</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {imageUrl && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-1.5 text-xs text-[#7c6ee0] hover:underline disabled:opacity-50"
              >
                {uploading ? '上傳中…' : '更換圖片'}
              </button>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">
              標題 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
              placeholder="輸入素材標題"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0] ${titleError ? 'border-red-400' : 'border-gray-200'}`}
            />
            {titleError && <p className="text-xs text-red-500 mt-1">請輸入標題</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="輸入素材描述、筆記或摘要…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0] resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">標籤</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 bg-[#e8eaff] text-[#7c6ee0] rounded-full px-2.5 py-0.5 text-xs">
                  {t}
                  <button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="輸入後按 Enter 新增標籤"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0]"
            />
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">來源連結（選填）</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#4c5354] hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm bg-[#4c5354] text-white rounded-lg hover:bg-[#3a4041] transition-colors"
          >
            {isNew ? '新增' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}
