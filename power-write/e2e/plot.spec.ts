import { test, expect } from '@playwright/test'
import { injectAuth, mockDrive, defaultFixture, makeProject } from './helpers/driveMock'

// 情節看板：場景只有序號（無標題/摘要），且與目錄結構同步。
test.describe('情節看板場景', () => {
  test.beforeEach(async ({ page }) => {
    const fixture = defaultFixture()
    fixture.projectsByFolder['folder-1'] = makeProject({
      acts: [{ id: 'act_001', title: '第一幕', order: 1 }],
      chapters: [
        {
          id: 'ch_001', title: '第一章', order: 1, actId: 'act_001',
          fileId: 'chapter-file-1', wordCount: 0, rev: 1,
          scenes: [{ id: 'sc_a', order: 1 }, { id: 'sc_b', order: 2 }],
        },
      ],
    })
    await injectAuth(page)
    await mockDrive(page, fixture)
  })

  test('場景卡片以序號顯示，無標題欄', async ({ page }) => {
    await page.goto('/book/folder-1/plot')

    await expect(page.getByText('場景 1')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('場景 2')).toBeVisible()
    await expect(page.getByText('2 個場景')).toBeVisible()
  })

  test('新增場景同步到原稿目錄結構', async ({ page }) => {
    await page.goto('/book/folder-1/plot')
    await expect(page.getByText('場景 1')).toBeVisible({ timeout: 10_000 })

    // 在看板新增第三個場景
    await page.getByRole('button', { name: '＋ 新增場景' }).click()
    await expect(page.getByText('場景 3')).toBeVisible()

    // 切到原稿 → 目錄結構應出現三個場景列
    await page.getByRole('link', { name: '原稿' }).click()
    await expect(page).toHaveURL(/\/book\/folder-1$/)
    await expect(page.getByText('場景3')).toBeVisible({ timeout: 10_000 })
  })

  test('點擊場景卡片跳回原稿編輯器', async ({ page }) => {
    await page.goto('/book/folder-1/plot')
    await expect(page.getByText('場景 1')).toBeVisible({ timeout: 10_000 })

    await page.getByText('場景 1').click()
    await expect(page).toHaveURL(/\/book\/folder-1$/)
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10_000 })
  })
})
