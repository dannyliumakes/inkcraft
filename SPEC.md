# Power Write — 小說編輯器完整規格書

> 版本 v1.0 ｜ 2026-06-11
> 本文件可直接貼給 AI 進行製作。內容已對齊 Figma 設計（file `PWgL8mt0axA8oKmghyxDlF`）與技術評估報告，並補上兩者落差的最終決策。

---

## 0. 給製作 AI 的一句話摘要

打造一個**純前端 SPA 小說寫作套件「Power Write」**：React 18 + Vite + Tailwind + Tiptap + Zustand，部署於 Vercel，使用 Google OAuth（`drive.file` scope）登入，所有資料存於使用者自己的 Google Drive。介面為繁體中文、桌面/平板優先。共 6 大模組：書架、原稿編輯、情節看板、角色庫、研究庫、數據總覽。

---

## 1. 產品定位與關鍵決策

| 項目 | 決策 | 備註 |
| --- | --- | --- |
| 產品範圍 | **完整 6 模組套件**（照 Figma） | 非極簡編輯器；接近 Scrivener / Campfire |
| 使用者 | 個人為主，未來可能開放 | 多人協作**不**在範圍內 |
| 部署 | Vercel（純靜態，無後端） | 所有 API 皆 client-side |
| 登入 | Google OAuth 2.0 | scope = `drive.file` |
| 資料儲存 | **Google Drive：每本書一個資料夾，含一個 `project.json` + 每章一個 `.md` + assets 圖片** | 見 §4 |
| 圖片 | **全部上傳至該書 Drive 資料夾**，文件內以 Drive file ID 引用 | 書封、原稿內嵌圖、角色肖像、研究剪報 |
| 編輯器風格 | **以 Figma 為準**：三欄式、可內嵌圖片、左右側面板；提供「焦點模式」一鍵收起兩側 → 得到 iA Writer 體驗 | |
| 情節看板場景卡 | **僅大綱卡片**（synopsis），與原稿正文分離，可選擇性關聯章節 | 見 §6.3 |
| 字數統計 | **每日快照 + 專案總目標 + 每日目標**，畫成 7 天圖表 | CJK 以「字元」計數 |
| 全文搜尋 | **只搜原稿內文**（章節正文） | 不含角色/研究/筆記 |
| 里程碑版本歷史 | **保留概念，第二階段實作** | 第一版先靠 Drive 原生版本歷史 |
| 自動儲存 | Autosave debounce 3 秒 + 手動 Ctrl/Cmd+S | 見 §7 |
| 同步衝突 | **最後寫入者勝**（含版本號檢查提示） | 第一版不做合併 |
| 通知鈴鐺 | **本機寫作提醒**（如「今日尚未寫作」「已達每日目標」），純前端、無伺服器推播 | |
| 裝置支援 | **桌面 + 平板友善**（≥768px），手機不保證 | |
| 語言 | **繁體中文為主，預留 i18n**（文字抽成語言檔） | |

---

## 2. 技術棧（Tech Stack）

| 類別 | 選擇 | 理由 |
| --- | --- | --- |
| 框架 | React 18 + Vite + TypeScript | 純 SPA，無 server 複雜度 |
| 語言 | TypeScript | 資料模型複雜，型別必要 |
| Editor | **Tiptap 2** | WYSIWYG → 乾淨 Markdown；支援自訂節點（內嵌圖片、場景參考） |
| 樣式 | Tailwind CSS | 快速迭代 |
| 狀態管理 | **Zustand** | 輕量、低 boilerplate |
| 路由 | React Router v6 | 標準；6 模組為 6 個路由 |
| 搜尋 | **Fuse.js** | 純前端 fuzzy search（搜原稿內文） |
| OAuth | Google Identity Services（GIS）+ `@react-oauth/google` | 官方 |
| Drive 存取 | Drive API v3，純 `fetch()` | 不需 gapi |
| 圖表 | **Recharts**（或自繪 SVG bar） | 數據總覽的長條圖 |
| 拖曳排序 | **@dnd-kit/core** | 章節樹、看板場景卡拖曳 |
| 本機快取 | IndexedDB（透過 `idb`） | 草稿暫存、離線安全網 |
| i18n | `react-i18next` | 文字抽語言檔，預設 `zh-TW` |
| 部署 | Vercel | Zero-config CI/CD |

