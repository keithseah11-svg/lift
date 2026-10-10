import { NavLink } from 'react-router'

const TABS = [
  { to: '/history', label: 'Workouts' },
  { to: '/history/exercises', label: 'Exercises' },
  { to: '/history/body', label: 'Body' },
]

/** Segmented control shared by the three Progress screens. */
export function ProgressTabs() {
  return (
    <div className="mx-4 mb-3 grid grid-cols-3 rounded-xl bg-surface p-1 text-sm font-semibold">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          replace
          className={({ isActive }) => `rounded-lg py-1.5 text-center ${isActive ? 'bg-surface-2 text-text' : 'text-muted'}`}
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
