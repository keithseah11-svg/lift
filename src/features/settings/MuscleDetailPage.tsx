import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { useSettings } from '../../db/settings'
import { deleteMuscle, linkExerciseToMuscle, renameMuscle, unlinkExerciseFromMuscle } from '../../db/muscles'
import type { Exercise } from '../../db/types'
import { useMuscles } from '../../app/MusclesProvider'
import { isBuiltinMuscle, isMuscleId, type Muscle } from '../../domain/muscles'
import { exercisesForMuscle, type MuscleRole } from '../../domain/muscleLinks'
import { countedSecondaryMuscles } from '../../domain/muscleSets'
import { PageHeader } from '../../components/PageHeader'
import { ExercisePicker } from '../../components/ExercisePicker'
import { Sheet } from '../../components/Sheet'
import { MuscleRow, setMuscleTarget } from './MuscleTargetsPage'

export function MuscleDetailPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const { all, label } = useMuscles()
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])
  const [picking, setPicking] = useState(false)
  const [roleFor, setRoleFor] = useState<Exercise | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!isMuscleId(id) || !all.includes(id)) {
    return (
      <div>
        <PageHeader title="Muscle" back />
        <p className="p-4 text-muted">This muscle group no longer exists.</p>
      </div>
    )
  }
  if (!exercises) return null

  const muscle: Muscle = id
  const custom = !isBuiltinMuscle(muscle)
  const linked = exercisesForMuscle(exercises, muscle)
  const linkedIds = new Set(linked.map((l) => l.exercise.id))
  const isNew = params.get('new') === '1'

  const link = async (exercise: Exercise, role: MuscleRole) => {
    await linkExerciseToMuscle(exercise.id, muscle, role)
    setRoleFor(null)
    setMessage(`${exercise.name} now counts ${role === 'main' ? '1 set' : '½ set'} toward ${label(muscle)}.`)
  }

  const unlink = async (exercise: Exercise) => {
    const ok = await unlinkExerciseFromMuscle(exercise.id, muscle)
    setMessage(ok ? `Removed ${exercise.name}.` : null)
  }

  const remove = async () => {
    if (!custom || !confirm(`Delete “${label(muscle)}”? It will be unlinked from every exercise. Past workouts are kept.`)) return
    const result = await deleteMuscle(muscle)
    if (result.ok) return navigate('/settings/muscles', { replace: true })
    setMessage(
      `It’s the main muscle for ${result.mainFor.join(', ')}. Make another muscle their main one first (on that muscle’s page), then delete.`,
    )
  }

  return (
    <div className="pb-6">
      <PageHeader
        title={
          custom ? (
            <input
              className="w-full bg-transparent font-bold outline-none"
              defaultValue={label(muscle)}
              onBlur={(e) => renameMuscle(muscle, e.target.value)}
              aria-label="Muscle name"
            />
          ) : (
            label(muscle)
          )
        }
        back
      />
      <div className="space-y-4 px-4">
        <section className="card p-0">
          <ul>
            <MuscleRow
              muscle={muscle}
              linked={false}
              override={settings.muscleTargets[muscle]}
              defaults={{ min: settings.weeklySetMin, max: settings.weeklySetMax }}
              onChange={(v) => setMuscleTarget(settings.muscleTargets, muscle, v)}
            />
          </ul>
        </section>

        {isNew && linked.length === 0 && (
          <div className="card border border-accent/50 bg-accent-soft text-sm">
            <div className="font-semibold">“{label(muscle)}” was added.</div>
            Now choose the exercises that work it. Sets from those exercises will count toward its weekly target.
          </div>
        )}

        <section className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">Exercises that work {label(muscle)}</h2>
            <span className="text-sm text-muted">{linked.length}</span>
          </div>
          {!custom && (
            <p className="text-xs text-muted">Every exercise tagged with this muscle shows up here automatically. Add more below.</p>
          )}

          {linked.length > 0 && (
            <ul className="divide-y divide-line">
              {linked.map(({ exercise, role }) => {
                const counts = role === 'main' || countedSecondaryMuscles(exercise, settings.countSecondary).includes(muscle)
                return (
                  <li key={exercise.id} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link to={`/exercise/${exercise.id}`} className="min-w-0 truncate text-sm font-medium">
                        {exercise.name}
                      </Link>
                      <span className={`shrink-0 text-xs ${role === 'main' ? 'font-semibold text-good' : 'text-muted'}`}>
                        {role === 'main' ? 'Main · 1 set' : counts ? 'Secondary · ½ set' : 'Secondary · not counted'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      {role === 'secondary' ? (
                        <>
                          <button className="chip text-xs" onClick={() => link(exercise, 'main')}>
                            Make main muscle
                          </button>
                          <button className="chip text-xs text-bad" onClick={() => unlink(exercise)}>
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-muted">Every exercise has one main muscle. Make another muscle main to change it.</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <button className="btn-primary w-full" onClick={() => setPicking(true)}>
            + Add exercise to {label(muscle)}
          </button>
          {message && <p className="text-sm text-muted">{message}</p>}
        </section>

        {custom && (
          <button className="btn-danger w-full" onClick={remove}>
            Delete muscle group
          </button>
        )}
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(e) => (linkedIds.has(e.id) ? setMessage(`${e.name} already works ${label(muscle)}.`) : setRoleFor(e))}
      />

      <Sheet open={roleFor !== null} onClose={() => setRoleFor(null)} title={roleFor?.name ?? ''}>
        {roleFor && (
          <div className="space-y-2">
            <p className="text-sm text-muted">How much does {roleFor.name} work {label(muscle)}?</p>
            <button className="btn-secondary w-full justify-between" onClick={() => link(roleFor, 'secondary')}>
              <span>Secondary muscle</span>
              <span className="text-sm font-normal text-muted">½ set each</span>
            </button>
            <button className="btn-secondary w-full justify-between" onClick={() => link(roleFor, 'main')}>
              <span>Main muscle</span>
              <span className="text-sm font-normal text-muted">1 set each · replaces {label(roleFor.primaryMuscle)}</span>
            </button>
            <p className="text-xs text-muted">
              If you choose main, {label(roleFor.primaryMuscle)} becomes a secondary muscle for this exercise.
            </p>
          </div>
        )}
      </Sheet>
    </div>
  )
}
