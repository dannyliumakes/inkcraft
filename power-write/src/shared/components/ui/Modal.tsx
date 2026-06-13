import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** When true, clicking the overlay does not close the modal */
  disableBackdropClose?: boolean
  /** Modal width: 'sm' (max-w-sm) or 'lg' (max-w-lg). Default 'sm' */
  size?: 'sm' | 'lg'
  /** Optional footer content, rendered below a border-t separator */
  footer?: ReactNode
}

// ── Compound sub-components ──────────────────────────────────────────────────

function ModalHeader({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h2 className="text-lg font-bold text-[#181c1e]">{children}</h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          aria-label="關閉"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function ModalBody({ children }: { children: ReactNode }) {
  return <div className="px-6 py-5 flex flex-col gap-5">{children}</div>
}

function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">{children}</div>
}

// ── Main Modal component ─────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  disableBackdropClose = false,
  size = 'sm',
  footer,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
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

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null
  const sizeClass = size === 'lg' ? 'max-w-lg' : 'max-w-sm'

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (!disableBackdropClose && e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-2xl shadow-xl w-full ${sizeClass} mx-4 max-h-[90vh] overflow-y-auto`}
      >
        {title && <ModalHeader onClose={onClose}>{title}</ModalHeader>}
        <div className={title ? 'px-6 py-5 flex flex-col gap-5' : 'p-8'}>{children}</div>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </div>
    </div>
  )

  return portalRoot ? createPortal(content, portalRoot) : content
}

// Attach sub-components as static properties for Composition Pattern
Modal.Header = ModalHeader
Modal.Body = ModalBody
Modal.Footer = ModalFooter
