import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, format, parseISO } from 'date-fns'
import { db } from '../../db/schema'
import { updateSettings, useSettings } from '../../db/settings'
import { addMacroEntry, addMealPreset, deleteMacroEntry, deleteMealPreset, logPreset } from '../../db/macros'
import type { MacroTarget } from '../../db/types'
import { dayKey } from '../../domain/week'
import { kcalFromMacros, remainingMacros, sumMacros } from '../../domain/macros'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { NumberField } from '../../components/NumberField'
import { Sheet } from '../../components/Sheet'

export function FoodPage() {
  const [date, setDate] = useState(() => dayKey(new Date()))
  const [targetsOpen, setTargetsOpen] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const settings = useSettings()
  const entries = useLiveQuery(async () => (await db.macroEntries.where('date').equals(date).toArray()).sort((a, b) => a.createdAt - b.createdAt), [date])
  const presets = useLiveQuery(() => db.mealPresets.orderBy('label').toArray(), [])

  const target = settings.macroTarget
  const eaten = sumMacros(entries ?? [])
  const left = remainingMacros(target, eaten)
  const isToday = date === dayKey(new Date())
  const shift = (days: number) => setDate(dayKey(addDays(parseISO(date), days)))

  return (
    <div className="pb-6">
      <PageHeader
        title="Food"
        right={
          <button className="btn-ghost" onClick={() => setTargetsOpen(true)}>
            Targets
          </button>
        }
      />
      <div className="space-y-3 px-4">
        <div className="flex items-center justify-between">
          <button className="btn-ghost text-xl" onClick={() => shift(-1)} aria-label="Previous day">
            ‹
          </button>
          <button className="font-semibold" onClick={() => setDate(dayKey(new Date()))}>
            {isToday ? 'Today' : format(parseISO(date), 'EEE d MMM yyyy')}
          </button>
          <button className="btn-ghost text-xl" onClick={() => shift(1)} aria-label="Next day">
            ›
          </button>
        </div>

        <section className="card space-y-4">
          <div className="text-center">
            <div className={`text-4xl font-bold tabular-nums ${left.kcal < 0 ? 'text-bad' : ''}`}>{Math.abs(Math.round(left.kcal))}</div>
            <div className="text-sm text-muted">
              kcal {left.kcal < 0 ? 'over' : 'left'} · {Math.round(eaten.kcal)} / {target.kcal} eaten
            </div>
          </div>
          {(
            [
              ['Protein', eaten.proteinG, target.proteinG, left.proteinG],
              ['Carbs', eaten.carbsG, target.carbsG, left.carbsG],
              ['Fat', eaten.fatG, target.fatG, left.fatG],
            ] as const
          ).map(([label, value, goal, remaining]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  {label} <span className="text-muted">{Math.round(value)} / {goal}g</span>
                </span>
                <span className={`font-semibold ${remaining < 0 ? 'text-bad' : ''}`}>
                  {Math.abs(Math.round(remaining))}g {remaining < 0 ? 'over' : 'left'}
                </span>
              </div>
              <ProgressBar value={value} max={goal} tone={remaining < 0 ? 'bad' : value >= goal * 0.9 ? 'good' : 'accent'} />
            </div>
          ))}
        </section>

        {presets && presets.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-bold">Quick add</h2>
              <button className="text-sm text-accent" onClick={() => setPresetsOpen(true)}>
                Edit
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p.id} className="chip text-text" onClick={() => logPreset(date, p)}>
                  + {p.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <AddEntryForm date={date} />

        {entries && entries.length > 0 && (
          <section>
            <h2 className="mb-2 font-bold">Logged</h2>
            <ul className="card divide-y divide-line p-0">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.label || 'Entry'}</div>
                    <div className="text-xs text-muted">
                      P {e.proteinG} · C {e.carbsG} · F {e.fatG} · {e.kcal} kcal
                    </div>
                  </div>
                  <button className="btn-ghost text-bad" onClick={() => deleteMacroEntry(e.id)} aria-label="Delete entry">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <TargetsSheet open={targetsOpen} onClose={() => setTargetsOpen(false)} target={target} />

      <Sheet open={presetsOpen} onClose={() => setPresetsOpen(false)} title="Quick-add meals">
        <ul className="divide-y divide-line">
          {presets?.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.label}</div>
                <div className="text-xs text-muted">
                  P {p.proteinG} · C {p.carbsG} · F {p.fatG} · {p.kcal} kcal
                </div>
              </div>
              <button className="btn-ghost text-bad" onClick={() => deleteMealPreset(p.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}

function AddEntryForm({ date }: { date: string }) {
  const [label, setLabel] = useState('')
  const [protein, setProtein] = useState<number | null>(null)
  const [carbs, setCarbs] = useState<number | null>(null)
  const [fat, setFat] = useState<number | null>(null)
  const [kcal, setKcal] = useState<number | null>(null)
  const [savePreset, setSavePreset] = useState(false)

  const autoKcal = kcalFromMacros(protein ?? 0, carbs ?? 0, fat ?? 0)
  const canAdd = protein != null || carbs != null || fat != null || kcal != null
  const field = 'h-11 w-full rounded-xl bg-surface-2 text-center font-semibold outline-none focus:ring-1 focus:ring-accent'

  const add = async () => {
    const macros = { proteinG: protein ?? 0, carbsG: carbs ?? 0, fatG: fat ?? 0, kcal: kcal ?? autoKcal }
    const name = label.trim()
    await addMacroEntry(date, name, macros)
    if (savePreset && name) await addMealPreset(name, macros)
    setLabel('')
    setProtein(null)
    setCarbs(null)
    setFat(null)
    setKcal(null)
    setSavePreset(false)
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Add food</h2>
      <input className="field" placeholder="What did you eat? (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <div className="grid grid-cols-4 gap-2 text-center">
        <label>
          <span className="label">Protein</span>
          <NumberField decimal className={field} value={protein} onChange={setProtein} placeholder="g" />
        </label>
        <label>
          <span className="label">Carbs</span>
          <NumberField decimal className={field} value={carbs} onChange={setCarbs} placeholder="g" />
        </label>
        <label>
          <span className="label">Fat</span>
          <NumberField decimal className={field} value={fat} onChange={setFat} placeholder="g" />
        </label>
        <label>
          <span className="label">kcal</span>
          <NumberField className={field} value={kcal} onChange={setKcal} placeholder={String(autoKcal)} />
        </label>
      </div>
      <p className="text-xs text-muted">Calories fill in from macros (4/4/9 per gram) unless you type them.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-5 accent-accent" checked={savePreset} onChange={(e) => setSavePreset(e.target.checked)} disabled={!label.trim()} />
        Save as quick-add meal
      </label>
      <button className="btn-primary w-full" disabled={!canAdd} onClick={add}>
        Add
      </button>
    </section>
  )
}

function TargetsSheet({ open, onClose, target }: { open: boolean; onClose: () => void; target: MacroTarget }) {
  const [draft, setDraft] = useState(target)
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setDraft(target)
  }

  const save = async () => {
    await updateSettings({ macroTarget: draft })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Daily targets">
      <div className="space-y-3">
        {(
          [
            ['proteinG', 'Protein (g)'],
            ['carbsG', 'Carbs (g)'],
            ['fatG', 'Fat (g)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="label">{label}</span>
            <NumberField
              className="field"
              value={draft[key]}
              onChange={(v) => setDraft((d) => ({ ...d, [key]: v ?? 0 }))}
            />
          </label>
        ))}
        <label className="block">
          <span className="label">Calories (kcal)</span>
          <NumberField className="field" value={draft.kcal} onChange={(v) => setDraft((d) => ({ ...d, kcal: v ?? 0 }))} />
        </label>
        <button
          className="btn-secondary w-full"
          onClick={() => setDraft((d) => ({ ...d, kcal: kcalFromMacros(d.proteinG, d.carbsG, d.fatG) }))}
        >
          Calculate kcal from macros ({kcalFromMacros(draft.proteinG, draft.carbsG, draft.fatG)})
        </button>
        <button className="btn-primary w-full" onClick={save}>
          Save targets
        </button>
      </div>
    </Sheet>
  )
}
