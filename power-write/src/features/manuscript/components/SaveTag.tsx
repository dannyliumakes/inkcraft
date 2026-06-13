import { useTranslation } from 'react-i18next'
import { fmtTime } from '../lib/driveImageHelpers'

interface Props {
  status: string
  lastSavedAt: Date | null
  onRetry: () => void
}

const styles = {
  muted: 'text-xs text-placeholder',
  saved: 'text-xs text-green-600',
  error: 'text-xs text-danger underline focus-visible:ring-2 focus-visible:ring-blue-400',
}

export default function SaveTag({ status, lastSavedAt, onRetry }: Props) {
  const { t } = useTranslation()
  if (status === 'idle') return null
  if (status === 'typing') return <span className={styles.muted}>{t('save.typing')}</span>
  if (status === 'saving') return <span className={styles.muted}>{t('save.saving')}</span>
  if (status === 'saved')
    return (
      <span className={styles.saved}>
        {t('save.saved')} {lastSavedAt ? fmtTime(lastSavedAt) : ''}
      </span>
    )
  if (status === 'error')
    return (
      <button className={styles.error} onClick={onRetry}>
        {t('save.error')}
      </button>
    )
  return null
}
