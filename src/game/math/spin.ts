import { REEL_COUNT, ROW_COUNT, STRIP_COMPOSITION, SYMBOL_IDS, type SymbolId } from '../config'
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

/**
 * Demo helper: re-rolls until the outcome reaches the requested multiplier, so the
 * board still looks like a natural spin. Falls back to a hand-built jackpot line.
 */
export function spinWithMinMultiplier(bet: number, minMultiplier: number, rng: Rng = cryptoRng): SpinResult {
  for (let attempt = 0; attempt < 200_000; attempt++) {
    const result = spin(bet, rng)
    if (result.multiplier >= minMultiplier) return result
  }

  const stops = Array.from({ length: REEL_COUNT }, () => 0)
  const grid = gridFromStops(stops)
  for (let reel = 0; reel < REEL_COUNT; reel++) grid[reel][1] = reel === 2 ? 'wild' : 'seven'
  return { grid, stops, bet, ...evaluateGrid(grid, bet) }
}
