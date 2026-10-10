import { useState } from 'react'
import { Link } from 'react-router'
import type { Exercise, SetType, WorkoutExercise, WorkoutSet } from '../../db/types'
import { db } from '../../db/schema'
import { deleteSet, updateSet } from '../../db/workouts'
import { MUSCLE_LABELS } from '../../domain/muscles'
import { matchPrevious } from '../../domain/previous'
import type { Suggestion } from '../../domain/progression'
import { formatClock, formatNumber } from '../../lib/format'
import { startRest, unlockAudio } from '../../lib/restTimer'
import { NumberField } from '../../components/NumberField'
import { Sheet } from '../../components/Sheet'

interface Props {
  workoutExercise: WorkoutExercise
  exercise: Exercise
  sets: WorkoutSet[]
  previous: WorkoutSet[]
  suggestion?: Suggestion
  isActive: boolean
  isFirst: boolean
  isLast: boolean
  onAddSet: () => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  onRestChange: (restSec: number) => void
}

const TYPE_LABEL: Record<SetType, string> = { warmup: 'W', working: '', drop: 'D', failure: 'F' }
const TYPE_NAME: Record<SetType, string> = { warmup: 'Warm-up', working: 'Working', drop: 'Drop set', failure: 'To failure' }
const TYPE_COLOR: Record<SetType, string> = { warmup: 'text-warn', working: 'text-text', drop: 'text-accent', failure: 'text-bad' }

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300]

