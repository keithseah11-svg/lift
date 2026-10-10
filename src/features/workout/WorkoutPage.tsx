import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { useExerciseMap } from '../../db/exercises'
import {
  addExerciseToWorkout,
  addSet,
  deleteWorkout,
  finishWorkout,
  moveWorkoutExercise,
  previousPerformance,
  suggestionFor,
  removeWorkoutExercise,
  updateWorkout,
  updateWorkoutExercise,
} from '../../db/workouts'
import type { WorkoutSet } from '../../db/types'
import type { Suggestion } from '../../domain/progression'
import { supersetLayout } from '../../domain/supersets'
import { workoutGroups } from '../../db/supersets'
import { totalVolume } from '../../domain/volume'
import { formatDuration, formatVolume } from '../../lib/format'
import { stopRest, useNow } from '../../lib/restTimer'
import { PageHeader } from '../../components/PageHeader'
import { Stat } from '../../components/Stat'
import { ExercisePicker } from '../../components/ExercisePicker'
import { ExerciseCard } from './ExerciseCard'

export function WorkoutPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const exerciseMap = useExerciseMap()

  // null = not found, undefined = still loading
  const workout = useLiveQuery(async () => (await db.workouts.get(id)) ?? null, [id])
  const workoutExercises = useLiveQuery(
    async () => (await db.workoutExercises.where('workoutId').equals(id).toArray()).sort((a, b) => a.order - b.order),
    [id],
  )
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(id).toArray(), [id])

  const exerciseIdsKey = workoutExercises?.map((we) => we.exerciseId).join(',') ?? ''
  const previous = useLiveQuery(async () => {
    if (!workout) return new Map<string, WorkoutSet[]>()
    const ids = [...new Set(exerciseIdsKey.split(',').filter(Boolean))]
    const entries = await Promise.all(
      ids.map(async (exId) => [exId, (await previousPerformance(exId, workout.startedAt))?.sets ?? []] as const),
    )
    return new Map(entries)
  }, [exerciseIdsKey, workout?.startedAt])

  // Progression suggestions only make sense with a target rep range (routine exercises).
  const targetsKey = workoutExercises?.map((we) => `${we.id}:${we.exerciseId}:${we.repMin}:${we.repMax}:${we.targetRir}`).join('|') ?? ''
  const suggestions = useLiveQuery(async () => {
    const map = new Map<string, Suggestion>()
    if (!workout || !workoutExercises) return map
    for (const we of workoutExercises) {
      const exercise = await db.exercises.get(we.exerciseId)
      const suggestion = exercise && (await suggestionFor(exercise, we, workout.startedAt))
      if (suggestion) map.set(we.id, suggestion)
    }
    return map
  }, [targetsKey, workout?.startedAt])

  const isActive = workout?.status === 'active'
  const now = useNow(isActive, 1000)

  if (workout === null) {
    return (
      <div>
        <PageHeader title="Workout" back />
        <p className="p-4 text-muted">This workout no longer exists.</p>
      </div>
    )
  }
  if (!workout || !workoutExercises || !sets || !exerciseMap) return null

  const layout = supersetLayout(workoutExercises)
  const doneSets = sets.filter((s) => s.done && s.type !== 'warmup')
  const volume = totalVolume(sets)
  const elapsed = (workout.endedAt ?? now) - workout.startedAt

  const finish = async () => {
    const unticked = sets.filter((s) => !s.done && (s.weightKg != null || s.reps != null)).length
    if (doneSets.length === 0 && !confirm('No sets are ticked. Finish anyway? The workout will be empty.')) return
    if (unticked > 0 && !confirm(`${unticked} set${unticked > 1 ? 's are' : ' is'} not ticked and will be discarded. Finish?`)) return
    await finishWorkout(workout.id)
    if (isActive) stopRest()
    navigate(isActive ? `/history/${workout.id}?finished=1` : `/history/${workout.id}`, { replace: true })
  }

  const discard = async () => {
    const msg = isActive ? 'Discard this workout? Nothing will be saved.' : 'Delete this workout permanently?'
    if (!confirm(msg)) return
    await deleteWorkout(workout.id)
    if (isActive) stopRest()
    navigate(isActive ? '/train' : '/history', { replace: true })
  }

  return (
    <div className="pb-6">
      <PageHeader
        title={
          <input
            className="w-full bg-transparent font-bold outline-none"
            value={workout.name}
            onChange={(e) => updateWorkout(workout.id, { name: e.target.value })}
            aria-label="Workout name"
          />
        }
        back={!isActive}
        right={
          <button className="btn-primary px-4 py-2" onClick={finish}>
            {isActive ? 'Finish' : 'Save'}
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-2 px-4 pb-3 text-center">
        <Stat label="Duration" value={formatDuration(elapsed)} />
        <Stat label="Volume" value={formatVolume(volume)} />
        <Stat label="Sets" value={String(doneSets.length)} />
      </div>

      <div className="space-y-3 px-4">
        {workoutExercises.map((we, i) => {
          const exercise = exerciseMap.get(we.exerciseId)
          if (!exercise) return null
          return (
            <ExerciseCard
              key={we.id}
              workoutExercise={we}
              exercise={exercise}
              sets={sets.filter((s) => s.workoutExerciseId === we.id).sort((a, b) => a.order - b.order)}
              previous={previous?.get(we.exerciseId) ?? []}
              suggestion={isActive ? suggestions?.get(we.id) : undefined}
              isActive={isActive}
              isFirst={i === 0}
              isLast={i === workoutExercises.length - 1}
              superset={layout.get(we.id)}
              onSupersetNext={() => workoutGroups.link(we.id)}
              onLeaveSuperset={() => workoutGroups.unlink(we.id)}
              onAddSet={() => addSet(we.id)}
              onMove={(dir) => moveWorkoutExercise(we.id, dir)}
              onRemove={() => {
                if (confirm(`Remove ${exercise.name} from this workout?`)) void removeWorkoutExercise(we.id)
              }}
              onRestChange={(restSec) => updateWorkoutExercise(we.id, { restSec })}
            />
          )
        })}

        {workoutExercises.length === 0 && (
          <div className="card text-center text-muted">Add your first exercise to get started.</div>
        )}

        <button className="btn-primary w-full" onClick={() => setPickerOpen(true)}>
          + Add exercise
        </button>

        <div>
          <label className="label mt-2">Notes</label>
          <textarea
            className="field min-h-20"
            placeholder="How did it feel?"
            value={workout.notes}
            onChange={(e) => updateWorkout(workout.id, { notes: e.target.value })}
          />
        </div>

        <button className="btn-danger w-full" onClick={discard}>
          {isActive ? 'Discard workout' : 'Delete workout'}
        </button>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(e) => addExerciseToWorkout(workout.id, e)} />
    </div>
  )
}
