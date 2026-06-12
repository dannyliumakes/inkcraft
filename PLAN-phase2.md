# Power Write — Phase 2 實作計畫（結構化模組）

> 接續 `PLAN-phase1.md`。Phase 1 完成後才執行本計畫。
> 前置條件：Drive 服務層（`services/drive.ts`、`services/assets.ts`、`services/projectRepo.ts`）、`src/types/project.ts` 型別、Zustand store、`BookLayout` 分頁導航均已可用。
> 執行原則：**開工前先用 WebFetch 讀列出的官方文件，確認 API 名稱後再寫 code，不要憑空發明方法。**

Phase 2 範圍：
- **2.1** 角色庫（CRUD + 圖片 + 篩選分頁）
- **2.2** 研究素材庫（CRUD + 圖片 + 標籤）
- **2.3** 情節規劃看板（幕/章/場景卡 CRUD + 拖曳排序）
- **2.4** 原稿內嵌圖片（Tiptap 自訂 Image 節點 + Drive 上傳）
- **2.5** 全文搜尋（Fuse.js 搜原稿內文）
- **2.F** Phase 2 總驗證

---

## Phase 0：文件探查（執行者開工前必做）

⚠️ 下方 Allowed APIs 清單基於作者知識填入。**執行者必須在各子階段動手前 WebFetch 對應文件 URL 驗證**，以文件為準。

### Allowed APIs 清單（待驗證）

| 領域 | 預期 API / 套件 | 來源（必讀） |
| --- | --- | --- |
| @dnd-kit 基本 setup | `DndContext`, `useSortable`, `SortableContext`, `arrayMove`（@dnd-kit/core + @dnd-kit/sortable） | https://dndkit.com/docs/introduction ；https://docs.dndkit.com/presets/sortable/usesortable |
| @dnd-kit arrayMove | `arrayMove(items, from, to)` 來自 `@dnd-kit/sortable` | https://docs.dndkit.com/presets/sortable |
| @dnd-kit 跨容器拖曳 | `DragOverlay`、`over.id`、事件 `onDragEnd({active, over})` | https://docs.dndkit.com/api-documentation/context-provider |
| Tiptap 自訂 Image 屬性 | `Image.extend({ addAttributes() { return { assetId:{default:null}, caption:{default:''}, ...Image.config.addAttributes() } } })` | https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing |
| Tiptap `renderHTML`/`parseHTML` | 自訂 node 渲染 HTML 屬性（`assetId` 對應 data attribute） | https://tiptap.dev/docs/editor/extensions/custom-extensions/node-extensions |
| tiptap-markdown 自訂語法 | markdown 序列化用 `toMarkdown`/`parseMarkdown` 自訂 rule（或用 data attribute 回退方案） | https://github.com/aguingand/tiptap-markdown （README 的 Custom Extension 段落）|
| Fuse.js | `new Fuse(list, { keys, includeScore, threshold })`, `.search(query)` 回傳 `{item, score}[]` | https://www.fusejs.io/api/options.html ；https://www.fusejs.io/examples.html |
| Recharts（Phase 3 先參考用） | `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` | https://recharts.org/en-US/api |

### 反模式守則（全程適用）
- ❌ 不要用 `react-dnd`（舊版，不是本專案選用的）；一律用 `@dnd-kit`。
- ❌ `tiptap-markdown` 自訂 attribute 序列化需驗證——先讀 README，若無法保存 `assetId` 則改用 data attribute + `renderHTML`，不要假設它會自動處理。
- ❌ 圖片不能用公開 Drive 連結，只能 API blob（與 Phase 1 相同守則）。
- ❌ Fuse.js 搜尋索引只建在「章節正文純文字」，勿把整個 project.json 塞進去。

---

## Phase 2.1：角色庫 `/book/:id/characters`

**目標**：角色卡片 CRUD（新增/編輯/刪除）、肖像上傳/顯示、依 `label` 篩選分頁。對齊 Figma `57:272`（角色資料頁）與 `57:648`（側欄角色詳情元件）。

