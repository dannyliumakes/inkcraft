import { getImageUrl } from '../../../shared/services/assets'

/** Replace all drive:ASSET_ID occurrences in markdown with blob URLs */
export async function expandDriveUrls(md: string, token: string): Promise<string> {
  const pattern = /!\[([^\]]*)\]\(drive:([^)]+)\)/g
  const matches = [...md.matchAll(pattern)]
  if (matches.length === 0) return md

  let result = md
  await Promise.all(
    matches.map(async ([full, caption, assetId]) => {
      try {
        const blobUrl = await getImageUrl(token, assetId)
        result = result.replace(full, `![${caption}](${blobUrl})`)
      } catch (e) {
        console.error('Failed to expand drive URL for asset', assetId, e)
      }
    }),
  )
  return result
}

/** Replace all blob: src attributes on image nodes back to drive:ASSET_ID */
export function collapseBlobUrls(md: string, blobToAsset: Map<string, string>): string {
  if (blobToAsset.size === 0) return md
  let result = md
  blobToAsset.forEach((assetId, blobUrl) => {
    const escaped = blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), `drive:${assetId}`)
  })
  return result
}

export function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function fmtTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
