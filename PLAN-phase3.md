# Power Write — Phase 3 實作計畫（數據與打磨）

> 接續 `PLAN-phase2.md`。Phase 2 完成後才執行本計畫。
> 前置條件：全部 6 模組畫面已完成（Phase 2 後情節/角色/研究均可用）；Drive 服務層、assets、projectRepo 均已可用；`wordHistory` 欄位已在 `project.json` 結構中存在（SPEC §4.2）。
> 執行原則：**開工前先用 WebFetch 讀列出的官方文件，確認 API 名稱後再寫 code。**

Phase 3 範圍：
- **3.1** 字數每日快照 + 數據總覽圖表 + 目標 + 匯出原稿
- **3.2** 本機寫作提醒（通知鈴鐺）
- **3.3** 里程碑版本歷史
- **3.4** 響應式打磨（≥768px 平板）
- **3.5** i18n 補完 + 無障礙基線
- **3.F** Phase 3 總驗證 + Vercel 部署

---

## Phase 0：文件探查（執行者開工前必做）

⚠️ 下方 Allowed APIs 清單基於作者知識填入。**執行者必須在各子階段動手前 WebFetch 對應文件 URL 驗證**，以文件為準。

### Allowed APIs 清單（待驗證）

| 領域 | 預期 API / 套件 | 來源（必讀） |
| --- | --- | --- |
| Recharts BarChart | `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` | https://recharts.org/en-US/api ；https://recharts.org/en-US/examples/SimpleBarChart |
| Intl 日期/數字格式化 | `new Intl.DateTimeFormat('zh-TW', {...}).format(date)`, `new Intl.NumberFormat('zh-TW').format(n)` | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl |
| react-i18next 補完 | `useTranslation()`, `t('key')`, `Trans` component, `ChangeLanguage` | https://react.i18next.com/guides/quick-start |
| Web Notifications API（可選）| `Notification.requestPermission()`, `new Notification(title, { body })` | https://developer.mozilla.org/en-US/docs/Web/API/Notification |
| Drive Revisions list（里程碑）| `GET https://www.googleapis.com/drive/v3/files/{fileId}/revisions?fields=revisions(id,modifiedTime,keepForever)` | https://developers.google.com/drive/api/v3/reference/revisions/list |
| Drive Revisions keep | `PATCH .../revisions/{revisionId}` body `{"keepForever":true}` | https://developers.google.com/drive/api/v3/reference/revisions/update |
| File download（匯出） | `<a href={url} download="filename.md">` 或 `URL.createObjectURL(blob)` + programmatic click | MDN |

### 反模式守則（全程適用）
- ❌ 不要用任何需要後端的推播（FCM、APNS）；通知只用本機 `setInterval` / `sessionStorage` 邏輯。
- ❌ 不要用瀏覽器原生 `Notification` API 除非使用者已明確授權（`Notification.permission === 'granted'`）。
- ❌ 匯出時不要把整個 project.json 當章節內容輸出，只輸出各 `.md` 正文合併。
- ❌ 里程碑不要自己存快照進 project.json（第一版只標記 Drive revision，不做全文快照）。

---

## Phase 3.1：字數每日快照 + 數據總覽 + 匯出

**目標**：每日記錄總字數快照；數據總覽頁顯示 7 天長條圖、今日字數/本週/剩餘；右上角提供「匯出原稿」。對齊 Figma `57:313`。

**要做的事（照文件 COPY）**
1. **開工前**：
   - 對 Figma `57:313` 呼叫 `get_design_context`，取精確尺寸/色票（圖表卡片、三欄統計數字、匯出按鈕）。
   - WebFetch `https://recharts.org/en-US/examples/SimpleBarChart` 確認 Recharts BarChart 的最小可用 import 與 props。
2. 安裝：`recharts`。
3. **每日字數快照機制**（`services/wordSnapshot.ts`）：
   - `takeSnapshot(project)` ——
     - 讀 `project.manuscript.chapters`，各章 `wordCount` 加總得 `todayTotal`。
     - 讀 `project.wordHistory`（陣列 `{date, total}`）。
     - 若今天日期（`new Date().toISOString().slice(0,10)` in `zh-TW` timezone 或 `Intl`）的紀錄已存在則更新 `total`，否則 push 新記錄。
     - 觸發時機：每次成功 autosave 後呼叫（debounce 合併到 project.json 寫入）。
   - 保留最近 90 天紀錄，超過則 slice 最舊的刪除。
