import type { Key, ReactNode } from 'react'
import { ITEMS_BY_ID, type AvatarLook, type BodyType, type ShopItem, type Slot } from '../../domain/game/catalog'

/**
 * The lifter avatar: a flat cartoon figure drawn in layers. Every clothing
 * item is drawn from the same body measurements, so items fit all four
 * body types. viewBox 0 0 200 300, centre line x = 100.
 */

interface Body {
  shoulder: number // shoulder width
  waist: number
  hip: number
  arm: number // arm thickness
  leg: number // leg thickness
}

const BODIES: Record<BodyType, Body> = {
  lean: { shoulder: 56, waist: 40, hip: 46, arm: 12, leg: 16 },
  athletic: { shoulder: 66, waist: 44, hip: 48, arm: 15, leg: 18 },
  muscular: { shoulder: 80, waist: 50, hip: 52, arm: 19, leg: 22 },
  curvy: { shoulder: 58, waist: 42, hip: 62, arm: 13, leg: 21 },
}

const CX = 100
const SHOULDER_Y = 86
const WAIST_Y = 148
const HIP_Y = 170
const ARM_END = 192
const LEG_TOP = 162
const LEG_END = 270

interface Geo extends Body {
  armX: [number, number] // centre x of left/right arm
  legX: [number, number]
  torso: string // torso outline path
}

function geometry(type: BodyType): Geo {
  const b = BODIES[type]
  const armOffset = b.shoulder / 2 + b.arm / 2 - 3
  const legOffset = Math.max(b.hip / 4 + 2, b.leg / 2 + 3)
  const s = b.shoulder / 2
  const torso = `M ${CX - s} ${SHOULDER_Y + 6} Q ${CX - s} ${SHOULDER_Y} ${CX - s + 8} ${SHOULDER_Y} L ${CX + s - 8} ${SHOULDER_Y} Q ${CX + s} ${SHOULDER_Y} ${CX + s} ${SHOULDER_Y + 6} L ${CX + b.waist / 2} ${WAIST_Y} L ${CX + b.hip / 2} ${HIP_Y} L ${CX - b.hip / 2} ${HIP_Y} L ${CX - b.waist / 2} ${WAIST_Y} Z`
  return { ...b, armX: [CX - armOffset, CX + armOffset], legX: [CX - legOffset, CX + legOffset], torso }
}

/** Darken/lighten a hex colour by a factor (-1..1). */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra: Record<string, unknown> = {}) => {
  const { key, ...rest } = extra
  return <rect key={key as Key | undefined} x={x} y={y} width={w} height={h} rx={rx} fill={fill} {...rest} />
}

// ---------------------------------------------------------------- items

function drawBackground(item: ShopItem): ReactNode {
  const { main, accent } = item
  switch (item.style) {
    case 'bg-gym':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          {rect(0, 236, 200, 64, shade(main, -0.35))}
          {rect(20, 60, 160, 6, shade(main, 0.15), 3)}
          {rect(14, 46, 12, 34, accent, 3)}
          {rect(174, 46, 12, 34, accent, 3)}
          {rect(30, 236, 140, 2, shade(accent, -0.2))}
        </>
      )
    case 'bg-beach':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          <circle cx={160} cy={46} r={20} fill="#ffe27a" />
          {rect(0, 196, 200, 40, '#3aa3d9')}
          {rect(0, 232, 200, 68, accent)}
        </>
      )
    case 'bg-neon':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          {[40, 80, 120, 160].map((y) => rect(0, y, 200, 1.5, shade(accent, -0.3), 0, { key: y, opacity: 0.6 }))}
          <circle cx={100} cy={120} r={86} fill="none" stroke={accent} strokeWidth={4} opacity={0.85} />
          <circle cx={100} cy={120} r={92} fill="none" stroke="#4f8cff" strokeWidth={2} opacity={0.6} />
        </>
      )
    case 'bg-podium':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          <path d="M 100 0 L 40 300 L 160 300 Z" fill={shade(accent, -0.5)} opacity={0.35} />
          {rect(30, 262, 140, 38, accent, 4)}
          <text x={100} y={290} textAnchor="middle" fontSize={20} fontWeight={800} fill={shade(accent, -0.6)}>
            1
          </text>
        </>
      )
    case 'bg-iron':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          <path d="M 0 300 L 0 200 Q 50 170 100 200 Q 150 230 200 190 L 200 300 Z" fill={accent} opacity={0.55} />
          <path d="M 0 300 L 0 236 Q 60 210 120 236 Q 160 252 200 230 L 200 300 Z" fill={shade(accent, -0.3)} opacity={0.8} />
        </>
      )
    default:
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          <circle cx={100} cy={130} r={92} fill={accent} />
        </>
      )
  }
}

