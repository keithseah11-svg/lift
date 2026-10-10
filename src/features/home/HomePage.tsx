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
        {active && (
          <Link to={`/workout/${active.id}`} className="card flex items-center justify-between bg-accent-soft">
            <div>
              <div className="text-xs text-muted">In progress</div>
              <div className="font-semibold">{active.name}</div>
            </div>
            <span className="btn-primary">Resume</span>
          </Link>
        )}

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
            <span className="text-sm text-muted">{formatVolume(week?.volume ?? 0)} lifted</span>
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
            <h2 className="font-bold">Sets per muscle</h2>
            <span className="text-xs text-muted">
              target {settings.weeklySetMin}–{settings.weeklySetMax}
            </span>
          </div>
          <MuscleSetList counts={week?.muscleSets ?? {}} target={{ min: settings.weeklySetMin, max: settings.weeklySetMax }} showAll />
          <p className="mt-3 text-xs text-muted">
            <span className="text-warn">■</span> under · <span className="text-good">■</span> in range ·{' '}
            <span className="text-bad">■</span> over. Secondary muscles count as ½ set.
          </p>
        </section>

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
