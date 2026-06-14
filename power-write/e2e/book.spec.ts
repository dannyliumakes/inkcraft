import { test, expect } from '@playwright/test'
import { injectAuth, mockDrive, defaultFixture, makeProject } from './helpers/driveMock'

// 開書後的核心流程測試：sidebar、章節載入、tab 切換
test.describe('開書流程', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page)
    await mockDrive(page)
  })

  test('進入書本頁後顯示 nav tabs', async ({ page }) => {
    await page.goto('/book/folder-1')

    // 五個 tab 全部出現
    await expect(page.getByRole('link', { name: '原稿' })).toBeVisible()
    await expect(page.getByRole('link', { name: '情節' })).toBeVisible()
    await expect(page.getByRole('link', { name: '角色' })).toBeVisible()
    await expect(page.getByRole('link', { name: '研究' })).toBeVisible()
    await expect(page.getByRole('link', { name: '總覽' })).toBeVisible()
  })

  test('原稿頁顯示第一個章節標題', async ({ page }) => {
    await page.goto('/book/folder-1')

    // 等 project 載入（chapter title 會顯示在 sidebar）
    await expect(page.getByText('第一章')).toBeVisible({ timeout: 10_000 })
  })

  test('章節內容從 Drive 載入後顯示在編輯器', async ({ page }) => {
    await page.goto('/book/folder-1')

    // 等待章節內容出現在 tiptap 編輯器
    await expect(page.locator('.ProseMirror')).toContainText('這是第一章的內容', { timeout: 10_000 })
  })

  test('切換到情節 tab 不卡 loading、不崩潰', async ({ page }) => {
    await page.goto('/book/folder-1')

    // 等 nav 完全渲染再點
    await page.getByRole('link', { name: '情節' }).click()
    await expect(page).toHaveURL(/\/plot$/)

    // 不應顯示任何 error boundary 文字
    await expect(page.getByText('發生錯誤')).not.toBeVisible({ timeout: 5_000 })
  })

  test('切換到角色 tab 正常顯示', async ({ page }) => {
    await page.goto('/book/folder-1')
    await page.getByRole('link', { name: '角色' }).click()
    await expect(page).toHaveURL(/\/characters$/)
    await expect(page.getByText('發生錯誤')).not.toBeVisible()
  })

  test('切換到研究 tab 正常顯示', async ({ page }) => {
    await page.goto('/book/folder-1')
    await page.getByRole('link', { name: '研究' }).click()
    await expect(page).toHaveURL(/\/research$/)
    await expect(page.getByText('發生錯誤')).not.toBeVisible()
  })

  test('切換到總覽 tab 正常顯示', async ({ page }) => {
    await page.goto('/book/folder-1')
    await page.getByRole('link', { name: '總覽' }).click()
    await expect(page).toHaveURL(/\/overview$/)
    await expect(page.getByText('發生錯誤')).not.toBeVisible()
  })
})

// 多章節切換：驗證 cache 邏輯正確、不卡 loading
test.describe('章節切換', () => {
  test.beforeEach(async ({ page }) => {
    const fixture = defaultFixture()
    fixture.projectsByFolder['folder-1'] = makeProject({
      id: 'folder-1',
      title: '測試小說',
      projectFileId: 'project-file-1',
      chapters: [
        { id: 'ch_001', title: '第一章', order: 0, fileId: 'chapter-file-1', wordCount: 500, rev: 1 },
        { id: 'ch_002', title: '第二章', order: 1, fileId: 'chapter-file-2', wordCount: 800, rev: 1 },
      ],
    })
    fixture.chapterText['chapter-file-2'] = '這是第二章的內容。'

    await injectAuth(page)
    await mockDrive(page, fixture)
  })

  test('sidebar 顯示所有章節', async ({ page }) => {
    await page.goto('/book/folder-1')

    await expect(page.getByText('第一章')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('第二章')).toBeVisible({ timeout: 10_000 })
  })

  test('點擊第二章後載入其內容', async ({ page }) => {
    await page.goto('/book/folder-1')

    // 等第一章先載入
    await expect(page.locator('.ProseMirror')).toContainText('這是第一章的內容', { timeout: 10_000 })

    // 點擊第二章
    await page.getByText('第二章').click()

    // 編輯器內容應切換到第二章
    await expect(page.locator('.ProseMirror')).toContainText('這是第二章的內容', { timeout: 10_000 })
  })

  test('切回第一章使用 cache 不重新請求', async ({ page }) => {
    // 追蹤 Drive 下載請求次數
    let downloadCount = 0
    page.on('request', (req) => {
      if (req.url().includes('googleapis.com') && req.url().includes('alt=media')) {
        downloadCount++
      }
    })

    await page.goto('/book/folder-1')
    await expect(page.locator('.ProseMirror')).toContainText('這是第一章的內容', { timeout: 10_000 })

    // 等 background prefetch 完成（useChapterLoader 會在第一章載入後 prefetch 其他章節）
    await page.waitForTimeout(1_000)
    const countAfterPrefetch = downloadCount

    // 切到第二章（應已在 cache，不會有新請求）
    await page.getByText('第二章').click()
    await expect(page.locator('.ProseMirror')).toContainText('這是第二章的內容', { timeout: 10_000 })

    // 切回第一章（也在 cache）
    await page.getByText('第一章').click()
    await expect(page.locator('.ProseMirror')).toContainText('這是第一章的內容', { timeout: 10_000 })

    // prefetch 之後不應有新的下載請求（兩個章節都已 cache）
    expect(downloadCount).toBe(countAfterPrefetch)
  })
})
