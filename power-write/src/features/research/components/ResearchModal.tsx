import { useEffect, useRef, useState } from 'react'
import type { ResearchItem } from '../../../shared/types/project'
import { Button, Input, Textarea, TagInput } from '../../../shared/components/ui'
import { useImageUpload } from '../../../shared/hooks/useImageUpload'

interface Props {
  item?: ResearchItem | null
  bookFolderId: string
  totalItems: number
  onSave: (item: ResearchItem) => void
  onClose: () => void
}

const styles = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
  panel: 'bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto',
  panelHeader: 'flex items-center justify-between px-6 py-4 border-b border-gray-100',
  body: 'px-6 py-5 flex flex-col gap-5',
  imageLabel: 'block text-sm font-medium text-primary mb-2',
  imageDropzone: 'w-full aspect-video rounded-xl bg-accent-light flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-accent-border hover:border-accent transition-colors',
  imagePlaceholder: 'flex flex-col items-center gap-2 text-placeholder',
  imagePlaceholderText: 'text-xs',
  changeImageBtn: 'mt-1.5 text-xs text-accent hover:underline disabled:opacity-50',
  footer: 'flex justify-end gap-3 px-6 py-4 border-t border-gray-100',
}

export default function ResearchModal({ item, bookFolderId, totalItems, onSave, onClose }: Props) {
  const isNew = !item

  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [tags, setTags] = useState<string[]>(item?.tags ?? [])
  const [sourceUrl, setSourceUrl] = useState(item?.sourceUrl ?? '')
  const [titleError, setTitleError] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const { assetId: imageAssetId, imageUrl, uploading, handleFileChange } =
    useImageUpload(bookFolderId, item?.imageAssetId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSubmit() {
    if (!title.trim()) { setTitleError(true); return }
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
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className="section-title">{isNew ? '新增素材' : '編輯素材'}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="關閉">✕</Button>
        </div>

        <div className={styles.body}>
          <div>
            <label className={styles.imageLabel}>圖片</label>
            <div className={styles.imageDropzone} onClick={() => fileRef.current?.click()}>
              {imageUrl ? (
                <img src={imageUrl} alt="research" className="w-full h-full object-cover" />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="3" y="7" width="26" height="18" rx="2" stroke="var(--color-placeholder)" strokeWidth="1.5" />
                    <circle cx="11" cy="13" r="2.5" stroke="var(--color-placeholder)" strokeWidth="1.5" />
                    <path d="M3 22l7-5 5 4 4-3 10 7" stroke="var(--color-placeholder)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className={styles.imagePlaceholderText}>{uploading ? '上傳中…' : '點擊上傳圖片'}</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {imageUrl && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={styles.changeImageBtn}>
                {uploading ? '上傳中…' : '更換圖片'}
              </button>
            )}
          </div>

          <Input
            label="標題"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
            placeholder="輸入素材標題"
            error={titleError ? '請輸入標題' : undefined}
          />
          <Textarea label="描述" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="輸入素材描述、筆記或摘要…" />
          <TagInput tags={tags} onChange={setTags} />
          <Input label="來源連結（選填）" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit}>{isNew ? '新增' : '儲存'}</Button>
        </div>
      </div>
    </div>
  )
}
