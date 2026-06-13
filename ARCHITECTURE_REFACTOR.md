# Architecture Refactor Plan

基於架構規範審查結果，針對現有 codebase 的改善計畫。

**規範來源：** Staff Frontend Engineer Architecture Rules  
**審查日期：** 2026-06-13  
**狀態：** 🔲 未開始 / 🔄 進行中 / ✅ 完成

---

## 總覽

| Phase | 目標 | 優先級 | 預估影響 |
|-------|------|--------|----------|
| Phase 1 | ManuscriptPage 拆分 | 🔴 高 | 627 → ~80 LOC |
| Phase 2 | PlotBoard 拆分 | 🔴 高 | 657 → ~100 LOC |
| Phase 3 | Features 補齊標準子目錄 | 🟡 中 | 結構整齊化 |
| Phase 4 | Business Logic → Custom Hooks | 🟡 中 | 可測試性提升 |
| Phase 5 | Shared UI 補齊 Composition 介面 | 🟢 低 | 未來擴充彈性 |

---

## Phase 1 — ManuscriptPage 拆分

**問題：** `ManuscriptPage.tsx` 627 LOC，超規範 3 倍以上。  
包含 pure utility functions、多個 inline components、autosave 邏輯、Drive API 呼叫全部混在一起。

**目標結構：**

```
features/manuscript/
  components/
    SaveTag.tsx           ← 從 ManuscriptPage.tsx:76 拆出
    SidePanel.tsx         ← 從 ManuscriptPage.tsx:106 拆出
    EditorToolbar.tsx     ← 從 ManuscriptPage.tsx:522 拆出（top app bar）
    EditorArea.tsx        ← 從 ManuscriptPage.tsx:604 拆出（editor content）
  hooks/
    useChapterLoader.ts   ← loadChapter + 初始化 useEffect（ManuscriptPage.tsx:261-308）
    useAutosave.ts        ← triggerSave + debounce logic（ManuscriptPage.tsx:344-412）
    useEditorImageUpload.ts ← handleImageFileSelected（ManuscriptPage.tsx:450-472）
  lib/
    driveImageHelpers.ts  ← expandDriveUrls + collapseBlobUrls（ManuscriptPage.tsx:33-61）
  ManuscriptPage.tsx      ← 組合以上，目標 < 100 LOC
  manuscriptStore.ts      ← 不動
  ChapterTree.tsx         ← 不動
  useManuscriptSearch.ts  ← 不動
```

**拆分步驟：**

### 1-A：抽出 pure utilities → `lib/driveImageHelpers.ts`
- 移出 `expandDriveUrls()` (line 33–49)
- 移出 `collapseBlobUrls()` (line 53–61)
- 移出 `pad()` / `fmtTime()` (line 66–72)

### 1-B：抽出 `SaveTag` → `components/SaveTag.tsx`
- 移出 line 76–102
- Props: `{ status, lastSavedAt, onRetry }`

### 1-C：抽出 `SidePanel` → `components/SidePanel.tsx`
- 移出 line 106–224
- Props: `{ project, onProjectUpdate }`
- 內部邏輯（saveNotes, toggleTodo, addTodo, adjustGoal）維持 inline，因為都是 UI-driven side effects

### 1-D：抽出 `useChapterLoader` → `hooks/useChapterLoader.ts`
- 封裝 `loadChapter` callback (line 280–308)
- 封裝初始化 `useEffect` (line 261–277)
- 回傳 `{ loadChapter }`

### 1-E：抽出 `useAutosave` → `hooks/useAutosave.ts`
- 封裝 `triggerSave` (line 345–412)
- 封裝 Cmd+S `useEffect` (line 415–429)
- 回傳 `{ triggerSave }`

### 1-F：抽出 `useEditorImageUpload` → `hooks/useEditorImageUpload.ts`
- 封裝 `handleImageFileSelected` (line 450–472)
- 封裝 `fileInputRef`
- 回傳 `{ fileInputRef, handleImageFileSelected }`

### 1-G：抽出 `EditorToolbar` → `components/EditorToolbar.tsx`
- 移出 top app bar JSX (line 522–602)
- Props: `{ chapterTitle, editingChapterTitle, wordCount, saveStatus, lastSavedAt, focusMode, sidebarOpen, onToggleSidebar, onTitleClick, onTitleChange, onTitleBlur, onTitleKeyDown, onRetry, onInsertImage, onToggleFocus, fileInputRef, onImageChange }`
- ⚠️ Props 超過 8 個警戒 → 考慮拆 `onTitleProps`、`onSaveProps` 物件 groups

### 1-H：`ManuscriptPage.tsx` 精簡到只剩組合邏輯

---

## Phase 2 — PlotBoard 拆分

**問題：** `PlotBoard.tsx` 657 LOC，4 個 component 塞在一個檔案。  
DnD 邏輯、CRUD、project load/save 全部在 `PlotBoard()` function 內。

**目標結構：**

