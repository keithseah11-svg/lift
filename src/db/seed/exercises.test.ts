import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from './exercises'
import { isBuiltinMuscle } from '../../domain/muscles'
import { normalize } from '../../domain/search'

describe('built-in exercise library', () => {
  it('has 177 exercises with unique ids and names', () => {
    expect(SEED_EXERCISES).toHaveLength(177)
    expect(new Set(SEED_EXERCISES.map((e) => e.id)).size).toBe(SEED_EXERCISES.length)
    expect(new Set(SEED_EXERCISES.map((e) => normalize(e.name))).size).toBe(SEED_EXERCISES.length)
  })

  it('uses only built-in muscles, never lists the main muscle as secondary', () => {
    for (const e of SEED_EXERCISES) {
      expect(isBuiltinMuscle(e.primaryMuscle), e.name).toBe(true)
      expect(e.secondaryMuscles.every(isBuiltinMuscle), e.name).toBe(true)
      expect(e.secondaryMuscles, e.name).not.toContain(e.primaryMuscle)
      expect(new Set(e.secondaryMuscles).size, e.name).toBe(e.secondaryMuscles.length)
    }
  })
})

describe('exercise aliases', () => {
  it('only reference real exercises and make abbreviations searchable', async () => {
    const { EXERCISE_ALIASES, exerciseSearchNames } = await import('../../domain/exerciseAliases')
    const { searchByName } = await import('../../domain/search')
    const ids = new Set(SEED_EXERCISES.map((e) => e.id))
    for (const id of Object.keys(EXERCISE_ALIASES)) expect(ids.has(id), id).toBe(true)
    const find = (q: string) => searchByName(SEED_EXERCISES, q, exerciseSearchNames).map((e) => e.name)
    expect(find('sldl').slice(0, 2).sort()).toEqual(['Stiff Leg Deadlift (Barbell)', 'Stiff Leg Deadlift (Dumbbell)'])
    expect(find('kelso')).toEqual(['Kelso Shrug (Dumbbell)', 'Kelso Shrug (Barbell)'])
    expect(find('ohp')[0]).toBe('Overhead Press (Barbell)')
    expect(find('bss')[0]).toBe('Bulgarian Split Squat (Dumbbell)')
    expect(find('cable crunches')[0]).toBe('Cable Crunch')
    expect(find('kneeling cable crunch')[0]).toBe('Cable Crunch')
    expect(find('rope crunch')[0]).toBe('Cable Crunch')
    expect(find('machine crunches')[0]).toBe('Crunch (Machine)')
    expect(find('ab crunch machine')[0]).toBe('Crunch (Machine)')
    expect(find('ab machine')[0]).toBe('Crunch (Machine)')
  })
})
