import { useState } from 'react'
import { APP_VERSION, checkForUpdate } from '../../lib/pwa'

export function AppVersion() {
  const [status, setStatus] = useState<string | null>(null)

  const check = async () => {
    setStatus('Checking…')
    try {
      const found = await checkForUpdate()
      setStatus(found ? 'New version found. Lift will reload in a moment…' : 'You’re on the latest version.')
    } catch {
      setStatus('Couldn’t check. Are you online?')
    }
  }

  return (
    <section className="card space-y-2 text-sm">
      <h2 className="font-bold">App</h2>
      <div className="flex items-center justify-between">
        <span className="text-muted">Version</span>
        <span className="font-semibold tabular-nums">{APP_VERSION}</span>
      </div>
      <button className="btn-secondary w-full" onClick={check}>
        Check for updates
      </button>
      {status && <p className="text-muted">{status}</p>}
      <p className="text-xs text-muted">Lift updates itself when you open it. Your data stays on this phone either way.</p>
    </section>
  )
}
