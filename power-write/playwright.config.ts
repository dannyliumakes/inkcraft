import { defineConfig, devices } from '@playwright/test'

// e2e 測試設定。dev server 由 Playwright 自動啟動（npm run dev → http://localhost:5173）。
// 所有 Google Drive API 呼叫會在測試裡被攔截並回傳假資料，無需真實 Google 帳號。
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
