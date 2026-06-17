import { Modal } from './Modal'
import { Button } from './Button'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const styles = {
  message: 'text-sm text-secondary leading-relaxed',
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '確認',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className={styles.message}>{message}</p>
    </Modal>
  )
}
