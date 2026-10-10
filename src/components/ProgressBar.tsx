export function ProgressBar({ value, max, tone = 'accent' }: { value: number; max: number; tone?: 'accent' | 'good' | 'warn' | 'bad' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const color = { accent: 'bg-accent', good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' }[tone]
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${color} transition-[width]`} style={{ width: `${pct}%` }} />
    </div>
  )
}
