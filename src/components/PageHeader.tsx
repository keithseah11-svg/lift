import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

export function PageHeader({ title, back, right }: { title: ReactNode; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4">
        {back && (
          <button className="btn-ghost -ml-2 text-lg" onClick={() => navigate(-1)} aria-label="Back">
            ‹
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{title}</h1>
        {right}
      </div>
    </header>
  )
}
