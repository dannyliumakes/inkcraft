import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project, Todo } from '../../../shared/types/project'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'
import { patchProject } from '../../../shared/lib/projectPatch'

interface Props {
  project: Project
  onProjectUpdate: (p: Project) => void
}

export default function SidePanel({ project, onProjectUpdate }: Props) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState(project.notes)
  const [newTodo, setNewTodo] = useState('')

  async function saveNotes() {
    const token = getAccessToken()
    if (!token) return
    const updated = patchProject(project, { notes })
    onProjectUpdate(updated)
    await saveProject(token, updated)
  }

  async function toggleTodo(id: string) {
    const token = getAccessToken()
    if (!token) return
    const updated = patchProject(project, {
      todos: project.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })
    onProjectUpdate(updated)
    await saveProject(token, updated)
  }

  async function addTodo() {
    if (!newTodo.trim()) return
    const token = getAccessToken()
    if (!token) return
    const todo: Todo = { id: `todo_${Date.now()}`, text: newTodo.trim(), done: false }
    const updated = patchProject(project, { todos: [...project.todos, todo] })
    onProjectUpdate(updated)
    setNewTodo('')
    await saveProject(token, updated)
  }

  async function adjustGoal() {
    const val = window.prompt('輸入每日目標字數：', String(project.dailyWordGoal))
    if (!val) return
    const n = parseInt(val, 10)
    if (isNaN(n) || n <= 0) return
    const token = getAccessToken()
    if (!token) return
    const updated = patchProject(project, { dailyWordGoal: n })
    onProjectUpdate(updated)
    await saveProject(token, updated)
  }

  const totalWords = project.chapters.reduce((acc, ch) => acc + ch.wordCount, 0)
  const goal = project.dailyWordGoal || 1000
  const progress = Math.min(100, Math.round((totalWords / goal) * 100))

  return (
    <div className="flex flex-col gap-0 h-full overflow-y-auto">
      {/* Notes */}
      <section className="p-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('manuscript.notes')}</h3>
        <textarea
          className="w-full text-sm text-gray-700 bg-transparent resize-none outline-none min-h-[120px]"
          placeholder={t('manuscript.notes_placeholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
        />
      </section>

      {/* Todos */}
      <section className="p-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('manuscript.todos')}</h3>
        <ul className="space-y-1.5 mb-2">
          {project.todos.map((todo) => (
            <li key={todo.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
                className="accent-[#7c6ee0] w-3.5 h-3.5 shrink-0"
              />
              <span className={`text-sm ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {todo.text}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#7c6ee0]"
            placeholder={t('manuscript.todo_placeholder')}
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
          />
          <button
            className="px-2 py-1 bg-[#7c6ee0] text-white text-xs rounded hover:bg-[#6a5ec8] focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={addTodo}
          >
            {t('manuscript.todo_add')}
          </button>
        </div>
      </section>

      {/* Daily goal */}
      <section className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('manuscript.daily_goal')}</h3>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-700">{totalWords} / {goal} 字</span>
          <button className="text-xs text-[#7c6ee0] hover:underline focus-visible:ring-2 focus-visible:ring-blue-400" onClick={adjustGoal}>
            {t('manuscript.adjust_goal')}
          </button>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7c6ee0] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{t('manuscript.complete_pct', { pct: progress })}</p>
      </section>
    </div>
  )
}
