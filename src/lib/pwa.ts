import { registerSW } from 'virtual:pwa-register'

/**
 * Keeps the installed app current. An iPhone home-screen app usually resumes
 * from memory instead of reloading, so it would rarely look for a new version
 * on its own. We check whenever the app comes back to the foreground (and
 * every 30 min while open); when a new version is found the plugin
 * (registerType: 'autoUpdate') activates it and reloads the page. Data is
 * safe: everything is already saved in IndexedDB.
 */

const CHECK_EVERY_MS = 30 * 60 * 1000
let registration: ServiceWorkerRegistration | undefined

export const APP_VERSION = __APP_VERSION__

export function initPwa(): void {
  if (!('serviceWorker' in navigator)) return
  registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      if (!r) return
      registration = r
      const check = () => {
        if (navigator.onLine) r.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, CHECK_EVERY_MS)
    },
  })
}

/** Asks the server for a newer version. Resolves true if one is installing (the app then reloads). */
export async function checkForUpdate(): Promise<boolean> {
  if (!registration) return false
  await registration.update()
  return !!(registration.installing || registration.waiting)
}
