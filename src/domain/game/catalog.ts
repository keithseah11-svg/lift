/**
 * Avatar options and the item shop. Items are plain data; the Avatar
 * component turns each `style` into SVG.
 */

export const KG_PER_COIN = 10_000

export const BODY_TYPES = [
  { id: 'lean', label: 'Lean' },
  { id: 'athletic', label: 'Athletic' },
  { id: 'muscular', label: 'Muscular' },
  { id: 'curvy', label: 'Curvy' },
] as const
export type BodyType = (typeof BODY_TYPES)[number]['id']

export const SKIN_TONES = ['#f6d5b8', '#e8b48f', '#c98e66', '#a86b45', '#7a4a2c', '#4f2e1c', '#ffffff'] as const

export const HAIR_STYLES = [
  { id: 'short', label: 'Short' },
  { id: 'buzz', label: 'Buzz' },
  { id: 'curly', label: 'Curly' },
  { id: 'long', label: 'Long' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'bun', label: 'Bun' },
  { id: 'bald', label: 'Bald' },
] as const
export type HairStyle = (typeof HAIR_STYLES)[number]['id']

export const HAIR_COLORS = ['#1f1a17', '#5a3a22', '#a4462b', '#d8b25c', '#9a9a9a', '#4f8cff', '#e47aa8'] as const

export const EYE_COLORS = ['#5a3a22', '#2f6fd1', '#2e8b57', '#7b4fd6', '#c0392b', '#1f1a17'] as const

export const SLOTS = [
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Bottoms' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'head', label: 'Headwear' },
  { id: 'face', label: 'Eyewear' },
  { id: 'neck', label: 'Neck' },
  { id: 'waist', label: 'Belts' },
  { id: 'wrists', label: 'Wrists' },
  { id: 'pet', label: 'Pets' },
  { id: 'background', label: 'Backgrounds' },
] as const
export type Slot = (typeof SLOTS)[number]['id']

export type Rarity = 'starter' | 'common' | 'rare' | 'epic' | 'legendary' | 'milestone'

export const RARITY_LABELS: Record<Rarity, string> = {
  starter: 'Starter',
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  milestone: 'Achievement',
}

/** How each item is drawn. */
export type ItemStyle =
  | 'tee' | 'tank' | 'stringer' | 'compression' | 'hoodie' | 'jacket'
  | 'shorts' | 'joggers' | 'leggings' | 'trackpants'
  | 'sneakers' | 'hightops' | 'lifters'
  | 'headband' | 'cap' | 'beanie' | 'headphones' | 'crown'
  | 'shades' | 'aviators'
  | 'towel' | 'chain' | 'platechain'
  | 'belt'
  | 'sweatbands' | 'wraps'
  | 'pet-potato' | 'pet-chick' | 'pet-cat' | 'pet-dog' | 'pet-bunny' | 'pet-frog' | 'pet-penguin' | 'pet-panda' | 'pet-fox' | 'pet-dragon'
  | 'bg-plain' | 'bg-gym' | 'bg-beach' | 'bg-neon' | 'bg-podium' | 'bg-iron'

export interface ShopItem {
  id: string
  name: string
  slot: Slot
  style: ItemStyle
  main: string
  accent: string
  rarity: Rarity
  /** Coins to buy; undefined for starter and achievement items. */
  price?: number
  /** Achievement that unlocks it (achievement-only items). */
  milestone?: string
}

const item = (
  id: string,
  name: string,
  slot: Slot,
  style: ItemStyle,
  main: string,
  accent: string,
  rarity: Rarity,
  priceOrMilestone?: number | string,
): ShopItem => ({
  id,
  name,
  slot,
  style,
  main,
  accent,
  rarity,
  ...(typeof priceOrMilestone === 'number' ? { price: priceOrMilestone } : {}),
  ...(typeof priceOrMilestone === 'string' ? { milestone: priceOrMilestone } : {}),
})

