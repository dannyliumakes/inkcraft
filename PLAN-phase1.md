# Power Write — Phase 1 實作計畫（地基 + 核心寫作）

> 由 `SPEC.md` 的 Phase 1 展開。每個子階段都可在**獨立的新 chat context** 中執行，互不依賴記憶。
> 執行原則：**照文件 COPY，不要憑空發明 API**。每階段開頭先讀該階段列出的官方文件 URL，確認 API 名稱與簽名後再寫 code。

Phase 1 範圍 = SPEC.md 的：①專案骨架 ②Google 登入 + Drive 服務層 ③書架首頁 ④原稿編輯器（Tiptap、章節樹、字數、自動儲存、焦點模式）。

---

## Phase 0：文件探查（每個執行者開工前必做）

⚠️ 由於本計畫的 API 名稱是作者依知識填入，**執行者在每個子階段動手前，必須先用 WebFetch 讀對應官方文件確認**。下方為「預期可用 API 清單」與來源；若文件與此處不符，**以文件為準**並在計畫旁註記。

### Allowed APIs 清單（待執行者驗證）

| 領域 | 預期 API / 套件 | 來源（必讀） |
| --- | --- | --- |
| GIS OAuth（implicit token） | `@react-oauth/google` 的 `GoogleOAuthProvider` + `useGoogleLogin({ flow:'implicit', scope })`，回傳 `access_token` | https://www.npmjs.com/package/@react-oauth/google ；https://developers.google.com/identity/oauth2/web/guides/use-token-model |
| Drive v3 建資料夾 | `POST https://www.googleapis.com/drive/v3/files`，body `{name, mimeType:'application/vnd.google-apps.folder', parents:[id]}` | https://developers.google.com/drive/api/v3/reference/files/create ；https://developers.google.com/drive/api/guides/folder |
| Drive v3 list（q 查詢） | `GET https://www.googleapis.com/drive/v3/files?q=...&fields=files(id,name)&spaces=drive` | https://developers.google.com/drive/api/guides/search-files |
| Drive v3 建檔（multipart） | `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` | https://developers.google.com/drive/api/guides/manage-uploads#multipart |
| Drive v3 更新內容（media） | `PATCH https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=media` | https://developers.google.com/drive/api/reference/rest/v3/files/update |
| Drive v3 下載內容 | `GET https://www.googleapis.com/drive/v3/files/{id}?alt=media` → `res.blob()` | https://developers.google.com/drive/api/guides/manage-downloads |
| Drive v3 版本號 | `GET .../files/{id}?fields=headRevisionId` | https://developers.google.com/drive/api/reference/rest/v3/files/get |
| Tiptap 2 React | `@tiptap/react`、`@tiptap/starter-kit`、`@tiptap/pm`；`useEditor({extensions,content})` + `<EditorContent editor>` | https://tiptap.dev/docs/editor/getting-started/install/react |
| Tiptap Markdown I/O | `tiptap-markdown`：`Markdown` extension；`editor.storage.markdown.getMarkdown()`；以 markdown 字串當 `content` 載入 | https://github.com/aguingand/tiptap-markdown |
| Tiptap 字元數 | `@tiptap/extension-character-count`（`.characters()`）；**CJK 用自寫 counter，勿用 `.words()`** | https://tiptap.dev/docs/editor/extensions/functionality/character-count |
| Tiptap 自訂圖片屬性 | extend `@tiptap/extension-image`，`addAttributes()` 加 `assetId`/`caption` | https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing |
| Vite scaffold | `npm create vite@latest <name> -- --template react-ts` | https://vite.dev/guide/ |
| Tailwind（**用 v4**） | `@tailwindcss/vite` 外掛 + CSS 內 `@import "tailwindcss";`（**不要**用 v3 的 `@tailwind` directives + postcss） | https://tailwindcss.com/docs/installation/using-vite |
| React Router v6 | `createBrowserRouter` + `RouterProvider`，巢狀 route + `<Outlet/>` | https://reactrouter.com/start/library/routing |
| Zustand | `create<T>()(set => ...)`（curried TS 寫法） | https://zustand.docs.pmnd.rs/guides/typescript |
| i18n | `react-i18next` + `i18next`，預設 `zh-TW` | https://react.i18next.com/guides/quick-start |
| 離線快取 | `idb`：`openDB`、`get`、`put` | https://www.npmjs.com/package/idb |

