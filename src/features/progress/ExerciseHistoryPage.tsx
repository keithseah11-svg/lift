import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../../db/schema'
import { exerciseSessions } from '../../db/workouts'
import { MUSCLE_LABELS } from '../../domain/muscles'
import { computeRecords, sessionBestE1rm } from '../../domain/records'
import { totalVolume } from '../../domain/volume'
import { formatKg, formatNumber, formatVolume } from '../../lib/format'
import { PageHeader } from '../../components/PageHeader'
import { LineChart } from '../../components/LineChart'

type Metric = 'e1rm' | 'top' | 'volume'

const METRICS: { key: Metric; label: string; help: string }[] = [
  { key: 'e1rm', label: 'Est. 1RM', help: 'Best estimated one-rep max each session (Epley, sets of 1–12 reps).' },
  { key: 'top', label: 'Top set', help: 'Heaviest working weight each session.' },
  { key: 'volume', label: 'Volume', help: 'Total kg × reps for this exercise each session (warm-ups excluded).' },
]

export function ExerciseHistoryPage() {
  const { id = '' } = useParams()
  const [metric, setMetric] = useState<Metric>('e1rm')
  const exercise = useLiveQuery(async () => (await db.exercises.get(id)) ?? null, [id])
  const sessions = useLiveQuery(() => exerciseSessions(id), [id])

  if (exercise === null) {
    return (
      <div>
        <PageHeader title="Exercise" back />
        <p className="p-4 text-muted">This exercise no longer exists.</p>
      </div>
    )
  }
  if (!exercise || !sessions) return null

  // Oldest → newest for the chart.
  const rows = [...sessions].reverse().map(({ workout, sets }) => {
    const working = sets.filter((s) => s.type !== 'warmup')
    return {
      workout,
      sets,
      e1rm: sessionBestE1rm(sets),
      top: working.length ? Math.max(...working.map((s) => s.weightKg ?? 0)) : null,
      volume: totalVolume(sets),
    }
  })
  const points = rows.flatMap((r) => (r[metric] != null && r[metric]! > 0 ? [{ x: r.workout.startedAt, y: r[metric]!, row: r }] : []))
  const records = computeRecords(sessions.flatMap(({ workout, sets }) => sets.map((s) => ({ ...s, at: workout.startedAt }))))
  const format1 = (n: number) => formatNumber(Math.round(n * 10) / 10)
  const formatY = metric === 'volume' ? (y: number) => (y >= 1000 ? `${format1(y / 1000)}k` : String(Math.round(y))) : format1

  return (
    <div className="pb-6">
      <PageHeader title={exercise.name} back />
      <div className="space-y-3 px-4">
        <p className="text-sm text-muted">
          {MUSCLE_LABELS[exercise.primaryMuscle]}
          {exercise.secondaryMuscles.length > 0 && ` · ${exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}`}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <RecordTile label="Est. 1RM" value={records.bestE1rm ? formatKg(Math.round(records.bestE1rm.value * 10) / 10) : '—'} sub={records.bestE1rm && `${formatNumber(records.bestE1rm.weightKg)} × ${records.bestE1rm.reps}`} />
          <RecordTile label="Heaviest" value={records.heaviest ? formatKg(records.heaviest.weightKg) : '—'} sub={records.heaviest && `× ${records.heaviest.reps}`} />
          <RecordTile label="Best set" value={records.bestSetVolume ? formatVolume(records.bestSetVolume.value) : '—'} sub={records.bestSetVolume && `${formatNumber(records.bestSetVolume.weightKg)} × ${records.bestSetVolume.reps}`} />
        </div>

        <section className="card">
          <div className="mb-3 flex gap-2">
            {METRICS.map((m) => (
              <button key={m.key} className={metric === m.key ? 'chip-active' : 'chip'} onClick={() => setMetric(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          <LineChart
            line={points}
            formatY={formatY}
            describe={(i) => {
              const r = points[i].row
              return (
                <>
                  <div className="font-semibold text-text">
                    {metric === 'volume' ? formatVolume(points[i].y) : formatKg(Math.round(points[i].y * 10) / 10)}
                  </div>
                  <div className="text-muted">{r.sets.filter((s) => s.type !== 'warmup').length} working sets</div>
                </>
              )
            }}
          />
          <p className="mt-2 text-xs text-muted">{METRICS.find((m) => m.key === metric)!.help}</p>
        </section>

        <h2 className="pt-2 font-bold">Sessions</h2>
        {sessions.length === 0 && <div className="card text-center text-muted">You haven't logged this exercise yet.</div>}
        <ul className="space-y-2">
          {sessions.map(({ workout, sets }) => (
            <li key={workout.id}>
              <Link to={`/history/${workout.id}`} className="card block">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{format(workout.startedAt, 'EEE d MMM yyyy')}</span>
                  <span className="text-muted">{formatVolume(totalVolume(sets))}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums">
                  {sets.map((s) => (
                    <span key={s.id} className={s.type === 'warmup' ? 'text-muted' : ''}>
                      {s.type === 'warmup' && 'W '}
                      {formatNumber(s.weightKg ?? 0)}×{s.reps ?? 0}
                      {s.rir != null && <span className="text-muted"> @{s.rir}</span>}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function RecordTile({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="rounded-xl bg-surface px-2 py-2 text-center">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted tabular-nums">{sub}</div>}
    </div>
  )
}
