import { forwardRef, type ButtonHTMLAttributes } from 'react'

// ══════════════════════════════════════════════════
// 🎨 視覺設定 — 設計師編輯區
// 顏色請到 src/index.css @theme 修改，class 名稱對應如下：
//   bg-primary      → --color-primary
//   bg-primary-hover → --color-primary-hover
//   text-muted      → --color-muted
// ══════════════════════════════════════════════════

type ButtonVariant = 'primary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-muted/50',
  ghost:   'text-muted hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-muted/30',
  danger:  'bg-danger text-white hover:bg-danger-hover focus-visible:ring-2 focus-visible:ring-danger/40',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
}

// ══════════════════════════════════════════════════
// ⚙️ 工程師區
// ══════════════════════════════════════════════════

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`rounded-full font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
