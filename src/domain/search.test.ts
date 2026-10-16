import { describe, expect, it } from 'vitest'
import { matchScore, searchByName } from './search'

const NAMES = [
  'Chest Supported Row (Machine)',
  'Chest Supported Row (Dumbbell)',
  'T-Bar Row',
  'Iso-Lateral Pulldown (Machine)',
  'Lat Pulldown (Cable)',
  'Single Arm Triceps Pushdown (Cable)',
  'Triceps Pushdown (Cable)',
  'JM Press (Barbell)',
  'Bench Press (Barbell)',
]

const find = (q: string) => searchByName(NAMES, q, (n) => n)

describe('exercise search', () => {
  it('ignores punctuation and spacing', () => {
    expect(find('t bar row')).toEqual(['T-Bar Row'])
    expect(find('tbar')).toEqual(['T-Bar Row'])
    expect(find('iso lateral pulldown')[0]).toBe('Iso-Lateral Pulldown (Machine)')
    expect(find('lat pull down')).toContain('Lat Pulldown (Cable)')
  })

  it('handles plurals, singular "tricep" and small typos', () => {
    expect(find('chest supported rows')).toEqual(['Chest Supported Row (Machine)', 'Chest Supported Row (Dumbbell)'])
    expect(find('chest supportedd rows')).toHaveLength(2)
    expect(find('single arm tricep pushdown')).toEqual(['Single Arm Triceps Pushdown (Cable)'])
    expect(find('jm press')).toEqual(['JM Press (Barbell)'])
  })

  it('ranks names that start with the query first', () => {
    expect(find('triceps')[0]).toBe('Triceps Pushdown (Cable)')
    expect(find('press')).toEqual(['JM Press (Barbell)', 'Bench Press (Barbell)'])
  })

  it('does not match unrelated words', () => {
    expect(matchScore('Bench Press (Barbell)', 'squat')).toBeNull()
    expect(matchScore('Leg Press', 'chest')).toBeNull()
  })
})
