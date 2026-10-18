import gsap from 'gsap'
import { BlurFilter, Container } from 'pixi.js'
import { ROW_COUNT, type SymbolId } from '../config'
import { CELL_H, CELL_W } from './layout'
import { SymbolView } from './SymbolView'

/** Visible rows plus one hidden buffer symbol above and one below the window. */
const VIEW_COUNT = ROW_COUNT + 2
const MAX_BLUR = 14

type ReelState = 'idle' | 'starting' | 'spinning' | 'stopping'

export interface ReelSpeed {
  /** Symbols per second at full speed. */
  speed: number
}

/**
 * A reel is a looping strip of SymbolViews. `spinPos` grows while spinning; each view's
 * slot is (spinPos + index) mod VIEW_COUNT. When a view wraps from the bottom back to the
 * top it gets a new symbol: random while spinning, the result symbol on its final lap.
 */
export class Reel extends Container {
  readonly index: number
  private readonly strip = new Container()
  private readonly views: SymbolView[] = []
  private readonly laps: number[] = []
  private readonly blur = new BlurFilter({ strengthX: 0, strengthY: 0, quality: 3 })
  private readonly randomSymbol: () => SymbolId

  private state: ReelState = 'idle'
  private spinPos = 0
  private lastPos = 0
  private speed = 0
  private targetPos = 0
  private result: SymbolId[] | null = null
  private startTimeline: gsap.core.Timeline | null = null

  constructor(index: number, symbols: SymbolId[], randomSymbol: () => SymbolId) {
    super()
    this.index = index
    this.randomSymbol = randomSymbol
    this.strip.x = CELL_W / 2
    this.addChild(this.strip)

    for (let i = 0; i < VIEW_COUNT; i++) {
      const view = new SymbolView(randomSymbol())
      this.views.push(view)
      this.laps.push(0)
      this.strip.addChild(view)
    }
    this.setSymbols(symbols)
  }

  get isIdle(): boolean {
    return this.state === 'idle'
  }

  /** Shows `symbols` (top to bottom) without animation. */
  setSymbols(symbols: SymbolId[]): void {
    this.spinPos = Math.round(this.spinPos)
    this.views.forEach((view, i) => {
      view.setSymbol(this.symbolForSlot(this.slotOf(i, this.spinPos), symbols))
      this.laps[i] = this.lapOf(i, this.spinPos)
    })
    this.layout()
  }

  /** The view currently shown in `row` (only meaningful while idle). */
  viewAt(row: number): SymbolView {
    return this.views.find((_, i) => this.slotOf(i, this.spinPos) === row + 1)!
  }

  resetViews(): void {
    this.views.forEach((v) => v.reset())
  }

  start({ speed }: ReelSpeed, delay: number): void {
    this.views.forEach((v) => v.reset())
    this.state = 'starting'
    this.result = null

    this.startTimeline = gsap
      .timeline({ delay })
      .to(this.strip, { y: -26, duration: 0.14, ease: 'power2.out' })
      .add(() => {
        this.state = 'spinning'
      })
      .to(this, { speed, duration: 0.28, ease: 'power2.in' })
      .to(this.strip, { y: 0, duration: 0.18, ease: 'power1.in' }, '<')
  }

  stop(result: SymbolId[], { speed }: ReelSpeed): Promise<void> {
    this.startTimeline?.kill()
    this.startTimeline = null
    gsap.killTweensOf(this)
    this.strip.y = 0

    const v = Math.max(this.speed, speed * 0.6)
    this.speed = 0
    this.result = result
    this.state = 'stopping'
    // At least one full lap so every visible view wraps once and receives its result symbol.
    this.targetPos = Math.ceil(this.spinPos) + VIEW_COUNT + 1
    const distance = this.targetPos - this.spinPos
    // power1.out starts at 2x average speed, so this keeps the velocity continuous.
    const duration = (2 * distance) / v

    return new Promise((resolve) => {
      gsap.to(this, {
        spinPos: this.targetPos,
        duration,
        ease: 'power1.out',
        onComplete: () => {
          this.state = 'idle'
          this.spinPos = this.targetPos
          this.layout()
          this.setBlur(0)
          gsap
            .timeline()
            .to(this.strip, { y: 18, duration: 0.07, ease: 'power1.out' })
            .to(this.strip, { y: 0, duration: 0.55, ease: 'elastic.out(1.1, 0.35)' })
          resolve()
        },
      })
    })
  }

  update(dt: number): void {
    if (this.state === 'starting' || this.state === 'spinning') {
      this.spinPos += this.speed * dt
    }
    if (this.state === 'idle') return

    const velocity = dt > 0 ? (this.spinPos - this.lastPos) / dt : 0
    this.lastPos = this.spinPos
    this.setBlur(Math.min(MAX_BLUR, Math.max(0, velocity) * 0.55))
    this.layout()
  }

  private layout(): void {
    this.lastPos = this.spinPos
    this.views.forEach((view, i) => {
      const lap = this.lapOf(i, this.spinPos)
      if (lap !== this.laps[i]) {
        this.laps[i] = lap
        this.onWrap(view, i, lap)
      }
      const slot = this.slotOf(i, this.spinPos)
      view.y = (slot - 1) * CELL_H + CELL_H / 2
    })
  }

  private onWrap(view: SymbolView, i: number, lap: number): void {
    if (this.state === 'stopping' && this.result && this.lapOf(i, this.targetPos) === lap) {
      view.setSymbol(this.symbolForSlot(this.slotOf(i, this.targetPos), this.result))
    } else {
      view.setSymbol(this.randomSymbol())
    }
  }

  /** Slot 0 is the buffer above the window, slots 1..ROW_COUNT are visible rows. */
  private symbolForSlot(slot: number, symbols: SymbolId[]): SymbolId {
    return slot >= 1 && slot <= ROW_COUNT ? symbols[slot - 1] : this.randomSymbol()
  }

  private setBlur(strength: number): void {
    if (strength < 0.5) {
      this.strip.filters = null
      return
    }
    this.blur.strengthY = strength
    if (!this.strip.filters) this.strip.filters = [this.blur]
  }

  private slotOf(i: number, pos: number): number {
    const value = (pos + i) % VIEW_COUNT
    return value < 0 ? value + VIEW_COUNT : value
  }

  private lapOf(i: number, pos: number): number {
    return Math.floor((pos + i) / VIEW_COUNT)
  }

  override destroy(): void {
    this.startTimeline?.kill()
    gsap.killTweensOf(this)
    gsap.killTweensOf(this.strip)
    this.blur.destroy()
    super.destroy({ children: true })
  }
}
