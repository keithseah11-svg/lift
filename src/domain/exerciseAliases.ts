/**
 * Nicknames and abbreviations people search for, keyed by built-in exercise
 * id, e.g. "SLDL" for Stiff Leg Deadlift. Only used for search.
 */
export const EXERCISE_ALIASES: Record<string, string[]> = {
  'stiff-leg-deadlift': ['SLDL', 'Stiff Legged Deadlift'],
  'db-stiff-leg-deadlift': ['SLDL', 'DB SLDL', 'Stiff Legged Deadlift'],
  rdl: ['RDL'],
  'db-rdl': ['RDL', 'DB RDL'],
  'smith-rdl': ['RDL'],
  'single-leg-rdl': ['SLRDL', 'Single Leg RDL'],
  ohp: ['OHP', 'Military Press', 'Strict Press'],
  'seated-ohp': ['OHP'],
  'bulgarian-split-squat': ['BSS', 'Split Squat'],
  'kelso-shrug': ['Chest Supported Shrug', 'Prone Shrug'],
  'kelso-shrug-barbell': ['Chest Supported Shrug', 'Prone Shrug'],
  'close-grip-bench': ['CGBP'],
  'skull-crusher': ['Lying Triceps Extension'],
  'glute-ham-raise': ['GHR'],
  'pec-deck': ['Chest Fly (Machine)', 'Butterfly'],
  'face-pull': ['Rope Face Pull'],
  'trap-bar-deadlift': ['Hex Bar Deadlift'],
}

export function exerciseSearchNames(e: { id: string; name: string }): string[] {
  return [e.name, ...(EXERCISE_ALIASES[e.id] ?? [])]
}
