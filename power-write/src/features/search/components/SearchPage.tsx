import { useMemo } from 'react'
import { useLoaderData, useNavigate, useParams } from 'react-router-dom'
import { useManuscriptStore } from '../../manuscript/manuscriptStore'
import { useManuscriptSearch } from '../../manuscript/useManuscriptSearch'
import { getAccessToken } from '../../../shared/stores/authStore'
import { downloadText, getHeadRevisionId } from '../../../shared/services/drive'
import type { SearchLoaderData } from '../services/searchLoader'

export default function SearchPage() {
  const data = useLoaderData() as SearchLoaderData
  const query = data.query
  const navigate = useNavigate()
  const { bookId } = useParams<{ bookId: string }>()

  // Subscribe to manuscript store
  const project = useManuscriptStore((s) => s.project)
  const chapterContent = useManuscriptStore((s) => s.chapterContent)
  const activeChapterId = useManuscriptStore((s) => s.activeChapterId)
  const setActiveChapter = useManuscriptStore((s) => s.setActiveChapter)
  const setChapterContent = useManuscriptStore((s) => s.setChapterContent)
  const setSaveStatus = useManuscriptStore((s) => s.setSaveStatus)
  const setHeadRevisionId = useManuscriptStore((s) => s.setHeadRevisionId)

  const { search } = useManuscriptSearch(project, chapterContent, activeChapterId)

  const results = useMemo(() => search(query), [search, query])

  function handleSelectChapter(chapterId: string) {
    if (!project) return
    const ch = project.chapters.find((c) => c.id === chapterId)
    if (!ch) return
    const token = getAccessToken()
    if (!token) return

    // Navigate to manuscript tab
    navigate(`/book/${bookId}`)

    setActiveChapter(ch.id)
    setSaveStatus('idle')
    Promise.all([
      downloadText(token, ch.fileId),
      getHeadRevisionId(token, ch.fileId),
    ])
      .then(([text, revId]) => {
        setHeadRevisionId(revId)
        setChapterContent(text)
      })
      .catch((err) => console.error('Failed to load chapter from search', err))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">
          搜尋「{query}」
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {results.length} 個結果
        </p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">找不到「{query}」的相關內容</p>
          <p className="text-xs text-gray-300 mt-1">
            嘗試搜尋其他關鍵字
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => handleSelectChapter(r.id)}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-accent-light transition-colors border border-gray-100 hover:border-accent-border"
              >
                <p className="text-sm font-semibold text-primary mb-0.5">
                  {r.title}
                </p>
                <p
                  className="text-xs text-gray-500 leading-relaxed line-clamp-2"
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