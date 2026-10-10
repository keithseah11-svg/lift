import type { SupersetInfo } from '../domain/supersets'

export function SupersetBadge({ info }: { info: SupersetInfo | undefined }) {
  if (!info?.groupId) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-text">
      🔗 Superset {info.label}
      {info.position === 'last' && <span className="font-normal text-muted">· rest after</span>}
    </span>
  )
}

/** Left accent bar marking cards that belong to a superset. */
export function supersetCardClass(info: SupersetInfo | undefined): string {
  return info?.groupId ? 'border-l-4 border-accent' : ''
}
