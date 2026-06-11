import { useAuthStore } from '../stores/authStore'

const BASE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

async function apiFetch(token: string, url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(token),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (res.status === 401) {
    useAuthStore.getState().clearAccessToken()
    throw new Error('Unauthorized: please sign in again')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Drive API error ${res.status}: ${text}`)
  }

  return res
}

export async function findOrCreateRootFolder(token: string): Promise<string> {
  const q = "name='PowerWrite' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents"
  const url = `${BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`
  const res = await apiFetch(token, url)
  const data = await res.json() as { files: Array<{ id: string; name: string }> }

  if (data.files.length > 0) {
    return data.files[0].id
  }

  return createFolder(token, 'PowerWrite', 'root')
}

export async function createFolder(token: string, name: string, parentId: string): Promise<string> {
  const body = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  }

  const res = await apiFetch(token, `${BASE}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json() as { id: string }
  return data.id
}

export async function listChildren(
  token: string,
  parentId: string,
  extraQ?: string,
): Promise<Array<{ id: string; name: string }>> {
  let q = `'${parentId}' in parents and trashed=false`
  if (extraQ) q += ` and ${extraQ}`
  const url = `${BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`
  const res = await apiFetch(token, url)
  const data = await res.json() as { files: Array<{ id: string; name: string }> }
  return data.files
}

export async function createTextFile(
  token: string,
  name: string,
  parentId: string,
  content: string,
  mimeType = 'text/plain',
): Promise<string> {
  const boundary = `pw_boundary_${Math.random().toString(36).slice(2)}`
  const metadata = JSON.stringify({ name, parents: [parentId] })

  const body = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n`,
    `\r\n`,
    `${metadata}\r\n`,
    `--${boundary}\r\n`,
    `Content-Type: ${mimeType}\r\n`,
    `\r\n`,
    `${content}\r\n`,
    `--${boundary}--`,
  ].join('')

  const res = await apiFetch(
    token,
    `${UPLOAD}/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  )

  const data = await res.json() as { id: string }
  return data.id
}

export async function updateFileContent(
  token: string,
  fileId: string,
  content: string,
): Promise<void> {
  await apiFetch(
    token,
    `${UPLOAD}/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
    },
  )
}

export async function downloadText(token: string, fileId: string): Promise<string> {
  const res = await apiFetch(token, `${BASE}/files/${fileId}?alt=media`)
  return res.text()
}

export async function downloadBlob(token: string, fileId: string): Promise<Blob> {
  const res = await apiFetch(token, `${BASE}/files/${fileId}?alt=media`)
  return res.blob()
}

export async function getHeadRevisionId(token: string, fileId: string): Promise<string> {
  const res = await apiFetch(token, `${BASE}/files/${fileId}?fields=headRevisionId`)
  const data = await res.json() as { headRevisionId: string }
  return data.headRevisionId
}
