import { useMemo, type ReactNode } from 'react'
import { ITEMS_BY_ID, type AvatarLook, type BodyType, type ShopItem, type Slot } from '../../domain/game/catalog'

/**
 * The lifter avatar: a pixel-art sprite on a 48 × 72 grid. Every part is a
 * pixel mask painted with a fill colour and a 1-pixel ink outline (the
 * mask's own edge), then drawn as one SVG path per colour. Clothes are
 * built from the body's masks, so they fit all four body types.
 * Animations live in index.css (.av-*).
 */

const W = 48
const H = 72
const CX = 24 // centre line sits between pixel 23 and pixel 24
const INK = '#1b1820'

// ---------------------------------------------------------------- masks

type Mask = Set<number>
const idx = (x: number, y: number) => y * W + x

function maskWhere(test: (x: number, y: number) => boolean, x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1): Mask {
  const m: Mask = new Set()
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) if (test(x, y)) m.add(idx(x, y))
  }
  return m
}
const rectM = (x0: number, y0: number, x1: number, y1: number) => maskWhere(() => true, x0, y0, x1, y1)
const ellipseM = (cx: number, cy: number, rx: number, ry: number) =>
  maskWhere((x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1)
const union = (...ms: Mask[]): Mask => new Set(ms.flatMap((m) => [...m]))
const minus = (a: Mask, b: Mask): Mask => new Set([...a].filter((i) => !b.has(i)))
const where = (m: Mask, test: (x: number, y: number) => boolean): Mask => new Set([...m].filter((i) => test(i % W, Math.floor(i / W))))
const mirror = (m: Mask): Mask => new Set([...m].map((i) => idx(W - 1 - (i % W), Math.floor(i / W))))
const shift = (m: Mask, dx: number, dy: number): Mask =>
  new Set([...m].map((i) => [(i % W) + dx, Math.floor(i / W) + dy]).filter(([x, y]) => x >= 0 && x < W && y >= 0 && y < H).map(([x, y]) => idx(x, y)))
/** Grow a mask by one pixel in every direction (4-neighbours). */
const grow = (m: Mask): Mask => union(m, shift(m, 1, 0), shift(m, -1, 0), shift(m, 0, 1), shift(m, 0, -1))
const isEdge = (m: Mask, i: number) => {
  const x = i % W
  const y = Math.floor(i / W)
  return x === 0 || y === 0 || x === W - 1 || y === H - 1 || !m.has(i - 1) || !m.has(i + 1) || !m.has(i - W) || !m.has(i + W)
}
const inside = (m: Mask): Mask => new Set([...m].filter((i) => !isEdge(m, i)))
const dotsM = (pts: [number, number][]): Mask => new Set(pts.map(([x, y]) => idx(x, y)))
const symDots = (pts: [number, number][]): Mask => union(dotsM(pts), mirror(dotsM(pts)))

class Canvas {
  px: (string | undefined)[] = new Array(W * H)
  /** Fill a mask; its edge pixels get the ink colour (null = no outline). */
  paint(m: Mask, fill: string, ink: string | null = INK) {
    for (const i of m) this.px[i] = ink && isEdge(m, i) ? ink : fill
    return this
  }
  /** Darken whatever is already there (shadows). */
  darken(m: Mask, f: number) {
    for (const i of m) {
      const c = this.px[i]
      if (c?.startsWith('#')) this.px[i] = shade(c, -f)
    }
    return this
  }
  dots(m: Mask, color: string) {
    for (const i of m) this.px[i] = color
    return this
  }
  /** One path per colour, run-length encoded by row. */
  render(): ReactNode {
    const paths = new Map<string, string>()
    for (let y = 0; y < H; y++) {
      let x = 0
      while (x < W) {
        const c = this.px[idx(x, y)]
        if (!c) {
          x++
          continue
        }
        let len = 1
        while (x + len < W && this.px[idx(x + len, y)] === c) len++
        paths.set(c, (paths.get(c) ?? '') + `M${x} ${y}h${len}v1h-${len}z`)
        x += len
      }
    }
    return [...paths].map(([c, d]) => <path key={c} d={d} fill={c} />)
  }
}

/** Darken/lighten a hex colour by a factor (-1..1). */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1, 7), 16)
  const ch = (v: number) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// ---------------------------------------------------------------- body

