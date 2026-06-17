import { useMemo } from 'react'
import { useLoaderData, useNavigate, useParams } from 'react-router-dom'
import { useManuscriptStore } from '../../manuscript/manuscriptStore'
import { useManuscriptSearch } from '../../manuscript/useManuscriptSearch'
import type { SearchLoaderData } from '../services/searchLoader'

const styles = {
  root: 'p-6 max-w-2xl mx-auto',
  header: 'mb-6',
  resultCount: 'text-sm text-secondary mt-1',
  empty: 'text-center py-12',
  emptyMain: 'text-placeholder',
  emptyHint: 'text-xs text-placeholder mt-1',
  list: 'flex flex-col gap-2',
  resultBtn: 'w-full text-left px-4 py-3 rounded-xl hover:bg-accent-light transition-colors border border-gray-100 hover:border-accent-border',
  resultTitle: 'text-sm font-semibold text-primary mb-0.5',
  resultSnippet: 'text-xs text-secondary leading-relaxed line-clamp-2',
}

export default function SearchPage() {
  const data = useLoaderData() as SearchLoaderData
  const query = data.query
  const navigate = useNavigate()
  const { bookId } = useParams<{ bookId: string }>()

  // Subscribe to manuscript store
  const project = useManuscriptStore((s) => s.project)
  const sceneContents = useManuscriptStore((s) => s.sceneContents)
  const activeChapterId = useManuscriptStore((s) => s.activeChapterId)
  const setActiveChapter = useManuscriptStore((s) => s.setActiveChapter)
  const setSaveStatus = useManuscriptStore((s) => s.setSaveStatus)

  const chapterContent = useMemo(
    () => Array.from(sceneContents.values()).join('\n\n'),
    [sceneContents],
  )

  const { search } = useManuscriptSearch(project, chapterContent, activeChapterId)

  const results = useMemo(() => search(query), [search, query])

  function handleSelectChapter(chapterId: string) {
    if (!project) return
    const ch = project.chapters.find((c) => c.id === chapterId)
    if (!ch) return

    // Navigate to manuscript tab; useChapterLoader handles the actual content load
    navigate(`/book/${bookId}`)
    setActiveChapter(ch.id)
    setSaveStatus('idle')
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className="page-title">
          搜尋「{query}」
        </h1>
        <p className={styles.resultCount}>
          {results.length} 個結果
        </p>
      </div>

      {results.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyMain}>找不到「{query}」的相關內容</p>
          <p className={styles.emptyHint}>
            嘗試搜尋其他關鍵字
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => handleSelectChapter(r.id)}
                className={styles.resultBtn}
              >
                <p className={styles.resultTitle}>
                  {r.title}
                </p>
                <p
                  className={styles.resultSnippet}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
