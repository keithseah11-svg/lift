import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { allMuscles, muscleLabel, setCustomMuscles, type CustomMuscle, type Muscle } from '../domain/muscles'

interface MusclesValue {
  /** Built-in muscles followed by your own. */
  all: Muscle[]
  custom: CustomMuscle[]
  label: (m: Muscle) => string
}

const MusclesContext = createContext<MusclesValue | null>(null)

/**
 * Loads your custom muscle groups before the app renders, so every label
 * and list includes them from the first frame, and keeps them in sync.
 */
export function MusclesProvider({ children }: { children: ReactNode }) {
  const custom = useLiveQuery(() => db.muscles.toArray(), [])
  const value = useMemo(() => {
    if (!custom) return null
    setCustomMuscles(custom)
    return { all: allMuscles(), custom: [...custom].sort((a, b) => a.createdAt - b.createdAt), label: muscleLabel }
  }, [custom])
  if (!value) return null
  return <MusclesContext.Provider value={value}>{children}</MusclesContext.Provider>
}

/** Subscribe to the muscle list; components re-render when you add or remove a muscle. */
export function useMuscles(): MusclesValue {
  const v = useContext(MusclesContext)
  if (!v) throw new Error('useMuscles must be used inside MusclesProvider')
  return v
}
