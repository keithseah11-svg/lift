import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /**
   * Full-screen panel anchored to the top. Use for anything you type into:
   * on iPhone the keyboard covers the bottom of the screen, which would
   * hide a bottom sheet's inputs.
   */
  fullScreen?: boolean
}

/** Modal panel: a bottom sheet by default, or a full-screen page. */
export function Sheet({ open, onClose, title, children, fullScreen }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const header = (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <button className="btn-ghost" onClick={onClose}>
        {fullScreen ? 'Done' : 'Close'}
      </button>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="pt-safe fixed inset-0 z-50 mx-auto flex max-w-lg flex-col bg-surface" role="dialog" aria-label={title}>
        {header}
        <div className="pb-safe min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="pb-safe relative flex max-h-[90dvh] flex-col rounded-t-3xl bg-surface">
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}
