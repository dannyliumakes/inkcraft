# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Location

All source code lives in `power-write/`. Always `cd power-write` before running commands.

## Commands

```bash
cd power-write
npm run dev        # start dev server at http://localhost:5173
npm run build      # tsc + vite build
npm run lint       # eslint
npx vitest run     # run tests (only lib/wordCount.test.ts exists currently)
```

Requires `power-write/.env` with:
```
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

## Architecture

**Stack:** React 18 + TypeScript, Vite, Zustand, React Router v6, Tailwind CSS, i18next (zh-TW only)

**Storage:** All data persists in Google Drive `appDataFolder` (hidden app storage, not visible in user's Drive). No backend — the app is entirely client-side with Google OAuth tokens.

### Data flow

1. User signs in via Google OAuth → access token stored in `authStore` (Zustand, in-memory only)
2. `ShelfPage` lists books by querying Drive `appDataFolder` for project folders
3. Opening a book loads `project.json` from Drive → hydrates `manuscriptStore`
4. `projectRepo.ts` is the single persistence coordinator: `loadProject` / `saveProject` read/write `project.json` as JSON
5. Chapter content is stored as individual `.md` files in Drive; `manuscriptStore` tracks the active chapter and save status
6. Conflict detection uses Drive `headRevisionId` per chapter

### Directory structure

```
src/
  features/         # vertical slice per domain
    shelf/          # book list + create book
    manuscript/     # editor + chapter tree
    layout/         # BookLayout shell, milestone panel, notifications
    overview/       # stats, word history, milestones, reminders
    plot/           # plot board (acts → chapters → scenes)
    characters/     # character list + modal
    research/       # research items list + modal
  shared/
    types/project.ts        # all domain types (Project, Chapter, Character, etc.)
    services/
      drive.ts              # all Google Drive REST API calls
      auth.tsx              # Google OAuth flow
      projectRepo.ts        # load/save Project via drive.ts
      assets.ts             # image asset upload/download
      exportService.ts      # export manuscript
    stores/
      authStore.ts          # access token (Zustand)
    components/
      ui/                   # Button, Input, Textarea, Modal, Badge, Spinner
      ErrorBoundary.tsx
  lib/              # pure utilities: wordCount.ts, wordStats.ts, customImage.ts
  router.tsx        # routes: / → ShelfPage, /book/:bookId → BookLayout (nested)
```

### Design Token 規則（設計師 / 工程師分工）

**設計師編輯區：** `src/index.css` 最上方的 `@theme {}` 區塊
- 所有顏色、圓角定義在這裡，改這裡會自動套用到全站
- 變數命名規則：`--color-primary`、`--color-accent`、`--radius-btn` 等

**工程師規則（強制執行）：**
- 元件裡**禁止**硬寫任何顏色數值，包括 `#181c1e`、`bg-[#xxx]`、`stroke="#xxx"`、`fill="#xxx"`
- Tailwind class 使用 token 名稱：`bg-primary`、`text-muted`、`bg-accent-light`、`text-secondary` 等
- SVG inline 屬性使用 CSS 變數：`stroke="var(--color-placeholder)"`、`fill="var(--color-muted)"`
- 新增顏色時，**一定先**加到 `@theme {}` 並命名，再於元件中使用
- Claude 寫新元件或修改現有元件時，必須遵守此規則，不得產生任何硬寫顏色

**Typography semantic class（強制使用）：**
| 用途 | Class | 對應位置 |
|------|-------|---------|
| 頁面主標題 | `page-title` | 各功能頁 h1（角色資料、情節規劃…） |
| Modal / 區塊標題 | `section-title` | Modal header、panel 小節標題 |
| 卡片標題 | `card-title` | 卡片內名稱、item title |
| 欄位標籤 | `field-label` | form label、說明小標 |

字體大小請到 `src/index.css` 的 `@theme {}` 修改 `--font-size-h1` 等變數；字重、顏色請到 Typography Token 區的 `.page-title` 等 class 修改。
禁止直接使用 `text-2xl font-bold`、`text-lg font-semibold` 等組合替代上述 class。

**Token 對照表（常用）：**
| 用途 | Token class | CSS 變數 |
|------|------------|---------|
| 主要文字、按鈕 | `text-primary` / `bg-primary` | `--color-primary` |
| 次要文字、icon | `text-muted` | `--color-muted` |
| 說明文字 | `text-secondary` | `--color-secondary` |
| Placeholder | `text-placeholder` | `--color-placeholder` |
| 強調色（紫） | `text-accent` / `bg-accent` | `--color-accent` |
| 強調淺背景 | `bg-accent-light` | `--color-accent-light` |
| 強調邊框 | `border-accent-border` | `--color-accent-border` |
| 頁面底色 | `bg-surface` | `--color-surface` |
| 危險色 | `bg-danger` / `text-danger` | `--color-danger` |
| SVG 空狀態描邊 | — | `var(--color-stroke-empty)` |

### Styles 物件規則（強制執行）

所有元件的 Tailwind class 字串必須抽離到元件函式**上方**的 `styles` 物件，JSX 裡只能用 `className={styles.xxx}`。

**基本格式：**
```tsx
const styles = {
  root: 'flex flex-col gap-4 p-6',
  title: 'card-title truncate',
  btn: 'w-8 h-8 rounded-lg hover:bg-gray-100 text-placeholder',
}
```

**動態/條件 class 用函式值：**
```tsx
const styles = {
  item: (isActive: boolean) =>
    `px-3 py-2 text-sm ${isActive ? 'bg-accent-softer text-muted font-medium' : 'hover:bg-gray-50 text-secondary'}`,
}
// JSX: className={styles.item(isActive)}
```

**多個子元件在同一檔案時，各自命名 styles 物件：**
```tsx
const cardStyles = { ... }
const pageStyles = { ... }
```

**例外：`cva` 保留用於 `Button`、`Badge` 等變體驅動的共用 UI primitive，不改為 styles 物件。**

**違禁寫法（不得出現在 JSX 裡）：**
- `className="text-sm font-semibold text-primary ..."` ← 直接硬寫長字串
- `className={isActive ? 'bg-accent ...' : 'bg-gray ...'}` ← 條件邏輯混在 JSX

### Key conventions

- `drive.ts` is the only file that calls `fetch` against Google APIs — all other code goes through it
- 401 responses in `drive.ts` automatically clear the auth token and throw; components should surface this to re-trigger login
- `Project` type is the central data model; every feature reads from or writes to it via `manuscriptStore` or direct Drive calls
- New UI primitives go in `shared/components/ui/` and are exported via `index.ts`
