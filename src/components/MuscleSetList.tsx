import { muscleLabel, type Muscle } from '../domain/muscles'
import { useMuscles } from '../app/MusclesProvider'
import { targetStatus, type ResolvedTargets } from '../domain/muscleTargets'
import { formatNumber } from '../lib/format'

interface Props {
  counts: Partial<Record<Muscle, number>>
  /** When set, bars are drawn against each muscle's weekly target range. */
  targets?: ResolvedTargets
  showAll?: boolean
}

const TONE = { off: 'bg-muted/40', none: 'bg-line', under: 'bg-warn', in: 'bg-good', over: 'bg-bad' }

export function MuscleSetList({ counts, targets, showAll }: Props) {
  // Untracked muscles only show if they actually got sets.
  const muscles = useMuscles().all
  const rows = muscles.filter((m) => (counts[m] ?? 0) > 0 || (showAll && (!targets || targets[m])))
  if (rows.length === 0) return <p className="text-sm text-muted">No working sets yet.</p>
  const maxTarget = targets ? Math.max(...muscles.map((m) => targets[m]?.max ?? 0), 1) : 0
  const scale = Math.max(maxTarget * 1.25, ...rows.map((m) => counts[m] ?? 0), 1)

  return (
    <ul className="space-y-2">
      {rows.map((m) => {
        const n = counts[m] ?? 0
        const target = targets?.[m] ?? null
        const tone = targets ? TONE[targetStatus(n, target)] : 'bg-accent'
        return (
          <li key={m} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2 text-sm">
            <span className="truncate text-muted">{muscleLabel(m)}</span>
            <div className="relative h-2.5 rounded-full bg-surface-2">
              {target && (
                <div
                  className="absolute inset-y-0 rounded-full bg-good/15"
                  style={{ left: `${(target.min / scale) * 100}%`, width: `${((target.max - target.min) / scale) * 100}%` }}
                />
              )}
              <div className={`relative h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, (n / scale) * 100)}%` }} />
            </div>
            <span className="text-right tabular-nums">
              <span className="font-semibold">{formatNumber(n)}</span>
              {targets && <span className="text-xs text-muted">{target ? `/${target.min}` : ' off'}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