### 反模式守則（全程適用）
- ❌ 不要用已棄用的 `gapi` / `gapi.auth2`。一律用 GIS（Google Identity Services）。
- ❌ implicit flow 在瀏覽器**沒有 refresh token**；access token 約 1 小時過期，過期要重新呼叫 `useGoogleLogin`，不要假裝能 refresh。
- ❌ `drive.file` scope 下圖片**不能**用公開 `<img src="https://drive...">`；必須 API 下載成 blob → `URL.createObjectURL`。
- ❌ 不要混用 Tailwind v3 與 v4 的設定方式。本專案用 v4。
- ❌ access token 不寫進 localStorage（存記憶體 / Zustand non-persist）。

---

## Phase 1.1：專案骨架

**目標**：可跑起來的空殼，含全部基礎設施與路由，但畫面是 placeholder。

**要做的事（照文件 COPY）**
1. `npm create vite@latest power-write -- --template react-ts`（在 repo 內；現有只有 test.txt，先開 feature 分支）。
2. 安裝依賴：`react-router-dom zustand react-i18next i18next idb @react-oauth/google`，編輯器留到 1.4。
3. Tailwind **v4**：裝 `tailwindcss @tailwindcss/vite`，在 `vite.config.ts` 加 `tailwindcss()` plugin，CSS 入口 `@import "tailwindcss";`（照官方 Vite 安裝頁 COPY）。
4. 建目錄結構：
   ```
   src/
     main.tsx            # GoogleOAuthProvider + RouterProvider
     router.tsx          # createBrowserRouter，巢狀路由
     i18n.ts             # react-i18next init，預設 zh-TW
     locales/zh-TW.json  # 翻譯字串
     stores/             # zustand stores
     services/           # drive、auth（1.2 填內容）
     features/
       shelf/            # 書架（1.3）
       manuscript/       # 編輯器（1.4）
       layout/BookLayout.tsx  # 頂部 5 分頁 + <Outlet/>
     lib/wordCount.ts    # CJK 計數（1.4）
   ```
5. `router.tsx`：用 `createBrowserRouter`，路由照 SPEC §3：
   - `/` → Shelf
   - `/book/:bookId` → `BookLayout`（含頂部分頁），children: `manuscript`(index)、`plot`、`characters`、`research`、`overview`（後四個先放 placeholder）。
6. `BookLayout`：頂部導航列（logo + 5 分頁 NavLink + 鈴鐺 + 使用者）。分頁用 `NavLink` 標示 active。

**文件參考**：Vite guide、Tailwind v4 Vite 安裝頁、React Router「routing」、i18next quick-start（皆見 Phase 0 表）。

**驗收清單**
- [ ] `npm run dev` 啟動無錯。
- [ ] `/` 顯示 Shelf placeholder；`/book/test/manuscript` 顯示帶頂部分頁的 layout。
- [ ] `grep -r "@tailwind " src` **無結果**（確認用 v4 import 而非 v3 directive）。
- [ ] `useTranslation()` 在某元件成功顯示一個 zh-TW 字串。
- [ ] `npm run build` 通過。

**反模式守則**：勿建立 `tailwind.config.js` + postcss 的 v3 流程；勿在此階段引入編輯器套件。

---

## Phase 1.2：Google 登入 + Drive 服務層

**目標**：能登入 Google、在 Drive 建立 `PowerWrite/` 與書本資料夾、讀寫 `project.json` 與 `.md`、上傳/下載圖片。**這是最高風險階段，務必先讀文件。**

**前置（使用者需提供）**：Google Cloud Console 建 OAuth Client ID（Web），授權來源加 `http://localhost:5173`。Client ID 放 `.env` 的 `VITE_GOOGLE_CLIENT_ID`。

**要做的事（照文件 COPY）**
1. `main.tsx` 包 `<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>`。
2. `services/auth.ts` + `stores/authStore.ts`：
   - 用 `useGoogleLogin({ flow:'implicit', scope:'https://www.googleapis.com/auth/drive.file', onSuccess })`，把 `access_token` 存進 Zustand（**記憶體，不 persist**）。
   - 包一個 `getAccessToken()`；偵測到 401 時清 token 並要求重新登入（不嘗試 refresh）。
