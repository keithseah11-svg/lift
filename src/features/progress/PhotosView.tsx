import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { db } from '../../db/schema'
import { addPhoto, deletePhoto, updatePhoto } from '../../db/photos'
import type { ProgressPhoto } from '../../db/types'
import { POSES, POSE_LABELS, type Pose } from '../../domain/photos'
import { dayKey } from '../../domain/week'
import { compressPhoto } from '../../lib/image'
import { Sheet } from '../../components/Sheet'

/** Object URL for a stored blob, revoked when no longer shown. */
function usePhotoUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function PhotoImg({ photo, className }: { photo: ProgressPhoto; className?: string }) {
  const url = usePhotoUrl(photo.blob)
  return url ? (
    <img src={url} alt={`${POSE_LABELS[photo.pose]} photo, ${photo.date}`} className={className} draggable={false} />
  ) : (
    <div className={`${className} bg-surface-2`} />
  )
}

export function PhotosView() {
  const photos = useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), [])
  const [pose, setPose] = useState<Pose>('front')
  const [date, setDate] = useState(() => dayKey(new Date()))
  const [filter, setFilter] = useState<Pose | 'all'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)
  const [comparing, setComparing] = useState(false)

  if (!photos) return null

  const addFiles = async (files: FileList) => {
    setError(null)
    try {
      let n = 0
      for (const file of Array.from(files)) {
        setBusy(`Saving photo ${++n} of ${files.length}…`)
        await addPhoto(date, pose, await compressPhoto(file))
      }
    } catch (err) {
      setError(`Couldn't save that photo: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
    }
  }

  const shown = photos.filter((p) => filter === 'all' || p.pose === filter)
  const byDate = new Map<string, ProgressPhoto[]>()
  for (const p of shown) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p])

  return (
    <div className="space-y-3">
      <section className="card space-y-3">
        <h2 className="font-bold">Add progress photo</h2>
        <div className="flex flex-wrap gap-2">
          {POSES.map((p) => (
            <button key={p} className={pose === p ? 'chip-active' : 'chip'} onClick={() => setPose(p)}>
              {POSE_LABELS[p]}
            </button>
          ))}
        </div>
        <label className="block min-w-0">
          <span className="label">Date</span>
          <input type="date" className="field min-w-0 appearance-none py-2" value={date} max={dayKey(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <label className={`btn-primary w-full cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          {busy ?? '📷 Take or choose photo'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files
              if (files?.length) void addFiles(files)
              e.target.value = ''
            }}
          />
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        <p className="text-xs text-muted">
          Same spot, same light, same time of day makes comparisons honest. Photos stay on this phone and are resized to save space.
        </p>
      </section>

      {photos.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['all', ...POSES] as const).map((p) => (
            <button key={p} className={filter === p ? 'chip-active' : 'chip'} onClick={() => setFilter(p)}>
              {p === 'all' ? 'All' : POSE_LABELS[p]}
            </button>
          ))}
          <button className="btn-ghost ml-auto whitespace-nowrap" disabled={photos.length < 2} onClick={() => setComparing(true)}>
            Compare
          </button>
        </div>
      )}

      {photos.length === 0 && <div className="card text-center text-sm text-muted">No photos yet.</div>}

      {[...byDate.entries()].map(([d, items]) => (
        <section key={d}>
          <h3 className="mb-1.5 text-sm text-muted">{format(parseISO(d), 'EEE d MMM yyyy')}</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {items.map((p) => (
              <button key={p.id} className="relative overflow-hidden rounded-lg" onClick={() => setViewing(p)}>
                <PhotoImg photo={p} className="aspect-[3/4] w-full object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[11px] text-white">{POSE_LABELS[p.pose]}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <Sheet open={viewing !== null} onClose={() => setViewing(null)} title={viewing ? format(parseISO(viewing.date), 'd MMM yyyy') : ''}>
        {viewing && <PhotoDetail photo={viewing} onDone={() => setViewing(null)} />}
      </Sheet>

      <Sheet open={comparing} onClose={() => setComparing(false)} title="Compare">
        {comparing && <Compare photos={photos} />}
      </Sheet>
    </div>
  )
}

function PhotoDetail({ photo, onDone }: { photo: ProgressPhoto; onDone: () => void }) {
  const live = useLiveQuery(() => db.photos.get(photo.id), [photo.id]) ?? photo
  return (
    <div className="space-y-3">
      <PhotoImg photo={live} className="max-h-[60dvh] w-full rounded-xl object-contain" />
      <div className="flex flex-wrap gap-2">
        {POSES.map((p) => (
          <button key={p} className={live.pose === p ? 'chip-active' : 'chip'} onClick={() => updatePhoto(live.id, { pose: p })}>
            {POSE_LABELS[p]}
          </button>
        ))}
      </div>
      <input
        type="date"
        className="field min-w-0 appearance-none py-2"
        value={live.date}
        max={dayKey(new Date())}
        onChange={(e) => e.target.value && updatePhoto(live.id, { date: e.target.value })}
        aria-label="Photo date"
      />
      <button
        className="btn-danger w-full"
        onClick={async () => {
          if (!confirm('Delete this photo? This cannot be undone.')) return
          await deletePhoto(live.id)
          onDone()
        }}
      >
        Delete photo
      </button>
    </div>
  )
}

/** Side by side: defaults to your first and latest photo of the same pose. */
function Compare({ photos }: { photos: ProgressPhoto[] }) {
  const poses = POSES.filter((p) => photos.some((ph) => ph.pose === p))
  const [pose, setPose] = useState<Pose>(poses[0] ?? 'front')
  const ofPose = photos.filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  const [beforeId, setBeforeId] = useState<string | null>(null)
  const [afterId, setAfterId] = useState<string | null>(null)
  const before = ofPose.find((p) => p.id === beforeId) ?? ofPose[0]
  const after = ofPose.find((p) => p.id === afterId) ?? ofPose[ofPose.length - 1]

  const picker = (value: ProgressPhoto | undefined, onChange: (id: string) => void, label: string) => (
    <select className="field py-2 text-sm" value={value?.id ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {ofPose.map((p) => (
        <option key={p.id} value={p.id}>
          {format(parseISO(p.date), 'd MMM yyyy')}
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {poses.map((p) => (
          <button
            key={p}
            className={pose === p ? 'chip-active' : 'chip'}
            onClick={() => {
              setPose(p)
              setBeforeId(null)
              setAfterId(null)
            }}
          >
            {POSE_LABELS[p]}
          </button>
        ))}
      </div>
      {ofPose.length < 2 ? (
        <p className="text-sm text-muted">Add at least two {POSE_LABELS[pose].toLowerCase()} photos to compare.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {[
            { photo: before, set: setBeforeId, label: 'Before' },
            { photo: after, set: setAfterId, label: 'After' },
          ].map(({ photo, set, label }) => (
            <div key={label} className="min-w-0 space-y-1.5">
              <div className="text-xs text-muted">{label}</div>
              {picker(photo, set, `${label} photo`)}
              {photo && <PhotoImg photo={photo} className="aspect-[3/4] w-full rounded-lg object-cover" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
