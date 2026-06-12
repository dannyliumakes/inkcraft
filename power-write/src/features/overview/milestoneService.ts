import type { Project } from '../../shared/types/project'
import { listRevisions, keepRevision } from '../../shared/services/drive'

export async function createMilestone(
  token: string,
  project: Project,
  label: string,
  saveProject: (token: string, p: Project) => Promise<void>,
): Promise<Project> {
  let driveRevisionId: string | undefined
  try {
    const revisions = await listRevisions(token, project.projectFileId)
    if (revisions.length > 0) {
      const latest = revisions[revisions.length - 1]
      await keepRevision(token, project.projectFileId, latest.id)
      driveRevisionId = latest.id
    }
  } catch {
    // Drive revision tagging failed — still save milestone without it
  }

  const milestone = {
    id: `ms_${Date.now()}`,
    label,
    createdAt: new Date().toISOString(),
    driveRevisionId,
  }
  const updated: Project = { ...project, milestones: [...(project.milestones ?? []), milestone] }
  await saveProject(token, updated)
  return updated
}