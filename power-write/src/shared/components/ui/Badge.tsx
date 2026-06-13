import type { ReactNode } from 'react'

// ══════════════════════════════════════════════════
// 🎨 視覺設定 — 設計師編輯區
//   bg-accent-soft / text-accent → --color-accent-soft / --color-accent
// ══════════════════════════════════════════════════

type BadgeVariant = 'default' | 'success' | 'warning'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-accent-soft text-accent',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
}

// ══════════════════════════════════════════════════
// ⚙️ 工程師區
// ══════════════════════════════════════════════════

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
