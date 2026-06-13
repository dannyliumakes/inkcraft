# Styles Object Refactor Plan

將 JSX 內的 inline Tailwind class 字串抽到元件外的 `styles` 物件，讓設計師溝通時有明確的樣式定位點，PR diff 也更集中。

## 原則

- **Feature 元件** → `styles` 物件（純 JS，零依賴）
- **共用 UI 元件有 variants** → 維持 `cva`，不動
- **動態 / 條件 class** → 以 `styles.xxx` + template literal 處理，或用 `styles.xxxActive` / `styles.xxxDefault`
- **`typeColor` 類函數** → 改為 `styles` 物件 lookup

---

## Phase 1 — Plot feature（5 檔）

> 最小，ChapterColumn 已是示範款，先熱身

### `features/plot/components/ChapterColumn.tsx`

```
const styles = {
  root: 'flex-shrink-0 w-[340px] bg-surface rounded-2xl border border-gray-100 flex flex-col',
  header: 'px-4 pt-4 pb-2',
  titleBtn: 'text-sm font-semibold text-primary hover:text-muted text-left w-full',
  sceneCount: 'text-xs text-placeholder mt-0.5',
  body: 'flex-1 px-3 pb-2 flex flex-col gap-2 overflow-y-auto',
  footer: 'px-3 pb-3',
  addBtn: 'w-full py-2 rounded-xl text-xs text-secondary hover:bg-white hover:text-muted border-2 border-dashed border-gray-200 hover:border-accent-border transition-colors',
}
```

---

### `features/plot/components/SceneCard.tsx`

動態 class 用 template literal：

```
const styles = {
  root: (overlay: boolean) =>
    `bg-white rounded-xl border border-gray-100 p-3 shadow-sm select-none ${
      overlay ? 'rotate-2 shadow-lg' : 'hover:border-accent-border transition-colors'
    }`,
  inner: 'flex items-start gap-2',
  dragHandle: 'mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0',
  content: 'flex-1 min-w-0',
  title: 'text-sm font-medium text-primary truncate',
  summary: 'text-xs text-secondary mt-0.5 line-clamp-2',
  tags: 'flex flex-wrap gap-1 mt-1.5',
  tag: 'text-[10px] bg-accent-light text-muted px-1.5 py-0.5 rounded-full',
  editBtn: 'flex-shrink-0 text-gray-300 hover:text-muted transition-colors',
}
```

---

### `features/plot/components/ActSection.tsx`

```
const styles = {
  header: 'flex items-center gap-3 mb-4',
  divider: 'h-px flex-1 bg-gray-200',
  actBtn: 'text-sm font-bold text-muted hover:text-primary px-2 py-1 rounded',
  body: 'flex gap-4 overflow-x-auto pb-2',
  addChapterBtn: 'flex-shrink-0 w-[200px] h-[80px] self-start rounded-2xl border-2 border-dashed border-gray-200 text-sm text-secondary hover:border-accent-border hover:text-muted transition-colors',
}
```

---

### `features/plot/PlotBoard.tsx`

```
const styles = {
  root: 'flex flex-col h-full',
  toolbar: 'bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4 flex-wrap',
  tagSelect: 'border border-gray-200 rounded-xl px-3 py-2 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-muted/30',
  errorBanner: 'bg-red-50 border-b border-red-100 px-8 py-2 text-sm text-red-500',
  scroll: 'flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-8',
  empty: 'flex flex-col items-center justify-center h-64 text-placeholder',
}
```

---

### `features/plot/SceneModal.tsx`

```
const styles = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
  panel: 'bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8 max-h-[90vh] overflow-y-auto',
  form: 'flex flex-col gap-4',
  chapterSelect: 'w-full border border-gray-200 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-muted/30',
  sceneImage: 'w-full h-32 object-cover rounded-xl mb-2',
  actions: 'flex gap-3 justify-end mt-2',
}
```

---

## Phase 2 — Characters & Research（4 檔）

> 最多巢狀子元件，適合拆成各子元件各自的 styles

### `features/characters/components/CharacterList.tsx`

內含三個小元件（`PortraitImage`、`CharacterCard`、主頁面），各自抽獨立 styles：

