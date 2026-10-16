import { NavLink, Outlet } from 'react-router'
import { RestTimerBar } from '../components/RestTimerBar'
import { ActiveWorkoutBar } from '../components/ActiveWorkoutBar'

const TABS = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/train', label: 'Train', icon: '🏋️' },
  { to: '/plan', label: 'Plan', icon: '📅' },
  { to: '/food', label: 'Food', icon: '🍗' },
  { to: '/history', label: 'Progress', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '🧸' },
]

export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      {/* Room for the tab bar plus the rest timer and workout bars when they show. */}
      <main className="pb-48">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg">
        <RestTimerBar />
        <ActiveWorkoutBar />
        <nav className="pb-safe border-t border-line bg-bg/95 backdrop-blur">
          <ul className="grid grid-cols-6">
            {TABS.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.to === '/'}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`
                  }
                >
                  <span className="text-xl leading-none">{t.icon}</span>
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
