import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { format } from 'date-fns'
import { buyItem, equipItem, updateLook, useGame, type GameState } from '../../db/game'
import { useSettings } from '../../db/settings'
import {
  BODY_TYPES,
  EYE_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  ITEMS,
  ITEMS_BY_ID,
  KG_PER_COIN,
  RARITY_LABELS,
  SKIN_TONES,
  SLOTS,
  type AvatarLook,
  type Rarity,
  type ShopItem,
  type Slot,
} from '../../domain/game/catalog'
import { ACHIEVEMENTS } from '../../domain/game/achievements'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { Avatar } from '../../components/avatar/Avatar'

type Tab = 'shop' | 'wardrobe' | 'achievements' | 'look'
const TABS: { key: Tab; label: string }[] = [
  { key: 'shop', label: 'Shop' },
  { key: 'wardrobe', label: 'Wardrobe' },
  { key: 'achievements', label: 'Awards' },
  { key: 'look', label: 'Look' },
]

/** Slots you can leave empty (you always keep bottoms on). */
const OPTIONAL_SLOTS: Slot[] = ['top', 'shoes', 'head', 'face', 'neck', 'waist', 'wrists', 'pet']

const RARITY_COLOR: Record<Rarity, string> = {
  starter: 'text-muted',
  common: 'text-muted',
  rare: 'text-accent',
  epic: 'text-[#b388ff]',
  legendary: 'text-warn',
  milestone: 'text-good',
}

export function AvatarPage() {
  const game = useGame()
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'shop') as Tab
  const [preview, setPreview] = useState<ShopItem | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // Bumped to replay the happy hop.
  const [cheers, setCheers] = useState(0)
  const [cheering, setCheering] = useState(false)
  const hopTimer = useRef<number | undefined>(undefined)
  const hop = () => {
    setCheers((n) => n + 1)
    setCheering(true)
    window.clearTimeout(hopTimer.current)
    hopTimer.current = window.setTimeout(() => setCheering(false), 1700)
  }

  if (!game) return null
  const { ledger, look } = game

  const switchTab = (t: Tab) => {
    setPreview(null)
    setMessage(null)
    setParams(t === 'shop' ? {} : { tab: t }, { replace: true })
  }

  const buy = async (item: ShopItem) => {
    const result = await buyItem(item.id)
    setMessage(result.ok ? `Bought ${item.name}! It’s on now.` : result.reason)
    if (result.ok) {
      setPreview(null)
      hop()
    }
  }

  return (
    <div className="pb-6">
      <PageHeader title="Profile" />
      <div className="space-y-3 px-4">
        <section className="card space-y-3">
          <button className="mx-auto block" onClick={hop} aria-label="Make your lifter jump">
            <Avatar key={cheers} look={look} preview={preview} size={170} animated cheer={cheering} className="block rounded-2xl" />
          </button>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold">
              🥔 {Math.max(0, ledger.balance)} <span className="text-base font-semibold text-muted">{Math.max(0, ledger.balance) === 1 ? 'potato' : 'potatoes'}</span>
            </div>
            <div className="text-sm text-muted">🏆 {game.unlocked.size}</div>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted">{ledger.kgToNextCoin.toLocaleString()} kg to the next potato</div>
            <ProgressBar value={KG_PER_COIN - ledger.kgToNextCoin} max={KG_PER_COIN} tone="warn" />
          </div>
          <p className="text-[11px] text-muted">
            1 potato per {KG_PER_COIN.toLocaleString()} kg lifted
            {settings.coinsSince ? ` since ${format(settings.coinsSince, 'd MMM yyyy')}` : ''}.
          </p>
        </section>

        <div className="grid grid-cols-4 rounded-xl bg-surface p-1 text-sm font-semibold">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`rounded-lg py-1.5 ${tab === t.key ? 'bg-surface-2 text-text' : 'text-muted'}`}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {message && <p className="rounded-xl bg-surface px-3 py-2 text-sm">{message}</p>}

        {tab === 'shop' && <Shop game={game} preview={preview} onPreview={setPreview} onBuy={buy} />}
        {tab === 'wardrobe' && <Wardrobe game={game} />}
        {tab === 'achievements' && <Awards game={game} />}
        {tab === 'look' && <Look look={look} />}
      </div>
    </div>
  )
}

