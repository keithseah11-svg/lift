import type { Key, ReactNode } from 'react'
import { ITEMS_BY_ID, type AvatarLook, type BodyType, type ShopItem, type Slot } from '../../domain/game/catalog'

/**
 * The lifter avatar: a chibi figure (big head, stubby limbs, soft outlines)
 * drawn in layers. Every clothing item is drawn from the same body
 * measurements, so items fit all four body types. viewBox 0 0 200 300,
 * centre line x = 100. Animations live in index.css (.av-*).
 */

interface Body {
  shoulder: number // shoulder width
  waist: number
  hip: number
  arm: number // arm thickness
  leg: number // leg thickness
}

const BODIES: Record<BodyType, Body> = {
  lean: { shoulder: 50, waist: 46, hip: 50, arm: 13, leg: 15 },
  athletic: { shoulder: 60, waist: 50, hip: 52, arm: 15, leg: 17 },
  muscular: { shoulder: 74, waist: 56, hip: 56, arm: 19, leg: 20 },
  curvy: { shoulder: 52, waist: 46, hip: 64, arm: 14, leg: 19 },
}

const CX = 100
const HEAD_CY = 98
const HEAD_RX = 58
const HEAD_RY = 54
const EYE_Y = 106
const SHOULDER_Y = 146
const WAIST_Y = 192
const HIP_Y = 210
const ARM_TOP = 154
const ARM_LEN = 42
const LEG_TOP = 204
const LEG_END = 242
const GROUND = 260

const INK = '#3a2e3f'
const OL = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const }

interface Geo extends Body {
  armX: [number, number] // shoulder x of left/right arm
  legX: [number, number] // centre x of left/right leg
}

function geometry(type: BodyType): Geo {
  const b = BODIES[type]
  const armOffset = b.shoulder / 2 - b.arm / 2 + 3
  const legOffset = Math.max(b.hip / 4, b.leg / 2 + 3)
  return { ...b, armX: [CX - armOffset, CX + armOffset], legX: [CX - legOffset, CX + legOffset] }
}

/** Rounded torso outline, grown by `pad` for clothes. `inset` cuts sleeveless arm holes. */
function torsoPath(g: Geo, pad = 0, bottom = HIP_Y, inset = 0): string {
  const s = g.shoulder / 2 + pad
  const w = g.waist / 2 + pad
  const h = g.hip / 2 + pad
  const top = SHOULDER_Y
  const mid = (top + WAIST_Y) / 2 + 8
  const lower = `Q ${CX + h} ${WAIST_Y + 6} ${CX + h} ${bottom - 6} Q ${CX + h} ${bottom} ${CX + h - 6} ${bottom} L ${CX - h + 6} ${bottom} Q ${CX - h} ${bottom} ${CX - h} ${bottom - 6} Q ${CX - h} ${WAIST_Y + 6} ${CX - w} ${WAIST_Y}`
  if (inset) {
    return `M ${CX - s + inset} ${top} L ${CX + s - inset} ${top} Q ${CX + w - 2} ${top + inset} ${CX + w} ${WAIST_Y} ${lower} Q ${CX - w + 2} ${top + inset} ${CX - s + inset} ${top} Z`
  }
  return `M ${CX - s} ${top + 12} Q ${CX - s} ${top} ${CX - s + 12} ${top} L ${CX + s - 12} ${top} Q ${CX + s} ${top} ${CX + s} ${top + 12} Q ${CX + w} ${mid} ${CX + w} ${WAIST_Y} ${lower} Q ${CX - w} ${mid} ${CX - s} ${top + 12} Z`
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
          {rect(0, 248, 200, 52, shade(main, -0.35))}
          {rect(20, 60, 160, 6, shade(main, 0.15), 3)}
          {rect(14, 46, 12, 34, accent, 3)}
          {rect(174, 46, 12, 34, accent, 3)}
          {rect(30, 248, 140, 2, shade(accent, -0.2))}
        </>
      )
    case 'bg-beach':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          <circle cx={164} cy={40} r={18} fill="#ffe27a" />
          {rect(0, 206, 200, 42, '#3aa3d9')}
          {rect(0, 244, 200, 56, accent)}
        </>
      )
    case 'bg-neon':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          {[40, 80, 120, 160].map((y) => rect(0, y, 200, 1.5, shade(accent, -0.3), 0, { key: y, opacity: 0.6 }))}
          <circle cx={100} cy={140} r={88} fill="none" stroke={accent} strokeWidth={4} opacity={0.85} />
          <circle cx={100} cy={140} r={94} fill="none" stroke="#4f8cff" strokeWidth={2} opacity={0.6} />
        </>
      )
    case 'bg-podium':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          <path d="M 100 0 L 40 300 L 160 300 Z" fill={shade(accent, -0.5)} opacity={0.35} />
          {rect(30, 258, 140, 42, accent, 4)}
          <text x={100} y={290} textAnchor="middle" fontSize={20} fontWeight={800} fill={shade(accent, -0.6)}>
            1
          </text>
        </>
      )
    case 'bg-iron':
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          <path d="M 0 300 L 0 210 Q 50 180 100 210 Q 150 240 200 200 L 200 300 Z" fill={accent} opacity={0.55} />
          <path d="M 0 300 L 0 246 Q 60 220 120 246 Q 160 262 200 240 L 200 300 Z" fill={shade(accent, -0.3)} opacity={0.8} />
        </>
      )
    default:
      return (
        <>
          {rect(0, 0, 200, 300, main)}
          <circle cx={100} cy={150} r={92} fill={accent} />
        </>
      )
  }
}

