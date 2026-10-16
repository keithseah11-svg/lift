import { describe, expect, it } from 'vitest'
import { exercisesForMuscle, findMuscleByName, linkPatch, newCustomMuscleId, unlinkPatch } from './muscleLinks'
import { isMuscleId, MUSCLE_LABELS, MUSCLES, type Muscle } from './muscles'

const hipAdd = 'custom-adductors-ab12' as const
const ex = (id: string, primaryMuscle: Muscle, secondaryMuscles: Muscle[] = [], countedSecondary?: Muscle[] | null) => ({
  id,
  primaryMuscle,
  secondaryMuscles,
  countedSecondary,
})

describe('muscle links', () => {
  const squat = ex('squat', 'quads', ['glutes', 'lower_back'])
  const rdl = ex('rdl', 'hamstrings', ['glutes'])
  const curl = ex('curl', 'biceps')

  it('lists exercises working a muscle with their role', () => {
    expect(exercisesForMuscle([squat, rdl, curl], 'glutes').map((x) => [x.exercise.id, x.role])).toEqual([
      ['squat', 'secondary'],
      ['rdl', 'secondary'],
    ])
    expect(exercisesForMuscle([squat, rdl, curl], 'biceps').map((x) => x.role)).toEqual(['main'])
  })

  it('links a new muscle as secondary', () => {
    expect(linkPatch(squat, hipAdd, 'secondary')).toEqual({ primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'lower_back', hipAdd], countedSecondary: undefined })
    // explicit secondary choices get the new muscle switched on
    expect(linkPatch(ex('x', 'quads', ['glutes'], []), hipAdd, 'secondary').countedSecondary).toEqual([hipAdd])
  })

  it('makes a muscle the main one, demoting the old main to secondary', () => {
    expect(linkPatch(squat, 'glutes', 'main')).toEqual({ primaryMuscle: 'glutes', secondaryMuscles: ['quads', 'lower_back'], countedSecondary: undefined })
    expect(linkPatch(ex('x', 'quads', ['glutes'], ['glutes']), hipAdd, 'main').countedSecondary).toEqual(['quads', 'glutes'])
  })

  it('unlinks secondary muscles but never the main one', () => {
    expect(unlinkPatch(squat, 'glutes')?.secondaryMuscles).toEqual(['lower_back'])
    expect(unlinkPatch(ex('x', 'quads', ['glutes'], ['glutes']), 'glutes')?.countedSecondary).toEqual([])
    expect(unlinkPatch(squat, 'quads')).toBeNull()
  })

  it('finds existing muscles by name, ignoring case and punctuation', () => {
    const label = (m: Muscle) => (m === hipAdd ? 'Adductors' : MUSCLE_LABELS[m as (typeof MUSCLES)[number]])
    const all: Muscle[] = [...MUSCLES, hipAdd]
    expect(findMuscleByName('front delts', all, label)).toBe('front_delts')
    expect(findMuscleByName('ADDUCTORS', all, label)).toBe(hipAdd)
    expect(findMuscleByName('Obliques', all, label)).toBeNull()
  })

  it('makes valid custom ids', () => {
    const id = newCustomMuscleId('Hip Adductors!', () => 0.5)
    expect(id).toMatch(/^custom-hip-adductors-[a-z0-9]{4}$/)
    expect(isMuscleId(id)).toBe(true)
  })
})
