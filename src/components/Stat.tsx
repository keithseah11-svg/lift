export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface py-2 text-center">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  )
}