---

## 3. 資訊架構與導航

頂部固定導航列（所有書內頁面共用）：

```
[Power Write logo]   [📄原稿] [🔀情節] [👥角色] [🔍研究] [📊總覽]        [🔔] [使用者名 ▾]
```

路由表：

| 路由 | 畫面 | Figma 節點 |
| --- | --- | --- |
| `/` | 書架首頁（我的作品集） | `57:92` |
| `/login` | Google 登入頁 | （Figma 未提供，自訂極簡頁） |
| `/book/:bookId/manuscript` | 原稿寫作空間（預設進入頁） | `57:138` |
| `/book/:bookId/plot` | 情節規劃看板 | `57:215` |
| `/book/:bookId/characters` | 角色資料庫 | `57:272` |
| `/book/:bookId/research` | 研究素材與資料庫 | `57:291` |
| `/book/:bookId/overview` | 專案概覽與數據 | `57:313` |

> 注意：頂部 5 個分頁**只在進入某本書後**出現；書架首頁 `/` 不顯示分頁列。

---

## 4. 資料模型（Google Drive）

### 4.1 Drive 資料夾結構

App 首次執行時於使用者 Drive 根目錄建立 `PowerWrite/`（若不存在）。每本書一個子資料夾：

```
PowerWrite/                              ← app 根資料夾（drive.file scope 下自建）
└── {bookId}/                            ← 一本書一個資料夾
    ├── project.json                     ← 主檔：所有結構化資料（除原稿正文外）
    ├── manuscript/
    │   ├── ch_001.md                    ← 每章一個 Markdown 檔（純正文）
    │   ├── ch_002.md
    │   └── ...
    └── assets/
        ├── cover.png                    ← 書封
        ├── char_{id}.png                ← 角色肖像
        ├── research_{id}.png            ← 研究剪報圖
        └── inline_{uuid}.png            ← 原稿內嵌圖
```

設計原則：
- **原稿正文**走獨立 `.md`，方便日後匯出、利用 Drive 原生版本歷史、單章存取省流量。
- **其餘所有結構化資料**（章節順序、看板、角色、研究、筆記、待辦、字數歷史、設定）集中在 `project.json`，一次讀寫即可載入整本書 meta。
- 圖片皆為 Drive 內檔案，文件中以 `assetId`（Drive file ID）引用；顯示時透過 Drive API 取得內容並轉 blob URL（注意 `drive.file` 下需用 API 下載，不能直接 `<img src>` 公開連結）。

### 4.2 `project.json` 結構

