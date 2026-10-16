import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { updateSettings, useSettings } from '../../db/settings'
import { setCountedSecondary } from '../../db/exercises'
import type { Exercise } from '../../db/types'
import { isBuiltinMuscle, muscleLabel, type Muscle } from '../../domain/muscles'
import { useMuscles } from '../../app/MusclesProvider'
import { Link } from 'react-router'
import { AddMuscleSheet } from './AddMuscleSheet'
import { countedSecondaryMuscles } from '../../domain/muscleSets'
import type { MuscleTarget, MuscleTargetOverrides, SetRange } from '../../domain/muscleTargets'
import { searchByName } from '../../domain/search'
import { PageHeader } from '../../components/PageHeader'
import { NumberField } from '../../components/NumberField'
import { exerciseSearchNames } from '../../domain/exerciseAliases'

const numberClass =
  'h-9 w-14 rounded-lg bg-surface-2 text-center font-semibold outline-none focus:ring-1 focus:ring-accent disabled:opacity-30'

/** Sets (or clears, with null) one muscle's own weekly target. */
export async function setMuscleTarget(current: MuscleTargetOverrides, m: Muscle, value: MuscleTarget | null) {
  const next: MuscleTargetOverrides = { ...current }
  if (value == null) delete next[m]
  else next[m] = value
  await updateSettings({ muscleTargets: next })
}

export function MuscleTargetsPage() {
  const settings = useSettings()
  const { all } = useMuscles()
  const [adding, setAdding] = useState(false)
  const defaults: SetRange = { min: settings.weeklySetMin, max: settings.weeklySetMax }
  const setOverride = (m: Muscle, value: MuscleTarget | null) => setMuscleTarget(settings.muscleTargets, m, value)

  return (
    <div className="pb-6">
      <PageHeader title="Muscle targets" back />
      <div className="space-y-5 px-4">
        <section className="card p-0">
          <div className="px-4 pt-4 pb-2">
            <h2 className="font-bold">Weekly sets per muscle</h2>
            <p className="text-xs text-muted">
              Default is {defaults.min}–{defaults.max} sets (change it in Settings). Type a number to give a muscle its own
              range, or switch tracking off for muscles you don’t want to target. Tap a muscle to see and change
              which exercises work it.
            </p>
            <button className="btn-primary mt-3 w-full" onClick={() => setAdding(true)}>
              + Add muscle group
            </button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_0.75rem_3.5rem_3rem] items-center gap-x-1.5 px-4 pb-1 text-[11px] font-medium text-muted uppercase">
            <span>Muscle</span>
            <span className="text-center">Min</span>
            <span />
            <span className="text-center">Max</span>
            <span className="text-center">Track</span>
          </div>
          <ul className="divide-y divide-line">
            {all.map((m) => (
              <MuscleRow key={m} muscle={m} override={settings.muscleTargets[m]} defaults={defaults} onChange={(v) => setOverride(m, v)} />
            ))}
          </ul>
        </section>

        <SecondarySection countSecondary={settings.countSecondary} />
      </div>
      <AddMuscleSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

export function MuscleRow({
  muscle,
  override,
  defaults,
  onChange,
  linked = true,
}: {
  muscle: Muscle
  override: MuscleTarget | undefined
  defaults: SetRange
  onChange: (value: MuscleTarget | null) => void
  /** Show the muscle name as a link to its page. */
  linked?: boolean
}) {
  const off = override === 'off'
  const custom = override != null && override !== 'off'
  const range = custom ? override : defaults

  const setMin = (v: number | null) => {
    if (v == null) return
    onChange({ min: v, max: Math.max(v, range.max) })
  }
  const setMax = (v: number | null) => {
    if (v == null || v < 1) return
    onChange({ min: Math.min(range.min, v), max: v })
  }

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_3.5rem_0.75rem_3.5rem_3rem] items-center gap-x-1.5 px-4 py-2">
      <div className="min-w-0">
        {linked ? (
          <Link to={`/settings/muscles/${muscle}`} className={`block truncate text-sm ${off ? 'text-muted' : 'text-accent'}`}>
            {muscleLabel(muscle)}
            {!isBuiltinMuscle(muscle) && <span className="ml-1 text-[10px] text-muted uppercase">yours</span>} ›
          </Link>
        ) : (
          <div className="text-sm font-medium">Weekly target</div>
        )}
        <div className="text-[11px] text-muted">
          {off ? (
            'Not tracked'
          ) : custom ? (
            <button className="text-accent" onClick={() => onChange(null)}>
              Custom · reset
            </button>
          ) : (
            'Default'
          )}
        </div>
      </div>
      <NumberField ariaLabel={`${muscleLabel(muscle)} minimum sets`} className={numberClass} value={off ? null : range.min} placeholder="–" onChange={setMin} />
      <span className="text-center text-muted">–</span>
      <NumberField ariaLabel={`${muscleLabel(muscle)} maximum sets`} className={numberClass} value={off ? null : range.max} placeholder="–" onChange={setMax} min={1} />
      <label className="flex justify-center">
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={!off}
          onChange={(e) => onChange(e.target.checked ? null : 'off')}
          aria-label={`Track ${muscleLabel(muscle)}`}
        />
      </label>
    </li>
  )
}