4. **每日產出計算**（`lib/wordStats.ts`）：
   - `getDailyOutput(history, days)` ——取最近 N 天，每天產出 = `history[i].total - history[i-1].total`（若為負則顯示 0，不顯示「刪了多少」）。
   - `getWeekTotal(history)` ——本週（週一至今）各天產出加總。
   - `getRemainingGoal(project)` ——`settings.projectWordGoal - 最新 total`（最小顯示 0）。
5. `features/overview/Overview.tsx`：
   - 頂部：標題「專案概覽與數據」+ 右側「匯出原稿」按鈕。
   - **寫作進度追蹤卡**：
     - 標題「寫作進度追蹤」+「過去 7 天的字數產出分析」+ 圖例 + 時間範圍下拉（最近一周）。
     - Recharts `<ResponsiveContainer width="100%" height={272}><BarChart data={weekData}><XAxis dataKey="day"/><YAxis/><Tooltip/><Bar dataKey="output"/></BarChart></ResponsiveContainer>`（照 SimpleBarChart example COPY，勿發明 props）。
     - 底部三欄統計：今日字數（`Intl.NumberFormat` 格式化）、本週總計、剩餘目標。
   - **設定區塊**（簡單 inline 表單）：
     - 專案總目標（`projectWordGoal`）：`<input type="number">`，失焦時存 project.json。
     - 每日目標（`dailyWordGoal`）：同上。
6. **匯出原稿**：
   - 按「匯出原稿」→ 讀取所有章節 `.md`（`downloadText(chapter.fileId)`，已快取者直接用）→ 依 `order` 排序 → 合併成一個字串（各章之間加 `\n\n---\n\n`）→ `new Blob([content], {type:'text/markdown'})` → `URL.createObjectURL` → 建 `<a download="書名.md">` 並自動點擊 → `URL.revokeObjectURL`。

**文件參考**：Figma `57:313`（`get_design_context`）；Recharts SimpleBarChart example；MDN Intl.NumberFormat。

**驗收清單**
- [ ] 寫點字 → autosave → 到總覽頁，今日字數有更新。
- [ ] 長條圖顯示 7 天（若歷史不足 7 天，只顯示有資料的天數，其餘顯示 0）。
- [ ] 本週總計 = 週一至今各天產出加總。
- [ ] 剩餘目標 = 總目標 - 當前總字數（不顯示負數）。
- [ ] 點「匯出原稿」→ 瀏覽器下載 `.md` 檔，內容包含所有章節正文、章間有分隔線。
- [ ] 修改目標後重整仍保存。

**反模式守則**：不要用 `new Date()` 的本地時間做跨時區的日期比較，統一用 `Intl.DateTimeFormat` 或 ISO date string；每日產出不要顯示負數（刪字就顯示 0）。

---

## Phase 3.2：本機寫作提醒（通知鈴鐺）

**目標**：右上角鈴鐺顯示紅點與提醒清單（「今日尚未寫作」「已達成每日目標」等），純前端、無伺服器。

**要做的事**
1. `services/reminderService.ts`：
   - `checkReminders(project)` → 回傳 `Reminder[]`（`{id, message, type:'info'|'success'|'warning'}`）：
     - 若今天無 `wordHistory` 紀錄或產出為 0 → `{ id:'no-writing-today', message:'今日尚未寫作', type:'warning' }`。
     - 若今日產出 ≥ `dailyWordGoal` → `{ id:'daily-goal-reached', message:'已達成今日目標 🎉', type:'success' }`。
     - 若今日產出 > 0 但 < `dailyWordGoal` → `{ id:'keep-going', message:`今日已寫 X 字，距目標還差 Y 字`, type:'info' }`（只有一條）。
2. 觸發時機：app 進入 `BookLayout` 時計算一次；用 `setInterval` 每 30 分鐘重新計算（`useEffect` cleanup `clearInterval`）。
3. `features/layout/NotificationBell.tsx`：
   - 鈴鐺圖示；有提醒時顯示紅點 badge（提醒數量）。
   - 點鈴鐺 → 展開 Dropdown 清單，顯示各提醒訊息。
   - 每條提醒可點「X」關閉（存進 `sessionStorage` 記「本次已讀」，重整後重新計算）。
4. 不需要瀏覽器 `Notification` API（push notification 不在範圍，避免需要使用者授權的摩擦）；只做 in-app 清單。

**驗收清單**
- [ ] 今天沒寫字 → 鈴鐺有紅點、清單顯示「今日尚未寫作」。
- [ ] 今天已達每日目標 → 清單顯示「已達成今日目標 🎉」，不顯示「尚未寫作」。
- [ ] 關閉提醒後清單消失（或該條消失）。
- [ ] 重整頁面後重新計算（關閉狀態不跨 session 持續）。

**反模式守則**：不要用 `Notification.requestPermission()`（不在需求範圍）；不要用後端推播。