3. `services/drive.ts`——純 `fetch` 包裝（全部帶 `Authorization: Bearer ${token}`）：
   - `findOrCreateRootFolder()`：`files.list` 用 `q="name='PowerWrite' and mimeType='application/vnd.google-apps.folder' and trashed=false"`；無則 `files.create`。
   - `createFolder(name, parentId)`。
   - `listChildren(parentId, extraQ?)`。
   - `createTextFile(name, parentId, content, mimeType)`：**multipart upload**（`uploadType=multipart`，body 為 metadata JSON + media 的 multipart）。
   - `updateFileContent(fileId, content)`：`PATCH uploadType=media`。
   - `downloadText(fileId)` / `downloadBlob(fileId)`：`GET ?alt=media` → `res.text()` / `res.blob()`。
   - `getHeadRevisionId(fileId)`：`files.get?fields=headRevisionId`。
4. `services/assets.ts`：`uploadImage(file, bookFolderId)` → 回 assetId；`getImageUrl(assetId)` → 下載 blob + `URL.createObjectURL`，並用 Map 快取（assetId → objectURL）。
5. `services/projectRepo.ts`：`loadProject(bookId)` / `saveProject(project)`（讀寫 `project.json`，依 SPEC §4.2 型別）；型別定義放 `src/types/project.ts`（照 SPEC §4.2 一字不差建 interface）。

**文件參考**：@react-oauth/google README、Drive create/upload/download/search 各頁（Phase 0 表）。先 WebFetch multipart upload 頁，確認 boundary 與 body 格式再寫。

**驗收清單**
- [ ] 點登入 → 同意畫面顯示「管理您用這個應用程式開啟或建立的雲端硬碟檔案」。
- [ ] 登入後在 Drive 出現 `PowerWrite/` 資料夾。
- [ ] 寫一個 temp 測試：建子資料夾 + 寫入一個 `.md` + 讀回，內容一致。
- [ ] 上傳一張圖 → `getImageUrl` 能在 `<img>` 顯示。
- [ ] token 過期（或手動清掉）後操作 → 導回登入，無 crash。

**反模式守則**：勿用 gapi；勿把 token 落地；圖片勿用公開連結。

---

## Phase 1.3：書架首頁 `/`

**目標**：列出 / 建立 / 開啟 / 刪除書本。對齊 Figma `57:92`。

**要做的事**
1. 開工前對 Figma 節點 `57:92` 呼叫 `get_design_context` 取精確尺寸/色票。
2. `features/shelf/Shelf.tsx`：
   - 載入時 `findOrCreateRootFolder` → `listChildren` 列出各書資料夾 → 各讀 `project.json` 取書名、`coverAssetId`、`updatedAt`。
   - 書卡網格（桌面 3 欄）：書封（無封面則用預設米色+紅點樣板）、書名、「最後編輯：X 前」、「開啟編輯 →」連到 `/book/:id/manuscript`。
   - 永遠一張「展開新的故事」虛線空卡 → 開「建立新作品」彈窗。
3. 建立流程：輸入書名 → `createFolder` → 建 `manuscript/`、`assets/` 子資料夾 → 寫初始 `project.json`（一個空章 `ch_001` + 對應空 `.md`）→ 導向編輯器。
4. 書卡 hover 選單：重新命名、刪除（二次確認，刪 Drive 資料夾）、複製（可延後）。

**驗收清單**
- [ ] 建新書 → Drive 出現完整資料夾結構 + 初始 `project.json`。
- [ ] 重新整理後書架仍列出該書。
- [ ] 刪除需二次確認，確認後書架與 Drive 同步消失。

**反模式守則**：勿把整本書資料塞進單一 state 後才渲染；書架只需各書 meta。

---

## Phase 1.4：原稿編輯器 `/book/:id/manuscript`

**目標**：三欄編輯器，含 Tiptap、章節樹、CJK 字數、自動儲存狀態機、焦點模式。對齊 Figma `57:138`。

**要做的事（照文件 COPY）**
1. 開工前對 `57:138`、`57:141`、`57:145`、`57:163`、`57:648` 呼叫 `get_design_context`。
2. 安裝編輯器套件：`@tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-character-count @tiptap/extension-image tiptap-markdown`。
3. `lib/wordCount.ts`：`countWords(text)` 依 SPEC §4.3——CJK 字元數 + 英數 token 數，標點不計。**寫單元測試**（中文、英文、混合、標點）。
4. 編輯器（`features/manuscript/Editor.tsx`）：
   - `useEditor({ extensions:[StarterKit(heading levels 1-3), Markdown, CharacterCount, CustomImage], content: <該章 markdown> })`。
   - 載入章節 = `downloadText(chapter.fileId)` → 設為 content（透過 tiptap-markdown）。
   - 字數 = `countWords(editor.getText())`，即時顯示於頂部 App Bar。