function ItemCard({ item, look, label, active, onClick }: { item: ShopItem; look: AvatarLook; label: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`overflow-hidden rounded-xl bg-surface text-left ${active ? 'ring-2 ring-accent' : ''}`}>
      <Avatar look={look} preview={item} size={110} className="mx-auto block w-full" />
      <div className="px-2 py-1.5">
        <div className="truncate text-xs font-semibold">{item.name}</div>
        <div className="text-[11px]">{label}</div>
      </div>
    </button>
  )
}

function SlotFilter({ slot, onChange, slots }: { slot: Slot | 'all'; onChange: (s: Slot | 'all') => void; slots: Slot[] }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <button className={slot === 'all' ? 'chip-active' : 'chip'} onClick={() => onChange('all')}>
        All
      </button>
      {SLOTS.filter((s) => slots.includes(s.id)).map((s) => (
        <button key={s.id} className={slot === s.id ? 'chip-active' : 'chip'} onClick={() => onChange(s.id)}>
          {s.label}
        </button>
      ))}
    </div>
  )
}

function Shop({
  game,
  preview,
  onPreview,
  onBuy,
}: {
  game: GameState
  preview: ShopItem | null
  onPreview: (i: ShopItem | null) => void
  onBuy: (i: ShopItem) => void
}) {
  const [slot, setSlot] = useState<Slot | 'all'>('all')
  const forSale = ITEMS.filter((i) => i.price != null).sort((a, b) => a.price! - b.price!)
  const shown = forSale.filter((i) => slot === 'all' || i.slot === slot)
  const balance = Math.max(0, game.ledger.balance)

  return (
    <div className="space-y-3">
      <SlotFilter slot={slot} onChange={setSlot} slots={[...new Set(forSale.map((i) => i.slot))]} />
      <p className="text-xs text-muted">Tap an item to try it on.</p>
      <div className="grid grid-cols-3 gap-2">
        {shown.map((item) => {
          const own = game.owned.has(item.id)
          return (
            <ItemCard
              key={item.id}
              item={item}
              look={game.look}
              active={preview?.id === item.id}
              onClick={() => onPreview(preview?.id === item.id ? null : item)}
              label={
                own ? (
                  <span className="text-good">Owned</span>
                ) : (
                  <span className="flex justify-between">
                    <span className={RARITY_COLOR[item.rarity]}>{RARITY_LABELS[item.rarity]}</span>
                    <span className="font-semibold">🥔 {item.price}</span>
                  </span>
                )
              }
            />
          )
        })}
      </div>

      {preview && (
        <div className="sticky bottom-28 z-10 rounded-2xl border border-line bg-bg/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-semibold">{preview.name}</span>
            <span className={`text-xs ${RARITY_COLOR[preview.rarity]}`}>{RARITY_LABELS[preview.rarity]}</span>
          </div>
          {game.owned.has(preview.id) ? (
            <button className="btn-secondary w-full" onClick={() => equipItem(preview.slot, preview.id).then(() => onPreview(null))}>
              Wear it
            </button>
          ) : (
            <button className="btn-primary w-full" disabled={balance < preview.price!} onClick={() => onBuy(preview)}>
              {balance >= preview.price! ? `Buy for 🥔 ${preview.price}` : `Need 🥔 ${preview.price! - balance} more`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Wardrobe({ game }: { game: GameState }) {
  const [slot, setSlot] = useState<Slot | 'all'>('all')
  const ownedItems = ITEMS.filter((i) => game.owned.has(i.id))
  const shown = ownedItems.filter((i) => slot === 'all' || i.slot === slot)

  return (
    <div className="space-y-3">
      <SlotFilter slot={slot} onChange={setSlot} slots={[...new Set(ownedItems.map((i) => i.slot))]} />
      <p className="text-xs text-muted">Tap to wear; tap what you’re wearing to take it off.</p>
      <div className="grid grid-cols-3 gap-2">
        {shown.map((item) => {
          const wearing = game.look.equipped[item.slot] === item.id
          const removable = OPTIONAL_SLOTS.includes(item.slot)
          return (
            <ItemCard
              key={item.id}
              item={item}
              look={game.look}
              active={wearing}
              onClick={() => (wearing ? removable && equipItem(item.slot, null) : equipItem(item.slot, item.id))}
              label={wearing ? <span className="text-accent">Wearing{removable ? ' · tap to remove' : ''}</span> : <span className="text-muted">Tap to wear</span>}
            />
          )
        })}
      </div>
    </div>
  )
}

function Awards({ game }: { game: GameState }) {
  return (
    <ul className="space-y-2">
      {ACHIEVEMENTS.map((a) => {
        const reward = [...ITEMS_BY_ID.values()].find((i) => i.milestone === a.id)!
        const progress = Math.min(a.target, a.progress(game.stats))
        const done = game.unlocked.has(a.id)
        const wearing = game.look.equipped[reward.slot] === reward.id
        return (
          <li key={a.id} className={`card flex items-center gap-3 p-3 ${done ? '' : 'opacity-90'}`}>
            <Avatar look={game.look} preview={reward} size={64} className={`shrink-0 rounded-lg ${done ? '' : 'grayscale'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {done ? '🏆 ' : ''}
                  {a.name}
                </span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {Math.round(progress).toLocaleString()} / {a.target.toLocaleString()} {a.unit}
                </span>
              </div>
              <div className="text-xs text-muted">{a.description}</div>
              <div className="my-1.5">
                <ProgressBar value={progress} max={a.target} tone={done ? 'good' : 'accent'} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>
                  Reward: <span className="font-medium">{reward.name}</span>
                </span>
                {done && !wearing && (
                  <button className="btn-ghost py-0" onClick={() => equipItem(reward.slot, reward.id)}>
                    Wear
                  </button>
                )}
                {wearing && <span className="text-accent">Wearing</span>}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Look({ look }: { look: AvatarLook }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="label">Body type</h3>
        <div className="grid grid-cols-4 gap-2">
          {BODY_TYPES.map((b) => (
            <button
              key={b.id}
              className={`overflow-hidden rounded-xl bg-surface ${look.bodyType === b.id ? 'ring-2 ring-accent' : ''}`}
              onClick={() => updateLook({ bodyType: b.id })}
            >
              <Avatar look={{ ...look, bodyType: b.id }} size={80} className="mx-auto block w-full" />
              <div className="py-1 text-xs font-semibold">{b.label}</div>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3 className="label">Skin tone</h3>
        <div className="flex flex-wrap gap-2">
          {SKIN_TONES.map((c) => (
            <button
              key={c}
              aria-label={`Skin tone ${c}`}
              className={`size-10 rounded-full ${look.skinTone === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
              style={{ background: c }}
              onClick={() => updateLook({ skinTone: c })}
            />
          ))}
        </div>
      </section>
      <section>
        <h3 className="label">Hair</h3>
        <div className="flex flex-wrap gap-2">
          {HAIR_STYLES.map((h) => (
            <button key={h.id} className={look.hairStyle === h.id ? 'chip-active' : 'chip'} onClick={() => updateLook({ hairStyle: h.id })}>
              {h.label}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3 className="label">Hair colour</h3>
        <div className="flex flex-wrap gap-2">
          {HAIR_COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Hair colour ${c}`}
              className={`size-10 rounded-full ${look.hairColor === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
              style={{ background: c }}
              onClick={() => updateLook({ hairColor: c })}
            />
          ))}
        </div>
      </section>
      <section>
        <h3 className="label">Eye colour</h3>
        <div className="flex flex-wrap gap-2">
          {EYE_COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Eye colour ${c}`}
              className={`size-10 rounded-full ${look.eyeColor === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
              style={{ background: c }}
              onClick={() => updateLook({ eyeColor: c })}
            />
          ))}
        </div>
      </section>
      <p className="text-xs text-muted">Your look is free to change any time. Clothes come from the shop and awards.</p>
    </div>
  )
}
