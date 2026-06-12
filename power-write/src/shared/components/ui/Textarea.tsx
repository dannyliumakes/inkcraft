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

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[#181c1e]"
          >
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
          className={`w-full border rounded-xl px-4 py-3 text-[#181c1e] placeholder-[#6d6d6d] focus:outline-none focus:ring-2 focus:ring-[#4c5354]/30 transition-colors resize-none ${
            error
              ? 'border-red-400 focus:ring-red-400/30'
              : 'border-gray-200'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'