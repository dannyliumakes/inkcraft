# Feature-Based 結構遷移計劃

漸進式遷移，每個階段獨立可部署，不破壞現有功能。

---

## 階段總覽

| 階段 | 內容 | 風險 | 預估工作量 |
|------|------|------|-----------|
| Phase 1 | 建立 `shared/` 骨架，搬純工具 | 低 | 小 |
| Phase 2 | 建立 `shared/components/ui/` 基本元件 | 低 | 中 |
| Phase 3 | 搬 shared services / stores / types | 中 | 小 |
| Phase 4 | 各 feature 內化自己的 store + service | 中 | 中 |
| Phase 5 | 所有 feature 改用 `shared/components/ui` | 中 | 中 |
| Phase 6 | 清理舊資料夾，驗收 | 低 | 小 |

---

## Phase 1 — 建立骨架，搬純工具

**目標：** 建立新的資料夾結構，搬不依賴 React 的純函式。

### 動作

1. 建立資料夾結構（空的）：
   ```
   src/shared/components/ui/
   src/shared/services/
   src/shared/stores/
   src/shared/types/
   src/lib/
   ```

2. 搬移純工具（只有函式，無 React 依賴）：
   - `src/lib/wordCount.ts` ← 從 `src/lib/wordCount.ts`（現已存在，確認路徑正確）
   - `src/lib/wordStats.ts` ← 從 `src/services/wordStats.ts`（若存在）

3. 更新所有 import 路徑。

### 驗收
- `npm run build` 無錯誤
- `npm test` 通過（wordCount.test.ts）

---

## Phase 2 — 建立 `shared/components/ui/`

**目標：** 寫出基本 UI primitive，不改任何 feature 的現有程式碼。

### 要建立的元件

| 檔案 | Props 重點 |
|------|-----------|
| `Button.tsx` | `variant: 'primary' \| 'ghost' \| 'danger'`, `size: 'sm' \| 'md'`, `loading` |
| `Input.tsx` | `label`, `error`, `forwardRef` |
| `Textarea.tsx` | `label`, `error`, `autoResize` |
| `Modal.tsx` | `open`, `onClose`, `title`，portal 掛到 `#modal-root` |
| `Badge.tsx` | `variant: 'default' \| 'success' \| 'warning'` |
| `Spinner.tsx` | `size: 'sm' \| 'md' \| 'lg'` |

### 建立 `index.ts`
```ts
// src/shared/components/ui/index.ts
export { Button } from './Button'
export { Input } from './Input'
export { Textarea } from './Textarea'
export { Modal } from './Modal'
export { Badge } from './Badge'
export { Spinner } from './Spinner'
```

### 設計原則
- 全用 Tailwind class，不用 CSS Module
- 所有接受 ref 的元件加 `forwardRef`
- 不含任何業務邏輯（不 import store、不呼叫 API）

### 驗收
- 元件可獨立 render，無任何 feature import
- `npm run build` 無錯誤

---

## Phase 3 — 搬 Shared Services / Stores / Types

**目標：** 把真正跨 feature 的基礎設施移到 `shared/`。

### 動作

1. **Types**
   - 移動 `src/types/project.ts` → `src/shared/types/project.ts`
   - 更新所有 import

2. **Services（跨 feature 用）**
   - 移動 `src/services/auth.tsx` → `src/shared/services/auth.tsx`
   - 移動 `src/services/drive.ts` → `src/shared/services/drive.ts`
   - 移動 `src/services/exportService.ts` → `src/shared/services/exportService.ts`
   - 移動 `src/services/assets.ts` → `src/shared/services/assets.ts`

3. **Stores（全域狀態）**
   - 移動 `src/stores/authStore.ts` → `src/shared/stores/authStore.ts`
   - 更新所有 import

4. **ErrorBoundary**
   - 移動 `src/components/ErrorBoundary.tsx` → `src/shared/components/ErrorBoundary.tsx`

