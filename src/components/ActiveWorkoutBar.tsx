import { Link, useLocation } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { getActiveWorkout } from '../db/workouts'
import { formatClock } from '../lib/format'
import { useNow } from '../lib/restTimer'

/** Shown above the tabs on every other screen while a workout is running. */
export function ActiveWorkoutBar() {
  const { pathname } = useLocation()
  const active = useLiveQuery(getActiveWorkout, [])
  const visible = !!active && pathname !== `/workout/${active.id}`
  const now = useNow(visible, 1000)
  if (!visible) return null

  const elapsedSec = Math.floor((now - active.startedAt) / 1000)
  const h = Math.floor(elapsedSec / 3600)
  const clock = h > 0 ? `${h}:${formatClock(elapsedSec % 3600).padStart(5, '0')}` : formatClock(elapsedSec)

  return (
    <Link
      to={`/workout/${active.id}`}
      className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-accent px-4 py-2.5 text-white shadow-lg"
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />
        <span className="relative inline-flex size-2.5 rounded-full bg-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] opacity-80">Workout in progress</div>
        <div className="truncate font-semibold">{active.name}</div>
      </div>
      <span className="font-semibold tabular-nums">{clock}</span>
      <span className="text-sm font-semibold">Resume ›</span>
    </Link>
  )
}
