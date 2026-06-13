import { test, expect } from '@playwright/test'

// 未登入時：app 能正常開啟並顯示登入畫面，不應崩潰或空白。
test.describe('未登入 smoke 測試', () => {
  test('首頁顯示登入畫面', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Power Write' })).toBeVisible()
    await expect(page.getByText('Sign in to access your novels')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  })

  test('頁面沒有 console error', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Power Write' })).toBeVisible()
    // Google GIS 腳本載入相關的警告會被忽略，只在意 app 自身錯誤
    const appErrors = errors.filter((e) => !/gsi|accounts\.google|GSI_LOGGER/i.test(e))
    expect(appErrors).toEqual([])
  })
})
