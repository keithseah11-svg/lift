import { useEffect, useRef } from 'react'
import { adjustRest, playChime, stopRest, useNow, useRestTimer } from '../lib/restTimer'
import { formatClock } from '../lib/format'

export function RestTimerBar() {
  const timer = useRestTimer()
  const now = useNow(timer !== null, 250)
  const chimedFor = useRef<number | null>(null)

  const remaining = timer ? (timer.endsAt - now) / 1000 : 0
  const finished = timer !== null && remaining <= 0

  useEffect(() => {
    if (!timer || !finished || chimedFor.current === timer.endsAt) return
    chimedFor.current = timer.endsAt
    // Only chime if rest ended moments ago, not when reopening the app much later.
    if (document.visibilityState === 'visible' && now - timer.endsAt < 2000) playChime()
  }, [timer, finished, now])

  const endsAt = timer?.endsAt
  useEffect(() => {
    if (!finished) return
    const t = setTimeout(stopRest, 4000)
    return () => clearTimeout(t)
  }, [finished, endsAt])

  if (!timer) return null
  const pct = Math.min(100, Math.max(0, (remaining / timer.durationSec) * 100))

  return (
    <div className={`mx-3 mb-2 overflow-hidden rounded-2xl shadow-lg ${finished ? 'bg-good' : 'bg-surface-2'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button className="btn-ghost text-text" onClick={() => adjustRest(-15)} disabled={finished}>
          −15
        </button>
        <div className="flex-1 text-center">
          <div className="text-xs text-text/70">{finished ? 'Rest over' : 'Rest'}</div>
          <div className="text-2xl font-bold tabular-nums">{finished ? 'Go! 💪' : formatClock(remaining)}</div>
        </div>
        <button className="btn-ghost text-text" onClick={() => adjustRest(15)} disabled={finished}>
          +15
        </button>
        <button className="btn-ghost text-text" onClick={stopRest}>
          Skip
        </button>
      </div>
      {!finished && (
        <div className="h-1 bg-bg/40">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