### 驗收
- `npm run build` 無錯誤
- 登入流程正常運作

---

## Phase 4 — Feature 內化自己的 Store + Service

**目標：** 把 feature 專屬的 store 和 service 移進各自的 feature 資料夾。

### 搬移對照表

| 現在位置 | 新位置 |
|---------|--------|
| `src/stores/manuscriptStore.ts` | `src/features/manuscript/manuscriptStore.ts` |
| `src/stores/shelfStore.ts` | `src/features/shelf/shelfStore.ts` |
| `src/services/projectRepo.ts` | 拆分（見下方） |
| `src/services/milestoneService.ts` | `src/features/overview/milestoneService.ts` |
| `src/services/reminderService.ts` | `src/features/overview/reminderService.ts` |
| `src/services/wordSnapshot.ts` | `src/features/overview/wordSnapshot.ts` |
| `src/lib/useManuscriptSearch.ts` | `src/features/manuscript/useManuscriptSearch.ts` |

### projectRepo.ts 拆分說明

`projectRepo.ts` 目前混合了多個 feature 的資料存取，需要拆成：
- `src/features/manuscript/manuscriptService.ts` ← chapter CRUD
- `src/features/shelf/shelfService.ts` ← book CRUD（create / delete / list）
- `src/features/characters/characterService.ts` ← character CRUD
- `src/features/plot/plotService.ts` ← plot board CRUD
- `src/features/research/researchService.ts` ← research CRUD

共用的 `loadProject` / `saveProject` 保留在 `src/shared/services/projectRepo.ts`，各 feature service 呼叫它。

### 驗收
- `src/stores/` 和 `src/services/` 資料夾清空（或只剩 shared 的東西）
- 所有功能正常

---

## Phase 5 — Feature 改用 `shared/components/ui`

**目標：** 把各 feature 裡的原生 HTML 元素換成 `shared/components/ui` 元件。

### 逐 feature 執行

每次只動一個 feature，改完確認功能正常再繼續。

建議順序（由簡到繁）：
1. `features/research/` — 相對獨立
2. `features/characters/` — 結構簡單
3. `features/plot/` — 有 dnd-kit，注意不破壞拖拉
4. `features/shelf/` — 有 Modal，注意 focus trap
5. `features/overview/` — 有 recharts，注意 layout
6. `features/manuscript/` — 最複雜，Tiptap 編輯器，最後動

### 範例替換

```tsx
// Before
<button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={handleSave}>
  儲存
</button>

// After
import { Button } from '@/shared/components/ui'
<Button variant="primary" onClick={handleSave}>儲存</Button>
```

### 驗收
- 每個 feature 視覺和行為與遷移前一致
- `npm run build` 無錯誤

---

## Phase 6 — 清理與驗收

**目標：** 移除舊資料夾，確認無殘留。

### 清理項目

- [ ] 刪除 `src/components/`（ErrorBoundary 已移到 `src/shared/components/`）
- [ ] 刪除 `src/stores/`（store 已分散到各 feature 或 `src/shared/stores/`）
- [ ] 刪除 `src/services/`（service 已分散到各 feature 或 `src/shared/services/`）
- [ ] 刪除 `src/types/`（已移到 `src/shared/types/`）
- [ ] 確認 `src/lib/` 只有純函式

### Import 規則驗收

執行以下 grep，確認沒有跨 feature import：
```bash
# 不應該有任何結果
grep -r "from '../" src/features/ | grep "features/"
```

### 最終結構確認
```
src/
├── features/     ← 6 個 feature，各自獨立
├── shared/       ← ui / services / stores / types
├── lib/          ← 純工具函式
├── router.tsx
├── i18n.ts
└── main.tsx
```

### 最終驗收
- [ ] `npm run build` 無錯誤
- [ ] `npm test` 全數通過
- [ ] 所有主要功能手動測試通過（書架、編輯、人物、故事板、資料、總覽）
- [ ] 無任何跨 feature 的橫向 import
