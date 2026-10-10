import { describe, expect, it } from 'vitest'
import { niceTicks } from './LineChart'

describe('niceTicks', () => {
  it('covers the full data range with round steps', () => {
    expect(niceTicks(93, 112)).toEqual([90, 100, 110, 120])
    for (const [lo, hi] of [[79.6, 82.4], [0.4, 7.9], [1200, 14850]]) {
      const ticks = niceTicks(lo, hi)
      expect(ticks[0]).toBeLessThanOrEqual(lo)
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(hi)
      const steps = ticks.slice(1).map((t, i) => Number((t - ticks[i]).toFixed(6)))
      expect(new Set(steps).size).toBe(1)
    }
    const t = niceTicks(80, 80)
    expect(t[0]).toBeLessThanOrEqual(80)
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(80)
  })
})
