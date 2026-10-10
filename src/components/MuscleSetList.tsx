import { MUSCLES, MUSCLE_LABELS, type Muscle } from '../domain/muscles'
import { formatNumber } from '../lib/format'

interface Props {
  counts: Partial<Record<Muscle, number>>
  /** When set, bars are drawn against a weekly target range. */
  target?: { min: number; max: number }
  showAll?: boolean
}

export function MuscleSetList({ counts, target, showAll }: Props) {
  const rows = MUSCLES.filter((m) => showAll || (counts[m] ?? 0) > 0)
  if (rows.length === 0) return <p className="text-sm text-muted">No working sets yet.</p>
  const scale = target ? target.max * 1.25 : Math.max(...rows.map((m) => counts[m] ?? 0), 1)

  return (
    <ul className="space-y-2">
      {rows.map((m) => {
        const n = counts[m] ?? 0
        const tone = !target ? 'bg-accent' : n === 0 ? 'bg-line' : n < target.min ? 'bg-warn' : n > target.max ? 'bg-bad' : 'bg-good'
        return (
          <li key={m} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-sm">
            <span className="truncate text-muted">{MUSCLE_LABELS[m]}</span>
            <div className="relative h-2.5 rounded-full bg-surface-2">
              {target && (
                <div
                  className="absolute inset-y-0 rounded-full bg-good/15"
                  style={{ left: `${(target.min / scale) * 100}%`, width: `${((target.max - target.min) / scale) * 100}%` }}
                />
              )}
              <div className={`relative h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, (n / scale) * 100)}%` }} />
            </div>
            <span className="text-right font-semibold tabular-nums">{formatNumber(n)}</span>
          </li>
        )
      })}
    </ul>
  )
}
