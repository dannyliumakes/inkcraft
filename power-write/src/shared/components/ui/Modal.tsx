import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** When true, clicking the overlay does not close the modal */
  disableBackdropClose?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  children,
  disableBackdropClose = false,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const portalRoot =
    typeof document !== 'undefined'
      ? document.getElementById('modal-root')
      : null

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (!disableBackdropClose && e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8"
      >
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#181c1e]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
              aria-label="關閉"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )

  return portalRoot ? createPortal(content, portalRoot) : content
}