5. **自動儲存狀態機**（SPEC §7）：
   - `onUpdate` → 設狀態「正在輸入…」並重置 3 秒 debounce timer。
   - 觸發時：`editor.storage.markdown.getMarkdown()` → `updateFileContent(chapter.fileId, md)`；成功 →「已儲存 ✓ HH:MM」，失敗 →「⚠ 儲存失敗，點此重試」。
   - 同步更新 `project.json` 的 `chapters[].wordCount` + `updatedAt` + `rev+1`（對 project.json 的寫入另做 debounce 合併，避免頻繁打 API）。
   - `Cmd/Ctrl+S` → 跳過 debounce 立即存。
   - 衝突（SPEC §7）：存前比對 `headRevisionId`/`rev`，遠端較新則彈提示讓使用者選覆蓋/載入/取消。
6. **左欄**章節樹：列 `manuscript.chapters`（依 order）；點章切換載入；新增章（建 `.md` + 更新 meta）、重新命名、刪除。拖曳排序可延後到 Phase 2（先用上下移動鈕）。
7. **左欄下半 / 右欄**：角色快捷清單（讀 `characters`，唯讀預覽即可，編輯留 Phase 2）；右欄筆記（綁 `project.json.notes`）、待辦（`todos`）、今日目標（今日字數 / `dailyWordGoal`）。
8. **焦點模式**：一鍵收起左右兩欄 + 隱藏頂部分頁，只剩置中文字欄。

**文件參考**：Tiptap React 安裝、tiptap-markdown README、character-count、extend-existing（皆 Phase 0 表）。**自訂圖片屬性的 markdown 來回序列化是已知風險**——先讀 tiptap-markdown README 確認自訂 attribute 是否能保存；若不行，內嵌圖片可降級到 Phase 2 用自訂語法處理（Phase 1 編輯器先支援純文字 + 標題 + 粗斜體即可，圖片不阻塞）。

**驗收清單**
- [ ] 輸入文字 3 秒後狀態列顯示「已儲存 ✓」，重新整理內容仍在（Drive 已存）。
- [ ] `Cmd+S` 立即存。
- [ ] 字數顯示正確：`countWords` 單元測試全綠（中文逐字計）。
- [ ] 切換章節正確載入各自 `.md`。
- [ ] 焦點模式收起兩欄。
- [ ] 斷網時輸入不報錯（IndexedDB 暫存），恢復後補存（離線安全網可簡化，但至少不丟資料/不 crash）。

**反模式守則**：勿用 `CharacterCount.words()` 當中文字數（會錯）；勿假設 tiptap-markdown 能保存任意自訂 attribute 而不驗證；圖片勿用公開連結。

---

## Phase 1.F：Phase 1 總驗證

1. **文件符合度**：逐一比對 Drive 呼叫的 endpoint/參數與 §Phase 0 表（及官方文件）一致。
2. **反模式掃描**：
   - `grep -rn "gapi" src` → 應無。
   - `grep -rn "@tailwind " src` → 應無（v4）。
   - `grep -rn "localStorage" src` → 確認沒有存 access token。
   - `grep -rn "\.words()" src` → 確認沒拿來當中文字數。
3. **功能煙霧測試**（用 `/run` 或 `/verify`）：登入 → 建書 → 寫字 → 自動存 → 重整仍在 → 切章 → 焦點模式 → 字數正確。
4. `npm run build` + 單元測試（wordCount）通過。

---

## 交付產物（Phase 1 完成時）
- 可登入、可在自己 Google Drive 建立/編輯小說、自動儲存的桌面 web app。
- 書架 + 三欄原稿編輯器 + CJK 字數 + 焦點模式。
- 情節/角色/研究/總覽為 placeholder（Phase 2、3 填）。

> 下一步：完成 Phase 1 後，用 `/make-plan` 展開 SPEC.md 的 Phase 2（角色庫、研究庫、情節看板、內嵌圖片）。
