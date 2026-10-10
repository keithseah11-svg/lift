import { db } from './schema'
import { newId } from '../lib/id'
import type { MeasurementSite } from '../domain/measurements'

/** One reading per site per day: logging again the same day replaces it. */
export async function setMeasurement(date: string, site: MeasurementSite, value: number): Promise<void> {
  await db.transaction('rw', db.measurements, async () => {
    const existing = await db.measurements.where('date').equals(date).filter((m) => m.site === site).first()
    await db.measurements.put({ id: existing?.id ?? newId(), date, site, value })
  })
}

export async function deleteMeasurement(id: string): Promise<void> {
  await db.measurements.delete(id)
}
