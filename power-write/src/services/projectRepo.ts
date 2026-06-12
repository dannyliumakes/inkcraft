import type { Project } from '../types/project'
import { downloadText, updateFileContent } from './drive'

export async function loadProject(token: string, projectFileId: string): Promise<Project> {
  const text = await downloadText(token, projectFileId)
  return JSON.parse(text) as Project
}

export async function saveProject(token: string, project: Project): Promise<void> {
  const updated: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
  }
  await updateFileContent(token, project.projectFileId, JSON.stringify(updated))
}
