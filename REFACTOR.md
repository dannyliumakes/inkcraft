# UI 重複元件重構計劃

重構目標：將三個 Modal（CharacterModal、ResearchModal、SceneModal）中重複的 UI 與邏輯抽出至 `shared/`，減少維護成本。

---

## Phase 1 — 讓現有 Modal 元件支援 feature modal 的外殼結構

**問題：**  
`CharacterModal`、`ResearchModal`、`SceneModal` 各自手刻 overlay + 卡片殼，沒有使用已存在的 `shared/components/ui/Modal.tsx`。  
現有 `Modal` 的卡片寬度是 `max-w-sm`，但三個 feature modal 需要 `max-w-lg`。  
另外 feature modal 有獨立的 header（含標題 + ✕ 按鈕）與 footer（含取消 + 儲存按鈕），現有 `Modal` 的 `title` prop 樣式不完全吻合。

**更動內容：**

- [ ] `shared/components/ui/Modal.tsx`  
  - 新增 `size` prop：`'sm' | 'lg'`，預設 `'sm'`  
  - 新增 `footer` prop（`ReactNode`），渲染在卡片底部 border-t 區塊  
  - 調整 header 樣式使其符合 feature modal 的 `px-6 py-4 border-b` 規格

**完成標準：**  
`Modal` 元件可以直接承載 feature modal 的 header / content / footer，不需要在外層再包 overlay div。

---

## Phase 2 — 抽出 TagInput 元件

**問題：**  
三個 Modal 都有完全相同的標籤輸入邏輯與 UI：
- `tags` state + `tagInput` state  
- Enter 鍵新增、× 刪除  
- `Badge` + `Input` 組合

**更動內容：**

- [x] 新建 `shared/components/ui/TagInput.tsx`  
  - Props：`tags: string[]`、`onChange: (tags: string[]) => void`、`placeholder?: string`  
  - 內部管理 input 狀態，外部只拿 tags 陣列  
- [x] `shared/components/ui/index.ts` 補上 `TagInput` export  
- [x] `CharacterModal.tsx` — 移除 tags 相關 state / handler，改用 `TagInput`  
- [x] `ResearchModal.tsx` — 同上  
- [x] `SceneModal.tsx` — 同上

**完成標準：**  
三個 Modal 的 tags 區塊各縮減為一行 `<TagInput tags={tags} onChange={setTags} />`。

---

## Phase 3 — 抽出 ImageUploader 元件

**問題：**  
`CharacterModal` 與 `ResearchModal` 的圖片上傳流程完全一樣：  
- `fileRef` hidden input  
- `uploading` state  
- `handleFileChange` → `uploadImage()` → `getImageUrl()`  
- 點擊佔位區觸發 input

**更動內容：**

- [ ] 新建 `shared/components/ui/ImageUploader.tsx`  
  - Props：`assetId: string | null`、`bookFolderId: string`、`shape?: 'square' | 'landscape'`、`onChange: (assetId: string, url: string) => void`  
  - `shape='square'` → 頭像用圓形 80×80  
  - `shape='landscape'` → 素材用 aspect-video 矩形  
  - 內部處理 uploading state、token 取得、upload + getImageUrl  
- [ ] `shared/components/ui/index.ts` 補上 `ImageUploader` export  
- [ ] `CharacterModal.tsx` — 移除圖片上傳邏輯，改用 `<ImageUploader shape="square" />`  
- [ ] `ResearchModal.tsx` — 移除圖片上傳邏輯，改用 `<ImageUploader shape="landscape" />`  
- [ ] `SceneModal.tsx` — 移除圖片上傳邏輯，改用 `<ImageUploader />`（已是簡化版，統一換掉）

**完成標準：**  
三個 Modal 不再有 `uploadImage` / `getImageUrl` 的直接呼叫，全部透過 `ImageUploader`。

---

## Phase 4 — 用新 Modal 元件取代三個 Modal 的手刻外殼

**問題：**  
Phase 1 完成後，Modal 元件具備正確規格，可以真正取代手刻殼。

**更動內容：**

- [ ] `CharacterModal.tsx`  
  - 移除手刻的 `fixed inset-0 …` overlay div  
  - 移除 Escape 鍵 `useEffect`（Modal 元件已處理）  
  - 改用 `<Modal open onClose={onClose} title="新增角色 / 編輯角色" size="lg" footer={...}>`  
- [ ] `ResearchModal.tsx` — 同上，title="新增素材 / 編輯素材"  
- [ ] `SceneModal.tsx` — 同上，title="新增場景 / 編輯場景"

**完成標準：**  
三個 Modal 檔案不再出現 `fixed inset-0`、`bg-black/40`、Escape `useEffect`。

---

## Phase 5 — patchProject helper（選做）

**問題：**  
`ManuscriptPage` 的 `SidePanel` 內 `saveNotes`、`toggleTodo`、`addTodo`、`adjustGoal` 四個函式都重複：  
```ts
{ ...project, updatedAt: new Date().toISOString(), rev: project.rev + 1 }
```

**更動內容：**

- [x] 新建 `shared/lib/projectPatch.ts`  
  - `patchProject(project, changes)` 自動填入 `updatedAt` 與 `rev + 1`  
- [x] `ManuscriptPage.tsx` 的 `SidePanel` 四個函式改用 `patchProject`

**完成標準：**  
`SidePanel` 不再出現 `new Date().toISOString()` 與 `rev: project.rev + 1` 的重複。

---

## 執行順序

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5（選做）
```

Phase 1–4 有相依性（先擴充 Modal，再讓 feature modal 使用）。  
Phase 2 和 Phase 3 可以平行進行（互不影響）。  
Phase 5 完全獨立，隨時可做。

每個 Phase 結束後執行：
```bash
cd power-write
npm run build
npx vitest run
```