function drawBottom(item: ShopItem, g: Geo): ReactNode {
  const { main, accent } = item
  const outer = Math.max(g.hip / 2, g.legX[1] - CX + g.leg / 2) + 3
  if (item.style === 'shorts') {
    return (
      <>
        <path
          d={`M ${CX - g.waist / 2 - 2} ${WAIST_Y + 6} L ${CX + g.waist / 2 + 2} ${WAIST_Y + 6} L ${CX + outer} ${HIP_Y} L ${CX + outer + 1} 212 L ${CX + 3} 212 L ${CX} 192 L ${CX - 3} 212 L ${CX - outer - 1} 212 L ${CX - outer} ${HIP_Y} Z`}
          fill={main}
        />
        {rect(CX - outer - 1, 207, outer - 2, 5, accent, 1)}
        {rect(CX + 3, 207, outer - 2, 5, accent, 1)}
      </>
    )
  }
  const width = item.style === 'leggings' ? g.leg + 2 : g.leg + 6
  return (
    <>
      <path d={`M ${CX - g.waist / 2 - 2} ${WAIST_Y + 6} L ${CX + g.waist / 2 + 2} ${WAIST_Y + 6} L ${CX + outer} ${HIP_Y + 4} L ${CX - outer} ${HIP_Y + 4} Z`} fill={main} />
      {g.legX.map((x, i) => (
        <g key={i}>
          {rect(x - width / 2, LEG_TOP, width, LEG_END - LEG_TOP + 2, main, width / 3)}
          {item.style === 'joggers' && rect(x - width / 2, LEG_END - 6, width, 7, shade(main, -0.25), 3)}
          {item.style === 'trackpants' && rect(x + (i === 0 ? -width / 2 + 1 : width / 2 - 4), LEG_TOP + 6, 3, LEG_END - LEG_TOP - 6, accent)}
        </g>
      ))}
    </>
  )
}

function drawShoes(item: ShopItem, g: Geo): ReactNode {
  const { main, accent } = item
  return g.legX.map((x, i) => {
    const dir = i === 0 ? -1 : 1
    const fx = x + dir * 3
    return (
      <g key={i}>
        {item.style === 'hightops' && rect(x - g.leg / 2 - 1, LEG_END - 14, g.leg + 2, 16, main, 4)}
        <ellipse cx={fx} cy={LEG_END + 6} rx={g.leg / 2 + 6} ry={8} fill={main} />
        {rect(fx - g.leg / 2 - 6, LEG_END + 9, g.leg + 12, 4, item.style === 'lifters' ? accent : shade(accent, 0), 2)}
        {item.style === 'lifters' && rect(fx - g.leg / 2 - 2, LEG_END + 1, g.leg + 4, 3, '#eef1f6', 1.5)}
        {item.style === 'sneakers' && <path d={`M ${fx - 4} ${LEG_END + 2} L ${fx + 4} ${LEG_END + 6}`} stroke={accent} strokeWidth={2} strokeLinecap="round" />}
      </g>
    )
  })
}

