import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

interface Props {
  title: ReactNode
  back?: boolean
  /** Where the back button goes; defaults to the previous screen. */
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
}

export function PageHeader({ title, back, onBack, backLabel = 'Back', right }: Props) {
  const navigate = useNavigate()
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4">
        {back && (
          <button className="btn-ghost -ml-2 text-lg" onClick={onBack ?? (() => navigate(-1))} aria-label={backLabel}>
            ‹
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{title}</h1>
        {right}
      </div>
    </header>
  )
}