**要做的事**
1. **開工前**對 Figma 節點 `57:272` 與 `57:648` 呼叫 `get_design_context`，取精確尺寸/色票/間距。
2. 確認 `src/types/project.ts` 裡 `Character` 介面已照 SPEC §4.2：`{ id, name, label, aliases[], description, portraitAssetId, tags[], order }`。
3. `features/characters/CharacterList.tsx`：
   - 從 `projectRepo.loadProject(bookId)` 讀 `characters` 陣列。
   - 頂部：標題「角色資料」+ 篩選 Tab Bar（「全部」+ 各 `label` 值）+ 「＋ 新增角色」按鈕。
   - 卡片網格（桌面 4 欄，卡寬 ≈ 306px）：肖像（無則預設頭像）、姓名、label 標籤 badge、別名（最多顯示 2 個）、敘述摘要（截 2 行）。
   - 點卡片 → 打開 `CharacterModal`（或同頁側欄詳情，照 Figma 側欄詳情設計 `57:648`）。
4. `features/characters/CharacterModal.tsx`（新增/編輯彈窗）：
   - 肖像上傳：`<input type="file" accept="image/*">` → `assets.uploadImage(file, bookFolderId)` → 存 `portraitAssetId`，顯示用 `assets.getImageUrl(portraitAssetId)`。
   - 欄位：姓名（必填）、label（下拉或自由輸入）、別名（可多個 tag input）、敘述（textarea）、標籤。
   - 確認 → `projectRepo.saveProject` 更新 `characters`（新增時 `order = characters.length`）。
5. 刪除：確認後從陣列移除 + 儲存（肖像圖片在 Drive 保留，不刪 assets，避免複雜度）。

**文件參考**：Figma `57:272`、`57:648`（`get_design_context`）；Drive assets API（已在 Phase 1 建立，直接用）。

**驗收清單**
- [ ] 新增角色（含肖像上傳）→ 刷新後仍存在，肖像顯示正確（blob URL，非公開連結）。
- [ ] 篩選 Tab 切換只顯示該 label 的角色；「全部」顯示全部。
- [ ] 編輯角色資料後儲存，重新整理確認更新。
- [ ] 刪除角色後清單移除。
- [ ] `grep -rn "drive.google.com" src/features/characters` → 無公開圖片連結。

**反模式守則**：label 不要 hardcode，從現有角色的 label 值動態產生篩選分頁（加「全部」）；肖像顯示不要公開連結。

---

## Phase 2.2：研究素材庫 `/book/:id/research`

**目標**：研究卡片 CRUD + 圖片 + 標籤篩選。對齊 Figma `57:291`（研究素材與資料庫）。

**要做的事**
1. **開工前**對 Figma `57:291` 呼叫 `get_design_context`。
2. 確認 `ResearchItem` 介面：`{ id, title, description, imageAssetId, tags[], sourceUrl?, order }`。
3. `features/research/ResearchList.tsx`：
   - 頂部：標題「研究素材與資料庫」+「篩選」（依 tags）+「＋ 新增素材」。
   - Masonry / 三欄卡片牆（桌面 3 欄，卡寬 ≈ 426px）：圖片（16:9 或自適應）、標題、敘述（截 3 行）、標籤 badges。
   - 點卡片 → 編輯彈窗。
4. `features/research/ResearchModal.tsx`：
   - 圖片上傳 → `assets.uploadImage` → `imageAssetId`。
   - 欄位：標題（必填）、敘述、圖片、標籤（多個 tag input）、來源 URL（選填）。
   - 儲存 → `projectRepo.saveProject` 更新 `research` 陣列。
5. 篩選：點標籤 badge → 只顯示包含該標籤的卡片（純前端過濾，不需重新載入）。

**驗收清單**
- [ ] 新增有圖片的研究素材 → 刷新後存在，圖片顯示正確。
- [ ] 點標籤篩選 → 正確過濾。
- [ ] 無圖片的卡片有合適佔位區塊（不爆版）。

**反模式守則**：圖片不用公開連結；Masonry 可用 CSS `columns` 實作（不需第三方 library）。

---

## Phase 2.3：情節規劃看板 `/book/:id/plot`

**目標**：幕/章/場景卡 CRUD + @dnd-kit 拖曳排序。對齊 Figma `57:215`（情節規劃看板）。

**要做的事（照文件 COPY）**
1. **開工前**：
   - 對 Figma `57:215` 呼叫 `get_design_context`。
   - WebFetch `https://docs.dndkit.com/presets/sortable/usesortable` 確認 `useSortable` hook 簽名與所需的 `SortableContext`, `DndContext` 配合方式。
   - WebFetch `https://docs.dndkit.com/api-documentation/context-provider` 確認 `onDragEnd` 事件形狀。
