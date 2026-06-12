import type { Project } from '../types/project';
import { downloadText } from './drive';
import { getAccessToken } from '../stores/authStore';

export async function downloadManuscript(project: Project): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const sorted = [...project.chapters].sort((a, b) => a.order - b.order);
  const parts: string[] = [];
  for (const ch of sorted) {
    const content = await downloadText(token, ch.fileId);
    parts.push(`# ${ch.title}\n\n${content}`);
  }
  const blob = new Blob([parts.join('\n\n---\n\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
