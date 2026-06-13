import type { Project } from '../types/project'

export function patchProject(project: Project, changes: Partial<Omit<Project, 'updatedAt' | 'rev'>>): Project {
  return {
    ...project,
    ...changes,
    updatedAt: new Date().toISOString(),
    rev: project.rev + 1,
  }
}
