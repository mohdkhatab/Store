import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-xl neu-well px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ' +
  'transition-shadow duration-200 outline-none disabled:opacity-50'

interface FieldWrapProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor: string
  children: React.ReactNode
  className?: string
}

function FieldWrap({ label, hint, error, required, htmlFor, children, className }: FieldWrapProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string
  hint?: string
  error?: string
  /** Rendered inside the field, e.g. a "+91" label or a search icon. */
  prefix?: React.ReactNode
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, className, wrapperClassName, id, required, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <FieldWrap
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={fieldId}
      className={wrapperClassName}
    >
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-4 text-sm text-[var(--text-muted)]">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(
            fieldBase,
            'h-11 text-sm',
            prefix && 'pl-14',
            error && 'shadow-[0_0_0_1.5px_var(--danger)]',
            className,
          )}
          {...rest}
        />
      </div>
    </FieldWrap>
  )
})

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  wrapperClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, id, required, rows = 4, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <FieldWrap
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={fieldId}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          fieldBase,
          'resize-y py-3 text-sm leading-relaxed',
          error && 'shadow-[0_0_0_1.5px_var(--danger)]',
          className,
        )}
        {...rest}
      />
    </FieldWrap>
  )
})

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  wrapperClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, wrapperClassName, id, required, children, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <FieldWrap
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={fieldId}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={fieldId}
        required={required}
        className={cn(fieldBase, 'h-11 cursor-pointer appearance-none pr-10 text-sm', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldWrap>
  )
})
