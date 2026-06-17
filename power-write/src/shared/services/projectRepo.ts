import type { Project, Act, Chapter } from '../types/project'
import { makeDefaultScene } from '../types/project'
import { downloadText, updateFileContent } from './drive'

// Old format chapters may have actId — handle gracefully during load.
type StoredChapter = Omit<Chapter, 'actId'> & { actId?: string }

// Migrate old actId-based data to the new flat-list order model.
// Acts and chapters get a unified order so their position in the list is
// determined solely by order value, not by parent-child relationship.
function migrateToFlatOrder(
  rawActs: Act[],
  rawChapters: StoredChapter[],
): { acts: Act[]; chapters: Chapter[] } {
  const sortedActs = [...rawActs].sort((a, b) => a.order - b.order)

  let counter = 1
  const acts: Act[] = []
  const chapters: Chapter[] = []

  for (const act of sortedActs) {
    acts.push({ ...act, order: counter++ })
    const actChapters = rawChapters
      .filter((c) => c.actId === act.id)
      .sort((a, b) => a.order - b.order)
    for (const ch of actChapters) {
      const { actId: _removed, ...rest } = ch as StoredChapter & { actId?: string }
      chapters.push({ ...rest, order: counter++ } as Chapter)
    }
  }

  // chapters with no matching act go at the end
  const placed = new Set(chapters.map((c) => c.id))
  const orphans = rawChapters
    .filter((c) => !placed.has(c.id))
    .sort((a, b) => a.order - b.order)
  for (const ch of orphans) {
    const { actId: _removed, ...rest } = ch as StoredChapter & { actId?: string }
    chapters.push({ ...rest, order: counter++ } as Chapter)
  }

  return { acts, chapters }
}

export async function loadProject(token: string, projectFileId: string): Promise<Project> {
  const text = await downloadText(token, projectFileId)
  const parsed = JSON.parse(text) as Partial<Project> & {
    id: string; title: string; manuscriptFolderId: string; assetsFolderId: string
    projectFileId: string; characters: Project['characters']; notes: string
    todos: Project['todos']; dailyWordGoal: number; updatedAt: string; rev: number
    chapters?: StoredChapter[]
  }

  const rawActs: Act[] = parsed.acts ?? []
  const rawChapters: StoredChapter[] = (parsed.chapters ?? []).map((c) => ({
    ...c,
    scenes: c.scenes && c.scenes.length > 0 ? c.scenes : [makeDefaultScene()],
  }))

  // detect old format: any chapter still has actId
  const needsMigration = rawChapters.some((c) => 'actId' in c && c.actId != null)

  let acts: Act[]
  let chapters: Chapter[]

  if (needsMigration) {
    ;({ acts, chapters } = migrateToFlatOrder(rawActs, rawChapters))
  } else {
    acts = rawActs
    chapters = rawChapters as Chapter[]
  }

  return {
    ...parsed,
    projectWordGoal: parsed.projectWordGoal ?? 80000,
    wordHistory: parsed.wordHistory ?? [],
    research: parsed.research ?? [],
    characters: parsed.characters ?? [],
    acts,
    chapters,
  }
}

export async function saveProject(token: string, project: Project): Promise<void> {
  const updated: Project = { ...project, updatedAt: new Date().toISOString() }
  await updateFileContent(token, project.projectFileId, JSON.stringify(updated))
}
