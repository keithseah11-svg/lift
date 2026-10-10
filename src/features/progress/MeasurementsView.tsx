import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { db } from '../../db/schema'
import { deleteMeasurement, setMeasurement } from '../../db/measurements'
import { MEASUREMENT_SITES, siteInfo, summarizeMeasurements, type MeasurementSite } from '../../domain/measurements'
import { dayKey } from '../../domain/week'
import { formatNumber } from '../../lib/format'
import { NumberField } from '../../components/NumberField'
import { LineChart } from '../../components/LineChart'

function signed(n: number | null, unit: string) {
  if (n == null) return '—'
  return `${n > 0 ? '+' : n < 0 ? '−' : '±'}${formatNumber(Math.abs(n))} ${unit}`
}

export function MeasurementsView() {
  const entries = useLiveQuery(() => db.measurements.orderBy('date').toArray(), [])
  const [date, setDate] = useState(() => dayKey(new Date()))
  const [site, setSite] = useState<MeasurementSite>('waist')
  const [value, setValue] = useState<number | null>(null)
  const [selected, setSelected] = useState<MeasurementSite | null>(null)

  if (!entries) return null

  const summary = summarizeMeasurements(entries)
  const active = selected ?? summary[0]?.site ?? null
  const activeEntries = entries.filter((e) => e.site === active)
  const existing = entries.find((e) => e.date === date && e.site === site)
  const last = [...entries].reverse().find((e) => e.site === site)

  const save = async () => {
    if (value == null || value <= 0) return
    await setMeasurement(date, site, value)
    setValue(null)
    setSelected(site)
  }

  return (
    <div className="space-y-3">
      <section className="card space-y-3">
        <h2 className="font-bold">Log a measurement</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0">
            <span className="label">Date</span>
            <input type="date" className="field min-w-0 appearance-none py-2" value={date} max={dayKey(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          <label className="min-w-0">
            <span className="label">Body part</span>
            <select className="field py-2" value={site} onChange={(e) => setSite(e.target.value as MeasurementSite)}>
              {MEASUREMENT_SITES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <label>
            <span className="label">{siteInfo(site).unit}</span>
            <NumberField
              decimal
              className="field py-2 text-center font-semibold"
              value={value}
              placeholder={existing ? formatNumber(existing.value) : last ? formatNumber(last.value) : '0'}
              onChange={setValue}
            />
          </label>
          <button className="btn-primary py-2" disabled={value == null || value <= 0} onClick={save}>
            {existing ? 'Update' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-muted">Measure relaxed, same time of day, tape snug but not tight. Every 2–4 weeks is plenty.</p>
      </section>

      {summary.length > 0 && (
        <section className="card p-0">
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem] gap-2 px-4 pt-3 pb-1 text-[11px] font-medium text-muted uppercase">
            <span>Part</span>
            <span className="text-right">Latest</span>
            <span className="text-right">Last</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-line">
            {summary.map((s) => {
              const unit = siteInfo(s.site).unit
              return (
                <li key={s.site}>
                  <button
                    className={`grid w-full grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem] items-center gap-2 px-4 py-2.5 text-left text-sm ${active === s.site ? 'bg-accent-soft' : ''}`}
                    onClick={() => setSelected(s.site)}
                  >
                    <span className="truncate">{siteInfo(s.site).label}</span>
                    <span className="text-right font-semibold tabular-nums">
                      {formatNumber(s.latest.value)} {unit}
                    </span>
                    <span className="text-right text-muted tabular-nums">{signed(s.sincePrevious, unit)}</span>
                    <span className="text-right text-muted tabular-nums">{signed(s.sinceFirst, unit)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="px-4 pt-1 pb-3 text-xs text-muted">Last = change since the previous reading. Total = since your first. Tap a row for its chart.</p>
        </section>
      )}

      {active && activeEntries.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-bold">{siteInfo(active).label}</h2>
          {activeEntries.length > 1 ? (
            <LineChart
              line={activeEntries.map((e) => ({ x: parseISO(e.date).getTime(), y: e.value }))}
              formatY={(y) => formatNumber(Math.round(y * 10) / 10)}
              height={160}
            />
          ) : (
            <p className="text-sm text-muted">Log this again later to see a trend.</p>
          )}
          <ul className="mt-3 divide-y divide-line">
            {[...activeEntries].reverse().map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <span className="flex-1 text-sm">{format(parseISO(e.date), 'EEE d MMM yyyy')}</span>
                <span className="font-semibold tabular-nums">
                  {formatNumber(e.value)} {siteInfo(e.site).unit}
                </span>
                <button className="btn-ghost text-bad" onClick={() => deleteMeasurement(e.id)} aria-label={`Delete ${siteInfo(e.site).label} on ${e.date}`}>
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
