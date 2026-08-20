import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label?: string
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="flex items-center gap-2 disabled:opacity-50"
    >
      <span
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-success' : 'bg-secondary',
        )}
      >
        <span
          className={cn(
            'inline-block size-3.5 transform rounded-full bg-white shadow-[0_1px_3px_oklch(0.05_0_0/0.5)] transition-transform duration-200 ease-out',
            checked ? 'translate-x-[19px]' : 'translate-x-[3px]',
          )}
        />
      </span>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </button>
  )
}
