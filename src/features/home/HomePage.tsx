import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../../db/schema'
import { useExerciseMap } from '../../db/exercises'
import { useSettings } from '../../db/settings'
import { getActiveWorkout, startWorkout } from '../../db/workouts'
import { dayKey, weekdayIndex } from '../../domain/week'
import { MUSCLE_LABELS } from '../../domain/muscles'
import { remainingMacros, sumMacros } from '../../domain/macros'
import { formatVolume } from '../../lib/format'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { MuscleSetList } from '../../components/MuscleSetList'
import { BodyHeatmap } from '../../components/BodyHeatmap'
import { loadAllRecords, sessionTimes } from '../../db/stats'
import { weekStreak } from '../../domain/streak'
import { weeklyRate, withSevenDayAverage } from '../../domain/bodyweight'
import { formatKg, formatNumber } from '../../lib/format'
import { useWeekStats } from './useWeekStats'

const BACKUP_REMINDER_DAYS = 7

export function HomePage() {
  const navigate = useNavigate()
  const settings = useSettings()
  const exerciseMap = useExerciseMap()
  const week = useWeekStats(exerciseMap)
  const today = new Date()
  const todayKey = dayKey(today)

  const active = useLiveQuery(getActiveWorkout, [])
  const plannedRoutine = useLiveQuery(async () => {
    const entry = await db.schedule.get(weekdayIndex(today))
    return entry?.routineId ? ((await db.routines.get(entry.routineId)) ?? null) : null
  }, [weekdayIndex(today)])
  const macroEntries = useLiveQuery(() => db.macroEntries.where('date').equals(todayKey).toArray(), [todayKey])
  const workoutCount = useLiveQuery(() => db.workouts.count(), [])
  const records = useLiveQuery(async () => (exerciseMap ? loadAllRecords(exerciseMap) : undefined), [exerciseMap])
  const doneTimes = useLiveQuery(sessionTimes, [])
  const bodyweight = useLiveQuery(async () => {
    const points = withSevenDayAverage(await db.bodyweight.orderBy('date').toArray())
    return points.length ? { latest: points[points.length - 1], rate: weeklyRate(points) } : null
  }, [])
  const streak = weekStreak(doneTimes ?? [], settings.weeklySessionTarget)

  const trainedToday = week?.summaries.filter((s) => dayKey(s.workout.startedAt) === todayKey) ?? []
  const sessions = week?.summaries.length ?? 0
  const hitThisWeek = week ? [...new Set(week.summaries.flatMap((s) => s.musclesHit))] : []
  const eaten = sumMacros(macroEntries ?? [])
  const left = remainingMacros(settings.macroTarget, eaten)
  const backupDue =
    (workoutCount ?? 0) > 0 &&
    (settings.lastBackupAt == null || Date.now() - settings.lastBackupAt > BACKUP_REMINDER_DAYS * 86400000)

  const start = async (routineId: string | null) => {
    const id = await startWorkout(routineId)
    navigate(`/workout/${id}`)
  }

  return (
    <div>
      <PageHeader
        title="Lift"
        right={
          <Link to="/settings" className="btn-ghost text-xl" aria-label="Settings">
            ⚙️
          </Link>
        }
      />
      <div className="space-y-3 px-4">
        {backupDue && (
          <Link to="/settings" className="card flex items-center gap-3 border border-warn/40">
            <span className="text-2xl">💾</span>
            <div className="text-sm">
              <div className="font-semibold">Back up your data</div>
              <div className="text-muted">
                {settings.lastBackupAt
                  ? `Last backup ${Math.floor((Date.now() - settings.lastBackupAt) / 86400000)} days ago.`
                  : 'You haven’t made a backup yet.'}{' '}
                Your data lives only on this phone.
              </div>
            </div>
          </Link>
        )}

        <section className="card">
          <div className="text-xs text-muted uppercase">{format(today, 'EEEE, d MMM')}</div>
          {trainedToday.length > 0 ? (
            <div className="mt-1">
              <div className="font-semibold text-good">✓ Trained today</div>
              {trainedToday.map((s) => (
                <Link key={s.workout.id} to={`/history/${s.workout.id}`} className="block text-sm text-muted">
                  {s.workout.name} · {formatVolume(s.volume)} · {s.musclesHit.map((m) => MUSCLE_LABELS[m]).join(', ')}
                </Link>
              ))}
            </div>
          ) : plannedRoutine ? (
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted">Planned</div>
                <div className="text-lg font-bold">{plannedRoutine.name}</div>
              </div>
              {!active && (
                <button className="btn-primary" onClick={() => start(plannedRoutine.id)}>
                  Start
                </button>
              )}
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="text-lg font-bold">Rest day</div>
              {!active && (
                <button className="btn-secondary" onClick={() => start(null)}>
                  Start empty workout
                </button>
              )}
            </div>
          )}
        </section>

        <section className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">This week</h2>
            <span className="text-sm text-muted">
              {streak > 0 && `🔥 ${streak} wk streak · `}
              {formatVolume(week?.volume ?? 0)} lifted
            </span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted">Sessions</span>
              <span className="font-semibold">
                {sessions} / {settings.weeklySessionTarget}
              </span>
            </div>
            <ProgressBar value={sessions} max={settings.weeklySessionTarget} tone={sessions >= settings.weeklySessionTarget ? 'good' : 'accent'} />
          </div>
          {hitThisWeek.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hitThisWeek.map((m) => (
                <span key={m} className="chip-active text-xs">
                  {MUSCLE_LABELS[m]}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-bold">Muscles this week</h2>
            <span className="text-xs text-muted">
              target {settings.weeklySetMin}–{settings.weeklySetMax} sets
            </span>
          </div>
          <BodyHeatmap counts={week?.muscleSets ?? {}} target={{ min: settings.weeklySetMin, max: settings.weeklySetMax }} />
          <div className="my-4 border-t border-line" />
          <MuscleSetList counts={week?.muscleSets ?? {}} target={{ min: settings.weeklySetMin, max: settings.weeklySetMax }} showAll />
          <p className="mt-3 text-xs text-muted">
            <span className="text-warn">■</span> under · <span className="text-good">■</span> in range ·{' '}
            <span className="text-bad">■</span> over. Secondary muscles count as ½ set.
          </p>
        </section>

        <section className="card">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-bold">Personal records</h2>
            <Link to="/history/exercises" className="text-sm text-accent">
              See all
            </Link>
          </div>
          {records && records.length === 0 && <p className="text-sm text-muted">Finish a workout to set your first records.</p>}
          <ul className="divide-y divide-line">
            {records?.slice(0, 6).map(({ exercise, records: r }) => (
              <li key={exercise.id}>
                <Link to={`/exercise/${exercise.id}`} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{exercise.name}</span>
                  {r.heaviest && (
                    <span className="text-xs text-muted tabular-nums">
                      {formatNumber(r.heaviest.weightKg)} × {r.heaviest.reps}
                    </span>
                  )}
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">
                    {r.bestE1rm ? formatKg(Math.round(r.bestE1rm.value * 10) / 10) : r.heaviest ? formatKg(r.heaviest.weightKg) : '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {records && records.length > 0 && (
            <p className="mt-1 text-xs text-muted">Right column: best estimated 1-rep max. Middle: heaviest set.</p>
          )}
        </section>

        <Link to="/history/body" className="card flex items-center justify-between">
          <div>
            <h2 className="font-bold">Bodyweight</h2>
            <div className="text-sm text-muted">
              {bodyweight
                ? bodyweight.rate == null
                  ? '7-day average'
                  : `${bodyweight.rate > 0 ? '+' : bodyweight.rate < 0 ? '−' : ''}${formatNumber(Math.abs(Math.round(bodyweight.rate * 100) / 100))} kg/week`
                : 'Tap to log your first weigh-in'}
            </div>
          </div>
          <span className="text-xl font-semibold">
            {bodyweight ? `${formatNumber(Math.round(bodyweight.latest.average * 10) / 10)} kg` : '+'}
          </span>
        </Link>

        <Link to="/food" className="card block">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-bold">Macros left today</h2>
            <span className="text-sm text-muted">{Math.max(0, Math.round(left.kcal))} kcal</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {(
              [
                ['Protein', eaten.proteinG, settings.macroTarget.proteinG, left.proteinG],
                ['Carbs', eaten.carbsG, settings.macroTarget.carbsG, left.carbsG],
                ['Fat', eaten.fatG, settings.macroTarget.fatG, left.fatG],
              ] as const
            ).map(([label, value, target, remaining]) => (
              <div key={label}>
                <div className="flex justify-between">
                  <span className="text-muted">{label}</span>
                  <span className={`font-semibold ${remaining < 0 ? 'text-bad' : ''}`}>{Math.round(remaining)}g</span>
                </div>
                <ProgressBar value={value} max={target} tone={remaining < 0 ? 'bad' : 'accent'} />
              </div>
            ))}
          </div>
        </Link>
      </div>
    </div>
  )
}
