import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * The timer stores when rest ends rather than counting down, so it stays
 * correct while iOS has the app suspended or the screen is locked.
 */
export interface RestTimerState {
  endsAt: number
  durationSec: number
}

const STORAGE_KEY = 'lift.restTimer'
const listeners = new Set<() => void>()
let state: RestTimerState | null = load()

function load(): RestTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RestTimerState) : null
  } catch {
    return null
  }
}

function set(next: RestTimerState | null) {
  state = next
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable; the timer still works for this session.
  }
  listeners.forEach((l) => l())
}

export function startRest(durationSec: number) {
  if (durationSec <= 0) return
  unlockAudio()
  set({ endsAt: Date.now() + durationSec * 1000, durationSec })
}

export function adjustRest(deltaSec: number) {
  if (!state) return
  const endsAt = state.endsAt + deltaSec * 1000
  if (endsAt <= Date.now()) return set(null)
  set({ endsAt, durationSec: Math.max(1, state.durationSec + deltaSec) })
}

export function stopRest() {
  set(null)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRestTimer(): RestTimerState | null {
  return useSyncExternalStore(subscribe, () => state)
}

/** Re-renders every `ms` while `active`. */
export function useNow(active: boolean, ms = 250): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return now
}

// --- Sound -----------------------------------------------------------------
// iOS only allows audio after a user gesture, so we create/resume the context
// when the user ticks a set, then reuse it for the end-of-rest chime.

let audio: AudioContext | null = null

export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

export function playChime() {
  if (!audio) return
  const t0 = audio.currentTime
  ;[0, 0.18, 0.36].forEach((offset, i) => {
    const osc = audio!.createOscillator()
    const gain = audio!.createGain()
    osc.type = 'sine'
    osc.frequency.value = i === 2 ? 1320 : 880
    gain.gain.setValueAtTime(0.0001, t0 + offset)
    gain.gain.exponentialRampToValueAtTime(0.4, t0 + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.16)
    osc.connect(gain).connect(audio!.destination)
    osc.start(t0 + offset)
    osc.stop(t0 + offset + 0.18)
  })
}
