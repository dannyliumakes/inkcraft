import { useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { getAccessToken } from '../../../shared/stores/authStore'
import { uploadImage, getImageUrl } from '../../../shared/services/assets'

export function useEditorImageUpload(
  bookFolderId: string | undefined,
  blobToAssetRef: React.MutableRefObject<Map<string, string>>,
  editorRef: React.MutableRefObject<Editor | null>,
) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const editor = editorRef.current
    if (!file || !editor) return
    e.target.value = ''

    const token = getAccessToken()
    if (!token || !bookFolderId) return

    try {
      const assetId = await uploadImage(token, file, bookFolderId)
      const blobUrl = await getImageUrl(token, assetId)
      blobToAssetRef.current.set(blobUrl, assetId)
      editor.commands.setImage({ src: blobUrl, assetId, caption: '' } as Parameters<typeof editor.commands.setImage>[0])
    } catch (err) {
      console.error('Image upload failed', err)
    }
  }

  return { fileInputRef, handleImageFileSelected }
}
