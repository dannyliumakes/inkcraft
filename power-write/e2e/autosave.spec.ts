import { test, expect } from '@playwright/test'
import { injectAuth, mockDrive, defaultFixture } from './helpers/driveMock'

// Autosave 測試：Ctrl+S 觸發儲存、存檔成功後顯示「已儲存」狀態
test.describe('Autosave', () => {
  test('Ctrl+S 觸發儲存並顯示「已儲存 ✓」', async ({ page }) => {
    let saveRequested = false

    await injectAuth(page)
    // 設定 Drive mock，同時監聽寫入請求
    await mockDrive(page)
    // 再加一層 listener 追蹤 PATCH（不 fulfill，只觀察）
    page.on('request', (req) => {
      if (req.url().includes('googleapis.com') && req.method() === 'PATCH') {
        saveRequested = true
      }
    })

    await page.goto('/book/folder-1')
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10_000 })
    // 確保章節內容已載入（save 需要 activeChapterId）
    await expect(page.locator('.ProseMirror')).toContainText('這是第一章', { timeout: 10_000 })

    await page.keyboard.press('Meta+s')

    await expect(page.getByText(/已儲存\s*✓/)).toBeVisible({ timeout: 8_000 })
    expect(saveRequested).toBe(true)
  })

  test('切換 tab 離開頁面時觸發 visibility save', async ({ page }) => {
    let saveRequested = false

    await injectAuth(page)
    await mockDrive(page)
    page.on('request', (req) => {
      if (req.url().includes('googleapis.com') && req.method() === 'PATCH') {
        saveRequested = true
      }
    })

    await page.goto('/book/folder-1')
    await expect(page.locator('.ProseMirror')).toContainText('這是第一章', { timeout: 10_000 })

    // 模擬 visibilitychange → hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await page.waitForTimeout(800)
    expect(saveRequested).toBe(true)
  })

  test('儲存失敗時顯示錯誤狀態', async ({ page }) => {
    await injectAuth(page)

    // Drive mock：GET 照常（載入資料），PATCH 回 500（儲存失敗）
    const fixture = defaultFixture()
    await mockDrive(page, fixture)
    // 在 mockDrive 之後再加一層攔截，覆蓋 PATCH
    await page.route('**/www.googleapis.com/upload/**', async (route) => {
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    })

    await page.goto('/book/folder-1')
    await expect(page.locator('.ProseMirror')).toContainText('這是第一章', { timeout: 10_000 })

    await page.keyboard.press('Meta+s')

    await expect(page.getByText(/儲存失敗/)).toBeVisible({ timeout: 8_000 })
  })
})
