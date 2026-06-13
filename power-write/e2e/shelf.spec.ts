import { test, expect } from '@playwright/test'
import { injectAuth, mockDrive, defaultFixture, makeProject } from './helpers/driveMock'

// 已登入時：書架正確載入並顯示書本（Drive API 全部用假資料）。
test.describe('書架 shelf 測試', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page)
  })

  test('登入後顯示書架標題與書本', async ({ page }) => {
    await mockDrive(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: '我的作品集' })).toBeVisible()
    await expect(page.getByText('測試小說')).toBeVisible()
  })

  test('多本書時全部顯示', async ({ page }) => {
    const fixture = defaultFixture()
    fixture.bookFolders = [
      { id: 'folder-1', name: '第一本' },
      { id: 'folder-2', name: '第二本' },
    ]
    fixture.projectsByFolder = {
      'folder-1': makeProject({ id: 'folder-1', title: '第一本', projectFileId: 'pf-1' }),
      'folder-2': makeProject({ id: 'folder-2', title: '第二本', projectFileId: 'pf-2' }),
    }
    await mockDrive(page, fixture)
    await page.goto('/')

    await expect(page.getByText('第一本')).toBeVisible()
    await expect(page.getByText('第二本')).toBeVisible()
  })

  test('沒有書本時顯示空書架但不崩潰', async ({ page }) => {
    const fixture = defaultFixture()
    fixture.bookFolders = []
    fixture.projectsByFolder = {}
    await mockDrive(page, fixture)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: '我的作品集' })).toBeVisible()
    await expect(page.getByRole('button', { name: '建立新作品' })).toBeVisible()
  })
})
