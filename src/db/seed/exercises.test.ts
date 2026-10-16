import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from './exercises'
import { isBuiltinMuscle } from '../../domain/muscles'
import { normalize } from '../../domain/search'

describe('built-in exercise library', () => {
  it('has 174 exercises with unique ids and names', () => {
    expect(SEED_EXERCISES).toHaveLength(174)
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
