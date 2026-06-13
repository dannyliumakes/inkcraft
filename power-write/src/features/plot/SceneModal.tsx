import { useEffect, useRef, useState } from 'react'
import type { PlotChapter, PlotScene } from '../../shared/types/project'
import { getAccessToken } from '../../shared/stores/authStore'
import { uploadImage } from '../../shared/services/assets'
import { getImageUrl } from '../../shared/services/assets'
import { Button, Input, Textarea, TagInput } from '../../shared/components/ui'

interface Props {
  scene?: PlotScene | null
  chapters: PlotChapter[]
  bookFolderId: string
  onSave: (scene: PlotScene, chapterId: string) => void
  onClose: () => void
  defaultChapterId?: string
}

const styles = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
  panel: 'bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8 max-h-[90vh] overflow-y-auto',
  form: 'flex flex-col gap-4',
  chapterLabel: 'block text-sm font-medium text-muted mb-1',
  chapterSelect: 'w-full border border-gray-200 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-muted/30',
  imageLabel: 'block text-sm font-medium text-muted mb-1',
  imagePreview: 'w-full h-32 object-cover rounded-xl mb-2',
  errorMsg: 'text-sm text-danger',
  actions: 'flex gap-3 justify-end mt-2',
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
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel}>
        <h2 className="section-title mb-6">
          {scene ? '編輯場景' : '新增場景'}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="場景標題"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="輸入場景標題…"
            autoFocus
          />

          <Textarea
            label="摘要"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="場景摘要…"
            rows={3}
          />

          {chapters.length > 0 && (
            <div>
              <label className={styles.chapterLabel}>章節</label>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className={styles.chapterSelect}
              >
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.title}</option>
                ))}
              </select>
            </div>
          )}

          <TagInput tags={tags} onChange={setTags} placeholder="新增標籤…" />

          <div>
            <label className={styles.imageLabel}>場景圖片</label>
            {imageUrl && (
              <img src={imageUrl} alt="scene" className={styles.imagePreview} />
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <Button variant="ghost" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '上傳中…' : imageAssetId ? '更換圖片' : '上傳圖片'}
            </Button>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.actions}>
            <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={!title.trim()}>儲存</Button>
          </div>
        </form>
      </div>
    </div>
  )
}