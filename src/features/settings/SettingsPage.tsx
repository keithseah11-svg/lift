import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { updateSettings, useSettings } from '../../db/settings'
import { saveFile, XLSX_MIME } from '../../lib/share'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { NumberField } from '../../components/NumberField'
import { PhotoBackup } from './PhotoBackup'
import { AppVersion } from './AppVersion'

type ExportState = { status: 'idle' } | { status: 'building' } | { status: 'ready'; data: ArrayBuffer; fileName: string } | { status: 'error'; message: string }

export function SettingsPage() {
  const settings = useSettings()
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' })
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null))
  }, [])

  const buildBackup = async () => {
    setExportState({ status: 'building' })
    try {
      const { buildBackupWorkbook, backupFileName } = await import('../../lib/excel')
      setExportState({ status: 'ready', data: await buildBackupWorkbook(), fileName: backupFileName() })
    } catch (err) {
      setExportState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  // iOS only opens the share sheet from a direct tap, so saving is a second step.
  const saveBackup = async () => {
    if (exportState.status !== 'ready') return
    const result = await saveFile(exportState.data, exportState.fileName, XLSX_MIME)
    if (result !== 'cancelled') {
      await updateSettings({ lastBackupAt: Date.now() })
      setExportState({ status: 'idle' })
    }
  }

  const importBackup = async (file: File) => {
    setImportMessage(null)
    try {
      const { parseBackupWorkbook, restoreBackup } = await import('../../lib/excel')
      const backup = await parseBackupWorkbook(await file.arrayBuffer())
      const t = backup.tables
      const summary = `${t.workouts.length} workouts, ${t.sets.length} sets, ${t.routines.length} routines, ${t.macroEntries.length} food entries, ${t.bodyweight.length} weigh-ins, ${t.measurements.length} measurements`
      if (!confirm(`Restore ${summary}?\n\nThis REPLACES all data currently in the app.`)) return
      await restoreBackup(backup)
      setImportMessage({ ok: true, text: `Restored ${summary}.` })
    } catch (err) {
      setImportMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    }
  }

  const numberClass = 'h-10 w-20 rounded-lg bg-surface-2 text-center font-semibold outline-none focus:ring-1 focus:ring-accent'

  return (
    <div className="pb-6">
      <PageHeader title="Settings" back />
      <div className="space-y-5 px-4">
        <section className="card space-y-3">
          <h2 className="font-bold">Weekly goals</h2>
          <label className="flex items-center justify-between gap-3">
            <span>Sessions per week</span>
            <NumberField
              className={numberClass}
              value={settings.weeklySessionTarget}
              min={1}
              onChange={(v) => v != null && v >= 1 && updateSettings({ weeklySessionTarget: Math.min(v, 14) })}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Default min sets per muscle</span>
            <NumberField className={numberClass} value={settings.weeklySetMin} onChange={(v) => v != null && updateSettings({ weeklySetMin: v })} />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Default max sets per muscle</span>
            <NumberField
              className={numberClass}
              value={settings.weeklySetMax}
              min={1}
              onChange={(v) => v != null && v >= 1 && updateSettings({ weeklySetMax: v })}
            />
          </label>
          <p className="text-xs text-muted">
            10–20 hard sets per muscle per week suits most people; returns diminish above that. Muscles without their own
            target use this default.
          </p>
          <Link to="/settings/muscles" className="btn-secondary w-full justify-between">
            <span>Muscle targets & secondary muscles</span>
            <span className="text-sm font-normal text-muted">
              {Object.keys(settings.muscleTargets).length > 0 ? `${Object.keys(settings.muscleTargets).length} custom ›` : '›'}
            </span>
          </Link>
        </section>

        <section className="card space-y-3">
          <h2 className="font-bold">Backup (Excel)</h2>
          <p className="text-sm text-muted">
            Your data is stored only on this device. Export a backup regularly and keep it in Files or iCloud Drive.
            {settings.lastBackupAt && <> Last backup: {format(settings.lastBackupAt, 'd MMM yyyy, HH:mm')}.</>}
          </p>
          {exportState.status === 'ready' ? (
            <button className="btn-primary w-full" onClick={saveBackup}>
              Save {exportState.fileName}
            </button>
          ) : (
            <button className="btn-primary w-full" onClick={buildBackup} disabled={exportState.status === 'building'}>
              {exportState.status === 'building' ? 'Preparing…' : 'Export to Excel'}
            </button>
          )}
          {exportState.status === 'error' && <p className="text-sm text-bad">Export failed: {exportState.message}</p>}

          <label className="btn-secondary w-full cursor-pointer">
            Import from Excel backup
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void importBackup(file)
              }}
            />
          </label>
          {importMessage && <p className={`text-sm ${importMessage.ok ? 'text-good' : 'text-bad'}`}>{importMessage.text}</p>}
        </section>

        <PhotoBackup />

        <section className="card space-y-2 text-sm">
          <h2 className="font-bold">Storage</h2>
          <p className="text-muted">
            {persisted === true && 'Persistent storage is on: the browser won’t clear your data automatically.'}
            {persisted === false &&
              'Persistent storage is not granted. Add Lift to your Home Screen (Share → Add to Home Screen) and keep regular backups.'}
            {persisted === null && 'Storage status unavailable.'}
          </p>
        </section>

        <AppVersion />
      </div>
    </div>
  )
}