```
const portraitStyles = {
  placeholder: 'w-full h-full flex items-center justify-center bg-accent-light',
}

const cardStyles = {
  root: 'bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:border-accent-border hover:shadow-sm transition-all',
  portrait: 'h-36 bg-accent-light overflow-hidden',
  body: 'p-3',
  name: 'card-title truncate',
  role: 'text-xs text-secondary mt-0.5 truncate',
  tagRow: 'flex flex-wrap gap-1 mt-2',
  tag: 'text-[10px] bg-accent-light text-muted px-1.5 py-0.5 rounded-full',
}

const pageStyles = {
  root: 'p-6 md:p-8',
  header: 'flex items-center justify-between mb-6',
  grid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4',
  empty: 'text-center text-placeholder py-16',
}
```

---

### `features/characters/components/CharacterModal.tsx`

```
const styles = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
  panel: 'bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-8 max-h-[90vh] overflow-y-auto',
  portraitArea: 'flex items-start gap-6 mb-6',
  portraitBox: 'w-24 h-24 rounded-2xl bg-accent-light overflow-hidden flex-shrink-0',
  form: 'flex flex-col gap-4',
  actions: 'flex gap-3 justify-end mt-2',
}
```

---

### `features/research/components/ResearchList.tsx`

```
const styles = {
  root: 'p-6 md:p-8',
  header: 'flex items-center justify-between mb-6',
  grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  card: 'bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:border-accent-border hover:shadow-sm transition-all',
  cardImage: 'w-full h-28 object-cover rounded-xl mb-3',
  cardImagePlaceholder: 'w-full h-28 bg-accent-light rounded-xl mb-3 flex items-center justify-center',
  cardTitle: 'card-title truncate',
  cardSnippet: 'text-xs text-secondary mt-1 line-clamp-2',
  tagRow: 'flex flex-wrap gap-1 mt-2',
  tag: 'text-[10px] bg-accent-light text-muted px-1.5 py-0.5 rounded-full',
  empty: 'text-center text-placeholder py-16',
}
```

---

### `features/research/components/ResearchModal.tsx`

```
const styles = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
  panel: 'bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8 max-h-[90vh] overflow-y-auto',
  imagePreview: 'w-full h-40 object-cover rounded-xl mb-2',
  form: 'flex flex-col gap-4',
  actions: 'flex gap-3 justify-end mt-2',
}
```

---

## Phase 3 — Layout shell（3 檔）

> `BookLayout.tsx` 最複雜，`SearchBar` 內有動態 open 狀態，單獨處理

### `features/layout/BookLayout.tsx`

`SearchBar` 子元件與 `BookLayout` 各自的 styles：

```
const searchStyles = {
  root: 'relative flex items-center',
  iconBtn: 'w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors',
  expandedWrap: 'flex items-center gap-2 bg-white border border-accent rounded-full px-3 py-1.5 shadow-sm min-w-[240px]',
  input: 'flex-1 text-sm outline-none bg-transparent text-primary placeholder-gray-400',
  dropdown: 'absolute top-full right-0 mt-2 w-[420px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden',
  dropdownScroll: 'max-h-[400px] overflow-y-auto',
  resultBtn: 'w-full text-left px-4 py-3 hover:bg-accent-light transition-colors border-b border-gray-50 last:border-0',
  dropdownFooter: 'px-4 py-2 border-t border-gray-100 bg-gray-50',
  emptyDropdown: 'absolute top-full right-0 mt-2 w-[320px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 px-4 py-6 text-center',
}

const layoutStyles = {
  root: 'min-h-screen flex flex-col bg-surface',
  mobileBanner: 'sm:hidden bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center',
  nav: 'bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center gap-2 md:gap-4 sticky top-0 z-30 overflow-hidden',
  logo: 'font-black text-xl md:text-[32px] text-primary tracking-tight mr-2 md:mr-6 shrink-0',
  tabBar: 'flex items-center bg-accent-light rounded-full p-1 gap-0.5 md:gap-1 overflow-x-auto shrink min-w-0',
  tabLink: (isActive: boolean) =>
    `px-2 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-400 ${
      isActive ? 'bg-muted text-white' : 'text-muted hover:bg-accent-softer'
    }`,
  milestoneBtn: 'px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-full border border-gray-200 text-muted hover:bg-accent-light transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-blue-400',
  userAvatar: 'w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent font-bold text-sm',
  main: 'flex-1 overflow-hidden',
}
```

