import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[#e8eaff] text-[#7c6ee0]',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
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