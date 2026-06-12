import type { Project } from '../types/project'
import { downloadText, updateFileContent } from './drive'

export async function loadProject(token: string, projectFileId: string): Promise<Project> {
  const text = await downloadText(token, projectFileId)
  const parsed = JSON.parse(text) as Partial<Project> & Pick<Project, 'id' | 'title' | 'manuscriptFolderId' | 'assetsFolderId' | 'projectFileId' | 'chapters' | 'characters' | 'notes' | 'todos' | 'dailyWordGoal' | 'updatedAt' | 'rev'>
  return {
    ...parsed,
    projectWordGoal: parsed.projectWordGoal ?? 80000,
    wordHistory: parsed.wordHistory ?? [],
    milestones: parsed.milestones ?? [],
    research: parsed.research ?? [],
    characters: parsed.characters ?? [],
    plotBoard: parsed.plotBoard ?? { acts: [] },
  }
}

export async function saveProject(token: string, project: Project): Promise<void> {
  const updated: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
  }
  await updateFileContent(token, project.projectFileId, JSON.stringify(updated))
}