```jsonc
{
  "schemaVersion": 1,
  "id": "book_1718000000",
  "title": "沉默的迴聲",
  "coverAssetId": "drive_file_id_or_null",
  "createdAt": "2026-06-11T10:00:00Z",
  "updatedAt": "2026-06-11T12:34:00Z",
  "rev": 42,                              // 單調遞增；每次成功寫入 +1，用於衝突偵測

  "settings": {
    "projectWordGoal": 50000,            // 專案總字數目標
    "dailyWordGoal": 2000                // 每日字數目標
  },

  // ── 原稿章節（正文存在各自 .md，這裡只放 meta）──
  "manuscript": {
    "chapters": [
      {
        "id": "ch_001",
        "title": "第一章：迷霧深處",
        "file": "manuscript/ch_001.md",
        "order": 0,
        "wordCount": 1234              // 快取值，存檔時更新
      }
    ]
  },

  // ── 情節看板（純大綱，與原稿分離）──
  "plotBoard": {
    "acts": [
      {
        "id": "act_1",
        "title": "第一幕",
        "order": 0,
        "chapters": [
          {
            "id": "pbc_1",
            "title": "第一章：啟程",
            "order": 0,
            "chapterRef": "ch_001",     // 可選：關聯到原稿章節，null 表示純大綱
            "scenes": [
              {
                "id": "sc_1",
                "title": "城門前的對話",
                "synopsis": "亞瑟與莫倫的告別，埋下徽章伏筆。",
                "imageAssetId": null,
                "tags": ["伏筆", "亞瑟"],
                "order": 0
              }
            ]
          }
        ]
      }
    ]
  },

  // ── 角色庫 ──
  "characters": [
    {
      "id": "char_1",
      "name": "凱恩斯大叔",
      "label": "配角",                  // 對應 Figma 的 label 標籤，用於篩選分頁
      "aliases": ["大書", "神秘商人"],
      "description": "亞瑟在市場上遇見的那個神秘商人……",
      "portraitAssetId": "drive_file_id_or_null",
      "tags": [],
      "order": 0
    }
  ],

  // ── 研究素材庫 ──
  "research": [
    {
      "id": "res_1",
      "title": "場景中的黑色森林：氛圍參考",
      "description": "陰冷、潮濕、霧氣繚繞的森林氛圍參考。",
      "imageAssetId": "drive_file_id_or_null",
      "tags": ["場景", "氛圍"],
      "sourceUrl": null,               // 可選：剪報來源
      "order": 0
    }
  ],

  // ── 編輯頁右側面板（書層級）──
  "notes": "",                          // 自由文字筆記
  "todos": [
    { "id": "td_1", "text": "補寫第三章結尾", "done": false, "order": 0 }
  ],

  // ── 字數歷史（每日快照）──
  "wordHistory": [
    { "date": "2026-06-11", "total": 15902 }   // 當日該書總字數
  ],

  // ── 里程碑（第二階段）──
  "milestones": []
}
```

### 4.3 字數計數規則（CJK）

`字數` 計算規則（適用所有正文/敘述）：

1. 移除 Markdown 標記與空白後計算。
2. CJK 字元（中日韓統一表意文字）：**每字算 1**。
3. 非 CJK 連續字母/數字序列：**每個 token 算 1**（英文單字）。
4. 標點符號不計入。

> 實作可用：`(中文字元數) + (以空白/標點切出的英數詞數)`。提供 `countWords(text: string): number` 工具函式並寫單元測試。

---

## 5. 視覺設計規範（Design Tokens）

> 以下為依 Figma 推斷的基準值，製作時請對每個畫面呼叫 `get_design_context` / `get_variable_defs` 取得精確 token。

- **整體風格**：淺色、低飽和、大量留白、卡片帶柔和陰影與圓角；接近 Notion／Linear 的精緻簡約。
- **字體**：UI 用無襯線（system-ui / Noto Sans TC）；原稿正文標題可用襯線增加文學感（見 Figma 原稿頁 H2）。
- **圓角**：卡片約 12–16px；按鈕約 8–24px（主要按鈕為藥丸狀）。
- **主色**：近黑色主按鈕（如「建立新作品」「儲存變更」深色藥丸鈕）；強調色為紫色系（書架空卡的圖示、頭像底色）。
- **書封**：米色背景 + 紅色圓點 + 黑色山形圖案（Figma 範例風格），可作預設樣板。
- **間距網格**：8px 基準。書架卡片寬 384px；看板欄寬 340px；角色卡寬 306px；研究卡寬約 426px。

務必：所有顏色使用 CSS 變數 / Tailwind theme token，不要寫死十六進位，方便日後深色模式。

---

## 6. 各模組詳細規格

### 6.1 書架首頁 `/`（Figma 57:92）