2. 安裝：`@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`。
3. 資料結構確認：`project.plotBoard.acts[]` → `act.chapters[]` → `chapter.scenes[]`（見 SPEC §4.2）。
4. `features/plot/PlotBoard.tsx`：
   - 按幕分區，每幕一條 Section Header（「第一幕」+ 分隔線）。
   - 每幕下為橫向章欄（`overflow-x: auto`）；每欄 340px；欄首顯示章名。
   - 工具列（照 Figma `57:393`、`57:406`）：標題「情節規劃看板」、篩選（依標籤）、排序、「＋ 新增場景」、「儲存變更」。
5. **場景卡拖曳（欄內 + 跨欄）**：
   - 依照 dnd-kit 文件的 Sortable preset，`SortableContext` 包場景卡清單（每欄一個 `SortableContext`，`id` 為場景 id 陣列）。
   - `useSortable({ id: scene.id })` 在每張場景卡使用。
   - 跨欄拖曳用 `onDragOver` 偵測目標欄後更新本地陣列；`onDragEnd` 觸發「儲存變更」更新 `project.json`（儲存前顯示「有未儲存變更」提示）。
   - 用 `DragOverlay` + `arrayMove` 呈現拖曳中的卡片預覽。
6. **場景卡 CRUD**：
   - 新增場景：在指定欄按「＋」→ 彈窗輸入標題 + 大綱摘要 + 可選縮圖（`imageAssetId`）+ 標籤 + `chapterRef`（選填，關聯原稿章節）。
   - 編輯：點場景卡 → 同彈窗。
   - 刪除：卡片選單 → 確認後移除。
7. **幕/章管理**：
   - 新增幕（按 Section 旁的「＋」）；新增章欄（每幕末尾）。
   - 章欄可重新命名（inline 點擊標題）。
   - 「儲存變更」按鈕：手動觸發 `projectRepo.saveProject`（看板為避免高頻 API，不 debounce 自動存，改為手動儲存 + 離開前提示有未儲存變更）。

**文件參考**：dnd-kit sortable docs、dnd-kit DragOverlay docs（Phase 0 表）；Figma `57:215`（`get_design_context`）。

**驗收清單**
- [ ] 場景卡在欄內可拖曳排序，放下後順序正確。
- [ ] 場景卡可拖曳到不同章欄，放下後出現在正確欄位。
- [ ] 按「儲存變更」後重整，順序仍保留。
- [ ] 新增/編輯/刪除場景卡後儲存。
- [ ] 新增幕、新增章欄可用。
- [ ] `grep -rn "react-dnd" src` → 無結果（確認用 dnd-kit）。

**反模式守則**：不要用 `react-dnd`；不要在每次拖曳事件都呼叫 Drive API（只在「儲存變更」時寫）。

---

## Phase 2.4：原稿內嵌圖片

**目標**：在 Tiptap 編輯器內上傳並顯示圖片（`assetId` 引用，非公開 URL）。

**要做的事（照文件 COPY）**
1. **開工前**：
   - WebFetch `https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing` 確認 `addAttributes()` 的確切寫法。
   - WebFetch `https://github.com/aguingand/tiptap-markdown` README，找「Custom Extension / custom attribute serialization」段落，確認 `assetId` attribute 是否能在 Markdown 序列化中保存，以及 `toMarkdown`/`parseMarkdown` 自訂規則寫法。
2. `lib/customImage.ts`——extend Tiptap Image：
   ```ts
   // 照文件 extend-existing 的 COPY pattern
   import Image from '@tiptap/extension-image'
   export const CustomImage = Image.extend({
     addAttributes() {
       return {
         ...this.parent?.(),
         assetId: { default: null },
         caption: { default: '' },
       }
     },
     // renderHTML / parseHTML 讓 assetId 對應 data-asset-id attribute
     renderHTML({ HTMLAttributes }) { ... },
     parseHTML() { ... },
   })
   ```
   > ⚠️ 若 tiptap-markdown 無法在 MD 中保存 `assetId`，則以 `![caption](drive:assetId)` 格式存入 Markdown，載入時用正則解析並替換為 blob URL。此降級方案優先於複雜的自訂序列化規則。