function drawTop(item: ShopItem, g: Geo): ReactNode {
  const { main, accent } = item
  const sleeve = (len: number, extra = 6) =>
    g.armX.map((x, i) => rect(x - (g.arm + extra) / 2, SHOULDER_Y + 1, g.arm + extra, len, main, (g.arm + extra) / 2.5, { key: i }))
  const neckline = <path d={`M ${CX - 10} ${SHOULDER_Y} Q ${CX} ${SHOULDER_Y + 10} ${CX + 10} ${SHOULDER_Y}`} fill="none" stroke={accent} strokeWidth={2.5} />
  const torso = <path d={g.torso} fill={main} />

  switch (item.style) {
    case 'tank':
    case 'stringer': {
      const inset = item.style === 'stringer' ? 16 : 11
      const s = g.shoulder / 2
      return (
        <>
          <path
            d={`M ${CX - s + inset} ${SHOULDER_Y} L ${CX - 7} ${SHOULDER_Y} Q ${CX} ${SHOULDER_Y + (item.style === 'stringer' ? 22 : 12)} ${CX + 7} ${SHOULDER_Y} L ${CX + s - inset} ${SHOULDER_Y} L ${CX + g.waist / 2 + (item.style === 'stringer' ? -4 : 0)} ${WAIST_Y} L ${CX + g.hip / 2 - 1} ${HIP_Y - 2} L ${CX - g.hip / 2 + 1} ${HIP_Y - 2} L ${CX - g.waist / 2 - (item.style === 'stringer' ? -4 : 0)} ${WAIST_Y} Z`}
            fill={main}
          />
          <path d={`M ${CX - g.hip / 2 + 2} ${HIP_Y - 4} L ${CX + g.hip / 2 - 2} ${HIP_Y - 4}`} stroke={accent} strokeWidth={2} />
        </>
      )
    }
    case 'compression':
      return (
        <>
          {sleeve(ARM_END - SHOULDER_Y - 8, 2)}
          {torso}
          {neckline}
          <path d={`M ${CX - g.shoulder / 2 + 6} ${SHOULDER_Y + 18} L ${CX + g.shoulder / 2 - 6} ${SHOULDER_Y + 18}`} stroke={accent} strokeWidth={3} />
        </>
      )
    case 'hoodie':
      return (
        <>
          {sleeve(ARM_END - SHOULDER_Y - 6, 7)}
          {g.armX.map((x, i) => rect(x - (g.arm + 7) / 2, ARM_END - 12, g.arm + 7, 7, shade(main, -0.2), 3, { key: `c${i}` }))}
          {torso}
          {rect(CX - g.waist / 2 + 4, 126, g.waist - 8, 18, shade(main, -0.15), 6)}
          <path d={`M ${CX - 5} ${SHOULDER_Y + 4} L ${CX - 5} ${SHOULDER_Y + 24} M ${CX + 5} ${SHOULDER_Y + 4} L ${CX + 5} ${SHOULDER_Y + 24}`} stroke={accent} strokeWidth={2} strokeLinecap="round" />
          {rect(CX - g.hip / 2, HIP_Y - 7, g.hip, 7, shade(main, -0.2), 3)}
        </>
      )
    case 'jacket':
      return (
        <>
          {sleeve(ARM_END - SHOULDER_Y - 6, 6)}
          {g.armX.map((x, i) => rect(x - (g.arm + 6) / 2, SHOULDER_Y + 30, g.arm + 6, 3, accent, 1, { key: `s${i}` }))}
          {torso}
          <path d={`M ${CX} ${SHOULDER_Y + 4} L ${CX} ${HIP_Y - 2}`} stroke={accent} strokeWidth={2.5} />
          <path d={`M ${CX - 12} ${SHOULDER_Y - 2} L ${CX} ${SHOULDER_Y + 10} L ${CX + 12} ${SHOULDER_Y - 2}`} fill="none" stroke={accent} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M ${CX - g.shoulder / 2 + 4} ${SHOULDER_Y + 30} L ${CX - 4} ${SHOULDER_Y + 30} M ${CX + 4} ${SHOULDER_Y + 30} L ${CX + g.shoulder / 2 - 4} ${SHOULDER_Y + 30}`} stroke={accent} strokeWidth={3} />
        </>
      )
    default: // tee
      return (
        <>
          {sleeve(34)}
          {torso}
          {neckline}
        </>
      )
  }
}

function drawWaist(item: ShopItem, g: Geo): ReactNode {
  const w = g.waist + 10
  return (
    <>
      {rect(CX - w / 2, WAIST_Y - 6, w, 14, item.main, 3)}
      {rect(CX - 7, WAIST_Y - 7, 14, 16, item.accent, 2)}
      {rect(CX - 3, WAIST_Y - 3, 6, 8, item.main, 1)}
    </>
  )
}

function drawWrists(item: ShopItem, g: Geo): ReactNode {
  return g.armX.map((x, i) => (
    <g key={i}>
      {rect(x - g.arm / 2 - 2, ARM_END - 16, g.arm + 4, item.style === 'wraps' ? 12 : 8, item.main, 3)}
      {item.style === 'wraps' && rect(x - g.arm / 2 - 2, ARM_END - 12, g.arm + 4, 2, item.accent)}
    </g>
  ))
}

function drawNeck(item: ShopItem, g: Geo): ReactNode {
  if (item.style === 'towel') {
    const x = g.armX[1]
    return (
      <>
        {rect(CX + 4, SHOULDER_Y - 4, x - CX + 4, 10, item.main, 4)}
        {rect(x - 2, SHOULDER_Y - 2, 12, 44, item.main, 4)}
        {rect(x - 2, SHOULDER_Y + 34, 12, 3, item.accent)}
      </>
    )
  }
  return (
    <>
      <path d={`M ${CX - 14} ${SHOULDER_Y - 2} Q ${CX} ${SHOULDER_Y + 26} ${CX + 14} ${SHOULDER_Y - 2}`} fill="none" stroke={item.main} strokeWidth={3} strokeDasharray="2 1.5" />
      {item.style === 'platechain' ? (
        <>
          <circle cx={CX} cy={SHOULDER_Y + 16} r={7} fill={item.accent} stroke={item.main} strokeWidth={2} />
          <circle cx={CX} cy={SHOULDER_Y + 16} r={2} fill={item.main} />
        </>
      ) : (
        <circle cx={CX} cy={SHOULDER_Y + 14} r={4} fill={item.accent} stroke={item.main} strokeWidth={1.5} />
      )}
    </>
  )
}

function drawFace(item: ShopItem): ReactNode {
  const lens = (x: number) =>
    item.style === 'aviators' ? (
      <path key={x} d={`M ${x - 9} 46 L ${x + 9} 46 Q ${x + 9} 60 ${x} 60 Q ${x - 9} 60 ${x - 9} 46 Z`} fill={item.main} stroke={item.accent} strokeWidth={1.5} />
    ) : (
      rect(x - 9, 45, 18, 11, item.main, 4, { key: x })
    )
  return (
    <>
      {lens(CX - 10)}
      {lens(CX + 10)}
      <path d={`M ${CX - 2} 49 L ${CX + 2} 49`} stroke={item.style === 'aviators' ? item.accent : item.main} strokeWidth={2} />
    </>
  )
}

function drawHead(item: ShopItem): ReactNode {
  const { main, accent } = item
  switch (item.style) {
    case 'headband':
      return (
        <>
          {rect(CX - 26, 34, 52, 8, main, 3)}
          {rect(CX + 20, 36, 10, 14, main, 3)}
        </>
      )
    case 'cap':
      return (
        <>
          <path d={`M ${CX - 27} 40 Q ${CX - 27} 16 ${CX} 16 Q ${CX + 27} 16 ${CX + 27} 40 Z`} fill={main} />
          <ellipse cx={CX + 4} cy={40} rx={32} ry={5} fill={shade(main, -0.25)} />
          <circle cx={CX} cy={17} r={2.5} fill={accent} />
          {rect(CX - 6, 26, 12, 7, accent, 2)}
        </>
      )
    case 'beanie':
      return (
        <>
          <path d={`M ${CX - 27} 42 Q ${CX - 27} 12 ${CX} 12 Q ${CX + 27} 12 ${CX + 27} 42 Z`} fill={main} />
          {rect(CX - 28, 34, 56, 10, accent, 4)}
          <circle cx={CX} cy={11} r={6} fill={accent} />
        </>
      )
    case 'headphones':
      return (
        <>
          <path d={`M ${CX - 27} 52 Q ${CX - 30} 14 ${CX} 14 Q ${CX + 30} 14 ${CX + 27} 52`} fill="none" stroke={main} strokeWidth={5} />
          {rect(CX - 34, 42, 12, 20, accent, 5)}
          {rect(CX + 22, 42, 12, 20, accent, 5)}
        </>
      )
    case 'crown':
      return (
        <>
          <path d={`M ${CX - 22} 30 L ${CX - 24} 10 L ${CX - 12} 22 L ${CX} 6 L ${CX + 12} 22 L ${CX + 24} 10 L ${CX + 22} 30 Z`} fill={main} stroke={shade(main, -0.3)} strokeWidth={1.5} />
          <circle cx={CX} cy={22} r={3} fill={accent} />
          <circle cx={CX - 13} cy={25} r={2} fill="#4f8cff" />
          <circle cx={CX + 13} cy={25} r={2} fill="#34c77b" />
        </>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------- body

function hairBack(style: AvatarLook['hairStyle'], color: string): ReactNode {
  if (style === 'long') return rect(CX - 28, 36, 56, 64, color, 18)
  if (style === 'ponytail') return rect(CX + 18, 40, 12, 46, color, 6)
  return null
}

function hairFront(style: AvatarLook['hairStyle'], color: string): ReactNode {
  switch (style) {
    case 'short':
      return <path d={`M ${CX - 26} 46 Q ${CX - 28} 20 ${CX} 22 Q ${CX + 28} 20 ${CX + 26} 46 Q ${CX + 18} 32 ${CX} 34 Q ${CX - 18} 32 ${CX - 26} 46 Z`} fill={color} />
    case 'buzz':
      return <path d={`M ${CX - 25} 44 Q ${CX - 25} 24 ${CX} 24 Q ${CX + 25} 24 ${CX + 25} 44 Q ${CX} 32 ${CX - 25} 44 Z`} fill={color} opacity={0.75} />
    case 'curly':
      return (
        <g fill={color}>
          {[-22, -12, 0, 12, 22].map((dx) => (
            <circle key={dx} cx={CX + dx} cy={28 + Math.abs(dx) / 3} r={10} />
          ))}
          <circle cx={CX - 25} cy={42} r={7} />
          <circle cx={CX + 25} cy={42} r={7} />
        </g>
      )
    case 'long':
    case 'ponytail':
      return <path d={`M ${CX - 27} 50 Q ${CX - 30} 20 ${CX} 22 Q ${CX + 30} 20 ${CX + 27} 50 Q ${CX + 22} 30 ${CX} 32 Q ${CX - 22} 30 ${CX - 27} 50 Z`} fill={color} />
    case 'bun':
      return (
        <>
          <circle cx={CX} cy={20} r={10} fill={color} />
          <path d={`M ${CX - 26} 46 Q ${CX - 28} 22 ${CX} 24 Q ${CX + 28} 22 ${CX + 26} 46 Q ${CX + 18} 32 ${CX} 33 Q ${CX - 18} 32 ${CX - 26} 46 Z`} fill={color} />
        </>
      )
    default:
      return null
  }
}

interface Props {
  look: AvatarLook
  /** Show this item instead of what's equipped in its slot (shop try-on). */
  preview?: ShopItem | null
  size?: number
  className?: string
}

export function Avatar({ look, preview, size = 200, className }: Props) {
  const g = geometry(look.bodyType)
  const skin = look.skinTone
  const skinShade = shade(skin, -0.12)
  const itemIn = (slot: Slot): ShopItem | undefined => {
    if (preview?.slot === slot) return preview
    const id = look.equipped[slot]
    return id ? ITEMS_BY_ID.get(id) : undefined
  }
  const [bg, top, bottom, shoes, head, face, neck, waist, wrists] = (
    ['background', 'top', 'bottom', 'shoes', 'head', 'face', 'neck', 'waist', 'wrists'] as Slot[]
  ).map(itemIn)
  const hideHairTop = head && (head.style === 'cap' || head.style === 'beanie')

  return (
    <svg viewBox="0 0 200 300" width={size} height={(size * 3) / 2} className={className} role="img" aria-label="Your lifter avatar">
      {bg ? drawBackground(bg) : rect(0, 0, 200, 300, 'var(--color-surface-2)')}

      {hairBack(look.hairStyle, look.hairColor)}

      {/* legs */}
      {g.legX.map((x, i) => rect(x - g.leg / 2, LEG_TOP, g.leg, LEG_END - LEG_TOP + 4, skinShade, g.leg / 2, { key: i }))}
      {shoes ? drawShoes(shoes, g) : g.legX.map((x, i) => <ellipse key={i} cx={x + (i ? 3 : -3)} cy={LEG_END + 5} rx={g.leg / 2 + 3} ry={6} fill={skinShade} />)}
      {bottom && drawBottom(bottom, g)}

      {/* arms */}
      {g.armX.map((x, i) => (
        <g key={i}>
          {rect(x - g.arm / 2, SHOULDER_Y + 2, g.arm, ARM_END - SHOULDER_Y, skinShade, g.arm / 2)}
          <circle cx={x} cy={ARM_END + 4} r={g.arm / 2 + 2} fill={skin} />
        </g>
      ))}

      {/* torso and neck */}
      <path d={g.torso} fill={skin} />
      {rect(CX - 8, 66, 16, 24, skinShade, 4)}
      {top && drawTop(top, g)}
      {waist && drawWaist(waist, g)}
      {wrists && drawWrists(wrists, g)}
      {neck && drawNeck(neck, g)}

      {/* head */}
      <circle cx={CX} cy={50} r={26} fill={skin} />
      <circle cx={CX - 26} cy={52} r={5} fill={skinShade} />
      <circle cx={CX + 26} cy={52} r={5} fill={skinShade} />
      <circle cx={CX - 9} cy={50} r={3} fill="#1b1e25" />
      <circle cx={CX + 9} cy={50} r={3} fill="#1b1e25" />
      <path d={`M ${CX - 14} 42 L ${CX - 5} 41 M ${CX + 5} 41 L ${CX + 14} 42`} stroke={shade(look.hairColor, -0.1)} strokeWidth={2.5} strokeLinecap="round" />
      <path d={`M ${CX - 8} 62 Q ${CX} 68 ${CX + 8} 62`} fill="none" stroke="#7a3b2a" strokeWidth={2.5} strokeLinecap="round" />
      {!hideHairTop && hairFront(look.hairStyle, look.hairColor)}
      {face && drawFace(face)}
      {head && drawHead(head)}
    </svg>
  )
}
