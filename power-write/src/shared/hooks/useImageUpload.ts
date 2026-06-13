import { useEffect, useState } from 'react'
import { getAccessToken } from '../stores/authStore'
import { uploadImage, getImageUrl } from '../services/assets'

export function useImageUpload(bookFolderId: string, initialAssetId?: string | null) {
  const [assetId, setAssetId] = useState<string | null>(initialAssetId ?? null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!assetId) return
    const token = getAccessToken()
    if (!token) return
    getImageUrl(token, assetId).then(setImageUrl).catch(console.error)
  }, [assetId])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const token = getAccessToken()
    if (!token) return
    setUploading(true)
    try {
      const id = await uploadImage(token, file, bookFolderId)
      setAssetId(id)
      const url = await getImageUrl(token, id)
      setImageUrl(url)
    } catch (err) {
      console.error('Image upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  return { assetId, imageUrl, uploading, handleFileChange }
}