- 標題列：日期（如「16 April, 2022」）+「我的作品集」大標 + 右側「＋ 建立新作品」深色按鈕。
- 書卡網格（responsive，桌面 3 欄）：每張卡顯示書封、書名、「最後編輯：1 天前」、「開啟編輯 →」。
- 永遠有一張**「展開新的故事」空卡**（虛線框 + 圖示），點擊＝建立新作品。
- 建立新作品流程：彈窗輸入書名 → 在 Drive 建立 `{bookId}/` 資料夾與初始 `project.json`（含 1 個空章）→ 進入 `/book/:id/manuscript`。
- 書卡右鍵 / hover 選單：重新命名、刪除（刪除＝移除 Drive 資料夾，需二次確認）、複製。

### 6.2 原稿寫作空間 `/book/:id/manuscript`（Figma 57:138）

三欄式版面：

**左欄（256px）— 階層目錄**（Figma 57:141、元件 57:648）
- 上半：**章節樹**（可拖曳排序、新增章節、重新命名、刪除）。點章節 → 載入該 `.md` 到編輯器。
- 分隔線。
- 下半：**角色快捷清單**（可下鑽：清單 → 角色詳情卡，含肖像、姓名、label、別名、敘述）。提供「角色」與「章節」兩種側欄檢視切換（Figma 元件變體 `Property 1=Default` / `Property 1=character`）。

**中欄（彈性）— 編輯器**（Figma 57:145）
- 頂部 App Bar（57:146）：章節標題、字數即時顯示、焦點模式切換鈕、儲存狀態。
- Tiptap 編輯器，支援：
  - 標題 H1–H3、粗體、斜體、引用、清單。
  - **內嵌圖片**（自訂 node）：上傳 → 存 `assets/inline_{uuid}.png` → 以 assetId 引用；可加圖說（如「參考場景：索爾海姆的晨霧」）。
  - 輸出/儲存為**乾淨 Markdown**（圖片以自訂語法保存 assetId，例如 `![圖說](drive:fileId)`，載入時解析）。
- **焦點模式**：一鍵收起左右兩欄 + 隱藏頂部分頁，只剩置中文字欄（≈ iA Writer）。

**右欄（319px）— 輔助面板**（Figma 57:163）
- 筆記（Notes）：自由文字，存 `project.json.notes`。
- 待辦清單（Todo）：可勾選，存 `project.json.todos`。
- 今日目標：顯示今日字數 / 每日目標進度。

### 6.3 情節規劃看板 `/book/:id/plot`（Figma 57:215）

- 以**幕（Act）**為分區（「第一幕」「第二幕」…），每幕一條控制列標題 + 分隔線。
- 每幕下為**章欄（Chapter Column）**橫向排列，欄寬 340px：欄首為章名，欄內為**場景卡**（synopsis），最下方有「＋ 新增場景」主按鈕。
- 場景卡內容：標題、大綱摘要、可選縮圖、標籤。**僅大綱，不含正文。** 可選擇關聯到原稿章節（`chapterRef`）。
- 互動：場景卡可在欄內 / 跨欄拖曳排序（@dnd-kit）；章欄可新增；幕可新增。
- 工具列（57:393 / 57:406）：標題「情節規劃看板」、篩選、排序、「＋ 新增場景」、「儲存變更」。

### 6.4 角色資料庫 `/book/:id/characters`（Figma 57:272）

- 標題「角色資料」+ 篩選分頁（Tab Bar，依 `label` 分類，如：全部 / 主角 / 配角）+「＋ 新增角色」按鈕。
- 角色卡網格（桌面 4 欄，卡寬 306px）：肖像、姓名、label 標籤、別名、敘述摘要。
- 點卡片 → 角色詳情（可於側欄或彈窗編輯所有欄位、上傳肖像）。
- 欄位：`name, label, aliases[], description, portraitAssetId, tags[]`（見 §4.2）。

### 6.5 研究素材與資料庫 `/book/:id/research`（Figma 57:291）

