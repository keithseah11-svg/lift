import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { format } from 'date-fns'

export interface ChartPoint {
  x: number // timestamp
  y: number
}

interface Props {
  /** Main series, drawn as a 2px line with an end dot. */
  line: ChartPoint[]
  /** Optional raw readings drawn as small de-emphasised dots behind the line. */
  dots?: ChartPoint[]
  formatY: (y: number) => string
  /** Tooltip body for the inspected x. */
  describe?: (index: number) => ReactNode
  height?: number
  /** Legend labels when `dots` are shown (two series need a legend). */
  legend?: { line: string; dots: string }
}

const PAD = { top: 12, right: 14, bottom: 22, left: 40 }

/** Picks ~4 round tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.05)
    min -= pad
    max += pad
  }
  const raw = (max - min) / (count - 1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  // Always end on a tick at or above the max so the highest point is never clipped.
  const ticks: number[] = []
  for (let v = start; ; v += step) {
    ticks.push(Number(v.toFixed(6)))
    if (v >= max - 1e-9) break
  }
  return ticks
}

/** Responsive SVG line chart; tap or drag horizontally to inspect a point. */
export function LineChart({ line, dots = [], formatY, describe, height = 180, legend }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [active, setActive] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (line.length === 0) return <p className="py-8 text-center text-sm text-muted">No data yet.</p>

  const all = [...line, ...dots]
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys))
  const yMin = ticks[0]
  const yMax = ticks[ticks.length - 1]
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const innerW = width - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const sx = (x: number) => PAD.left + (xMax === xMin ? innerW / 2 : ((x - xMin) / (xMax - xMin)) * innerW)
  const sy = (y: number) => PAD.top + innerH - ((y - yMin) / (yMax - yMin || 1)) * innerH

  const path = line.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('')
  const last = line[line.length - 1]

  const inspect = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clientX - rect.left
    let best = 0
    line.forEach((p, i) => {
      if (Math.abs(sx(p.x) - x) < Math.abs(sx(line[best].x) - x)) best = i
    })
    setActive(best)
  }

  const activePoint = active != null ? line[active] : null
  const tooltipLeft = activePoint ? Math.min(Math.max(sx(activePoint.x) - 70, 0), width - 140) : 0

  return (
    <div>
      {legend && dots.length > 0 && (
        <div className="mb-2 flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <svg width="16" height="8" aria-hidden>
              <line x1="0" y1="4" x2="16" y2="4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {legend.line}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="8" height="8" aria-hidden>
              <circle cx="4" cy="4" r="3" fill="var(--color-muted)" />
            </svg>
            {legend.dots}
          </span>
        </div>
      )}
      <div
        ref={wrapRef}
        className="relative select-none"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => inspect(e.clientX)}
        onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons > 0) && inspect(e.clientX)}
      >
        <svg width={width} height={height} role="img" aria-label="Line chart">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" strokeWidth="1" />
              <text x={PAD.left - 6} y={sy(t)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--color-muted)" className="tabular-nums">
                {formatY(t)}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={height - 6} fontSize="10" fill="var(--color-muted)">
            {format(xMin, 'd MMM')}
          </text>
          {xMax !== xMin && (
            <text x={width - PAD.right} y={height - 6} textAnchor="end" fontSize="10" fill="var(--color-muted)">
              {format(xMax, 'd MMM')}
            </text>
          )}

          {dots.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="2.5" fill="var(--color-muted)" opacity="0.7" />
          ))}

          <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {line.length <= 30 &&
            line.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="1.5" />
            ))}
          <circle cx={sx(last.x)} cy={sy(last.y)} r="4.5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />

          {activePoint && (
            <g>
              <line x1={sx(activePoint.x)} x2={sx(activePoint.x)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-muted)" strokeWidth="1" />
              <circle cx={sx(activePoint.x)} cy={sy(activePoint.y)} r="5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {activePoint && (
          <div
            className="pointer-events-none absolute top-0 w-[140px] rounded-lg border border-line bg-bg/95 px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: tooltipLeft }}
          >
            <div className="text-muted">{format(activePoint.x, 'EEE d MMM yyyy')}</div>
            {describe ? describe(active!) : <div className="font-semibold text-text">{formatY(activePoint.y)}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