const TORSO_TOP = 29
const TORSO_BOTTOM = 55
const FEET = 61

interface BodySpec {
  /** Torso half-width at key rows, interpolated in between. */
  profile: [number, number][]
  arm: number
}

const BODIES: Record<BodyType, BodySpec> = {
  lean: { profile: [[29, 5], [31, 7], [33, 8], [55, 9]], arm: 3 },
  athletic: { profile: [[29, 5], [31, 8], [34, 10], [48, 10], [55, 11]], arm: 4 },
  muscular: { profile: [[29, 6], [31, 10], [33, 13], [38, 13], [46, 10], [55, 11]], arm: 5 },
  curvy: { profile: [[29, 5], [31, 8], [35, 11], [46, 13], [52, 13], [55, 12]], arm: 4 },
}

interface Body {
  hw: (y: number) => number
  torso: Mask
  arms: [Mask, Mask]
  legs: [Mask, Mask]
  head: Mask
}

function buildBody(type: BodyType): Body {
  const { profile, arm } = BODIES[type]
  const hw = (y: number) => {
    if (y <= profile[0][0]) return profile[0][1]
    for (let k = 1; k < profile.length; k++) {
      const [y0, w0] = profile[k - 1]
      const [y1, w1] = profile[k]
      if (y <= y1) return Math.round(w0 + ((w1 - w0) * (y - y0)) / (y1 - y0))
    }
    return profile[profile.length - 1][1]
  }
  const torso = maskWhere((x, y) => x >= CX - hw(y) && x < CX + hw(y), 0, TORSO_TOP, W - 1, TORSO_BOTTOM)

  // Arms hug the body: one pixel outside its edge, `arm` pixels inside, so
  // their outline draws the arm line inside the silhouette (Charlie style).
  const armL = maskWhere((x, y) => {
    const edge = CX - hw(y)
    const x0 = edge - 1
    const x1 = edge + arm - 1
    const corner = y === 48 && (x === x0 || x === x1)
    return x >= x0 && x <= x1 && !corner
  }, 0, 31, W - 1, 48)

  // Stubby legs; the left one includes the centre column so the two share one seam.
  const legOut = hw(TORSO_BOTTOM) - 2
  const legL = maskWhere((x) => x >= CX - legOut && x <= CX, 0, TORSO_BOTTOM - 1, W - 1, FEET)
  const legR = mirror(legL)

  return { hw, torso, arms: [armL, mirror(armL)], legs: [legL, legR], head: ellipseM(CX, 21.5, 9.5, 8.8) }
}

function bodyDetails(type: BodyType, c: Canvas, skin: string) {
  const line = shade(skin, -0.45)
  if (type === 'muscular') {
    c.dots(symDots([[CX - 7, 36], [CX - 6, 37], [CX - 5, 37], [CX - 4, 37], [CX - 3, 37], [CX - 2, 36]]), line)
    c.dots(union(rectM(CX - 1, 40, CX - 1, 49), rectM(CX - 3, 42, CX + 2, 42), rectM(CX - 3, 45, CX + 2, 45)), line)
  } else if (type === 'curvy') {
    c.dots(symDots([[CX - 5, 44], [CX - 4, 45], [CX - 3, 46], [CX - 2, 46], [CX - 1, 46]]), line)
    c.dots(rectM(CX - 1, 49, CX, 49), line)
  } else {
    c.dots(rectM(CX - 1, 48, CX, 48), line)
  }
}

// ---------------------------------------------------------------- items

