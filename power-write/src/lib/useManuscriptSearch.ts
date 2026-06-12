import { useMemo } from 'react'
import Fuse from 'fuse.js'
import type { Project } from '../types/project'

export interface SearchDoc {
  id: string
  title: string
  content: string
}

export interface SearchResult {
  id: string
  title: string
  snippet: string
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function buildSnippet(content: string, query: string, contextLen = 50): string {
  const lower = content.toLowerCase()
  const queryLower = query.toLowerCase()
  const idx = lower.indexOf(queryLower)
  if (idx === -1) {
    // fallback: first 100 chars
    return content.slice(0, 100) + (content.length > 100 ? '…' : '')
  }
  const start = Math.max(0, idx - contextLen)
  const end = Math.min(content.length, idx + queryLower.length + contextLen)
  const before = (start > 0 ? '…' : '') + content.slice(start, idx)
  const match = content.slice(idx, idx + queryLower.length)
  const after = content.slice(idx + queryLower.length, end) + (end < content.length ? '…' : '')
  return `${before}<mark>${match}</mark>${after}`
}

export function useManuscriptSearch(
  project: Project | null,
  chapterContent: string,
  activeChapterId: string | null,
) {
  // Build docs list. For the active chapter we use the live editor content;
  // for others we use whatever is cached in project (titles only for now, as
  // Drive content isn't bulk-fetched — avoids extra API calls per spec).
  const docs: SearchDoc[] = useMemo(() => {
    if (!project) return []
    return project.chapters.map((ch) => {
      const rawContent = ch.id === activeChapterId ? chapterContent : ''
      return {
        id: ch.id,
        title: ch.title,
        content: stripMarkdown(rawContent),
      }
    })
  }, [project, chapterContent, activeChapterId])

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: ['title', 'content'],
        includeScore: true,
        includeMatches: true,
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [docs],
  )

  function search(query: string): SearchResult[] {
    if (!query.trim()) return []
    const raw = fuse.search(query)
    return raw.map(({ item }) => ({
      id: item.id,
      title: item.title,
      snippet: item.content
        ? buildSnippet(item.content, query)
        : item.title,
    }))
  }

  return { search }
}
