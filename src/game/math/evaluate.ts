import { PAYLINES, SYMBOLS, WIN_TIERS, type SymbolId, type WinTier } from '../config'

/** grid[reel][row] */
export type Grid = SymbolId[][]

export interface LineWin {
  lineIndex: number
  symbol: SymbolId
  count: 3 | 4 | 5
  /** [reel, row] of every symbol that forms the win. */
  positions: [number, number][]
  multiplier: number
  amount: number
}

export interface Evaluation {
  wins: LineWin[]
  totalWin: number
  multiplier: number
  tier: WinTier
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function payFor(symbol: SymbolId, count: number): number {
  return count >= 3 ? SYMBOLS[symbol].pays[count as 3 | 4 | 5] : 0
}

/**
 * Left-to-right line evaluation. WILD substitutes any symbol; a line that starts
 * with wilds pays whichever is larger: the pure wild run or the substituted symbol.
 */
export function evaluateLine(line: SymbolId[]): { symbol: SymbolId; count: number; multiplier: number } | null {
  let wildRun = 0
  while (wildRun < line.length && line[wildRun] === 'wild') wildRun++

  const target = line.find((s) => s !== 'wild')
  let targetCount = 0
  if (target) {
    while (targetCount < line.length && (line[targetCount] === target || line[targetCount] === 'wild')) targetCount++
  }

  const wildPay = payFor('wild', wildRun)
  const targetPay = target ? payFor(target, targetCount) : 0

  if (wildPay === 0 && targetPay === 0) return null
  return wildPay >= targetPay
    ? { symbol: 'wild', count: wildRun, multiplier: wildPay }
    : { symbol: target!, count: targetCount, multiplier: targetPay }
}

export function getWinTier(multiplier: number): WinTier {
  if (multiplier <= 0) return 'none'
  return WIN_TIERS.find((t) => multiplier >= t.minMultiplier)?.tier ?? 'small'
}

export function evaluateGrid(grid: Grid, bet: number): Evaluation {
  const wins: LineWin[] = []

  PAYLINES.forEach((rows, lineIndex) => {
    const line = rows.map((row, reel) => grid[reel][row])
    const result = evaluateLine(line)
    if (!result) return

    wins.push({
      lineIndex,
      symbol: result.symbol,
      count: result.count as 3 | 4 | 5,
      positions: rows.slice(0, result.count).map((row, reel) => [reel, row]),
      multiplier: result.multiplier,
      amount: roundMoney(result.multiplier * bet),
    })
  })

  const multiplier = roundMoney(wins.reduce((sum, w) => sum + w.multiplier, 0))
  return {
    wins,
    multiplier,
    totalWin: roundMoney(wins.reduce((sum, w) => sum + w.amount, 0)),
    tier: getWinTier(multiplier),
  }
}