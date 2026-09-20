import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cx } from '@/lib/utils'

/* ── Button ─────────────────────────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'text-white hover:brightness-110 active:brightness-95',
  secondary: 'bg-raised text-ink border hover:bg-plane',
  ghost: 'text-ink-2 hover:bg-plane hover:text-ink',
  danger: 'text-white hover:brightness-110',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}) {
  const background =
    variant === 'primary'
      ? { background: 'var(--series-1)' }
      : variant === 'danger'
        ? { background: 'var(--status-critical)' }
        : undefined

  return (
    <button
      {...rest}
      style={{ ...background, borderColor: 'var(--line)', ...rest.style }}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition',
        'focus-ring disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

/* ── Surfaces ───────────────────────────────────────────────────────────── */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx('card', className)}>
      {children}
    </div>
  )
}

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', className)}
      style={{
        color: color ?? 'var(--text-secondary)',
        background: color ? `color-mix(in srgb, ${color} 12%, transparent)` : 'var(--plane)',
      }}
    >
      {children}
    </span>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center hairline">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-relaxed text-muted">{hint}</p>}
      {action}
    </div>
  )
}

/* ── Form controls ──────────────────────────────────────────────────────── */

export function Label({ children, required, hint }: { children: ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-xs font-medium text-ink-2">
        {children}
        {required && <span style={{ color: 'var(--status-critical)' }}> *</span>}
      </label>
      {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx('input', props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx('input min-h-[96px] resize-y leading-relaxed', props.className)} />
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cx('relative', className?.includes('!w-auto') ? 'inline-block' : 'block')}>
      <select {...rest} className={cx('input appearance-none pr-8', className)} />
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  )
}

/* ── Modal ──────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh]" onClick={onClose}>
      <div
        className={cx('card w-full shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')}
        style={{ background: 'var(--surface-2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-5 py-3.5 hairline">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted transition hover:bg-plane hover:text-ink focus-ring" aria-label="关闭">
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[62vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t px-5 py-3 hairline">{footer}</footer>}
      </div>
    </div>
  )
}
