import { useEffect, useState } from 'react'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  decimal?: boolean
  className?: string
  ariaLabel?: string
  min?: number
}

/**
 * Numeric input that keeps the user's partial text ("2.", "") while typing
 * and reports a parsed number (or null when empty).
 */
export function NumberField({ value, onChange, placeholder, decimal, className, ariaLabel, min = 0 }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value))

  useEffect(() => {
    const parsed = text === '' ? null : Number(text.replace(',', '.'))
    if (parsed !== value) setText(value == null ? '' : String(value))
    // Only react to external changes.
  }, [value])

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={ariaLabel}
      className={className ?? 'field text-center'}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.')
        const pattern = decimal ? /^\d*\.?\d{0,2}$/ : /^\d*$/
        if (!pattern.test(raw)) return
        setText(raw)
        if (raw === '' || raw === '.') return onChange(null)
        const n = Number(raw)
        if (!Number.isNaN(n) && n >= min) onChange(n)
      }}
    />
  )
}
