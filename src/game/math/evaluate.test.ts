import { describe, expect, it } from 'vitest'
import type { SymbolId } from '../config'
import { evaluateGrid, evaluateLine, getWinTier, type Grid } from './evaluate'
import { createSeededRng } from './rng'
import { REEL_STRIPS, spin, spinForTier } from './spin'

/** Builds grid[reel][row] from three human-readable rows. */
function fromRows(rows: SymbolId[][]): Grid {
  return rows[0].map((_, reel) => rows.map((row) => row[reel]))
}

const FILLER_TOP: SymbolId[] = ['bell', 'star', 'cherry', 'diamond', 'crown']
const FILLER_BOTTOM: SymbolId[] = ['crown', 'diamond', 'bell', 'cherry', 'star']

describe('evaluateLine', () => {
  it('returns null when fewer than 3 symbols match', () => {
    expect(evaluateLine(['lemon', 'lemon', 'cherry', 'lemon', 'lemon'])).toBeNull()
  })

  it('counts consecutive matches from the leftmost reel', () => {
    expect(evaluateLine(['bell', 'bell', 'bell', 'bell', 'star'])).toEqual({ symbol: 'bell', count: 4, multiplier: 2 })
  })

  it('lets WILD substitute for the line symbol', () => {
    expect(evaluateLine(['lemon', 'wild', 'lemon', 'wild', 'cherry'])).toEqual({
      symbol: 'lemon',
      count: 4,
      multiplier: 1,
    })
  })

  it('pays the pure wild run when it beats the substituted symbol', () => {
    expect(evaluateLine(['wild', 'wild', 'wild', 'lemon', 'lemon'])).toEqual({ symbol: 'wild', count: 3, multiplier: 10 })
  })

  it('pays the substituted symbol when it beats the wild run', () => {
    expect(evaluateLine(['wild', 'wild', 'seven', 'seven', 'seven'])).toEqual({
      symbol: 'seven',
      count: 5,
      multiplier: 80,
    })
  })

  it('pays five wilds as the top prize', () => {
    expect(evaluateLine(['wild', 'wild', 'wild', 'wild', 'wild'])).toEqual({ symbol: 'wild', count: 5, multiplier: 200 })
  })
})

describe('evaluateGrid', () => {
  it('finds no wins on a losing board', () => {
    const grid = fromRows([FILLER_TOP, ['lemon', 'cherry', 'bell', 'star', 'seven'], FILLER_BOTTOM])
    const result = evaluateGrid(grid, 10)
    expect(result.wins).toHaveLength(0)
    expect(result.totalWin).toBe(0)
    expect(result.tier).toBe('none')
  })

  it('pays the middle line in units of the total bet', () => {
    const grid = fromRows([FILLER_TOP, ['crown', 'crown', 'crown', 'lemon', 'cherry'], FILLER_BOTTOM])
    const result = evaluateGrid(grid, 10)
    const middle = result.wins.find((w) => w.lineIndex === 0)
    expect(middle).toMatchObject({ symbol: 'crown', count: 3, amount: 30 })
    expect(middle?.positions).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
    ])
  })

  it('follows zig-zag paylines and reports their positions', () => {
    const grid = fromRows([
      ['diamond', 'bell', 'cherry', 'star', 'diamond'],
      ['lemon', 'diamond', 'bell', 'diamond', 'crown'],
      ['star', 'cherry', 'diamond', 'lemon', 'bell'],
    ])
    const vLine = evaluateGrid(grid, 1).wins.find((w) => w.lineIndex === 3)
    expect(vLine).toMatchObject({ symbol: 'diamond', count: 5, multiplier: 20 })
    expect(vLine?.positions).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 1],
      [4, 0],
    ])
  })

  it('sums every winning line and keeps money rounded to cents', () => {
    const grid = fromRows([
      ['lemon', 'lemon', 'lemon', 'star', 'bell'],
      ['cherry', 'cherry', 'cherry', 'bell', 'star'],
      ['bell', 'star', 'crown', 'diamond', 'lemon'],
    ])
    const result = evaluateGrid(grid, 1)
    expect(result.totalWin).toBe(1)
    expect(result.wins.map((w) => w.symbol).sort()).toEqual(['cherry', 'lemon'])
  })
})

describe('getWinTier', () => {
  it.each([
    [0, 'none'],
    [0.2, 'small'],
    [14.99, 'small'],
    [15, 'big'],
    [40, 'mega'],
    [250, 'epic'],
  ] as const)('%s x bet is %s', (multiplier, tier) => {
    expect(getWinTier(multiplier)).toBe(tier)
  })
})

describe('spin', () => {
  it('builds the grid from consecutive positions on each reel strip', () => {
    const result = spin(1, createSeededRng(42))
    result.stops.forEach((stop, reel) => {
      const strip = REEL_STRIPS[reel]
      expect(result.grid[reel]).toEqual([0, 1, 2].map((row) => strip[(stop + row) % strip.length]))
    })
  })

  it.each(['big', 'mega', 'epic'] as const)('can force exactly a %s win for the demo mode', (tier) => {
    const rng = createSeededRng(1)
    for (let i = 0; i < 20; i++) {
      const result = spinForTier(2, tier, rng)
      expect(result.tier).toBe(tier)
      expect(result).toMatchObject(evaluateGrid(result.grid, 2))
    }
  })

  it.each(['big', 'mega', 'epic'] as const)('falls back to a hand-built %s win', (tier) => {
    expect(spinForTier(1, tier, () => 0).tier).toBe(tier)
  })

  it('has a realistic RTP and hit frequency', () => {
    const rng = createSeededRng(2026)
    const spins = 300_000
    let paid = 0
    let hits = 0
    for (let i = 0; i < spins; i++) {
      const result = spin(1, rng)
      paid += result.totalWin
      if (result.totalWin > 0) hits++
    }
    const rtp = paid / spins
    const hitRate = hits / spins
    console.info(`RTP ${(rtp * 100).toFixed(2)}%, hit rate ${(hitRate * 100).toFixed(1)}%`)
    expect(rtp).toBeGreaterThan(0.9)
    expect(rtp).toBeLessThan(1)
    expect(hitRate).toBeGreaterThan(0.25)
  })
})
