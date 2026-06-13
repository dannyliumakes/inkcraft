import type { Page } from '@playwright/test'
import type { Project } from '../../src/shared/types/project'

// ── 假資料 fixture ──────────────────────────────────────────────────────────
// 一本最小可用的書，包含一個章節。可在測試裡覆寫。

export const FAKE_TOKEN = 'test-access-token'

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'folder-1',
    title: '測試小說',
    manuscriptFolderId: 'manuscript-folder-1',
    assetsFolderId: 'assets-folder-1',
    projectFileId: 'project-file-1',
    chapters: [
      { id: 'ch_001', title: '第一章', order: 0, fileId: 'chapter-file-1', wordCount: 1200, rev: 1 },
    ],
    characters: [],
    research: [],
    notes: '',
    todos: [],
    plotBoard: { scenes: {} },
    dailyWordGoal: 1000,
    projectWordGoal: 80000,
    wordHistory: [],
    milestones: [],
    updatedAt: '2026-06-13T10:00:00.000Z',
    rev: 1,
    ...overrides,
  }
}

interface DriveFixture {
  // listChildren(root, folder filter) 回傳的書本資料夾
  bookFolders: Array<{ id: string; name: string }>
  // 每個資料夾底下的 project.json 內容（key = folder id）
  projectsByFolder: Record<string, Project>
  // 章節 .md 內容（key = fileId）
  chapterText: Record<string, string>
}

export function defaultFixture(): DriveFixture {
  const project = makeProject()
  return {
    bookFolders: [{ id: 'folder-1', name: '測試小說' }],
    projectsByFolder: { 'folder-1': project },
    chapterText: { 'chapter-file-1': '這是第一章的內容。' },
  }
}

// ── 在 app 載入前注入假登入 token ───────────────────────────────────────────
// authStore 用 zustand persist，名稱 'pw-auth'，所以直接寫 localStorage 即可通過 RequireAuth。
export async function injectAuth(page: Page, token = FAKE_TOKEN): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem('pw-auth', JSON.stringify({ state: { accessToken: t }, version: 0 }))
  }, token)
}

// ── 攔截所有 Google Drive API 呼叫 ──────────────────────────────────────────
export async function mockDrive(page: Page, fixture: DriveFixture = defaultFixture()): Promise<void> {
  // 找出 project.json 屬於哪個資料夾（用 projectFileId 反查）
  const folderByProjectFile: Record<string, string> = {}
  for (const [folderId, project] of Object.entries(fixture.projectsByFolder)) {
    folderByProjectFile[project.projectFileId] = folderId
  }

  await page.route('**/www.googleapis.com/**', async (route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

    // GET /drive/v3/files/{id}?alt=media → 下載檔案內容（project.json 或章節 .md）
    const fileMediaMatch = url.pathname.match(/\/drive\/v3\/files\/([^/]+)$/)
    if (fileMediaMatch && url.searchParams.get('alt') === 'media') {
      const fileId = decodeURIComponent(fileMediaMatch[1])
      const folderId = folderByProjectFile[fileId]
      if (folderId) {
        // 回傳 project.json
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixture.projectsByFolder[folderId]),
        })
      }
      // 章節 .md 內容
      return route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: fixture.chapterText[fileId] ?? '',
      })
    }

    // GET /drive/v3/files?q=... → listChildren
    if (url.pathname.endsWith('/drive/v3/files') && route.request().method() === 'GET') {
      const q = url.searchParams.get('q') ?? ''
      // 列出書本資料夾
      if (q.includes("mimeType='application/vnd.google-apps.folder'")) {
        return json({ files: fixture.bookFolders })
      }
      // 列出某資料夾下的 project.json
      if (q.includes("name='project.json'")) {
        const folderMatch = q.match(/'([^']+)' in parents/)
        const folderId = folderMatch?.[1]
        const project = folderId ? fixture.projectsByFolder[folderId] : undefined
        return json({ files: project ? [{ id: project.projectFileId, name: 'project.json' }] : [] })
      }
      // 其他列舉（章節等）— 預設空
      return json({ files: [] })
    }

    // 其他寫入操作（PATCH/POST 等）一律回 OK，避免測試噴錯
    return json({ id: 'mock-id', headRevisionId: 'mock-rev' })
  })
}
