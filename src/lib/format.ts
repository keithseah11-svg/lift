export function formatKg(kg: number): string {
  return `${Number(kg.toFixed(2))} kg`
}

export function formatVolume(kg: number): string {
  return `${Math.round(kg).toLocaleString()} kg`
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