function drawBottom(item: ShopItem, g: Geo): ReactNode {
  const { main, accent } = item
  const [lx, rx] = g.legX
  const w = g.waist / 2 + 1
  if (item.style === 'shorts') {
    const ho = Math.max(g.hip / 2, rx - CX + g.leg / 2) + 4
    const hem = LEG_TOP + 20
    return (
      <>
        <path
          d={`M ${CX - w} ${WAIST_Y + 2} L ${CX + w} ${WAIST_Y + 2} Q ${CX + ho} ${WAIST_Y + 4} ${CX + ho} ${HIP_Y} L ${CX + ho + 1} ${hem} L ${CX + 2} ${hem} L ${CX} ${LEG_TOP + 10} L ${CX - 2} ${hem} L ${CX - ho - 1} ${hem} L ${CX - ho} ${HIP_Y} Q ${CX - ho} ${WAIST_Y + 4} ${CX - w} ${WAIST_Y + 2} Z`}
          fill={main}
          {...OL}
        />
        {rect(CX - ho - 1, hem - 5, ho - 3, 4, accent, 1)}
        {rect(CX + 4, hem - 5, ho - 3, 4, accent, 1)}
      </>
    )
  }
  const wd = item.style === 'leggings' ? g.leg + 2 : g.leg + 6
  const ho = Math.max(g.hip / 2 + 2, rx - CX + wd / 2)
  const end = LEG_END + 4
  return (
    <>
      <path
        d={`M ${CX - w} ${WAIST_Y + 2} L ${CX + w} ${WAIST_Y + 2} Q ${CX + ho} ${WAIST_Y + 4} ${CX + ho} ${HIP_Y} L ${rx + wd / 2} ${end} L ${rx - wd / 2} ${end} L ${CX + 1} ${LEG_TOP + 14} L ${CX - 1} ${LEG_TOP + 14} L ${lx + wd / 2} ${end} L ${lx - wd / 2} ${end} L ${CX - ho} ${HIP_Y} Q ${CX - ho} ${WAIST_Y + 4} ${CX - w} ${WAIST_Y + 2} Z`}
        fill={main}
        {...OL}
      />
      {item.style === 'joggers' && g.legX.map((x, i) => rect(x - wd / 2 - 1, end - 7, wd + 2, 8, shade(main, -0.25), 3, { key: i, ...OL }))}
      {item.style === 'trackpants' && (
        <path
          d={`M ${CX - ho + 3} ${HIP_Y} L ${lx - wd / 2 + 3} ${end - 1} M ${CX + ho - 3} ${HIP_Y} L ${rx + wd / 2 - 3} ${end - 1}`}
          stroke={accent}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
    </>
  )
}

function drawShoes(item: ShopItem, g: Geo): ReactNode {
  const { main, accent } = item
  return g.legX.map((x, i) => {
    const fx = x + (i === 0 ? -3 : 3)
    return (
      <g key={i}>
        {item.style === 'hightops' && rect(x - g.leg / 2 - 2, LEG_END - 10, g.leg + 4, 16, main, 5, OL)}
        <ellipse cx={fx} cy={LEG_END + 7} rx={g.leg / 2 + 7} ry={9} fill={main} {...OL} />
        {rect(fx - g.leg / 2 - 5, LEG_END + 11, g.leg + 10, 3.5, accent, 1.5)}
        {item.style === 'lifters' && rect(fx - g.leg / 2 - 1, LEG_END + 1, g.leg + 2, 3.5, '#eef1f6', 1.5)}
        {item.style === 'sneakers' && <path d={`M ${fx - 4} ${LEG_END + 4} L ${fx + 4} ${LEG_END + 8}`} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />}
      </g>
    )
  })
}

/** Body part of a top; sleeves are drawn with the arms so they swing together. */
function drawTop(item: ShopItem, g: Geo): ReactNode {
  const { main, accent } = item
  switch (item.style) {
    case 'tank':
    case 'stringer': {
      const stringer = item.style === 'stringer'
      return (
        <>
          <path d={torsoPath(g, 1, HIP_Y - 4, stringer ? 18 : 11)} fill={main} {...OL} />
          {rect(CX - g.hip / 2 + 2, HIP_Y - 10, g.hip - 4, 2.5, accent, 1)}
        </>
      )
    }
    case 'compression':
      return (
        <>
          <path d={torsoPath(g, 1, HIP_Y - 4)} fill={main} {...OL} />
          {rect(CX - g.shoulder / 2 + 4, SHOULDER_Y + 16, g.shoulder - 8, 3.5, accent, 1)}
        </>
      )
    case 'hoodie':
      return (
        <>
          <path d={torsoPath(g, 3, HIP_Y + 2)} fill={main} {...OL} />
          {rect(CX - g.waist / 2 + 4, 182, g.waist - 8, 16, shade(main, -0.15), 6, OL)}
          <path d={`M ${CX - 6} ${SHOULDER_Y + 6} L ${CX - 6} ${SHOULDER_Y + 24} M ${CX + 6} ${SHOULDER_Y + 6} L ${CX + 6} ${SHOULDER_Y + 24}`} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        </>
      )
    case 'jacket':
      return (
        <>
          <path d={torsoPath(g, 3, HIP_Y + 1)} fill={main} {...OL} />
          <path d={`M ${CX} ${SHOULDER_Y + 6} L ${CX} ${HIP_Y}`} stroke={accent} strokeWidth={2.5} />
          <path d={`M ${CX - g.shoulder / 2} ${SHOULDER_Y + 22} L ${CX - 4} ${SHOULDER_Y + 22} M ${CX + 4} ${SHOULDER_Y + 22} L ${CX + g.shoulder / 2} ${SHOULDER_Y + 22}`} stroke={accent} strokeWidth={3} />
        </>
      )
    default: // tee
      return <path d={torsoPath(g, 2, HIP_Y - 3)} fill={main} {...OL} />
  }
}

/** Hood behind the head. */
function drawTopBack(item: ShopItem, g: Geo): ReactNode {
  if (item.style !== 'hoodie') return null
  return <ellipse cx={CX} cy={SHOULDER_Y + 2} rx={g.shoulder / 2 + 8} ry={16} fill={shade(item.main, -0.2)} {...OL} />
}

/** Sleeve in arm coordinates: shoulder at (0, 0), hand at (0, ARM_LEN). */
function drawSleeve(item: ShopItem, a: number): ReactNode {
  const { main, accent } = item
  switch (item.style) {
    case 'tee':
      return rect(-(a + 7) / 2, -7, a + 7, 20, main, 8, OL)
    case 'compression':
      return rect(-(a + 3) / 2, -6, a + 3, ARM_LEN - 6, main, (a + 3) / 2, OL)
    case 'hoodie':
      return (
        <>
          {rect(-(a + 8) / 2, -7, a + 8, ARM_LEN - 1, main, 8, OL)}
          {rect(-(a + 8) / 2, ARM_LEN - 11, a + 8, 8, shade(main, -0.2), 3, OL)}
        </>
      )
    case 'jacket':
      return (
        <>
          {rect(-(a + 7) / 2, -7, a + 7, ARM_LEN - 2, main, 8, OL)}
          {rect(-(a + 7) / 2 + 1.5, 12, a + 4, 4, accent, 1)}
        </>
      )
    default:
      return null
  }
}

function drawWrists(item: ShopItem, a: number): ReactNode {
  return (
    <>
      {rect(-(a + 5) / 2, ARM_LEN - 14, a + 5, item.style === 'wraps' ? 12 : 8, item.main, 3, OL)}
      {item.style === 'wraps' && rect(-(a + 5) / 2 + 1, ARM_LEN - 9, a + 3, 2.5, item.accent)}
    </>
  )
}

function drawWaist(item: ShopItem, g: Geo): ReactNode {
  const w = g.waist + 10
  return (
    <>
      {rect(CX - w / 2, WAIST_Y - 7, w, 14, item.main, 4, OL)}
      {rect(CX - 8, WAIST_Y - 8, 16, 16, item.accent, 3, OL)}
      {rect(CX - 3, WAIST_Y - 3, 6, 6, item.main, 1)}
    </>
  )
}

function drawNeck(item: ShopItem): ReactNode {
  if (item.style === 'towel') {
    return (
      <>
        {rect(CX - 24, SHOULDER_Y, 15, 40, item.main, 6, OL)}
        {rect(CX + 9, SHOULDER_Y, 15, 48, item.main, 6, OL)}
        {rect(CX + 10, SHOULDER_Y + 38, 13, 3, item.accent)}
      </>
    )
  }
  return (
    <>
      <path d={`M ${CX - 22} ${SHOULDER_Y + 2} Q ${CX} ${SHOULDER_Y + 38} ${CX + 22} ${SHOULDER_Y + 2}`} fill="none" stroke={item.main} strokeWidth={3.5} strokeDasharray="3 1.5" />
      {item.style === 'platechain' ? (
        <>
          <circle cx={CX} cy={SHOULDER_Y + 22} r={8} fill={item.accent} stroke={item.main} strokeWidth={2.5} />
          <circle cx={CX} cy={SHOULDER_Y + 22} r={2.5} fill={item.main} />
        </>
      ) : (
        <circle cx={CX} cy={SHOULDER_Y + 20} r={5} fill={item.accent} stroke={item.main} strokeWidth={2} />
      )}
    </>
  )
}

function drawFace(item: ShopItem): ReactNode {
  const lens = (x: number) =>
    item.style === 'aviators' ? (
      <path key={x} d={`M ${x - 14} ${EYE_Y - 8} L ${x + 14} ${EYE_Y - 8} Q ${x + 14} ${EYE_Y + 12} ${x} ${EYE_Y + 12} Q ${x - 14} ${EYE_Y + 12} ${x - 14} ${EYE_Y - 8} Z`} fill={item.main} stroke={item.accent} strokeWidth={2.5} />
    ) : (
      rect(x - 14, EYE_Y - 9, 28, 18, item.main, 7, { key: x, ...OL })
    )
  return (
    <>
      {lens(CX - 20)}
      {lens(CX + 20)}
      <path d={`M ${CX - 6} ${EYE_Y - 4} L ${CX + 6} ${EYE_Y - 4}`} stroke={item.style === 'aviators' ? item.accent : INK} strokeWidth={2.5} />
      <path d={`M ${CX - 28} ${EYE_Y - 3} L ${CX - 22} ${EYE_Y - 7} M ${CX + 12} ${EYE_Y - 3} L ${CX + 18} ${EYE_Y - 7}`} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    </>
  )
}

function drawHead(item: ShopItem): ReactNode {
  const { main, accent } = item
  switch (item.style) {
    case 'headband':
      return (
        <>
          <path d={`M ${CX - 57} 82 Q ${CX} 62 ${CX + 57} 82 L ${CX + 57} 94 Q ${CX} 74 ${CX - 57} 94 Z`} fill={main} {...OL} />
          <path d={`M ${CX + 54} 86 q 12 4 14 18 M ${CX + 54} 88 q 6 8 4 20`} fill="none" stroke={main} strokeWidth={5} strokeLinecap="round" />
        </>
      )
    case 'cap':
      return (
        <>
          <path d={`M ${CX - 60} 86 C ${CX - 62} 20 ${CX + 62} 20 ${CX + 60} 86 Z`} fill={main} {...OL} />
          <ellipse cx={CX + 10} cy={86} rx={66} ry={9} fill={shade(main, -0.25)} {...OL} />
          <circle cx={CX} cy={38} r={4} fill={accent} />
          {rect(CX - 10, 56, 20, 13, accent, 3)}
        </>
      )
    case 'beanie':
      return (
        <>
          <path d={`M ${CX - 61} 90 C ${CX - 63} 16 ${CX + 63} 16 ${CX + 61} 90 Z`} fill={main} {...OL} />
          {rect(CX - 62, 78, 124, 16, accent, 7, OL)}
          <circle cx={CX} cy={30} r={10} fill={accent} {...OL} />
        </>
      )
    case 'headphones':
      return (
        <>
          <path d={`M ${CX - 62} 108 C ${CX - 70} 18 ${CX + 70} 18 ${CX + 62} 108`} fill="none" stroke={main} strokeWidth={7} />
          {rect(CX - 72, 92, 17, 30, accent, 7, OL)}
          {rect(CX + 55, 92, 17, 30, accent, 7, OL)}
        </>
      )
    case 'crown':
      return (
        <>
          <path d={`M ${CX - 30} 52 L ${CX - 34} 18 L ${CX - 16} 34 L ${CX} 10 L ${CX + 16} 34 L ${CX + 34} 18 L ${CX + 30} 52 Z`} fill={main} {...OL} />
          <circle cx={CX} cy={38} r={4} fill={accent} />
          <circle cx={CX - 17} cy={43} r={2.5} fill="#4f8cff" />
          <circle cx={CX + 17} cy={43} r={2.5} fill="#34c77b" />
        </>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------- body

function hairBack(style: AvatarLook['hairStyle'], color: string): ReactNode {
  switch (style) {
    case 'long':
      return rect(CX - 63, 70, 126, 108, color, 30, OL)
    case 'ponytail':
      return (
        <>
          <ellipse cx={CX + 62} cy={128} rx={14} ry={32} fill={color} transform={`rotate(-18 ${CX + 62} 128)`} {...OL} />
          <circle cx={CX + 54} cy={98} r={6} fill="#e47aa8" {...OL} />
        </>
      )
    case 'bun':
      return <circle cx={CX} cy={44} r={20} fill={color} {...OL} />
    case 'curly':
      return <ellipse cx={CX} cy={HEAD_CY - 4} rx={HEAD_RX + 8} ry={HEAD_RY + 6} fill={color} {...OL} />
    default:
      return null
  }
}

function hairFront(style: AvatarLook['hairStyle'], color: string): ReactNode {
  switch (style) {
    case 'short':
    case 'bun':
      return (
        <path
          d={`M ${CX - 59} 108 C ${CX - 64} 18 ${CX + 64} 18 ${CX + 59} 108 Q ${CX + 54} 84 ${CX + 40} 78 Q ${CX + 30} 88 ${CX + 18} 74 Q ${CX + 4} 88 ${CX - 10} 74 Q ${CX - 24} 88 ${CX - 36} 76 Q ${CX - 52} 84 ${CX - 59} 108 Z`}
          fill={color}
          {...OL}
        />
      )
    case 'buzz':
      return <path d={`M ${CX - 58} 98 C ${CX - 62} 22 ${CX + 62} 22 ${CX + 58} 98 Q ${CX + 50} 70 ${CX} 68 Q ${CX - 50} 70 ${CX - 58} 98 Z`} fill={color} opacity={0.85} />
    case 'curly':
      return (
        <g fill={color} {...OL}>
          {[-48, -30, -12, 6, 24, 42].map((dx) => (
            <circle key={dx} cx={CX + dx + 3} cy={66 - Math.cos((dx / 60) * 1.4) * 14} r={14} />
          ))}
        </g>
      )
    case 'long':
    case 'ponytail':
      return (
        <path
          d={`M ${CX - 60} 124 C ${CX - 68} 16 ${CX + 68} 16 ${CX + 60} 124 L ${CX + 50} 124 Q ${CX + 50} 86 ${CX + 22} 74 Q ${CX - 8} 92 ${CX - 38} 80 Q ${CX - 50} 96 ${CX - 50} 124 Z`}
          fill={color}
          {...OL}
        />
      )
    default: // bald: a little shine
      return <ellipse cx={CX - 22} cy={62} rx={12} ry={6} fill="#ffffff" opacity={0.3} transform={`rotate(-20 ${CX - 22} 62)`} />
  }
}

function drawEye(x: number): ReactNode {
  return (
    <g className="av-eye" key={x}>
      <ellipse cx={x} cy={EYE_Y} rx={6.5} ry={8.5} fill={INK} />
      <circle cx={x + 2} cy={EYE_Y - 3} r={2.6} fill="#ffffff" />
      <circle cx={x - 2} cy={EYE_Y + 3.5} r={1.2} fill="#ffffff" />
    </g>
  )
}

interface Props {
  look: AvatarLook
  /** Show this item instead of what's equipped in its slot (shop try-on). */
  preview?: ShopItem | null
  size?: number
  className?: string
  /** Idle animation: breathing, blinking, swaying arms. */
  animated?: boolean
  /** Happy hop (e.g. after buying something). Change `key` to replay it. */
  cheer?: boolean
}

export function Avatar({ look, preview, size = 200, className, animated = false, cheer = false }: Props) {
  const g = geometry(look.bodyType)
  const skin = look.skinTone
  const skinShade = shade(skin, -0.1)
  const itemIn = (slot: Slot): ShopItem | undefined => {
    if (preview?.slot === slot) return preview
    const id = look.equipped[slot]
    return id ? ITEMS_BY_ID.get(id) : undefined
  }
  const [bg, top, bottom, shoes, head, face, neck, waist, wrists] = (
    ['background', 'top', 'bottom', 'shoes', 'head', 'face', 'neck', 'waist', 'wrists'] as Slot[]
  ).map(itemIn)
  const classes = [className, animated && 'av-anim', cheer && 'av-cheer'].filter(Boolean).join(' ')

  return (
    <svg viewBox="0 0 200 300" width={size} height={(size * 3) / 2} className={classes} role="img" aria-label="Your lifter avatar">
      {bg ? drawBackground(bg) : rect(0, 0, 200, 300, 'var(--color-surface-2)')}
      <ellipse className="av-shadow" cx={CX} cy={GROUND} rx={46} ry={6} fill="#000000" opacity={0.2} />

      <g className="av-body">
        <g className="av-head">
          {hairBack(look.hairStyle, look.hairColor)}
          {top && drawTopBack(top, g)}
        </g>

        {/* legs */}
        {g.legX.map((x, i) => rect(x - g.leg / 2, LEG_TOP, g.leg, LEG_END - LEG_TOP + 4, skinShade, g.leg / 2, { key: i, ...OL }))}
        {shoes ? drawShoes(shoes, g) : g.legX.map((x, i) => <ellipse key={i} cx={x + (i ? 3 : -3)} cy={LEG_END + 6} rx={g.leg / 2 + 4} ry={7} fill={skin} {...OL} />)}

        {/* torso */}
        <path d={torsoPath(g)} fill={skin} {...OL} />
        {bottom && drawBottom(bottom, g)}
        {top && drawTop(top, g)}
        {waist && drawWaist(waist, g)}
        {neck && drawNeck(neck)}

        {/* arms, in front of the body so they can swing */}
        {g.armX.map((x, i) => (
          <g key={i} transform={`translate(${x} ${ARM_TOP}) rotate(${i === 0 ? 10 : -10})`}>
            <g className={i === 0 ? 'av-arm-l' : 'av-arm-r'}>
              {rect(-g.arm / 2, -6, g.arm, ARM_LEN + 2, skinShade, g.arm / 2, OL)}
              {top && drawSleeve(top, g.arm)}
              {wrists && drawWrists(wrists, g.arm)}
              <circle cx={0} cy={ARM_LEN} r={g.arm / 2 + 3} fill={skin} {...OL} />
            </g>
          </g>
        ))}

        {/* head */}
        <g className="av-head">
          <circle cx={CX - HEAD_RX + 2} cy={HEAD_CY + 10} r={9} fill={skinShade} {...OL} />
          <circle cx={CX + HEAD_RX - 2} cy={HEAD_CY + 10} r={9} fill={skinShade} {...OL} />
          <ellipse cx={CX} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill={skin} {...OL} />
          <ellipse cx={CX - 34} cy={EYE_Y + 14} rx={8} ry={5} fill="#ff7b93" opacity={0.4} />
          <ellipse cx={CX + 34} cy={EYE_Y + 14} rx={8} ry={5} fill="#ff7b93" opacity={0.4} />
          {drawEye(CX - 20)}
          {drawEye(CX + 20)}
          <path d={`M ${CX - 27} ${EYE_Y - 14} Q ${CX - 20} ${EYE_Y - 19} ${CX - 13} ${EYE_Y - 14} M ${CX + 13} ${EYE_Y - 14} Q ${CX + 20} ${EYE_Y - 19} ${CX + 27} ${EYE_Y - 14}`} fill="none" stroke={shade(look.hairColor, -0.1)} strokeWidth={3} strokeLinecap="round" />
          <path d={`M ${CX - 7} ${EYE_Y + 15} Q ${CX} ${EYE_Y + 25} ${CX + 7} ${EYE_Y + 15} Z`} fill="#8a3442" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          {hairFront(look.hairStyle, look.hairColor)}
          {face && drawFace(face)}
          {head && drawHead(head)}
        </g>
      </g>
    </svg>
  )
}
