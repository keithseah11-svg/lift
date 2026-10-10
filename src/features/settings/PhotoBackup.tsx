import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { saveFile } from '../../lib/share'

type State = { status: 'idle' } | { status: 'working'; label: string } | { status: 'ready'; data: Uint8Array; fileName: string }

/** Photos are too big for the Excel backup, so they export/import as a .zip of JPEGs. */
export function PhotoBackup() {
  const count = useLiveQuery(() => db.photos.count(), [])
  const [state, setState] = useState<State>({ status: 'idle' })
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const build = async () => {
    setMessage(null)
    setState({ status: 'working', label: 'Preparing…' })
    try {
      const { buildPhotoZip, photoZipFileName } = await import('../../lib/photoZip')
      const photos = await db.photos.toArray()
      const data = buildPhotoZip(
        await Promise.all(photos.map(async (p) => ({ date: p.date, pose: p.pose, data: new Uint8Array(await p.blob.arrayBuffer()) }))),
      )
      setState({ status: 'ready', data, fileName: photoZipFileName() })
    } catch (err) {
      setState({ status: 'idle' })
      setMessage({ ok: false, text: `Export failed: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  // Second tap: iOS only opens the share sheet straight from a tap.
  const save = async () => {
    if (state.status !== 'ready') return
    const result = await saveFile(new Blob([state.data as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), state.fileName, 'application/zip')
    if (result !== 'cancelled') setState({ status: 'idle' })
  }

  const importZip = async (file: File) => {
    setMessage(null)
    setState({ status: 'working', label: 'Importing…' })
    try {
      const { parsePhotoZip } = await import('../../lib/photoZip')
      const { photos, skipped } = parsePhotoZip(new Uint8Array(await file.arrayBuffer()))
      const existing = await db.photos.toArray()
      // Skip exact duplicates (same day, pose and size), so importing twice is harmless.
      const seen = new Set(existing.map((p) => `${p.date}|${p.pose}|${p.blob.size}`))
      let added = 0
      for (const p of photos) {
        const key = `${p.date}|${p.pose}|${p.data.length}`
        if (seen.has(key)) continue
        seen.add(key)
        const blob = new Blob([p.data as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' })
        const size = await imageSize(blob)
        await db.photos.add({ id: crypto.randomUUID(), date: p.date, pose: p.pose, blob, ...size, createdAt: Date.now() })
        added++
      }
      const dupes = photos.length - added
      setMessage({
        ok: true,
        text: `Imported ${added} photo${added === 1 ? '' : 's'}${dupes ? `, ${dupes} already here` : ''}${skipped.length ? `, ${skipped.length} file(s) not recognised` : ''}.`,
      })
    } catch (err) {
      setMessage({ ok: false, text: `Import failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setState({ status: 'idle' })
    }
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Progress photos backup</h2>
      <p className="text-sm text-muted">
        Photos aren't in the Excel file. Export them as a .zip of JPEGs ({count ?? 0} photo{count === 1 ? '' : 's'}). Importing adds
        photos and skips ones already here.
      </p>
      {state.status === 'ready' ? (
        <button className="btn-primary w-full" onClick={save}>
          Save {state.fileName}
        </button>
      ) : (
        <button className="btn-secondary w-full" disabled={!count || state.status === 'working'} onClick={build}>
          {state.status === 'working' ? state.label : 'Export photos (.zip)'}
        </button>
      )}
      <label className={`btn-secondary w-full cursor-pointer ${state.status === 'working' ? 'pointer-events-none opacity-50' : ''}`}>
        Import photos (.zip)
        <input
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void importZip(file)
          }}
        />
      </label>
      {message && <p className={`text-sm ${message.ok ? 'text-good' : 'text-bad'}`}>{message.text}</p>}
    </section>
  )
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    const bmp = await createImageBitmap(blob)
    const size = { width: bmp.width, height: bmp.height }
    bmp.close()
    return size
  } catch {
    return { width: 0, height: 0 }
  }
}
