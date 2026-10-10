import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './schema'
import { DEFAULT_SETTINGS, type Settings } from './types'

const KEY = 'settings'

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get(KEY)
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db.transaction('rw', db.kv, async () => {
    const current = await getSettings()
    await db.kv.put({ key: KEY, value: { ...current, ...patch } })
  })
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS)
}