- 標題「研究素材與資料庫」+「篩選」+「＋ 新增素材」。
- Masonry / 多欄卡片牆（桌面 3 欄）：每張卡為圖片 + 標題 + 敘述 + 標籤。
- 欄位：`title, description, imageAssetId, tags[], sourceUrl?`。
- 用途：氛圍參考、世界觀設定、剪報。

### 6.6 專案概覽與數據 `/book/:id/overview`（Figma 57:313）

- 標題「專案概覽與數據」+ 右側「匯出原稿」按鈕。
- **寫作進度追蹤卡**：
  - 標題「寫作進度追蹤」+「過去 7 天的字數產出分析」+ 圖例「每日產出」+ 時間範圍下拉（最近一周）。
  - **長條圖**：週一～週日，每日字數產出（由 `wordHistory` 相鄰兩日 `total` 差計算當日增量）。
  - 底部三欄統計：**今日字數**（如 2,481）、**本週總計**（15,902）、**剩餘目標**（34,098 = `projectWordGoal − 目前總字數`）。
- **匯出原稿**：將所有章節 `.md` 依序合併，提供下載（單一 `.md` 或 `.zip`；第一版做合併 `.md` 即可）。

---

## 7. 自動儲存（Autosave）規格

### 狀態機

```
[使用者輸入] ──(重置 3 秒計時器)──▶ [等待 3 秒無輸入]
        │                                   │
        │                                   ▼
   [Ctrl/Cmd+S 立即觸發] ────────▶ [寫入 Drive]
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                  成功：狀態列「已儲存 ✓ HH:MM」   失敗：「⚠ 儲存失敗，點此重試」
```

### 狀態列文字

| 狀態 | 顯示 |
| --- | --- |
| 閒置（已儲存） | `已儲存 ✓ 21:43` |
| 正在輸入 | `正在輸入…` |
| 儲存中 | `儲存中…` |
| 儲存失敗 | `⚠ 儲存失敗，點此重試` |
| 手動存 | 跳過 debounce，立即觸發 |

### 寫入策略
- 編輯章節正文 → 只 `PATCH` 該 `.md` 檔；同時更新 `project.json` 的 `chapters[].wordCount` 與 `updatedAt`、`rev+1`（對 `project.json` 的寫入需 debounce 合併，避免頻繁打 API）。
- 編輯 meta（角色/研究/看板/筆記）→ `PATCH` `project.json`。
- **離線安全網**：每次變更先寫入 IndexedDB；網路恢復或重新整理後比對並補傳。

### 衝突處理（最後寫入者勝）
- 載入時記錄 `project.json` 的 `rev`（與 Drive `headRevisionId`）。
- 寫入前先 `GET` 遠端 `rev`；若遠端 `rev` > 本地基準 → 彈出提示「雲端有較新版本（可能在其他裝置編輯）」，讓使用者選擇：以本地覆蓋 / 載入雲端 / 取消。預設不靜默覆蓋。

---

## 8. 認證與 Google Drive 整合

- **OAuth Scope**：`https://www.googleapis.com/auth/drive.file`（只能存取 app 自建檔案，最小權限）。
- **登入流程**：GIS token client → 取得 access token（存記憶體，不落地 localStorage 以降低風險；token 過期靜默更新）。
- **Drive REST v3 操作**：`files.create`（資料夾與檔案）、`files.list`（`q` 查詢 PowerWrite 結構）、`files.get?alt=media`（讀內容）、`files.update`（PATCH 內容 / metadata）。
- **圖片顯示**：以 `files.get?alt=media` 取 blob → `URL.createObjectURL`，並建立記憶體快取（assetId → blobURL），避免重複下載。
- **Google Cloud Console 設定**（提醒使用者）：
  - 授權來源：`http://localhost:5173`（開發）、正式 Vercel domain（如 `https://power-write.vercel.app`）。
  - Vercel Preview URL 不預先登記，OAuth 測試略過，不影響主線開發。

