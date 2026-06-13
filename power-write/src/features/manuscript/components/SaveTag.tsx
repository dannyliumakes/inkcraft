import { useTranslation } from 'react-i18next'
import { fmtTime } from '../lib/driveImageHelpers'

interface Props {
  status: string
  lastSavedAt: Date | null
  onRetry: () => void
}

export default function SaveTag({ status, lastSavedAt, onRetry }: Props) {
  const { t } = useTranslation()
  if (status === 'idle') return null
  if (status === 'typing') return <span className="text-xs text-gray-400">{t('save.typing')}</span>
  if (status === 'saving') return <span className="text-xs text-gray-400">{t('save.saving')}</span>
  if (status === 'saved')
    return (
      <span className="text-xs text-green-600">
        {t('save.saved')} {lastSavedAt ? fmtTime(lastSavedAt) : ''}
      </span>
    )
  if (status === 'error')
    return (
      <button
        className="text-xs text-red-500 underline focus-visible:ring-2 focus-visible:ring-blue-400"
        onClick={onRetry}
      >
        {t('save.error')}
      </button>
    )
  return null
}