export function ExerciseCard(props: Props) {
  const { workoutExercise: we, exercise, sets, previous, isActive } = props
  const [menuOpen, setMenuOpen] = useState(false)
  const [typeSheetFor, setTypeSheetFor] = useState<WorkoutSet | null>(null)

  let workingIndex = 0
  const target =
    we.repMin != null && we.repMax != null
      ? `Target ${we.repMin === we.repMax ? we.repMin : `${we.repMin}–${we.repMax}`} reps${we.targetRir != null ? ` · RIR ${we.targetRir}` : ''}`
      : null

  // When the suggestion changes the load, last time's reps no longer apply.
  const loadChanged = props.suggestion?.kind === 'increase' || props.suggestion?.kind === 'deload'
  const repsHint = (set: WorkoutSet, prev: WorkoutSet | undefined) =>
    loadChanged && set.type !== 'warmup' ? props.suggestion!.reps : (prev?.reps ?? we.repMin ?? null)

  const toggleDone = async (set: WorkoutSet, prev: WorkoutSet | undefined) => {
    unlockAudio()
    // Read the stored row: a value typed just before tapping may not have re-rendered yet.
    const current = (await db.sets.get(set.id)) ?? set
    if (current.done) return updateSet(set.id, { done: false })
    const weightKg = current.weightKg ?? prev?.weightKg ?? null
    const reps = current.reps ?? repsHint(current, prev)
    if (reps == null) return // nothing to log yet
    await updateSet(set.id, { done: true, weightKg: weightKg ?? 0, reps })
    if (isActive) startRest(we.restSec)
  }

  const previousFor = matchPrevious(sets, previous)

  return (
    <section className="card px-3">
      <div className="mb-2 flex items-start gap-2 px-1">
        <div className="min-w-0 flex-1">
          <Link to={`/exercise/${exercise.id}`} className="font-semibold text-accent">
            {exercise.name}
          </Link>
          <p className="text-xs text-muted">
            {MUSCLE_LABELS[exercise.primaryMuscle]}
            {exercise.secondaryMuscles.length > 0 && ` · ${exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}`}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {target && <span>{target} · </span>}
            Rest {we.restSec > 0 ? formatClock(we.restSec) : 'off'}
          </p>
          {props.suggestion && <SuggestionNote suggestion={props.suggestion} />}
        </div>
        <button className="btn-ghost -mr-1 text-xl leading-none" onClick={() => setMenuOpen(true)} aria-label="Exercise options">
          ⋯
        </button>
      </div>

      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_3.75rem_3.25rem_2.75rem_2.5rem] items-center gap-x-1.5 px-1 text-[11px] font-medium text-muted uppercase">
        <span className="text-center">Set</span>
        <span>Previous</span>
        <span className="text-center">kg</span>
        <span className="text-center">Reps</span>
        <span className="text-center">RIR</span>
        <span className="text-center">✓</span>
      </div>

      <div className="mt-1 space-y-1">
        {sets.map((set, i) => {
          const prev = previousFor.get(set.id)
          const label = set.type === 'working' ? String(++workingIndex) : TYPE_LABEL[set.type]
          return (
            <div
              key={set.id}
              className={`grid grid-cols-[1.75rem_minmax(0,1fr)_3.75rem_3.25rem_2.75rem_2.5rem] items-center gap-x-1.5 rounded-lg px-1 py-1 ${set.done ? 'bg-good-soft' : ''}`}
            >
              <button
                className={`h-9 rounded-md bg-surface-2 text-sm font-bold ${TYPE_COLOR[set.type]}`}
                onClick={() => setTypeSheetFor(set)}
                aria-label={`Set ${i + 1} type: ${TYPE_NAME[set.type]}`}
              >
                {label}
              </button>
              <button
                className="truncate text-left text-xs text-muted tabular-nums"
                disabled={!prev}
                onClick={() => prev && updateSet(set.id, { weightKg: prev.weightKg, reps: prev.reps })}
              >
                {prev ? `${formatNumber(prev.weightKg ?? 0)}×${prev.reps ?? 0}${prev.rir != null ? ` @${prev.rir}` : ''}` : '—'}
              </button>
              <NumberField
                decimal
                ariaLabel="Weight in kg"
                className="h-9 w-full rounded-md bg-surface-2 text-center font-semibold outline-none focus:ring-1 focus:ring-accent"
                value={set.weightKg}
                placeholder={prev?.weightKg != null ? formatNumber(prev.weightKg) : '0'}
                onChange={(weightKg) => updateSet(set.id, { weightKg })}
              />
              <NumberField
                ariaLabel="Reps"
                className="h-9 w-full rounded-md bg-surface-2 text-center font-semibold outline-none focus:ring-1 focus:ring-accent"
                value={set.reps}
                placeholder={String(repsHint(set, prev) ?? 0)}
                onChange={(reps) => updateSet(set.id, { reps })}
              />
              <NumberField
                ariaLabel="Reps in reserve"
                className="h-9 w-full rounded-md bg-surface-2 text-center outline-none focus:ring-1 focus:ring-accent"
                value={set.rir}
                placeholder="–"
                onChange={(rir) => updateSet(set.id, { rir: rir == null ? null : Math.min(10, rir) })}
              />
              <button
                className={`h-9 rounded-md text-lg font-bold ${set.done ? 'bg-good text-white' : 'bg-surface-2 text-muted'}`}
                onClick={() => toggleDone(set, prev)}
                aria-label={set.done ? 'Mark set not done' : 'Mark set done'}
              >
                ✓
              </button>
            </div>
          )
        })}
      </div>

      <button className="btn-secondary mt-2 w-full py-2" onClick={props.onAddSet}>
        + Add set
      </button>

      <Sheet open={typeSheetFor !== null} onClose={() => setTypeSheetFor(null)} title="Set type">
        <div className="space-y-2">
          {(Object.keys(TYPE_NAME) as SetType[]).map((type) => (
            <button
              key={type}
              className={`btn w-full justify-start ${typeSheetFor?.type === type ? 'bg-accent-soft' : 'bg-surface-2'}`}
              onClick={() => {
                if (typeSheetFor) void updateSet(typeSheetFor.id, { type })
                setTypeSheetFor(null)
              }}
            >
              <span className={`w-6 font-bold ${TYPE_COLOR[type]}`}>{TYPE_LABEL[type] || '1'}</span>
              {TYPE_NAME[type]}
              {type === 'warmup' && <span className="ml-auto text-xs font-normal text-muted">not counted in volume</span>}
            </button>
          ))}
          <button
            className="btn-danger w-full"
            onClick={() => {
              if (typeSheetFor) void deleteSet(typeSheetFor.id)
              setTypeSheetFor(null)
            }}
          >
            Delete set
          </button>
        </div>
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={exercise.name}>
        <div className="space-y-4">
          <div>
            <label className="label">Rest timer</label>
            <div className="flex flex-wrap gap-2">
              {REST_OPTIONS.map((sec) => (
                <button key={sec} className={we.restSec === sec ? 'chip-active' : 'chip'} onClick={() => props.onRestChange(sec)}>
                  {sec === 0 ? 'Off' : formatClock(sec)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary" disabled={props.isFirst} onClick={() => props.onMove(-1)}>
              ↑ Move up
            </button>
            <button className="btn-secondary" disabled={props.isLast} onClick={() => props.onMove(1)}>
              ↓ Move down
            </button>
          </div>
          <button
            className="btn-danger w-full"
            onClick={() => {
              setMenuOpen(false)
              props.onRemove()
            }}
          >
            Remove exercise
          </button>
        </div>
      </Sheet>
    </section>
  )
}

const SUGGESTION_STYLE: Record<Suggestion['kind'], { icon: string; className: string }> = {
  increase: { icon: '⬆️', className: 'bg-good-soft' },
  reps: { icon: '➕', className: 'bg-accent-soft' },
  hold: { icon: '⏸️', className: 'bg-surface-2' },
  deload: { icon: '⬇️', className: 'bg-warn/15' },
}

function SuggestionNote({ suggestion }: { suggestion: Suggestion }) {
  const style = SUGGESTION_STYLE[suggestion.kind]
  return (
    <div className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs ${style.className}`}>
      <span className="font-semibold">
        {style.icon} Today: {suggestion.weightKg > 0 ? `${formatNumber(suggestion.weightKg)} kg × ` : ''}
        {suggestion.reps} reps
      </span>
      <span className="text-muted"> · {suggestion.reason}</span>
    </div>
  )
}