---

## 9. 通知 / 寫作提醒（本機）

純前端、無伺服器推播。觸發時於鈴鐺顯示紅點與清單：
- 「今日尚未寫作」（當日 `wordHistory` 無增量且超過設定時間）。
- 「已達成每日目標 🎉」（今日字數 ≥ `dailyWordGoal`）。
- 可選：連續寫作天數（streak）提醒。
- 實作：登入後以 `setInterval` / 進入 app 時計算；狀態存記憶體即可。

---

## 10. 非功能需求

- **效能**：單章載入 < 500ms（含 Drive 讀取）；編輯器輸入無感延遲。
- **響應式**：≥768px 完整三欄；平板可收起側欄；< 768px 顯示「建議使用較大螢幕」提示（手機不保證）。
- **i18n**：所有可見文字走 `react-i18next`，預設 `zh-TW`；數字/日期用 `Intl`。
- **無障礙**：鍵盤可操作主要流程；焦點可見；圖片需 alt。
- **錯誤處理**：Drive API 失敗有重試與使用者可見提示；token 過期自動續期，續期失敗導回登入。
- **資料安全**：access token 不落地；刪除書本需二次確認；匯出功能讓使用者隨時可取回全部資料。

---

## 11. 建議實作階段（Phasing）

> 規格涵蓋全部 6 模組，但建議按下列順序交給 AI 製作，每階段可獨立驗收。

**Phase 1 — 地基 + 核心寫作**
1. 專案骨架（Vite + TS + Tailwind + Router + Zustand + i18n）。
2. Google 登入 + Drive 服務層（建資料夾、CRUD `project.json` 與 `.md`、圖片上傳/讀取、blob 快取）。
3. 書架首頁（建立 / 開啟 / 刪除書本）。
4. 原稿編輯器（Tiptap、章節樹、字數、自動儲存狀態機、焦點模式）。

**Phase 2 — 結構化模組**
5. 角色庫、研究庫（卡片 CRUD + 圖片 + 篩選分頁）。
6. 情節看板（幕/章/場景卡，拖曳排序）。
7. 原稿內嵌圖片。

**Phase 3 — 數據與打磨**
8. 字數每日快照 + 數據總覽圖表 + 目標 + 匯出原稿。
9. 本機寫作提醒（通知鈴鐺）。
10. 里程碑版本歷史。
11. 響應式打磨、i18n 補完、無障礙。

---

## 12. 待後續確認 / 設計補充項

製作過程中需向使用者或設計稿再確認：
- 角色 `label` 的固定分類選項（主角/配角/反派…？或自由標籤）。
- 「匯出原稿」的格式（合併 `.md` / `.docx` / `.zip`）— 第一版建議合併 `.md`。
- 看板「篩選/排序」的具體條件（依標籤？依章？）。
- 深色模式是否要做（建議 token 先預留，第一版只做淺色）。
- 每章是否需再細分「場景」於原稿層級（目前決策：原稿以「章」為單位，場景僅存在於看板大綱）。

---

## 附錄 A：Figma 節點對照表

| 畫面 / 元件 | 節點 ID |
| --- | --- |
| 書架首頁 | `57:92` |
| 原稿寫作空間 | `57:138` |
| ├ 左側階層目錄 | `57:141` |
| ├ 編輯器中欄 | `57:145` |
| └ 右側輔助面板 | `57:163` |
| 情節規劃看板 | `57:215` |
| 情節看板工具列 | `57:393`, `57:406` |
| 角色資料庫 | `57:272` |
| 研究素材與資料庫 | `57:291` |
| 專案概覽與數據 | `57:313` |
| 側欄元件（章節/角色變體） | `57:648`（`Property 1=Default` / `=character`） |

> 製作每個畫面前，建議對該節點呼叫 Figma MCP 的 `get_design_context` 取得精確的尺寸、顏色、字級與資產。
