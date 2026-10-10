import { useState } from 'react'
import { addDays, addMonths, endOfMonth, format, isSameMonth, startOfMonth } from 'date-fns'
import { dayKey, weekStart, weekdayIndex } from '../domain/week'

interface Props {
  /** dayKey → workout ids finished that day */
  trained: Map<string, string[]>
  /** weekday (0 = Mon) → planned routine name */
  planned: Map<number, string>
  onDayPress?: (workoutIds: string[]) => void
}

const HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Month grid: filled days are workouts; outlined upcoming days are planned sessions. */
export function MonthCalendar({ trained, planned, onDayPress }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const today = dayKey(new Date())
  const first = weekStart(month)
  const last = endOfMonth(month)
  const days: Date[] = []
  for (let d = first; d <= last || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d)
  const sessionsThisMonth = days.filter((d) => isSameMonth(d, month)).reduce((n, d) => n + (trained.get(dayKey(d))?.length ?? 0), 0)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button className="btn-ghost text-xl" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
          ‹
        </button>
        <div className="text-center">
          <div className="font-semibold">{format(month, 'MMMM yyyy')}</div>
          <div className="text-xs text-muted">
            {sessionsThisMonth} session{sessionsThisMonth === 1 ? '' : 's'}
          </div>
        </div>
        <button className="btn-ghost text-xl" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {HEADERS.map((h, i) => (
          <div key={i} className="pb-1 text-muted">
            {h}
          </div>
        ))}
        {days.map((d) => {
          const key = dayKey(d)
          const ids = trained.get(key) ?? []
          const inMonth = isSameMonth(d, month)
          const upcoming = key >= today && planned.has(weekdayIndex(d))
          const isToday = key === today
          return (
            <button
              key={key}
              disabled={ids.length === 0}
              onClick={() => onDayPress?.(ids)}
              aria-label={`${format(d, 'd MMMM')}${ids.length ? `, ${ids.length} workout` : ''}${upcoming ? `, planned ${planned.get(weekdayIndex(d))}` : ''}`}
              className={[
                'flex aspect-square items-center justify-center rounded-full text-sm tabular-nums',
                !inMonth && 'opacity-30',
                ids.length > 0 ? 'bg-good font-bold text-white' : upcoming ? 'border border-accent text-text' : 'text-muted',
                isToday && ids.length === 0 && 'font-bold text-text underline underline-offset-4',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-good" /> Trained
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-accent" /> Planned
        </span>
      </div>
    </div>
  )
}
