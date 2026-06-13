import { useTranslation } from 'react-i18next'
import { Input } from '../../../shared/components/ui'
import SaveTag from './SaveTag'

interface TitleProps {
  value: string
  editing: boolean
  onChange: (v: string) => void
  onStartEdit: () => void
  onBlur: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

interface Props {
  titleProps: TitleProps
  wordCount: number
  saveStatus: string
  lastSavedAt: Date | null
  focusMode: boolean
  sidebarOpen: boolean
  activeChapterId: string | null | undefined
  fileInputRef: React.RefObject<HTMLInputElement>
  onToggleSidebar: () => void
  onRetry: () => void
  onInsertImage: () => void
  onToggleFocus: () => void
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const styles = {
  root: 'bg-white shadow-sm px-6 py-3 flex items-center gap-4 shrink-0 z-10',
  iconBtn: 'w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-placeholder shrink-0',
  iconBtnDisabled: 'w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 text-placeholder disabled:opacity-40',
  focusBtn: (active: boolean) =>
    `w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
      active ? 'bg-accent text-white' : 'hover:bg-gray-100 text-placeholder'
    }`,
  titleBtn: 'text-lg font-semibold text-primary cursor-pointer hover:text-accent transition-colors',
  wordCount: 'text-sm text-placeholder ml-2',
}

export default function EditorToolbar({
  titleProps,
  wordCount,
  saveStatus,
  lastSavedAt,
  focusMode,
  sidebarOpen,
  activeChapterId,
  fileInputRef,
  onToggleSidebar,
  onRetry,
  onInsertImage,
  onToggleFocus,
  onImageChange,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className={styles.root}>
      {!focusMode && (
        <button title={sidebarOpen ? '收起側欄' : '展開側欄'} className={styles.iconBtn} onClick={onToggleSidebar}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      {titleProps.editing ? (
        <Input
          className="text-lg font-semibold border-b border-accent w-auto"
          value={titleProps.value}
          autoFocus
          onChange={(e) => titleProps.onChange(e.target.value)}
          onBlur={titleProps.onBlur}
          onKeyDown={titleProps.onKeyDown}
        />
      ) : (
        <h2 className={styles.titleBtn} onClick={titleProps.onStartEdit}>
          {titleProps.value || (activeChapterId ? t('manuscript.untitled') : t('manuscript.select_chapter'))}
        </h2>
      )}

      <span className={styles.wordCount}>
        {wordCount.toLocaleString()} {t('chapter_tree.word_count_unit')}
      </span>

      <div className="flex-1" />

      <SaveTag status={saveStatus} lastSavedAt={lastSavedAt} onRetry={onRetry} />

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageChange} />

      <button title="插入圖片" className={styles.iconBtnDisabled} disabled={!activeChapterId} onClick={onInsertImage}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="5.5" cy="6.5" r="1" fill="currentColor"/>
          <path d="M1 11l3.5-3.5 2.5 2.5 2.5-2 3.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <button title={t('manuscript.focus_mode')} className={styles.focusBtn(focusMode)} onClick={onToggleFocus}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M1 5V2h3M12 2h3v3M1 11v3h3M12 14h3v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