```
features/plot/
  components/
    SceneCard.tsx         ← 從 PlotBoard.tsx:30 拆出
    ChapterColumn.tsx     ← 從 PlotBoard.tsx:120 拆出
    ActSection.tsx        ← 從 PlotBoard.tsx:570 拆出
    PlotToolbar.tsx       ← 從 PlotBoard.tsx:483 拆出（top toolbar）
  hooks/
    usePlotProject.ts     ← load/save project（PlotBoard.tsx:228-236, 443-459）
    usePlotDnd.ts         ← DnD sensors + handlers（PlotBoard.tsx:251-366）
    usePlotCrud.ts        ← act/chapter/scene CRUD（PlotBoard.tsx:370-433）
  PlotBoard.tsx           ← 組合以上，目標 < 100 LOC
  SceneModal.tsx          ← 不動
```

**拆分步驟：**

### 2-A：獨立化已有的 inline components
- `SceneCard` (line 30–116) → `components/SceneCard.tsx`
- `ChapterColumn` (line 120–202) → `components/ChapterColumn.tsx`
- `ActSection` (line 570–657) → `components/ActSection.tsx`

### 2-B：抽出 `usePlotProject` → `hooks/usePlotProject.ts`
- 封裝 load project `useEffect` (line 228–236)
- 封裝 `handleSave` (line 443–459)
- 封裝 `project`, `setProject`, `dirty`, `saving`, `saveError` state
- 回傳 `{ project, localActs, setLocalActs, dirty, saving, saveError, handleSave }`

### 2-C：抽出 `usePlotDnd` → `hooks/usePlotDnd.ts`
- 封裝 `sensors` (line 251–253)
- 封裝 `findSceneContainer` / `findChapterActIndex` helpers
- 封裝 `handleDragStart` / `handleDragOver` / `handleDragEnd` (line 293–366)
- 封裝 `activeScene` state
- 回傳 `{ sensors, activeScene, handleDragStart, handleDragOver, handleDragEnd }`

### 2-D：抽出 `usePlotCrud` → `hooks/usePlotCrud.ts`
- 封裝 `updateActs` helper
- 封裝 scene CRUD: `openAddScene`, `openEditScene`, `handleSaveScene` (line 370–396)
- 封裝 act/chapter CRUD: `addAct`, `addChapterToAct`, `renameChapter`, `renameAct` (line 400–433)
- 封裝 modal state: `modalChapterId`, `editingScene`
- 回傳所有操作函數

### 2-E：`PlotBoard.tsx` 精簡到只剩組合邏輯

---

## Phase 3 — Features 補齊標準子目錄

**問題：** 各 feature 的 modal/component 直接放在 feature 根層，沒有 `components/` 子目錄。

**目前 vs 目標：**

```
# 目前
features/
  characters/
    CharacterList.tsx
    CharacterModal.tsx

# 目標
features/
  characters/
    components/
      CharacterList.tsx
      CharacterModal.tsx
    hooks/
      useCharacterImageUpload.ts   ← 見 Phase 4
```

**需要搬移的檔案：**

| 現在位置 | 搬移到 |
|----------|--------|
| `characters/CharacterList.tsx` | `characters/components/CharacterList.tsx` |
| `characters/CharacterModal.tsx` | `characters/components/CharacterModal.tsx` |
| `research/ResearchList.tsx` | `research/components/ResearchList.tsx` |
| `research/ResearchModal.tsx` | `research/components/ResearchModal.tsx` |
| `shelf/CreateBookModal.tsx` | `shelf/components/CreateBookModal.tsx` |
| `shelf/ShelfPage.tsx` | `shelf/components/ShelfPage.tsx` (or keep as page entry) |
| `layout/BookLayout.tsx` | `layout/components/BookLayout.tsx` |
| `layout/MilestonePanel.tsx` | `layout/components/MilestonePanel.tsx` |
| `layout/NotificationBell.tsx` | `layout/components/NotificationBell.tsx` |
| `search/SearchPage.tsx` | `search/components/SearchPage.tsx` |

> ⚠️ 搬移時需同步更新所有 import path，確認 `router.tsx` 與 `BookLayout.tsx` 的 lazy imports。

---

## Phase 4 — Business Logic → Custom Hooks

**問題：** Modal components 仍有 business logic 直接 inline。

### 4-A：`CharacterModal` — image upload 邏輯
**現況：** `CharacterModal.tsx` 有 4 個 image 相關 state + upload handler inline  
**目標：** 抽成 `hooks/useCharacterImageUpload.ts`

```ts
// hooks/useCharacterImageUpload.ts
export function useCharacterImageUpload(bookFolderId: string, initialAssetId?: string | null) {
  // portraitAssetId, portraitUrl, uploading, fileInputRef
  // handleFileChange
  return { portraitAssetId, portraitUrl, uploading, fileInputRef, handleFileChange }
}
```

### 4-B：`ResearchModal` — image upload 邏輯
同上，抽成 `hooks/useResearchImageUpload.ts`（或共用 `shared/hooks/useImageUpload.ts`）