function drawBackground(c: Canvas, item: ShopItem | undefined) {
  const all = rectM(0, 0, W - 1, H - 1)
  if (!item) {
    c.paint(all, 'var(--color-surface-2)', null)
  } else {
    const { main, accent } = item
    c.paint(all, main, null)
    switch (item.style) {
      case 'bg-gym':
        c.paint(rectM(0, 60, W - 1, H - 1), shade(main, -0.35), null)
        c.paint(rectM(4, 10, 43, 11), shade(main, 0.25), null)
        c.paint(rectM(3, 6, 5, 15), accent)
        c.paint(rectM(42, 6, 44, 15), accent)
        break
      case 'bg-beach':
        c.paint(ellipseM(38, 10, 4, 4), '#ffe27a', null)
        c.paint(rectM(0, 46, W - 1, 56), '#3aa3d9', null)
        c.dots(where(rectM(0, 47, W - 1, 55), (x, y) => (x + y * 3) % 9 === 0), '#8fd0f2')
        c.paint(rectM(0, 57, W - 1, H - 1), accent, null)
        break
      case 'bg-neon':
        for (const y of [12, 24, 36, 48]) c.paint(rectM(0, y, W - 1, y), shade(accent, -0.5), null)
        c.paint(minus(ellipseM(CX, 36, 22.5, 22.5), ellipseM(CX, 36, 21.5, 21.5)), '#4f8cff', null)
        c.paint(minus(ellipseM(CX, 36, 20.5, 20.5), ellipseM(CX, 36, 19.5, 19.5)), accent, null)
        break
      case 'bg-podium':
        c.paint(maskWhere((x, y) => Math.abs(x + 0.5 - CX) < 6 + y * 0.25), '#2c2a22', null)
        c.paint(rectM(8, 62, 39, H - 1), accent)
        c.dots(union(rectM(23, 65, 24, 69), dotsM([[22, 66]]), rectM(22, 69, 25, 69)), shade(accent, -0.55))
        break
      case 'bg-iron':
        c.paint(maskWhere((x, y) => y > 46 + 4 * Math.sin(x / 6)), accent, null)
        c.paint(maskWhere((x, y) => y > 58 + 3 * Math.sin(x / 5 + 2)), shade(accent, -0.3), null)
        break
      default: // plain
        c.paint(ellipseM(CX, 38, 21, 21), accent, null)
        c.paint(rectM(0, 62, W - 1, H - 1), shade(main, -0.06), null)
    }
  }
  c.darken(ellipseM(CX, 62.5, 12, 1.4), 0.18)
}

function drawHairBack(c: Canvas, look: AvatarLook) {
  const color = look.hairColor
  switch (look.hairStyle) {
    case 'long':
      c.paint(where(ellipseM(CX, 26, 11.5, 14), (_, y) => y >= 18), color)
      break
    case 'ponytail':
      c.paint(ellipseM(35, 27, 2.8, 6), color)
      c.paint(rectM(33, 20, 34, 21), '#e47aa8')
      break
    case 'bun':
      c.paint(ellipseM(CX, 12, 3.5, 3.5), color)
      break
    case 'curly':
      c.paint(where(ellipseM(CX, 21, 11.5, 11), (_, y) => y <= 26), color)
      break
  }
}

function drawShoes(c: Canvas, b: Body, item: ShopItem) {
  const top = item.style === 'hightops' ? 56 : 58
  for (const leg of b.legs) {
    const foot = where(grow(leg), (_, y) => y >= top && y <= FEET)
    c.paint(foot, item.main)
    c.dots(where(inside(foot), (_, y) => y === FEET - 1), item.accent)
    if (item.style === 'lifters') c.dots(where(inside(foot), (_, y) => y === 59), '#eef1f6')
  }
}

function drawBottom(c: Canvas, b: Body, item: ShopItem) {
  const { main, accent } = item
  const hip = where(b.torso, (_, y) => y >= 50)
  const legOut = b.hw(TORSO_BOTTOM) - 1
  if (item.style === 'shorts') {
    const m = union(hip, ...b.legs.map((l) => where(l, (_, y) => y <= 57)))
    c.paint(m, main)
    c.dots(where(inside(m), (_, y) => y === 56), accent)
    c.dots(rectM(CX - 1, 55, CX - 1, 57), INK)
    return
  }
  const m = union(hip, ...b.legs.map((l) => where(l, (_, y) => y <= 59)))
  c.paint(m, main)
  c.dots(rectM(CX - 1, 55, CX - 1, 59), INK)
  if (item.style === 'joggers') c.dots(where(inside(m), (_, y) => y === 58), shade(main, -0.3))
  if (item.style === 'trackpants') c.dots(symDots([...Array(8)].map((_, k) => [CX - legOut + 1, 51 + k] as [number, number])), accent)
}

