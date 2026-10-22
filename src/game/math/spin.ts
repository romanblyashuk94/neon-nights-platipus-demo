import { PAYLINES, REEL_COUNT, ROW_COUNT, STRIP_COMPOSITION, SYMBOL_IDS, type SymbolId, type WinTier } from '../config'
import { evaluateGrid, type Evaluation, type Grid } from './evaluate'
import { createSeededRng, cryptoRng, randomInt, shuffle, type Rng } from './rng'

export interface SpinResult extends Evaluation {
  grid: Grid
  /** Index on each reel strip of the symbol shown in the top row. */
  stops: number[]
  bet: number
}

export function buildReelStrips(seed = 7): SymbolId[][] {
  const rng = createSeededRng(seed)
  const base = SYMBOL_IDS.flatMap((id) => Array<SymbolId>(STRIP_COMPOSITION[id]).fill(id))
  return Array.from({ length: REEL_COUNT }, () => shuffle(base, rng))
}

export const REEL_STRIPS = buildReelStrips()

export function gridFromStops(stops: number[], strips: SymbolId[][] = REEL_STRIPS): Grid {
  return stops.map((stop, reel) => {
    const strip = strips[reel]
    return Array.from({ length: ROW_COUNT }, (_, row) => strip[(stop + row) % strip.length])
  })
}

export function spin(bet: number, rng: Rng = cryptoRng, strips: SymbolId[][] = REEL_STRIPS): SpinResult {
  const stops = strips.map((strip) => randomInt(rng, strip.length))
  const grid = gridFromStops(stops, strips)
  return { grid, stops, bet, ...evaluateGrid(grid, bet) }
}

export type ForcedTier = Exclude<WinTier, 'none' | 'small'>

const PLANTED_SYMBOLS: SymbolId[] = ['diamond', 'crown', 'seven', 'wild']
const FALLBACK_LINE: Record<ForcedTier, SymbolId> = { big: 'diamond', mega: 'crown', epic: 'wild' }

/** Overwrites the start of a random payline with 3–5 copies of a premium symbol. */
function plantLine(grid: Grid, rng: Rng): Grid {
  const symbol = PLANTED_SYMBOLS[randomInt(rng, PLANTED_SYMBOLS.length)]
  const count = 3 + randomInt(rng, 3)
  const rows = PAYLINES[randomInt(rng, PAYLINES.length)]
  const planted = grid.map((column) => [...column])
  rows.slice(0, count).forEach((row, reel) => (planted[reel][row] = symbol))
  return planted
}

/**
 * Demo helper: returns a spin that lands exactly in the requested tier. Re-rolls first so
 * the board looks like a natural spin; tiers too rare for that (EPIC is ~1 in 74k spins)
 * get a premium line planted over a regular board. Falls back to a hand-built line.
 */
export function spinForTier(bet: number, tier: ForcedTier, rng: Rng = cryptoRng): SpinResult {
  for (let attempt = 0; attempt < 1_000; attempt++) {
    const result = spin(bet, rng)
    if (result.tier === tier) return result
  }

  for (let attempt = 0; attempt < 1_000; attempt++) {
    const { stops } = spin(bet, rng)
    const grid = plantLine(gridFromStops(stops), rng)
    const evaluation = evaluateGrid(grid, bet)
    if (evaluation.tier === tier) return { grid, stops, bet, ...evaluation }
  }

  const stops = Array.from({ length: REEL_COUNT }, () => 0)
  const grid = gridFromStops(stops)
  for (let reel = 0; reel < REEL_COUNT; reel++) grid[reel][1] = FALLBACK_LINE[tier]
  return { grid, stops, bet, ...evaluateGrid(grid, bet) }
}
