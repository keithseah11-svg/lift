import { useEffect, type ReactNode } from 'react'

/** Bottom sheet modal. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="pb-safe relative flex max-h-[90dvh] flex-col rounded-t-3xl bg-surface">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}