function topMask(b: Body, item: ShopItem): Mask {
  const dx = (x: number) => Math.abs(x + 0.5 - CX)
  switch (item.style) {
    case 'tank':
      return where(b.torso, (x, y) => y <= 50 && !(y < 36 && dx(x) > b.hw(y) - 3))
    case 'stringer':
      return where(b.torso, (x, y) => y <= 50 && !(y < 34 && dx(x) > 3) && !(y < 41 && dx(x) > b.hw(y) - 4))
    case 'compression':
      return where(b.torso, (_, y) => y <= 51)
    case 'hoodie':
    case 'jacket':
      return where(grow(b.torso), (_, y) => y >= TORSO_TOP && y <= 52)
    default:
      return where(b.torso, (_, y) => y <= 50)
  }
}

function drawTop(c: Canvas, b: Body, item: ShopItem) {
  const { main, accent } = item
  const m = topMask(b, item)
  c.paint(m, main)
  const body = inside(m)
  switch (item.style) {
    case 'tank':
    case 'stringer':
      c.dots(where(body, (_, y) => y === 48), accent)
      break
    case 'compression':
      c.dots(where(body, (_, y) => y === 36), accent)
      break
    case 'hoodie':
      c.paint(rectM(CX - 4, 45, CX + 3, 49), shade(main, -0.15))
      c.dots(union(rectM(CX - 2, 31, CX - 2, 35), rectM(CX + 1, 31, CX + 1, 35)), accent)
      break
    case 'jacket':
      c.dots(where(body, (x, y) => x === CX - 1 && y > 31), accent)
      c.dots(where(body, (x, y) => y === 38 && x !== CX - 1), accent)
      break
    default:
      c.dots(where(body, (_, y) => y === 49), shade(main, -0.2))
  }
}

/** Hood bunched behind the neck, drawn before the torso. */
function drawHood(c: Canvas, b: Body, item: ShopItem) {
  if (item.style === 'hoodie') c.paint(ellipseM(CX, 30, b.hw(31) + 1.5, 3.5), shade(item.main, -0.2))
}

function drawSleeves(c: Canvas, b: Body, item: ShopItem) {
  for (const arm of b.arms) {
    switch (item.style) {
      case 'tee':
        c.paint(where(arm, (_, y) => y <= 37), item.main)
        break
      case 'compression':
        c.paint(where(arm, (_, y) => y <= 45), item.main)
        break
      case 'hoodie': {
        const s = where(grow(arm), (_, y) => y >= 31 && y <= 46)
        c.paint(s, item.main)
        c.dots(where(inside(s), (_, y) => y === 45), shade(item.main, -0.25))
        break
      }
      case 'jacket': {
        const s = where(grow(arm), (_, y) => y >= 31 && y <= 46)
        c.paint(s, item.main)
        c.dots(where(inside(s), (_, y) => y === 39), item.accent)
        break
      }
    }
  }
}

function drawWrists(c: Canvas, b: Body, item: ShopItem) {
  for (const arm of b.arms) {
    const band = where(grow(arm), (_, y) => y >= 43 && y <= (item.style === 'wraps' ? 46 : 45))
    c.paint(band, item.main)
    if (item.style === 'wraps') c.dots(where(inside(band), (_, y) => y === 45), item.accent)
  }
}

function drawWaist(c: Canvas, b: Body, item: ShopItem) {
  c.paint(where(grow(b.torso), (x, y) => y >= 46 && y <= 48 && x >= CX - b.hw(47) - 1 && x < CX + b.hw(47) + 1), item.main)
  c.paint(rectM(CX - 2, 45, CX + 1, 49), item.accent)
}

