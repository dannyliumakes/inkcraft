import { forwardRef, type InputHTMLAttributes, useId } from 'react'

const styles = {
  wrapper: 'flex flex-col gap-1.5',
  input: (error: boolean, className: string) =>
    `w-full border rounded-xl px-4 py-3 text-primary placeholder-secondary focus:outline-none focus:ring-2 transition-colors ${
      error ? 'border-danger focus:ring-danger/30' : 'border-gray-200 focus:ring-muted/30'
    } ${className}`,
  error: 'text-xs text-danger',
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={styles.input(!!error, className)}
          {...props}
        />
        {error && (
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