---

## Phase 3.3：里程碑版本歷史

**目標**：使用者可手動標記「里程碑」，第一版以標記 Google Drive revision + 存 milestone 記錄（不做全文快照）。

**要做的事（照文件 COPY）**
1. **開工前**：
   - WebFetch `https://developers.google.com/drive/api/v3/reference/revisions/list` 確認 `revisions.list` endpoint 與欄位。
   - WebFetch `https://developers.google.com/drive/api/v3/reference/revisions/update` 確認 `PATCH revisions/{id}` 的 `keepForever` 參數。
2. `services/drive.ts` 新增：
   - `listRevisions(fileId)` → `GET .../revisions?fields=revisions(id,modifiedTime,keepForever)`
   - `keepRevision(fileId, revisionId)` → `PATCH .../revisions/{revisionId}` body `{"keepForever":true}`
3. **里程碑操作**（`services/milestoneService.ts`）：
   - `createMilestone(project, label)`:
     - 對 `project.json` 的 Drive fileId 呼叫 `listRevisions` 取最新 revision id。
     - 呼叫 `keepRevision(fileId, revisionId)`（確保 Drive 不自動清除）。
     - 在 `project.milestones` push `{ id, label, createdAt, driveRevisionId }` 並儲存 project.json。
   - `getMilestones(project)` → 直接讀 `project.milestones`。
4. 里程碑 UI（放在原稿頁的「總覽」側欄或獨立的 `VersionHistoryPanel.tsx`）：
   - 「標記里程碑」按鈕 → 彈窗輸入標籤（如「第三稿完成」）→ 呼叫 `createMilestone`。
   - 里程碑清單：顯示 `label`、`createdAt`（`Intl.DateTimeFormat` 格式化）。
   - 不提供從里程碑還原（第一版只記錄，還原需使用者自行到 Drive 歷史）。
5. **放置位置**：在書架首頁的書卡選單加「查看里程碑」入口；或在原稿頁頂部 App Bar 加「⋯ 更多」選單。

**驗收清單**
- [ ] 點「標記里程碑」→ 輸入標籤 → 成功後里程碑清單出現該條記錄。
- [ ] 重整後里程碑清單仍在（存在 project.json）。
- [ ] `grep -rn "snapshots" src` → 無（第一版不存全文快照）。
- [ ] Drive 上對應 revision 的 `keepForever` = true（可在 Drive 介面 Activity 確認）。

**反模式守則**：不要在 `project.json` 存全文快照（SPEC 已決定第二階段才考慮）；API 呼叫前必須確認 `drive.file` scope 是否允許 `revisions.list`（若 scope 受限，改為只在 `milestones` 存標籤 + 時間，不標記 Drive revision，並在 spec 補注）。

---

## Phase 3.4：響應式打磨（平板 ≥768px）

**目標**：在 768px–1023px 的平板上可正常使用（側欄可收起/展開）。

**要做的事**
1. **原稿頁三欄**：
   - `md:` breakpoint（≥768px）：左欄預設展開，可點漢堡鈕收起（變成 icon-only rail 或完全隱藏）。
   - 右欄（筆記/待辦）在 `lg:` 才預設顯示；`md` 時預設隱藏，可點圖示打開 Drawer 覆蓋。
2. **書架網格**：桌面 3 欄 → 平板 2 欄（`md:grid-cols-2 lg:grid-cols-3`）。
3. **角色/研究卡片**：桌面 4/3 欄 → 平板 2 欄。
4. **情節看板**：欄位橫向捲動（`overflow-x: auto`）在平板上已自然可用，確認滑動順暢。
5. **頂部導航**：平板上分頁文字縮短或只顯示圖示（`hidden md:inline`）。
6. **breakpoint 策略**：Tailwind v4 預設 `sm:640 md:768 lg:1024 xl:1280`（確認 v4 是否與 v3 相同，執行者務必 WebFetch 確認 v4 breakpoint 設定方式）。

**驗收清單**
- [ ] 在 768px 寬度下，書架/原稿/看板/角色/研究/總覽均可正常操作（無橫向溢出、無元素重疊）。
- [ ] 原稿頁左欄可收起，收起後編輯器佔滿剩餘寬度。
- [ ] `npm run build` 無 Tailwind 警告。

**反模式守則**：不要在 `< 768px` 強制顯示三欄（會重疊）；手機（`<768px`）顯示「建議使用較大螢幕」即可，不需完整 RWD。

---

## Phase 3.5：i18n 補完 + 無障礙基線

**目標**：所有可見文字走 i18n key；基本無障礙（鍵盤、focus、alt）。

