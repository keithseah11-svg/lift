/**
 * Supersets: consecutive exercises sharing a `supersetGroup` id are done
 * back-to-back, and rest only starts after the last exercise in the group.
 */

export interface Groupable {
  id: string
  order: number
  supersetGroup: string | null
}

export interface SupersetInfo {
  /** null when the exercise isn't in a superset */
  groupId: string | null
  /** 'A', 'B', … per superset in display order */
  label: string | null
  position: 'single' | 'first' | 'middle' | 'last'
}

function sorted<T extends Groupable>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order)
}

/**
 * Position of each item within its superset. Only consecutive items count
 * as the same superset, so a stray group id elsewhere can't link them.
 */
export function supersetLayout<T extends Groupable>(items: T[]): Map<string, SupersetInfo> {
  const list = sorted(items)
  const result = new Map<string, SupersetInfo>()
  let letter = 0
  for (let i = 0; i < list.length; ) {
    const g = list[i].supersetGroup
    let j = i + 1
    if (g) while (j < list.length && list[j].supersetGroup === g) j++
    if (!g || j - i < 2) {
      result.set(list[i].id, { groupId: null, label: null, position: 'single' })
      i++
      continue
    }
    const label = String.fromCharCode(65 + (letter++ % 26))
    for (let k = i; k < j; k++) {
      result.set(list[k].id, {
        groupId: g,
        label,
        position: k === i ? 'first' : k === j - 1 ? 'last' : 'middle',
      })
    }
    i = j
  }
  return result
}

/**
 * Link the item at `id` with the next one. Returns the group id each item
 * should now have (only items that change are included).
 */
export function linkWithNext<T extends Groupable>(items: T[], id: string, newGroupId: string): Map<string, string> {
  const list = sorted(items)
  const i = list.findIndex((x) => x.id === id)
  const next = list[i + 1]
  if (i < 0 || !next) return new Map()
  const group = list[i].supersetGroup ?? next.supersetGroup ?? newGroupId
  const changes = new Map<string, string>()
  // Merge the whole next run into this group, so A+B linked to C+D becomes one superset.
  const nextGroup = next.supersetGroup
  for (const x of list) {
    if (x === list[i] || x === next || (nextGroup && x.supersetGroup === nextGroup)) {
      if (x.supersetGroup !== group) changes.set(x.id, group)
    }
  }
  return changes
}

/**
 * Take one item out of its superset. If that leaves a single item behind,
 * that item is ungrouped too. Returns the ids whose group becomes null.
 */
export function unlink<T extends Groupable>(items: T[], id: string): string[] {
  const item = items.find((x) => x.id === id)
  if (!item?.supersetGroup) return []
  const rest = items.filter((x) => x.id !== id && x.supersetGroup === item.supersetGroup)
  return rest.length === 1 ? [id, rest[0].id] : [id]
}

/** Whether ticking a set on this exercise should start the rest timer. */
export function restsAfter(info: SupersetInfo | undefined): boolean {
  return !info || info.position === 'single' || info.position === 'last'
}

/** Items holding a group id that no longer forms a run of 2+ (e.g. after a move or removal). */
export function strayGroupIds<T extends Groupable>(items: T[]): string[] {
  const layout = supersetLayout(items)
  return items.filter((x) => x.supersetGroup && layout.get(x.id)?.position === 'single').map((x) => x.id)
}
