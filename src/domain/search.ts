/**
 * Forgiving exercise search: ignores case, punctuation and spacing
 * ("t bar row" finds "T-Bar Row", "lat pull down" finds "Lat Pulldown"),
 * plurals ("rows", "triceps"/"tricep"), and one-letter typos in longer
 * words ("supportedd").
 */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean)
}

/** Levenshtein distance capped at 2 (we only care about 0 or 1). */
function closeEnough(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

function tokenMatches(q: string, n: string): boolean {
  if (n.startsWith(q)) return true // partial typing: "pull" → "pulldown"
  if (q.startsWith(n) && q.length - n.length <= 2) return true // plurals: "rows" → "row"
  if (n.startsWith(q.slice(0, -1)) && q.endsWith('s') && q.length > 3) return true // "triceps" vs "tricep"
  return q.length >= 5 && closeEnough(q, n.slice(0, q.length + 1)) // one typo
}

/**
 * 0 = best (name starts with the query), 1 = all words match, null = no match.
 */
export function matchScore(name: string, query: string): number | null {
  const q = tokens(query)
  if (q.length === 0) return 1
  const compactName = normalize(name).replace(/ /g, '')
  const compactQuery = q.join('')
  if (compactName.startsWith(compactQuery)) return 0
  if (compactName.includes(compactQuery)) return 1
  const nameTokens = tokens(name)
  return q.every((qt) => nameTokens.some((nt) => tokenMatches(qt, nt))) ? 1 : null
}

/** Filters and orders items by how well `name` matches; ties keep their order. */
export function searchByName<T>(items: T[], query: string, name: (item: T) => string): T[] {
  if (!query.trim()) return items
  return items
    .map((item, i) => ({ item, i, score: matchScore(name(item), query) }))
    .filter((x): x is { item: T; i: number; score: number } => x.score != null)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map((x) => x.item)
}
