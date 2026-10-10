import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { db } from '../../db/schema'
import { deleteWeighIn, setWeighIn } from '../../db/bodyweight'
import { weeklyRate, withSevenDayAverage } from '../../domain/bodyweight'
import { dayKey } from '../../domain/week'
import { formatNumber } from '../../lib/format'
import { NumberField } from '../../components/NumberField'
import { LineChart } from '../../components/LineChart'

const RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
  { days: Infinity, label: 'All' },
]

export function WeightView() {
  const entries = useLiveQuery(() => db.bodyweight.orderBy('date').toArray(), [])
  const [date, setDate] = useState(() => dayKey(new Date()))
  const [kg, setKg] = useState<number | null>(null)
  const [range, setRange] = useState(90)

  if (!entries) return null

  const points = withSevenDayAverage(entries)
  const latest = points[points.length - 1]
  const rate = weeklyRate(points)
  const cutoff = range === Infinity ? '' : dayKey(Date.now() - range * 86400000)
  const visible = points.filter((p) => p.date >= cutoff)
  const existing = entries.find((e) => e.date === date)
  const x = (d: string) => parseISO(d).getTime()

  const save = async () => {
    if (kg == null || kg <= 0) return
    await setWeighIn(date, kg)
    setKg(null)
  }

  return (
    <div className="space-y-3">
        <section className="card space-y-3">
          <h2 className="font-bold">Log bodyweight</h2>
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-end gap-2">
            <label className="min-w-0">
              <span className="label">Date</span>
              <input type="date" className="field min-w-0 appearance-none py-2" value={date} max={dayKey(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
            <label>
              <span className="label">kg</span>
              <NumberField
                decimal
                className="field py-2 text-center font-semibold"
                value={kg}
                placeholder={existing ? formatNumber(existing.kg) : latest ? formatNumber(latest.kg) : '0'}
                onChange={setKg}
              />
            </label>
            <button className="btn-primary py-2" disabled={kg == null || kg <= 0} onClick={save}>
              {existing ? 'Update' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-muted">Weigh in at the same time each day (e.g. morning, after the bathroom) for the cleanest trend.</p>
        </section>

        {latest && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-surface px-3 py-2">
              <div className="text-xs text-muted">7-day average</div>
              <div className="text-xl font-semibold">{formatNumber(Math.round(latest.average * 10) / 10)} kg</div>
            </div>
            <div className="rounded-xl bg-surface px-3 py-2">
              <div className="text-xs text-muted">Trend</div>
              <div className="text-xl font-semibold">
                {rate == null ? '—' : `${rate > 0 ? '+' : rate < 0 ? '−' : ''}${formatNumber(Math.abs(Math.round(rate * 100) / 100))} kg/wk`}
              </div>
            </div>
          </div>
        )}

        {points.length > 0 && (
          <section className="card">
            <div className="mb-3 flex gap-2">
              {RANGES.map((r) => (
                <button key={r.label} className={range === r.days ? 'chip-active' : 'chip'} onClick={() => setRange(r.days)}>
                  {r.label}
                </button>
              ))}
            </div>
            <LineChart
              line={visible.map((p) => ({ x: x(p.date), y: Math.round(p.average * 100) / 100 }))}
              dots={visible.map((p) => ({ x: x(p.date), y: p.kg }))}
              formatY={(y) => formatNumber(Math.round(y * 10) / 10)}
              legend={{ line: '7-day average', dots: 'Daily weigh-in' }}
              describe={(i) => (
                <>
                  <div className="font-semibold text-text">{formatNumber(Math.round(visible[i].average * 10) / 10)} kg avg</div>
                  <div className="text-muted">weighed {formatNumber(visible[i].kg)} kg</div>
                </>
              )}
            />
          </section>
        )}

        {entries.length > 0 && (
          <section>
            <h2 className="mb-2 font-bold">Weigh-ins</h2>
            <ul className="card divide-y divide-line p-0">
              {[...points].reverse().slice(0, 60).map((p) => (
                <li key={p.date} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-sm">{format(parseISO(p.date), 'EEE d MMM yyyy')}</span>
                  <span className="font-semibold tabular-nums">{formatNumber(p.kg)} kg</span>
                  <button className="btn-ghost text-bad" onClick={() => deleteWeighIn(p.date)} aria-label={`Delete weigh-in on ${p.date}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
    </div>
  )
}
