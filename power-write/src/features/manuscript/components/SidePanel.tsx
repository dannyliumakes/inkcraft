import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project, Todo } from '../../../shared/types/project'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'
import { patchProject } from '../../../shared/lib/projectPatch'

interface Props {
  project: Project
  onProjectUpdate: (p: Project) => void
}

const NOTES_MIN = 80
const TODOS_MIN = 80
const GOAL_HEIGHT = 100

const styles = {
  root: 'flex flex-col h-full overflow-hidden',
  section: 'flex flex-col overflow-hidden',
  sectionInner: 'p-4 flex flex-col h-full overflow-hidden',
  sectionTitle: 'text-xs font-semibold text-placeholder uppercase tracking-wide mb-2 shrink-0',
  notesTextarea: 'w-full text-sm text-secondary bg-transparent resize-none outline-none flex-1 min-h-0',
  todoScrollArea: 'overflow-y-auto flex-1 min-h-0',
  todoList: 'space-y-1.5 mb-2',
  todoItem: 'flex items-center gap-2',
  todoCheckbox: 'accent-accent w-3.5 h-3.5 shrink-0',
  todoText: (done: boolean) => `text-sm ${done ? 'line-through text-placeholder' : 'text-secondary'}`,
  todoInputRow: 'flex gap-1 shrink-0 mt-2',
  todoInput: 'flex-1 text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-accent',
  todoAddBtn: 'px-2 py-1 bg-accent text-white text-xs rounded hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-blue-400',
  dragHandle: 'h-1 shrink-0 cursor-row-resize hover:bg-accent-border transition-colors border-t border-gray-100',
  goalSection: 'shrink-0 p-4 border-t border-gray-100',
  goalRow: 'flex items-center justify-between mb-1',
  goalText: 'text-sm text-secondary',
  goalAdjustBtn: 'text-xs text-accent hover:underline focus-visible:ring-2 focus-visible:ring-blue-400',
  progressTrack: 'h-2 bg-gray-100 rounded-full overflow-hidden',
  progressBar: 'h-full bg-accent rounded-full transition-all',
  progressLabel: 'text-xs text-placeholder mt-1',
}

export default function SidePanel({ project, onProjectUpdate }: Props) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState(project.notes)
  const [newTodo, setNewTodo] = useState('')
  const [notesHeight, setNotesHeight] = useState(200)

  const containerRef = useRef<HTMLDivElement>(null)

  const onNotesResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = notesHeight

    function onMove(ev: MouseEvent) {
      const delta = ev.clientY - startY
      const container = containerRef.current
      if (!container) return
      const available = container.clientHeight - GOAL_HEIGHT - TODOS_MIN - 4
      setNotesHeight(Math.max(NOTES_MIN, Math.min(available, startH + delta)))
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [notesHeight])

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
    <div className={styles.root} ref={containerRef}>
      {/* Notes — draggable height */}
      <div className={styles.section} style={{ height: notesHeight, minHeight: NOTES_MIN }}>
        <div className={styles.sectionInner}>
          <h3 className={styles.sectionTitle}>{t('manuscript.notes')}</h3>
          <textarea
            className={styles.notesTextarea}
            placeholder={t('manuscript.notes_placeholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
        </div>
      </div>

      {/* Drag handle between notes and todos */}
      <div className={styles.dragHandle} onMouseDown={onNotesResizeMouseDown} />

      {/* Todos — fills remaining space */}
      <div className={styles.section} style={{ flex: 1, minHeight: TODOS_MIN }}>
        <div className={styles.sectionInner}>
          <h3 className={styles.sectionTitle}>{t('manuscript.todos')}</h3>
          <div className={styles.todoScrollArea}>
            <ul className={styles.todoList}>
              {project.todos.map((todo) => (
                <li key={todo.id} className={styles.todoItem}>
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => toggleTodo(todo.id)}
                    className={styles.todoCheckbox}
                  />
                  <span className={styles.todoText(todo.done)}>{todo.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.todoInputRow}>
            <input
              className={styles.todoInput}
              placeholder={t('manuscript.todo_placeholder')}
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
            />
            <button className={styles.todoAddBtn} onClick={addTodo}>
              {t('manuscript.todo_add')}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Goal — pinned to bottom, fixed height */}
      <div className={styles.goalSection}>
        <h3 className={styles.sectionTitle}>{t('manuscript.daily_goal')}</h3>
        <div className={styles.goalRow}>
          <span className={styles.goalText}>{totalWords} / {goal} 字</span>
          <button className={styles.goalAdjustBtn} onClick={adjustGoal}>
            {t('manuscript.adjust_goal')}
          </button>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.progressLabel}>{t('manuscript.complete_pct', { pct: progress })}</p>
      </div>
    </div>
  )
}
