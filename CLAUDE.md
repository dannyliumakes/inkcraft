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

### Key conventions

- `drive.ts` is the only file that calls `fetch` against Google APIs — all other code goes through it
- 401 responses in `drive.ts` automatically clear the auth token and throw; components should surface this to re-trigger login
- `Project` type is the central data model; every feature reads from or writes to it via `manuscriptStore` or direct Drive calls
- New UI primitives go in `shared/components/ui/` and are exported via `index.ts`
