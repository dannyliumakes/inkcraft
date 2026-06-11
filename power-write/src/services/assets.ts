import { createTextFile, downloadBlob } from './drive'

// Cache: assetId -> objectURL (in-memory, not persisted)
const urlCache = new Map<string, string>()

export async function uploadImage(
  token: string,
  file: File,
  bookFolderId: string,
): Promise<string> {
  const content = await file.text()
  return createTextFile(token, file.name, bookFolderId, content, file.type)
}

export async function getImageUrl(token: string, assetId: string): Promise<string> {
  const cached = urlCache.get(assetId)
  if (cached) return cached

  const blob = await downloadBlob(token, assetId)
  const url = URL.createObjectURL(blob)
  urlCache.set(assetId, url)
  return url
}
