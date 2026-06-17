import { useEffect, useRef, useState } from 'react'

export interface DropdownMenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface Props {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
  align?: 'left' | 'right'
  minWidth?: string
}

const styles = {
  root: 'relative',
  panel: (align: 'left' | 'right', minWidth: string) =>
    `absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 ${minWidth}`,
  item: (variant: 'default' | 'danger') =>
    `w-full text-left px-3 py-1.5 text-sm cursor-pointer whitespace-nowrap ${
      variant === 'danger'
        ? 'text-danger hover:bg-red-50'
        : 'text-secondary hover:bg-gray-50'
    }`,
}

export function DropdownMenu({ trigger, items, align = 'right', minWidth = 'min-w-[100px]' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={styles.root} ref={ref}>
      <div onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}>
        {trigger}
      </div>
      {open && (
        <div className={styles.panel(align, minWidth)} onClick={(e) => e.stopPropagation()}>
          {items.map((item, i) => (
            <button
              key={i}
              className={styles.item(item.variant ?? 'default')}
              onClick={() => { setOpen(false); item.onClick() }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
