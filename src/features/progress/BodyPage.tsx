import { useSearchParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { ProgressTabs } from './ProgressTabs'
import { WeightView } from './WeightView'
import { MeasurementsView } from './MeasurementsView'
import { PhotosView } from './PhotosView'

const VIEWS = [
  { key: 'weight', label: 'Weight' },
  { key: 'measurements', label: 'Measurements' },
  { key: 'photos', label: 'Photos' },
] as const

type View = (typeof VIEWS)[number]['key']

export function BodyPage() {
  const [params, setParams] = useSearchParams()
  const view = (VIEWS.find((v) => v.key === params.get('view'))?.key ?? 'weight') as View

  return (
    <div className="pb-6">
      <PageHeader title="Progress" />
      <ProgressTabs />
      <div className="space-y-3 px-4">
        <div className="flex gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={view === v.key ? 'chip-active' : 'chip'}
              onClick={() => setParams(v.key === 'weight' ? {} : { view: v.key }, { replace: true })}
            >
              {v.label}
            </button>
          ))}
        </div>
        {view === 'weight' && <WeightView />}
        {view === 'measurements' && <MeasurementsView />}
        {view === 'photos' && <PhotosView />}
      </div>
    </div>
  )
}