export const ITEMS: ShopItem[] = [
  // Tops
  item('tee-grey', 'Basic Tee', 'top', 'tee', '#8b94a7', '#6b7385', 'starter'),
  item('tee-black', 'Black Tee', 'top', 'tee', '#22262f', '#3a404d', 'common', 3),
  item('tee-blue', 'Ocean Tee', 'top', 'tee', '#2f6fd1', '#1f4f9a', 'common', 3),
  item('tank-white', 'White Tank', 'top', 'tank', '#eef1f6', '#c9ced8', 'common', 4),
  item('stringer-red', 'Red Stringer', 'top', 'stringer', '#d63b3b', '#a32727', 'rare', 12),
  item('compression-black', 'Compression Top', 'top', 'compression', '#1b1e25', '#4f8cff', 'rare', 15),
  item('hoodie-grey', 'Grey Hoodie', 'top', 'hoodie', '#6f7686', '#575d6b', 'rare', 18),
  item('hoodie-pink', 'Pink Hoodie', 'top', 'hoodie', '#e47aa8', '#c25888', 'rare', 18),
  item('jacket-track', 'Track Jacket', 'top', 'jacket', '#1f3b73', '#f2b13c', 'epic', 45),
  item('jacket-champion', 'Champion Jacket', 'top', 'jacket', '#d9a520', '#fff3c4', 'legendary', 120),
  item('tee-regular', 'Gym Regular Tee', 'top', 'tee', '#34c77b', '#1f8a52', 'milestone', 'workouts-10'),
  item('tee-squat', 'Squat Club Tee', 'top', 'tee', '#7b4fd6', '#f2b13c', 'milestone', 'squat-140'),
  item('hoodie-dedicated', 'Dedicated Hoodie', 'top', 'hoodie', '#1b1e25', '#f2b13c', 'milestone', 'workouts-50'),

  // Bottoms
  item('shorts-black', 'Basic Shorts', 'bottom', 'shorts', '#2a2f3a', '#444b5a', 'starter'),
  item('shorts-grey', 'Grey Shorts', 'bottom', 'shorts', '#7d8597', '#5f6676', 'common', 3),
  item('shorts-red', 'Red Shorts', 'bottom', 'shorts', '#c93636', '#ffffff', 'common', 4),
  item('joggers-black', 'Black Joggers', 'bottom', 'joggers', '#22262f', '#3a404d', 'rare', 12),
  item('leggings-purple', 'Purple Leggings', 'bottom', 'leggings', '#6d4bc4', '#4d3290', 'rare', 12),
  item('trackpants-blue', 'Track Pants', 'bottom', 'trackpants', '#1f3b73', '#ffffff', 'rare', 16),
  item('shorts-gold', 'Golden Shorts', 'bottom', 'shorts', '#d9a520', '#fff3c4', 'epic', 40),
  item('shorts-volume', 'Volume Beast Shorts', 'bottom', 'shorts', '#e2541c', '#1b1e25', 'milestone', 'session-20000'),

  // Shoes
  item('sneakers-white', 'Basic Sneakers', 'shoes', 'sneakers', '#eef1f6', '#9aa1b0', 'starter'),
  item('sneakers-black', 'Black Sneakers', 'shoes', 'sneakers', '#22262f', '#eef1f6', 'common', 4),
  item('sneakers-red', 'Red Runners', 'shoes', 'sneakers', '#d63b3b', '#eef1f6', 'rare', 10),
  item('hightops-blue', 'Blue High-Tops', 'shoes', 'hightops', '#2f6fd1', '#eef1f6', 'rare', 14),
  item('lifters-red', 'Lifting Shoes', 'shoes', 'lifters', '#b8322f', '#2a1a12', 'epic', 45),

  // Headwear
  item('headband-red', 'Red Headband', 'head', 'headband', '#d63b3b', '#a32727', 'common', 3),
  item('cap-black', 'Black Cap', 'head', 'cap', '#22262f', '#3a404d', 'common', 5),
  item('beanie-green', 'Green Beanie', 'head', 'beanie', '#2e8b57', '#1f6b42', 'rare', 10),
  item('headphones-white', 'Headphones', 'head', 'headphones', '#eef1f6', '#4f8cff', 'rare', 15),
  item('cap-gold', 'Golden Cap', 'head', 'cap', '#d9a520', '#fff3c4', 'legendary', 100),
  item('headband-rookie', 'Rookie Headband', 'head', 'headband', '#4f8cff', '#2f6fd1', 'milestone', 'first-workout'),
  item('cap-consistency', 'Consistency Cap', 'head', 'cap', '#34c77b', '#ffffff', 'milestone', 'streak-4'),
  item('crown-million', 'Million Kilo Crown', 'head', 'crown', '#f2c335', '#d63b3b', 'milestone', 'volume-1000000'),

  // Eyewear
  item('shades-black', 'Sunglasses', 'face', 'shades', '#14161b', '#3a404d', 'rare', 12),
  item('aviators-gold', 'Gold Aviators', 'face', 'aviators', '#3b2a12', '#d9a520', 'epic', 40),

  // Neck
  item('towel-white', 'Gym Towel', 'neck', 'towel', '#eef1f6', '#c9ced8', 'common', 4),
  item('chain-gold', 'Gold Chain', 'neck', 'chain', '#d9a520', '#fff3c4', 'epic', 55),
  item('chain-deadlift', 'Deadlift Chain', 'neck', 'platechain', '#c9ced8', '#22262f', 'milestone', 'deadlift-180'),

  // Belts
  item('belt-brown', 'Lifting Belt', 'waist', 'belt', '#6b4423', '#c9ced8', 'rare', 20),
  item('belt-red', 'Red Lever Belt', 'waist', 'belt', '#b8322f', '#c9ced8', 'epic', 50),
  item('belt-centurion', 'Centurion Belt', 'waist', 'belt', '#d9a520', '#fff3c4', 'milestone', 'workouts-100'),

  // Wrists
  item('sweatbands-white', 'Sweatbands', 'wrists', 'sweatbands', '#eef1f6', '#c9ced8', 'common', 3),
  item('wraps-black', 'Wrist Wraps', 'wrists', 'wraps', '#22262f', '#d63b3b', 'rare', 10),
  item('wraps-bench', 'Bench Club Wraps', 'wrists', 'wraps', '#f2b13c', '#1b1e25', 'milestone', 'bench-100'),

  // Pets
  item('pet-spud', 'Spud the Potato', 'pet', 'pet-potato', '#b9864f', '#8a5f33', 'common', 5),
  item('pet-chick', 'Chick', 'pet', 'pet-chick', '#ffd84a', '#f28c28', 'common', 8),
  item('pet-cat', 'Cat', 'pet', 'pet-cat', '#f2a65a', '#ff8fa3', 'rare', 20),
  item('pet-cat-black', 'Black Cat', 'pet', 'pet-cat', '#2a2730', '#ff8fa3', 'rare', 22),
  item('pet-dog', 'Puppy', 'pet', 'pet-dog', '#e8d2b0', '#8a5f33', 'rare', 20),
  item('pet-bunny', 'Bunny', 'pet', 'pet-bunny', '#f4f1ec', '#ff8fa3', 'rare', 25),
  item('pet-frog', 'Frog', 'pet', 'pet-frog', '#5cc35c', '#c8f0a0', 'rare', 18),
  item('pet-penguin', 'Penguin', 'pet', 'pet-penguin', '#2a2f3a', '#f28c28', 'epic', 45),
  item('pet-panda', 'Panda', 'pet', 'pet-panda', '#f4f1ec', '#22262f', 'epic', 50),
  item('pet-fox', 'Fox', 'pet', 'pet-fox', '#e2741c', '#f4f1ec', 'epic', 45),
  item('pet-dragon', 'Baby Dragon', 'pet', 'pet-dragon', '#7b4fd6', '#f2c335', 'legendary', 120),

  // Backgrounds
  item('bg-plain', 'Plain', 'background', 'bg-plain', '#f4efe6', '#e9e1d2', 'starter'),
  item('bg-gym', 'Gym Floor', 'background', 'bg-gym', '#262b36', '#4f8cff', 'rare', 15),
  item('bg-beach', 'Beach', 'background', 'bg-beach', '#7cc6f2', '#f2d99a', 'epic', 40),
  item('bg-neon', 'Neon Studio', 'background', 'bg-neon', '#160f2b', '#e47aa8', 'epic', 50),
  item('bg-podium', 'Podium', 'background', 'bg-podium', '#1b1e25', '#d9a520', 'legendary', 100),
  item('bg-iron', 'Iron Will', 'background', 'bg-iron', '#2a1a12', '#e2541c', 'milestone', 'streak-10'),
]

export const ITEMS_BY_ID = new Map(ITEMS.map((i) => [i.id, i]))
export const STARTER_ITEM_IDS = ITEMS.filter((i) => i.rarity === 'starter').map((i) => i.id)

export interface AvatarLook {
  bodyType: BodyType
  skinTone: string
  hairStyle: HairStyle
  hairColor: string
  eyeColor: string
  /** item id per slot; null = nothing in that slot */
  equipped: Partial<Record<Slot, string | null>>
}

export const DEFAULT_LOOK: AvatarLook = {
  bodyType: 'athletic',
  skinTone: SKIN_TONES[1],
  hairStyle: 'short',
  hairColor: HAIR_COLORS[1],
  eyeColor: EYE_COLORS[0],
  equipped: { top: 'tee-grey', bottom: 'shorts-black', shoes: 'sneakers-white', background: 'bg-plain' },
}