---

### `features/layout/components/MilestonePanel.tsx`

```
const styles = {
  panel: 'fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l border-gray-100 z-40 flex flex-col',
  panelHeader: 'flex items-center justify-between px-4 py-3 border-b',
  closeBtn: 'p-1 rounded hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-400',
  inputArea: 'p-4 border-b',
  inputActions: 'flex gap-2',
  list: 'flex-1 overflow-y-auto p-4 space-y-3',
  milestoneItem: 'p-3 bg-gray-50 rounded-lg',
  milestoneLabel: 'font-medium text-sm',
  milestoneDate: 'text-xs text-gray-400 mt-1',
  empty: 'text-sm text-gray-400 text-center mt-8',
}
```

---

### `features/layout/components/NotificationBell.tsx`

⚠️ **額外問題**：`typeColor` 函數使用了硬寫顏色（`text-green-700 bg-green-50` 等），違反 design token 規則。  
重構時同步改為 token，並改成 styles lookup：

```
// 先在 index.css 補 token：
// --color-reminder-success / --color-reminder-warning / --color-reminder-info

const styles = {
  root: 'relative',
  bell: 'relative p-2 rounded-lg hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-400',
  badge: 'absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] rounded-full flex items-center justify-center leading-none',
  dropdown: 'absolute right-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50',
  empty: 'p-4 text-sm text-placeholder text-center',
  list: 'divide-y divide-gray-50',
  itemBase: 'flex items-start gap-2 px-4 py-3 text-sm rounded-xl',
  itemSuccess: 'text-green-700 bg-green-50',   // ← Phase 3 先維持原樣，token 補完後再改
  itemWarning: 'text-orange-700 bg-orange-50',
  itemInfo: 'text-blue-700 bg-blue-50',
  dismissBtn: 'shrink-0 opacity-60 hover:opacity-100 focus-visible:ring-1 focus-visible:ring-blue-400',
}

// typeColor 改成 lookup：
const typeStyle: Record<Reminder['type'], string> = {
  success: styles.itemSuccess,
  warning: styles.itemWarning,
  info: styles.itemInfo,
}
```

---

## Phase 4 — Manuscript（5 檔）

> 最大最複雜的功能，獨立一個 phase

### `features/manuscript/ChapterTree.tsx`

```
const styles = {
  root: 'flex flex-col h-full',
  header: 'px-4 py-3 border-b border-gray-100 flex items-center justify-between',
  list: 'flex-1 overflow-y-auto py-2',
  chapterItem: (isActive: boolean) =>
    `w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between group ${
      isActive ? 'bg-accent-light text-primary font-medium' : 'text-secondary hover:bg-gray-50'
    }`,
  chapterTitle: 'flex-1 truncate',
  chapterActions: 'hidden group-hover:flex items-center gap-1',
  actionBtn: 'p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary',
  addBtn: 'w-full px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-gray-50 transition-colors text-left border-t border-gray-100',
}
```

---

### `features/manuscript/ManuscriptPage.tsx`

```
const styles = {
  root: 'flex h-full',
  sidebar: 'w-64 border-r border-gray-100 flex flex-col flex-shrink-0',
  editorArea: 'flex-1 flex flex-col overflow-hidden',
  editorScroll: 'flex-1 overflow-y-auto',
  empty: 'flex flex-col items-center justify-center h-full text-placeholder gap-4',
}
```

---

### `features/manuscript/components/EditorToolbar.tsx`

> 特殊：工具列按鈕有 active/inactive 狀態，用函數 style 最合適

```
const styles = {
  root: 'flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-white flex-wrap',
  btn: (active: boolean) =>
    `px-2 py-1 text-sm rounded transition-colors ${
      active ? 'bg-accent-light text-accent font-medium' : 'text-secondary hover:bg-gray-50'
    }`,
  divider: 'w-px h-5 bg-gray-200 mx-1',
}
```

---

### `features/manuscript/components/SidePanel.tsx`