function drawNeck(c: Canvas, item: ShopItem) {
  switch (item.style) {
    case 'towel':
      c.paint(rectM(CX - 6, 30, CX - 4, 40), item.main)
      c.paint(rectM(CX + 3, 30, CX + 5, 43), item.main)
      c.dots(rectM(CX + 4, 41, CX + 4, 41), item.accent)
      break
    case 'platechain':
      c.dots(symDots([[CX - 5, 31], [CX - 4, 32], [CX - 3, 33], [CX - 2, 34]]), item.main)
      c.paint(rectM(CX - 2, 35, CX + 1, 38), item.accent, item.main)
      break
    default:
      c.dots(symDots([[CX - 5, 31], [CX - 4, 32], [CX - 3, 33], [CX - 2, 34], [CX - 1, 35]]), item.main)
      c.dots(rectM(CX - 1, 36, CX, 37), item.accent)
  }
}

function drawHairFront(c: Canvas, b: Body, look: AvatarLook) {
  const color = look.hairColor
  const head = b.head
  const dx = (x: number) => Math.abs(x + 0.5 - CX)
  switch (look.hairStyle) {
    case 'short':
    case 'bun':
      c.paint(where(head, (x, y) => y <= 16 || (y <= 19 && dx(x) > 6.5) || (y === 17 && dx(x) > 2)), color)
      break
    case 'buzz':
      c.paint(where(head, (_, y) => y <= 15), color)
      break
    case 'curly': {
      const curls = union(...[-8, -4, 0, 4, 8].map((d) => ellipseM(CX + d, 14 + Math.abs(d) / 3, 3, 3)))
      c.paint(union(where(head, (_, y) => y <= 16), where(curls, (_, y) => y <= 19)), color)
      break
    }
    case 'long':
    case 'ponytail':
      c.paint(where(head, (x, y) => y <= 16 || (y <= 17 && x < CX) || (look.hairStyle === 'long' && dx(x) > 7)), color)
      break
    default: // bald: a little shine
      c.dots(rectM(CX - 5, 15, CX - 4, 15), shade(look.skinTone, 0.5))
  }
}

function drawFace(c: Canvas, item: ShopItem) {
  const lens = rectM(CX - 6, 19, CX - 2, 22)
  const shaped = item.style === 'aviators' ? minus(lens, dotsM([[CX - 6, 22], [CX - 2, 22]])) : lens
  for (const m of [shaped, mirror(shaped)]) c.paint(m, item.main, item.style === 'aviators' ? item.accent : INK)
  c.dots(rectM(CX - 1, 20, CX, 20), item.style === 'aviators' ? item.accent : INK)
  c.dots(dotsM([[CX - 5, 20], [CX + 2, 20]]), shade(item.main, 0.6))
}

function drawHead(c: Canvas, b: Body, item: ShopItem) {
  const { main, accent } = item
  const big = grow(b.head)
  switch (item.style) {
    case 'headband':
      c.paint(where(big, (_, y) => y >= 15 && y <= 17), main)
      c.paint(dotsM([[34, 17], [35, 18], [35, 19], [34, 19], [36, 20]]), main, null)
      break
    case 'cap':
      c.paint(where(big, (_, y) => y <= 17), main)
      c.paint(rectM(CX - 9, 17, CX + 12, 18), shade(main, -0.3))
      c.dots(rectM(CX - 1, 14, CX, 15), accent)
      break
    case 'beanie':
      c.paint(where(big, (_, y) => y <= 18), main)
      c.paint(where(big, (_, y) => y >= 16 && y <= 18), accent)
      c.paint(ellipseM(CX, 10.5, 2.5, 2.5), accent)
      break
    case 'headphones':
      c.paint(where(minus(ellipseM(CX, 22, 11.6, 11), ellipseM(CX, 22, 10.4, 9.9)), (_, y) => y <= 20), main, null)
      c.paint(rectM(12, 19, 14, 25), accent)
      c.paint(rectM(33, 19, 35, 25), accent)
      break
    case 'crown': {
      const crown = union(rectM(CX - 6, 10, CX + 5, 13), rectM(CX - 6, 6, CX - 5, 9), rectM(CX - 1, 5, CX, 9), rectM(CX + 4, 6, CX + 5, 9))
      c.paint(crown, main)
      c.dots(rectM(CX - 1, 11, CX, 12), accent)
      c.dots(dotsM([[CX - 4, 11], [CX + 3, 11]]), '#4f8cff')
      break
    }
  }
}

