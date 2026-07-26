import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, description, children, footer, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    // Prevent the page behind from scrolling while the dialog is up.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog so keyboard users are not left behind it.
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'glass glass-hi relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-b-none sm:max-w-lg sm:rounded-[var(--radius-glass-lg)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-0 sm:p-6 sm:pb-0">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="p-5 sm:p-6">{children}</div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--glass-edge-lo)] p-4 sm:p-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
