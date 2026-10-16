import { useState, type ReactElement } from 'react'
import { MUSCLE_LABELS, type Muscle } from '../domain/muscles'
import { formatNumber } from '../lib/format'
import { targetStatus, type ResolvedTargets, type TargetStatus } from '../domain/muscleTargets'

interface Props {
  counts: Partial<Record<Muscle, number>>
  targets: ResolvedTargets
}

type Shape = ReactElement<SVGElement>

// Simplified figure, viewBox 0 0 120 240. Each muscle is a few basic shapes;
// mirrored pairs share a muscle id so both sides colour together.
const FRONT: [Muscle, (p: ShapeProps) => Shape][] = [
  ['traps', (p) => <polygon {...p} points="47,37 55,32 65,32 73,37 66,41 54,41" />],
  ['front_delts', (p) => <><ellipse {...p} cx="38" cy="49" rx="8" ry="9" /><ellipse {...p} cx="82" cy="49" rx="8" ry="9" /></>],
  ['side_delts', (p) => <><ellipse {...p} cx="29.5" cy="53" rx="4" ry="8" /><ellipse {...p} cx="90.5" cy="53" rx="4" ry="8" /></>],
  ['chest', (p) => <><rect {...p} x="41" y="43" width="18" height="21" rx="7" /><rect {...p} x="61" y="43" width="18" height="21" rx="7" /></>],
  ['abs', (p) => <rect {...p} x="49" y="66" width="22" height="42" rx="7" />],
  ['biceps', (p) => <><ellipse {...p} cx="31" cy="74" rx="6" ry="12" /><ellipse {...p} cx="89" cy="74" rx="6" ry="12" /></>],
  ['forearms', (p) => <><ellipse {...p} cx="26" cy="102" rx="5" ry="14" /><ellipse {...p} cx="94" cy="102" rx="5" ry="14" /></>],
  ['quads', (p) => <><rect {...p} x="41" y="114" width="17" height="56" rx="8.5" /><rect {...p} x="62" y="114" width="17" height="56" rx="8.5" /></>],
  ['calves', (p) => <><ellipse {...p} cx="49" cy="200" rx="7" ry="20" /><ellipse {...p} cx="71" cy="200" rx="7" ry="20" /></>],
]

const BACK: [Muscle, (p: ShapeProps) => Shape][] = [
  ['traps', (p) => <polygon {...p} points="46,37 60,31 74,37 66,60 60,64 54,60" />],
  ['rear_delts', (p) => <><ellipse {...p} cx="38" cy="49" rx="8" ry="9" /><ellipse {...p} cx="82" cy="49" rx="8" ry="9" /></>],
  ['side_delts', (p) => <><ellipse {...p} cx="29.5" cy="53" rx="4" ry="8" /><ellipse {...p} cx="90.5" cy="53" rx="4" ry="8" /></>],
  ['upper_back', (p) => <><rect {...p} x="42" y="52" width="10" height="20" rx="4" /><rect {...p} x="68" y="52" width="10" height="20" rx="4" /></>],
  ['lats', (p) => <><polygon {...p} points="41,75 52,77 54,100 45,93" /><polygon {...p} points="79,75 68,77 66,100 75,93" /></>],
  ['lower_back', (p) => <rect {...p} x="53" y="80" width="14" height="30" rx="5" />],
  ['triceps', (p) => <><ellipse {...p} cx="31" cy="73" rx="6" ry="12" /><ellipse {...p} cx="89" cy="73" rx="6" ry="12" /></>],
  ['forearms', (p) => <><ellipse {...p} cx="26" cy="102" rx="5" ry="14" /><ellipse {...p} cx="94" cy="102" rx="5" ry="14" /></>],
  ['glutes', (p) => <><ellipse {...p} cx="51" cy="123" rx="10" ry="11" /><ellipse {...p} cx="69" cy="123" rx="10" ry="11" /></>],
  ['hamstrings', (p) => <><rect {...p} x="41" y="136" width="17" height="38" rx="8.5" /><rect {...p} x="62" y="136" width="17" height="38" rx="8.5" /></>],
  ['calves', (p) => <><ellipse {...p} cx="49" cy="200" rx="8" ry="19" /><ellipse {...p} cx="71" cy="200" rx="8" ry="19" /></>],
]

interface ShapeProps {
  fill: string
  fillOpacity: number
  stroke: string
  strokeWidth: number
}

const STATUS_COLOR: Record<TargetStatus, string> = {
  off: 'var(--color-surface-2)',
  none: 'var(--color-surface-2)',
  under: 'var(--color-warn)',
  in: 'var(--color-good)',
  over: 'var(--color-bad)',
}

export function BodyHeatmap({ counts, targets }: Props) {
  const [selected, setSelected] = useState<Muscle | null>(null)

  const shapeProps = (m: Muscle): ShapeProps => {
    const n = counts[m] ?? 0
    const target = targets[m]
    const st = targetStatus(n, target)
    // Under-target muscles fade in as they approach the minimum.
    const opacity = st === 'under' && target ? 0.35 + 0.65 * Math.min(1, n / target.min) : 1
    return {
      fill: STATUS_COLOR[st],
      fillOpacity: opacity,
      stroke: m === selected ? 'var(--color-text)' : 'var(--color-surface)',
      strokeWidth: m === selected ? 1.5 : 1,
    }
  }

  const figure = (shapes: typeof FRONT, label: string) => (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 120 240" className="h-56 w-auto" role="img" aria-label={`${label} muscle map`}>
        <circle cx="60" cy="18" r="11" fill="var(--color-surface-2)" />
        <rect x="55" y="27" width="10" height="7" rx="2" fill="var(--color-surface-2)" />
        {shapes.map(([m, draw]) => (
          <g
            key={m}
            onClick={() => setSelected((s) => (s === m ? null : m))}
            className="cursor-pointer"
            role="button"
            aria-label={`${MUSCLE_LABELS[m]}: ${formatNumber(counts[m] ?? 0)} sets`}
          >
            {draw(shapeProps(m))}
          </g>
        ))}
      </svg>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  )

  return (
    <div>
      <div className="flex justify-center gap-6">
        {figure(FRONT, 'Front')}
        {figure(BACK, 'Back')}
      </div>
      <p className="mt-2 h-5 text-center text-sm">
        {selected ? (
          <>
            <span className="font-semibold">{MUSCLE_LABELS[selected]}</span>{' '}
            <span className="text-muted">
              {formatNumber(counts[selected] ?? 0)} sets ·{' '}
              {targets[selected] ? `of ${targets[selected].min}–${targets[selected].max} · ` : ''}
              {
                { off: 'not tracked', none: 'not trained yet', under: 'under target', in: 'in range', over: 'over target' }[
                  targetStatus(counts[selected] ?? 0, targets[selected])
                ]
              }
            </span>
          </>
        ) : (
          <span className="text-muted">Tap a muscle for its set count</span>
        )}
      </p>
    </div>
  )
}