// ---------------------------------------------------------------- sprite

interface Sprite {
  bg: ReactNode
  body: ReactNode
  arms: ReactNode
  head: ReactNode
  headTop: ReactNode
}

function buildSprite(look: AvatarLook, item: (slot: Slot) => ShopItem | undefined): Sprite {
  const b = buildBody(look.bodyType)
  const skin = look.skinTone
  const [top, bottom, shoes, head, face, neck, waist, wrists] = (['top', 'bottom', 'shoes', 'head', 'face', 'neck', 'waist', 'wrists'] as Slot[]).map(item)

  const bg = new Canvas()
  drawBackground(bg, item('background'))

  const body = new Canvas()
  drawHairBack(body, look)
  if (top) drawHood(body, b, top)
  for (const leg of b.legs) body.paint(leg, skin)
  body.paint(b.torso, skin)
  bodyDetails(look.bodyType, body, skin)
  if (shoes) drawShoes(body, b, shoes)
  if (bottom) drawBottom(body, b, bottom)
  if (top) drawTop(body, b, top)
  if (waist) drawWaist(body, b, waist)
  if (neck) drawNeck(body, neck)

  const arms = new Canvas()
  for (const arm of b.arms) arms.paint(arm, skin)
  if (top) drawSleeves(arms, b, top)
  if (wrists) drawWrists(arms, b, wrists)

  const headC = new Canvas()
  headC.paint(b.head, skin)
  headC.dots(rectM(CX - 1, 26, CX, 26), INK)
  drawHairFront(headC, b, look)

  const headTop = new Canvas()
  if (face) drawFace(headTop, face)
  if (head) drawHead(headTop, b, head)

  return { bg: bg.render(), body: body.render(), arms: arms.render(), head: headC.render(), headTop: headTop.render() }
}

const EYES_OPEN = <path d={`M${CX - 4} 20h1v3h-1zM${CX + 3} 20h1v3h-1z`} fill={INK} />
const EYES_CLOSED = <path d={`M${CX - 5} 22h2v1h-2zM${CX + 3} 22h2v1h-2z`} fill={INK} />
const EYES_HAPPY = <path d={`M${CX - 5} 22h1v1h-1zM${CX - 4} 21h1v1h-1zM${CX - 3} 22h1v1h-1zM${CX + 2} 22h1v1h-1zM${CX + 3} 21h1v1h-1zM${CX + 4} 22h1v1h-1z`} fill={INK} />

interface Props {
  look: AvatarLook
  /** Show this item instead of what's equipped in its slot (shop try-on). */
  preview?: ShopItem | null
  size?: number
  className?: string
  /** Idle animation: bobbing and blinking. */
  animated?: boolean
  /** Happy hop (e.g. after buying something). Change `key` to replay it. */
  cheer?: boolean
}

export function Avatar({ look, preview, size = 200, className, animated = false, cheer = false }: Props) {
  const sprite = useMemo(
    () =>
      buildSprite(look, (slot) => {
        if (preview?.slot === slot) return preview
        const id = look.equipped[slot]
        return id ? ITEMS_BY_ID.get(id) : undefined
      }),
    [look, preview],
  )
  const classes = [className, animated && 'av-anim', cheer && 'av-cheer'].filter(Boolean).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      className={classes}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Your lifter avatar"
    >
      {sprite.bg}
      <g className="av-char">
        {sprite.body}
        <g className="av-arms">{sprite.arms}</g>
        <g className="av-head">
          {sprite.head}
          {cheer ? (
            EYES_HAPPY
          ) : (
            <>
              <g className="av-eyes-open">{EYES_OPEN}</g>
              {animated && <g className="av-eyes-closed">{EYES_CLOSED}</g>}
            </>
          )}
          {sprite.headTop}
        </g>
      </g>
    </svg>
  )
}
