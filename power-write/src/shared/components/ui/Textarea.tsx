import {
  forwardRef,
  useEffect,
  useRef,
  type TextareaHTMLAttributes,
  useId,
} from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  autoResize?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, autoResize = false, id, className = '', onChange, ...props }, forwardedRef) => {
    const autoId = useId()
    const textareaId = id ?? autoId
    const errorId = error ? `${textareaId}-error` : undefined
    const innerRef = useRef<HTMLTextAreaElement | null>(null)

    const setRef = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el
      if (typeof forwardedRef === 'function') {
        forwardedRef(el)
      } else if (forwardedRef) {
        forwardedRef.current = el
      }
    }

    const resize = () => {
      const el = innerRef.current
      if (el && autoResize) {
        el.style.height = '0'
        el.style.height = `${el.scrollHeight}px`
      }
    }

    useEffect(() => {
      resize()
    }, [])

    const textareaClass = `w-full border rounded-xl px-4 py-3 text-primary placeholder-secondary focus:outline-none focus:ring-2 transition-colors resize-none ${
      error ? 'border-danger focus:ring-danger/30' : 'border-gray-200 focus:ring-muted/30'
    } ${className}`

  return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="field-label">
            {label}
          </label>
        )}
        <textarea
          ref={setRef}
          id={textareaId}
          aria-invalid={!!error}
          aria-describedby={errorId}
          onChange={(e) => {
            resize()
            onChange?.(e)
          }}
          className={textareaClass}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