**要做的事**
1. **i18n 補完**：
   - 掃描 `src` 內所有中文字串：`grep -rn "[一-鿿]" src --include="*.tsx" --include="*.ts"`。
   - 將 Phase 1–3 實作中直接寫死的中文字串移進 `src/locales/zh-TW.json`，用 `t('key')` 取代。
   - 確認日期（用 `Intl.DateTimeFormat('zh-TW', {year:'numeric',month:'long',day:'numeric'})`）與數字（`Intl.NumberFormat('zh-TW')`）皆用 Intl，不 hardcode 格式。
2. **無障礙基線**：
   - 所有 `<img>` 有 `alt`（書封 alt = 書名；角色肖像 alt = 角色名；研究圖 alt = 標題）。
   - 所有互動元素（button、input、link）可用 `Tab` 鍵聚焦，focus visible（Tailwind `focus-visible:ring`）。
   - 對話框（Modal）：打開時焦點移入，關閉時焦點回到觸發元素；ESC 關閉。
   - 情節看板拖曳：對鍵盤使用者提供替代操作（上移/下移按鈕，dnd-kit 本身支援鍵盤，確認 `KeyboardSensor` 已啟用）。
3. **錯誤邊界**：加 React `ErrorBoundary`（或用 `react-error-boundary`）包 `BookLayout`，Drive API 異常不應白屏。

**驗收清單**
- [ ] `grep -rn "[一-鿿]" src --include="*.tsx"` 結果只剩 i18n key 文件本身、註解、test data（不應有 JSX 裡直接的中文）。
- [ ] Tab 鍵可遍歷書架、編輯器工具列、看板按鈕等主要互動元素，有 focus ring 可見。
- [ ] 所有圖片有 alt（`grep -rn "<img" src` → 每個 `<img` 旁邊有 `alt=`）。
- [ ] Modal 開啟後 ESC 可關閉。
- [ ] Drive API 故意失敗（斷網）→ 出現 ErrorBoundary 提示，不白屏。

---

## Phase 3.F：Phase 3 總驗證 + Vercel 部署

### 程式碼最終掃描
1. `grep -rn "gapi" src` → 無。
2. `grep -rn "@tailwind " src` → 無（v4）。
3. `grep -rn "localStorage.*token\|sessionStorage.*token" src` → 無 access token 落地。
4. `grep -rn "drive.google.com" src` → 無公開圖片連結。
5. `grep -rn "[一-鿿]" src --include="*.tsx"` → 只剩 i18n 文件/註解。
6. `npm run build` 無 TS 錯誤、無 Tailwind 警告。
7. 所有單元測試（`wordCount`、`wordStats`、`reminderService`）通過。

### 端對端煙霧測試
- [ ] 登入 → 建書 → 寫字（確認 autosave）→ 切章 → 情節看板（拖曳）→ 建角色（上傳肖像）→ 建研究素材 → 到總覽看圖表 → 匯出 `.md` → 標記里程碑 → 鈴鐺提醒 → 登出 → 重新登入 → 所有資料仍在。
- [ ] 在 768px 寬度下同上流程無破版。

### Vercel 部署
1. 確認 `vercel.json`（或根目錄無需設定，Vite 預設 Vercel 支援）。
2. 在 Vercel 環境變數加 `VITE_GOOGLE_CLIENT_ID`。
3. 在 Google Cloud Console 的 OAuth Client 加 production domain（如 `https://power-write.vercel.app`）到授權來源與重新導向 URI。
4. Push → Vercel 自動部署 → 生產環境煙霧測試（登入 + 建書 + 寫字 + 存檔）。

---

## 交付產物（Phase 3 完成時）
- **完整 Power Write MVP**：書架 + 三欄原稿編輯器 + 情節看板 + 角色庫 + 研究庫 + 數據總覽 + 匯出 + 寫作提醒 + 里程碑標記。
- 平板友善（≥768px）、繁中 i18n、基本無障礙。
- 部署至 Vercel，可從公開 URL 訪問。

> **里程碑版本歷史（全文快照）** 與 **深色模式** 為 SPEC §12 確認的後續項目，不在本計畫範圍。

---

## 附錄：各 Phase 計畫快速索引

| 計畫檔 | 內容 |
| --- | --- |
| `PLAN-phase1.md` | 骨架 + 登入 + Drive 服務 + 書架 + 原稿編輯器 |
| `PLAN-phase2.md` | 角色庫 + 研究庫 + 情節看板 + 內嵌圖片 + 全文搜尋 |
| `PLAN-phase3.md` | 數據總覽 + 匯出 + 通知 + 里程碑 + 響應式 + i18n + 部署 |