```
const styles = {
  root: 'w-64 border-l border-gray-100 bg-white flex flex-col flex-shrink-0',
  header: 'px-4 py-3 border-b border-gray-100 flex items-center justify-between',
  section: 'px-4 py-3 border-b border-gray-100',
  sectionTitle: 'field-label mb-2',
  statRow: 'flex justify-between text-sm',
  statLabel: 'text-secondary',
  statValue: 'text-primary font-medium',
}
```

---

### `features/manuscript/components/SaveTag.tsx`

```
const styles = {
  base: 'text-xs px-2 py-0.5 rounded-full',
  saved: 'text-green-600 bg-green-50',
  saving: 'text-amber-600 bg-amber-50',
  error: 'text-danger bg-danger/10',
  idle: 'text-placeholder',
}
```

---

## Phase 5 — Shelf / Search / Overview（4 檔）

### `features/shelf/ShelfPage.tsx`

內含 `BookCard` 子元件：

```
const cardStyles = {
  root: 'bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:border-accent-border hover:shadow-sm transition-all group relative',
  title: 'card-title truncate mb-1',
  meta: 'text-xs text-secondary',
  menuBtn: 'absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all',
  menuDropdown: 'absolute right-0 top-8 w-32 bg-white rounded-xl border border-gray-100 shadow-lg z-10',
  menuItem: 'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
  menuItemDanger: 'w-full text-left px-3 py-2 text-sm text-danger hover:bg-gray-50 transition-colors',
}

const pageStyles = {
  root: 'min-h-screen bg-surface',
  header: 'bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between',
  content: 'max-w-5xl mx-auto px-8 py-8',
  grid: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
  empty: 'text-center text-placeholder py-24',
}
```

---

### `features/shelf/components/CreateBookModal.tsx`

```
const styles = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
  panel: 'bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8',
  form: 'flex flex-col gap-4 mt-6',
  actions: 'flex gap-3 justify-end',
}
```

---

### `features/search/components/SearchPage.tsx`

```
const styles = {
  root: 'p-6 md:p-8 max-w-3xl mx-auto',
  header: 'mb-6',
  resultItem: 'bg-white rounded-2xl border border-gray-100 p-4 hover:border-accent-border transition-colors cursor-pointer',
  resultTitle: 'card-title mb-1',
  resultSnippet: 'text-sm text-secondary leading-relaxed',
  empty: 'text-center text-placeholder py-16',
}
```

---

### `features/overview/Overview.tsx`

```
const styles = {
  root: 'p-6 md:p-8',
  header: 'mb-6',
  grid: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-8',
  statCard: 'bg-white rounded-2xl border border-gray-100 p-4',
  statLabel: 'field-label mb-1',
  statValue: 'text-2xl font-bold text-primary',
  section: 'mb-8',
  sectionTitle: 'section-title mb-4',
}
```

---

## Phase 6 — Shared UI Primitives（8 檔）

> 這批**維持 `cva`**，不改成 styles 物件。只補缺少 cva 的元件。

| 檔案 | 現狀 | 動作 |
|------|------|------|
| `Button.tsx` | 已有 cva | 不動 |
| `Badge.tsx` | 已有 cva | 不動 |
| `Input.tsx` | 無 variants，inline class | 可選：抽 styles 物件 |
| `Textarea.tsx` | 無 variants | 可選：抽 styles 物件 |
| `Modal.tsx` | 已有基本結構 | 確認有無 inline class 待抽 |
| `Spinner.tsx` | 小元件 | 低優先 |
| `TagInput.tsx` | 無 variants | 可選：抽 styles 物件 |
| `ImageUploader.tsx` | 有 state-based class | 可選：styles 物件 |

---

## 執行順序建議

```
Phase 1 → 2 → 3 → 4 → 5 → 6（選做）

每個 Phase 做完後執行：
  npm run build    # 確認無 TypeScript 錯誤
  npm run lint     # 確認無 lint 錯誤
```

## 快速辨認標準

改完的元件，JSX 裡的 `className=` 應該只剩下：
- `className={styles.xxx}` 
- `className={styles.xxx(param)}` （有動態的）
- `className={cn(styles.xxx, conditionalClass)}` （需要 merge 的）

出現 `className="text-sm font-..."` 這類字串 → 尚未重構。
