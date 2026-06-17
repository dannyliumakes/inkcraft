import type { Project } from '../types/project'
import { makeDefaultScene } from '../types/project'
import { downloadText, updateFileContent } from './drive'

const DEFAULT_ACT_ID = 'act_default'

export async function loadProject(token: string, projectFileId: string): Promise<Project> {
  const text = await downloadText(token, projectFileId)
  const parsed = JSON.parse(text) as Partial<Project> & Pick<Project, 'id' | 'title' | 'manuscriptFolderId' | 'assetsFolderId' | 'projectFileId' | 'chapters' | 'characters' | 'notes' | 'todos' | 'dailyWordGoal' | 'updatedAt' | 'rev'>

  let acts = parsed.acts ?? []
  const chapters = (parsed.chapters ?? []).map((c) => ({
    ...c,
    // assign orphan chapters to the first existing act, falling back to a default
    actId: c.actId && acts.some((a) => a.id === c.actId)
      ? c.actId
      : (acts[0]?.id ?? DEFAULT_ACT_ID),
    scenes: c.scenes && c.scenes.length > 0 ? c.scenes : [makeDefaultScene()],
  }))

  // ChapterTree only renders chapters nested under an act, so a project with
  // chapters but no acts would hide everything — synthesize a default act.
  if (acts.length === 0 && chapters.length > 0) {
    acts = [{ id: DEFAULT_ACT_ID, title: '第一幕', order: 1 }]
  }

  return {
    ...parsed,
    projectWordGoal: parsed.projectWordGoal ?? 80000,
    wordHistory: parsed.wordHistory ?? [],
    milestones: parsed.milestones ?? [],
    research: parsed.research ?? [],
    characters: parsed.characters ?? [],
    plotBoard: parsed.plotBoard?.scenes ? parsed.plotBoard : { scenes: {} },
    acts,
    chapters,
  }
}

export async function saveProject(token: string, project: Project): Promise<void> {
  const updated: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
  }
  await updateFileContent(token, project.projectFileId, JSON.stringify(updated))
}