export const REEL_COUNT = 5
export const ROW_COUNT = 3

export const SYMBOL_IDS = ['lemon', 'cherry', 'bell', 'star', 'diamond', 'crown', 'seven', 'wild'] as const
export type SymbolId = (typeof SYMBOL_IDS)[number]

export interface SymbolDef {
  id: SymbolId
  name: string
  /** Glow / accent color used by win effects and the paytable. */
  color: number
  /** Payout for 3, 4 and 5 of a kind, as a multiplier of the total bet. */
  pays: Record<3 | 4 | 5, number>
}

export const SYMBOLS: Record<SymbolId, SymbolDef> = {
  lemon: { id: 'lemon', name: 'Lemon', color: 0xd4ff3a, pays: { 3: 0.4, 4: 1, 5: 4 } },
  cherry: { id: 'cherry', name: 'Cherry', color: 0xff3355, pays: { 3: 0.6, 4: 1.5, 5: 6 } },
  bell: { id: 'bell', name: 'Bell', color: 0xff8a1f, pays: { 3: 0.8, 4: 2, 5: 8 } },
  star: { id: 'star', name: 'Star', color: 0xa855f7, pays: { 3: 1, 4: 3, 5: 10 } },
  diamond: { id: 'diamond', name: 'Diamond', color: 0x22e8ff, pays: { 3: 2, 4: 6, 5: 20 } },
  crown: { id: 'crown', name: 'Crown', color: 0xffd23f, pays: { 3: 3, 4: 10, 5: 40 } },
  seven: { id: 'seven', name: 'Lucky 7', color: 0xff2bd6, pays: { 3: 5, 4: 20, 5: 80 } },
  wild: { id: 'wild', name: 'Wild', color: 0xffffff, pays: { 3: 10, 4: 40, 5: 200 } },
}

/** How many times each symbol appears on a single reel strip. */
export const STRIP_COMPOSITION: Record<SymbolId, number> = {
  lemon: 7,
  cherry: 6,
  bell: 5,
  star: 5,
  diamond: 4,
  crown: 3,
  seven: 2,
  wild: 2,
}

/** Row index per reel (0 = top row). */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [1, 0, 1, 2, 1],
]

export const PAYLINE_COLORS = [
  0x22e8ff, 0xff2bd6, 0x39ff9f, 0xffe14d, 0xa855f7, 0xff8a1f, 0x5b8cff, 0xff4d6d, 0x00ffd5, 0xf472b6,
]

export const BET_OPTIONS = [1, 2, 5, 10, 20, 50] as const
export const DEFAULT_BET = 5
export const START_BALANCE = 1000

export type WinTier = 'none' | 'small' | 'big' | 'mega' | 'epic'

/** Win tier thresholds as a multiplier of the total bet. */
export const WIN_TIERS: { tier: Exclude<WinTier, 'none' | 'small'>; minMultiplier: number; label: string }[] = [
  { tier: 'epic', minMultiplier: 100, label: 'EPIC WIN' },
  { tier: 'mega', minMultiplier: 40, label: 'MEGA WIN' },
  { tier: 'big', minMultiplier: 15, label: 'BIG WIN' },
]
