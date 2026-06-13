import { useEffect, useRef, useState } from 'react'
import { getAccessToken } from '../../stores/authStore'
import { uploadImage, getImageUrl } from '../../services/assets'
import { Button } from './Button'

interface ImageUploaderProps {
  assetId: string | null
  bookFolderId: string
  /** 'square' → circular avatar (80×80); 'landscape' (default) → aspect-video rectangle */
  shape?: 'square' | 'landscape'
  /** Optional label shown above the upload area */
  label?: string
  onChange: (assetId: string, url: string) => void
}

export default function ImageUploader({
  assetId,
  bookFolderId,
  shape = 'landscape',
  label,
  onChange,
}: ImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load existing image
  useEffect(() => {
    if (!assetId) return
    const token = getAccessToken()
    if (!token) return
    getImageUrl(token, assetId).then(setImageUrl).catch(() => setImageUrl(null))
  }, [assetId])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const token = getAccessToken()
    if (!token) return
    setUploading(true)
    setError(null)
    try {
      const newAssetId = await uploadImage(token, file, bookFolderId)
      const url = await getImageUrl(token, newAssetId)
      setImageUrl(url)
      onChange(newAssetId, url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setUploading(false)
    }
  }

  if (shape === 'square') {
    return (
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-full bg-[#f2f4ff] flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-[#c0c8ff] hover:border-[#7c6ee0] transition-colors shrink-0"
          onClick={() => fileRef.current?.click()}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="portrait" className="w-full h-full object-cover" />
          ) : (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="12" r="5" stroke="#a0aec0" strokeWidth="1.5" />
              <path d="M4 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div>
          <Button
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            size="sm"
          >
            {uploading ? '上傳中…' : '上傳肖像'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-gray-400 mt-0.5">建議正方形圖片</p>
        </div>
      </div>
    )
  }

  // landscape (default)
  return (
    <div>
      {label && <label className="block text-sm font-medium text-[#181c1e] mb-2">{label}</label>}
      <div
        className="w-full aspect-video rounded-xl bg-[#f2f4ff] flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-[#c0c8ff] hover:border-[#7c6ee0] transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="upload" className="w-full h-full object-cover" />
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
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  )
}