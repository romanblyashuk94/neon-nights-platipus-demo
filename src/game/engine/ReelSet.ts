import gsap from 'gsap'
import { Container, Graphics } from 'pixi.js'
import { REEL_COUNT, type SymbolId } from '../config'
import type { Grid } from '../math/evaluate'
import { REEL_STRIPS } from '../math/spin'
import { REELS_H, REELS_W, reelX } from './layout'
import { Reel } from './Reel'
import type { SymbolView } from './SymbolView'

export interface SpinTiming {
  speed: number
  startStagger: number
  minSpinTime: number
  stopStagger: number
}

export const NORMAL_TIMING: SpinTiming = { speed: 24, startStagger: 0.07, minSpinTime: 0.75, stopStagger: 0.2 }
export const TURBO_TIMING: SpinTiming = { speed: 36, startStagger: 0.025, minSpinTime: 0.25, stopStagger: 0.07 }

/** Resolves after `seconds`, or immediately once `skip()` is called. */
class SkippableDelay {
  private skipped = false
  private wake: (() => void) | null = null

  wait(seconds: number): Promise<void> {
    if (this.skipped || seconds <= 0) return Promise.resolve()
    return new Promise((resolve) => {
      const call = gsap.delayedCall(seconds, () => {
        this.wake = null
        resolve()
      })
      this.wake = () => {
        call.kill()
        resolve()
      }
    })
  }

  skip(): void {
    this.skipped = true
    this.wake?.()
    this.wake = null
  }
}

export class ReelSet extends Container {
  readonly reels: Reel[] = []
  private delay: SkippableDelay | null = null

  constructor(initial: Grid) {
    super()
    for (let i = 0; i < REEL_COUNT; i++) {
      const strip = REEL_STRIPS[i]
      const randomSymbol = (): SymbolId => strip[Math.floor(Math.random() * strip.length)]
      const reel = new Reel(i, initial[i], randomSymbol)
      reel.x = reelX(i)
      this.reels.push(reel)
      this.addChild(reel)
    }

    const mask = new Graphics().rect(0, 0, REELS_W, REELS_H).fill(0xffffff)
    this.addChild(mask)
    this.mask = mask
  }

  get isSpinning(): boolean {
    return this.delay !== null
  }

  async spin(grid: Grid, timing: SpinTiming, onReelStop: (reel: number) => void): Promise<void> {
    const delay = (this.delay = new SkippableDelay())
    const speed = { speed: timing.speed }

    this.reels.forEach((reel, i) => reel.start(speed, i * timing.startStagger))
    await delay.wait(timing.minSpinTime + timing.startStagger * (REEL_COUNT - 1))

    const stopped: Promise<void>[] = []
    for (let i = 0; i < REEL_COUNT; i++) {
      if (i > 0) await delay.wait(timing.stopStagger)
      stopped.push(this.reels[i].stop(grid[i], speed).then(() => onReelStop(i)))
    }
    await Promise.all(stopped)
    this.delay = null
  }

  /** Slam stop: skip the remaining spin time and stop every reel right away. */
  quickStop(): void {
    this.delay?.skip()
  }

  viewAt(reel: number, row: number): SymbolView {
    return this.reels[reel].viewAt(row)
  }

  update(dt: number): void {
    this.reels.forEach((reel) => reel.update(dt))
  }
}