3. 圖片上傳 UI：在 Tiptap toolbar 加「插入圖片」按鈕 → `<input type="file">` → `assets.uploadImage` → 取得 `assetId` → `editor.commands.setImage({ src: blobURL, assetId, caption:'' })`。
4. 圖片顯示：`CustomImage` 的 `renderHTML` 用 `src="blob:..."` 顯示（blob URL 由 assets 快取取得）；若 blob URL 過期（頁面重整），在 editor `onCreate`/`onUpdate` 掃描所有 `assetId` 並重新取 blob URL。
5. 儲存：`editor.storage.markdown.getMarkdown()` 序列化時 `assetId` 需保存（用降級方案 `drive:assetId` 格式或 tiptap-markdown 自訂規則）。

**驗收清單**
- [ ] 點「插入圖片」、選圖 → 圖片出現在編輯器游標位置。
- [ ] 儲存後重新整理，圖片仍正確顯示（確認 `assetId` 有寫進 `.md`，且重新載入時能從 Drive 取回圖片）。
- [ ] `grep -rn "drive.google.com" src` → 無公開圖片連結。

**反模式守則**：不要在 `<img src>` 直接用公開 Drive 連結；不要假設 tiptap-markdown 自動處理 custom attribute——先驗證再寫。

---

## Phase 2.5：全文搜尋

**目標**：搜尋框搜原稿所有章節正文，結果顯示章節名稱 + 高亮片段。

**要做的事（照文件 COPY）**
1. **開工前**：WebFetch `https://www.fusejs.io/api/options.html` 確認 `Fuse` 建構子選項與 `.search()` 回傳結構。
2. 安裝：`fuse.js`。
3. 搜尋索引建立（在原稿模組載入完成後）：
   - 讀取所有章節的純文字（`downloadText(chapter.fileId)` → 已快取在 store 者直接用）。
   - 建立 `Fuse(chapters, { keys:['title','content'], includeScore:true, threshold:0.4 })`，其中 `content` 為該章 Markdown 的純文字（去掉 `#` 等標記）。
4. 搜尋 UI：在 `BookLayout` 頂部導航列加搜尋圖示 → 展開 `<input>` → 輸入後 debounce 300ms → 呼叫 `fuse.search(query)` → 顯示結果 Dropdown（章名 + 匹配片段 + 點擊跳到該章）。
5. 結果項目：`item.title` + 在 `item.content` 中找到 query 前後 50 字的片段，query 詞高亮（`<mark>` wrap）。

**文件參考**：https://www.fusejs.io/api/options.html

**驗收清單**
- [ ] 搜尋一個章節出現的詞 → 顯示該章結果。
- [ ] 點結果 → 跳到該章（載入並顯示於編輯器）。
- [ ] 搜尋空白 → 不顯示結果或清空。
- [ ] `grep -rn "react-search\|algoliasearch" src` → 無（只用 fuse.js）。

**反模式守則**：不要把整個 `project.json` 送進 Fuse；索引只含章節 `{ id, title, content }` 扁平陣列。

---

## Phase 2.F：Phase 2 總驗證

1. **反模式掃描**：
   - `grep -rn "react-dnd" src` → 無。
   - `grep -rn "drive.google.com" src` → 無公開圖片連結。
   - `grep -rn "@tailwind " src` → 無（確認仍是 v4）。
2. **功能煙霧測試**（用 `/verify` 或手動）：
   - 建角色 + 上傳肖像 → 重整仍在。
   - 建研究素材 + 圖片 → 重整仍在。
   - 情節看板拖曳排序 → 儲存後重整順序不變。
   - 原稿內嵌圖片 → 儲存 + 重整後仍顯示。
   - 搜尋原稿 → 正確跳章。
3. `npm run build` + 所有單元測試（wordCount + 任何新增測試）通過。

---

## 交付產物（Phase 2 完成時）
- 角色庫、研究庫完整 CRUD + 圖片。
- 情節看板幕/章/場景卡可拖曳排序並持久化。
- 原稿可內嵌圖片，儲存後重整仍在。
- 全文搜尋（只搜原稿）。

> 下一步：完成 Phase 2 後執行 `PLAN-phase3.md`（數據總覽、匯出、通知、里程碑、響應式、i18n 補完）。