function SecondarySection({ countSecondary }: { countSecondary: boolean }) {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])
  const [query, setQuery] = useState('')

  const withSecondary = useMemo(() => (exercises ?? []).filter((e) => e.secondaryMuscles.length > 0), [exercises])
  const customised = withSecondary.filter((e) => e.countedSecondary != null)
  const results = query.trim() ? searchByName(withSecondary, query, exerciseSearchNames).slice(0, 25) : []

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Secondary muscles</h2>
      <p className="text-sm text-muted">
        A set always counts as 1 for the exercise’s main muscle. Secondary muscles (e.g. triceps on bench press) can add ½
        set each toward their own weekly target.
      </p>
      <label className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
        <span>
          <span className="block font-medium">Count secondary muscles</span>
          <span className="block text-xs text-muted">Default for every exercise</span>
        </span>
        <input
          type="checkbox"
          className="size-6 accent-accent"
          checked={countSecondary}
          onChange={(e) => updateSettings({ countSecondary: e.target.checked })}
        />
      </label>

      <div>
        <h3 className="mb-1 font-semibold">Per-exercise choices</h3>
        <p className="mb-2 text-xs text-muted">
          Override the default for a specific exercise: tap a muscle to include or exclude it. Highlighted = counts.
        </p>
        <input
          className="field"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search an exercise to change"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-line">
          {results.map((e) => (
            <ExerciseCreditRow key={e.id} exercise={e} countSecondary={countSecondary} />
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && <p className="text-sm text-muted">No exercises with secondary muscles match.</p>}

      {customised.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-muted">Customised ({customised.length})</h3>
          <ul className="divide-y divide-line">
            {customised.map((e) => (
              <ExerciseCreditRow key={e.id} exercise={e} countSecondary={countSecondary} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export function ExerciseCreditRow({ exercise, countSecondary }: { exercise: Exercise; countSecondary: boolean }) {
  const counted = countedSecondaryMuscles(exercise, countSecondary)
  const custom = exercise.countedSecondary != null

  const toggle = (m: Muscle) => {
    const next = counted.includes(m) ? counted.filter((x) => x !== m) : [...counted, m]
    // Keep the exercise's own muscle order so the stored choice is stable.
    void setCountedSecondary(exercise.id, exercise.secondaryMuscles.filter((x) => next.includes(x)))
  }

  return (
    <li className="py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium">{exercise.name}</span>
        {custom ? (
          <button className="shrink-0 text-xs text-accent" onClick={() => setCountedSecondary(exercise.id, null)}>
            Custom · reset
          </button>
        ) : (
          <span className="shrink-0 text-xs text-muted">Default</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{muscleLabel(exercise.primaryMuscle)} · 1</span>
        {exercise.secondaryMuscles.map((m) => {
          const on = counted.includes(m)
          return (
            <button
              key={m}
              className={`${on ? 'chip-active' : 'chip line-through decoration-muted/60'} text-xs`}
              onClick={() => toggle(m)}
              aria-pressed={on}
            >
              {muscleLabel(m)} · {on ? '½' : '0'}
            </button>
          )
        })}
      </div>
    </li>
  )
}