### 4-C：`ShelfPage` — 過肥 (332 LOC)
- `CreateBookModal` 已獨立（✅）
- 考慮抽出 `useShelfActions` hook 封裝 create/delete book 邏輯

### 4-D：`SidePanel`（已在 Phase 1 獨立後）— 考慮抽出 `useSidePanel` hook
- `saveNotes`, `toggleTodo`, `addTodo`, `adjustGoal` 邏輯
- 可提升測試覆蓋

> **共用 hook 機會：** CharacterModal 與 ResearchModal 的 image upload 模式完全相同，  
> 可抽成 `shared/hooks/useImageUpload.ts`，接受 `bookFolderId` 與初始 `assetId`。

---

## Phase 5 — Shared UI 補齊 Composition 介面

**問題：** `Modal.tsx` 目前是單一 flat component，不支援 Composition Pattern。

**現況：**
```tsx
<Modal title="..." onClose={...} footer={...}>
  {children}
</Modal>
```

**目標（Compound Component）：**
```tsx
<Modal onClose={...}>
  <Modal.Header>標題</Modal.Header>
  <Modal.Body>內容</Modal.Body>
  <Modal.Footer>
    <Button>確認</Button>
  </Modal.Footer>
</Modal>
```

**實作方式：**
- 在 `Modal.tsx` 加上 `Modal.Header`、`Modal.Body`、`Modal.Footer` static properties
- 維持向下相容（舊有 `title` / `footer` props 繼續支援，標記 `@deprecated`）

---

## 執行順序建議

```
Phase 1 (ManuscriptPage)
  └── 1-A lib utilities    ← 無依賴，可先做
  └── 1-B SaveTag          ← 無依賴
  └── 1-C SidePanel        ← 無依賴
  └── 1-D useChapterLoader ← 依賴 1-A
  └── 1-E useAutosave      ← 依賴 1-A
  └── 1-F useEditorImageUpload
  └── 1-G EditorToolbar    ← 依賴 1-B, 1-F
  └── 1-H ManuscriptPage 精簡  ← 全部完成後

Phase 2 (PlotBoard) ← 可與 Phase 1 並行
  └── 2-A 獨立 components  ← 先做
  └── 2-B usePlotProject
  └── 2-C usePlotDnd
  └── 2-D usePlotCrud
  └── 2-E PlotBoard 精簡

Phase 3 (目錄搬移) ← Phase 1+2 完成後，減少 import 衝突

Phase 4 (Custom Hooks) ← Phase 3 之後

Phase 5 (Modal Composition) ← 最後，影響最廣
```

---

## 驗收標準

每個 Phase 完成後須通過：

- [ ] `npm run build` 無 TypeScript 錯誤
- [ ] `npx vitest run` 全部通過
- [ ] 沒有任何 Component 超過 200 LOC
- [ ] 沒有任何 Hook 超過 150 LOC
- [ ] `shared/components/ui/` 內無 fetch / zustand / business logic
- [ ] 每個 feature 有 `components/` 子目錄（Phase 3 後）

---

## 進度追蹤

### Phase 1 — ManuscriptPage 拆分 ✅ 2026-06-13
- [x] 1-A `lib/driveImageHelpers.ts`
- [x] 1-B `components/SaveTag.tsx`
- [x] 1-C `components/SidePanel.tsx`
- [x] 1-D `hooks/useChapterLoader.ts`
- [x] 1-E `hooks/useAutosave.ts`
- [x] 1-F `hooks/useEditorImageUpload.ts`
- [x] 1-G `components/EditorToolbar.tsx`
- [x] 1-H `ManuscriptPage.tsx` 精簡（627 → ~170 LOC）

### Phase 2 — PlotBoard 拆分 ✅ 2026-06-13
- [x] 2-A `components/SceneCard.tsx` / `ChapterColumn.tsx` / `ActSection.tsx`
- [x] 2-B `hooks/usePlotProject.ts`
- [x] 2-C `hooks/usePlotDnd.ts`
- [x] 2-D `hooks/usePlotCrud.ts`
- [x] 2-E `PlotBoard.tsx` 精簡（657 → ~100 LOC）

### Phase 3 — 目錄結構整理 ✅ 2026-06-13
- [x] characters 搬移
- [x] research 搬移
- [x] shelf 搬移
- [x] layout 搬移
- [x] search 搬移
- [x] 更新所有 import paths

### Phase 4 — Custom Hooks ✅ 2026-06-13
- [x] 4-A+4-B `shared/hooks/useImageUpload.ts`（CharacterModal + ResearchModal 共用）
- [ ] 4-C `ShelfPage` 瘦身（332 LOC，留待後續）
- [ ] 4-D `useSidePanel`（留待後續評估）

### Phase 5 — Modal Composition ✅ 2026-06-13
- [x] `Modal.Header` / `Modal.Body` / `Modal.Footer` compound components
- [ ] 既有 feature modal 遷移到新介面（向下相容，可漸進替換）
