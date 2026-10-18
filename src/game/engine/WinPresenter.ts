import gsap from 'gsap'
import { BitmapText, Container, Graphics } from 'pixi.js'
import { PAYLINE_COLORS, PAYLINES, ROW_COUNT, SYMBOLS } from '../config'
import type { LineWin } from '../math/evaluate'
import type { SpinResult } from '../math/spin'
import { type GeneratedTextures, SMALL_WIN_FONT, WIN_FONT } from './assets'
import { cellCenter, FRAME_PAD, REELS_H, REELS_W } from './layout'
import { ParticleSystem } from './particles'
import type { ReelFrame } from './ReelFrame'
import type { ReelSet } from './ReelSet'

type Point = { x: number; y: number }

interface DrawnLine {
  graphics: Graphics
  points: Point[]
  color: number
  progress: number
  drawnProgress: number
}

export interface PresentOptions {
  turbo: boolean
  /** Show the total count-up over the reels (big wins use the overlay instead). */
  showTotal: boolean
  onLineShown?: (win: LineWin) => void
  onCountTick?: () => void
}

export const formatMoney = (value: number) => value.toFixed(2)

/** Highlights winning lines: neon paylines, glowing symbols, sparks and a win counter. */
export class WinPresenter extends Container {
  private readonly reelSet: ReelSet
  private readonly frame: ReelFrame
  private readonly lineLayer = new Container()
  private readonly sparks: ParticleSystem
  private readonly sparkles: ParticleSystem
  private readonly total = new Container()
  private readonly totalText: BitmapText
  private readonly totalPlate = new Graphics()
  private readonly lineLabel = new Container()
  private readonly lineLabelText: BitmapText
  private readonly lineLabelPlate = new Graphics()
  private lines: DrawnLine[] = []
  private cycle: gsap.core.Timeline | null = null
  private countTween: gsap.core.Tween | null = null
  private finishShowcase: (() => void) | null = null

  constructor(reelSet: ReelSet, frame: ReelFrame, textures: GeneratedTextures) {
    super()
    this.reelSet = reelSet
    this.frame = frame
    this.sparks = new ParticleSystem(textures.softDot, 'add')
    this.sparkles = new ParticleSystem(textures.sparkle, 'add')

    this.totalText = new BitmapText({ text: '0.00', anchor: 0.5, style: { fontFamily: WIN_FONT, fontSize: 96 } })
    this.total.addChild(this.totalPlate, this.totalText)
    this.total.position.set(REELS_W / 2, REELS_H / 2)
    this.total.visible = false

    this.lineLabelText = new BitmapText({
      text: '0.00',
      anchor: 0.5,
      style: { fontFamily: SMALL_WIN_FONT, fontSize: 34 },
    })
    this.lineLabel.addChild(this.lineLabelPlate, this.lineLabelText)
    this.lineLabel.visible = false

    this.addChild(this.lineLayer, this.sparks, this.sparkles, this.lineLabel, this.total)
  }

  present(result: SpinResult, options: PresentOptions): Promise<void> {
    this.clear()
    if (result.wins.length === 0) return Promise.resolve()

    const speed = options.turbo ? 1.8 : 1
    this.frame.setExcited(true)
    this.showWins(result.wins, { stagger: 0.07 / speed })
    result.wins.forEach((win) => win.positions.forEach(([reel, row]) => this.burst(reel, row, win)))

    return new Promise<void>((resolve) => {
      const finish = () => {
        if (!this.finishShowcase) return
        this.finishShowcase = null
        this.countTween?.progress(1)
        this.countTween = null
        resolve()
        this.startCycle(result, options)
      }
      this.finishShowcase = finish

      if (!options.showTotal) {
        gsap.delayedCall(0.6 / speed, finish)
        return
      }

      this.showTotal(result.totalWin)
      const counter = { value: 0 }
      let lastTick = 0
      const duration = Math.min(0.5 + result.multiplier * 0.12, 2.2) / speed
      this.countTween = gsap.to(counter, {
        value: result.totalWin,
        duration,
        ease: 'power1.out',
        onUpdate: () => {
          this.totalText.text = formatMoney(counter.value)
          const now = performance.now()
          if (now - lastTick > 70) {
            lastTick = now
            options.onCountTick?.()
          }
        },
        onComplete: () => {
          this.totalText.text = formatMoney(result.totalWin)
          gsap.fromTo(this.total.scale, { x: 1.18, y: 1.18 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(3)' })
          gsap.delayedCall(0.55 / speed, finish)
        },
      })
    })
  }

  /** Fast-forwards the current showcase (count-up and hold). */
  skip(): void {
    this.finishShowcase?.()
  }

  clear(): void {
    this.finishShowcase = null
    this.cycle?.kill()
    this.cycle = null
    this.countTween?.kill()
    this.countTween = null
    gsap.killTweensOf(this.total)
    gsap.killTweensOf(this.total.scale)
    gsap.killTweensOf(this.lineLabel)
    this.total.visible = false
    this.lineLabel.visible = false
    this.clearLines()
    this.reelSet.reels.forEach((reel) => reel.resetViews())
    this.frame.setExcited(false)
  }

  update(dt: number): void {
    this.sparks.update(dt)
    this.sparkles.update(dt)
    for (const line of this.lines) this.drawLine(line)
  }

  private showWins(wins: LineWin[], { stagger }: { stagger: number }): void {
    this.clearLines()
    const winning = new Set(wins.flatMap((w) => w.positions.map(([reel, row]) => `${reel}:${row}`)))
    this.reelSet.reels.forEach((reel, r) => {
      for (let row = 0; row < ROW_COUNT; row++) {
        const view = reel.viewAt(row)
        if (winning.has(`${r}:${row}`)) view.highlight()
        else view.dim()
      }
    })

    wins.forEach((win, i) => {
      const rows = PAYLINES[win.lineIndex]
      const centers = rows.map((row, reel) => cellCenter(reel, row))
      const points: Point[] = [
        { x: -FRAME_PAD + 6, y: centers[0].y },
        ...centers,
        { x: REELS_W + FRAME_PAD - 6, y: centers[centers.length - 1].y },
      ]
      const line: DrawnLine = {
        graphics: new Graphics({ blendMode: 'add' }),
        points,
        color: PAYLINE_COLORS[win.lineIndex],
        progress: 0,
        drawnProgress: -1,
      }
      this.lineLayer.addChild(line.graphics)
      this.lines.push(line)
      gsap.to(line, { progress: 1, duration: 0.45, delay: i * stagger, ease: 'power2.out' })
    })
  }

  private showTotal(amount: number): void {
    this.totalText.text = formatMoney(amount)
    const w = Math.max(this.totalText.width + 90, 320)
    const h = 128
    this.totalPlate
      .clear()
      .roundRect(-w / 2, -h / 2, w, h, h / 2)
      .fill({ color: 0x0b0322, alpha: 0.82 })
      .roundRect(-w / 2, -h / 2, w, h, h / 2)
      .stroke({ color: 0xffe14d, width: 3, alpha: 0.9 })
    this.totalText.text = '0.00'
    this.total.visible = true
    this.total.alpha = 0
    gsap.to(this.total, { alpha: 1, duration: 0.2 })
    gsap.fromTo(this.total.scale, { x: 0.4, y: 0.4 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2.5)' })
  }

  private startCycle(result: SpinResult, options: PresentOptions): void {
    gsap.to(this.total, { alpha: 0, duration: 0.3, delay: 0.1, onComplete: () => void (this.total.visible = false) })

    const wins = result.wins
    if (wins.length === 1) {
      this.showLineLabel(wins[0])
      return
    }

    const timeline = gsap.timeline({ repeat: -1, delay: 0.25 })
    wins.forEach((win) => {
      timeline.add(() => {
        this.showWins([win], { stagger: 0 })
        this.showLineLabel(win)
        options.onLineShown?.(win)
      })
      timeline.to({}, { duration: 1.25 })
    })
    timeline.add(() => {
      this.lineLabel.visible = false
      this.showWins(wins, { stagger: 0.03 })
    })
    timeline.to({}, { duration: 1.1 })
    this.cycle = timeline
  }

  private showLineLabel(win: LineWin): void {
    const [reel, row] = win.positions[win.positions.length - 1]
    const center = cellCenter(reel, row)
    this.lineLabelText.text = formatMoney(win.amount)
    const w = this.lineLabelText.width + 34
    const h = 50
    this.lineLabelPlate
      .clear()
      .roundRect(-w / 2, -h / 2, w, h, h / 2)
      .fill({ color: 0x0b0322, alpha: 0.88 })
      .roundRect(-w / 2, -h / 2, w, h, h / 2)
      .stroke({ color: PAYLINE_COLORS[win.lineIndex], width: 2.5 })
    this.lineLabel.position.set(center.x, center.y + 52)
    this.lineLabel.visible = true
    gsap.killTweensOf(this.lineLabel.scale)
    gsap.fromTo(this.lineLabel.scale, { x: 0.5, y: 0.5 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(3)' })
  }

  private burst(reel: number, row: number, win: LineWin): void {
    const { x, y } = cellCenter(reel, row)
    const color = SYMBOLS[win.symbol].color
    this.sparks.spawn({
      x,
      y,
      count: 14,
      colors: [color, 0xffffff, PAYLINE_COLORS[win.lineIndex]],
      speed: [120, 420],
      life: [0.45, 0.9],
      scale: [0.12, 0.3],
      drag: 2.5,
      gravity: 260,
      spread: 30,
    })
    this.sparkles.spawn({
      x,
      y,
      count: 3,
      colors: [0xffffff, color],
      speed: [20, 90],
      life: [0.5, 0.9],
      scale: [0.4, 0.75],
      spin: [-4, 4],
      spread: 50,
    })
  }

  private drawLine(line: DrawnLine): void {
    if (line.drawnProgress === line.progress) return
    line.drawnProgress = line.progress
    const visible = this.partialPath(line.points, line.progress)
    const g = line.graphics
    g.clear()
    if (visible.length < 2) return
    const layers = [
      { width: 22, alpha: 0.12, color: line.color },
      { width: 11, alpha: 0.35, color: line.color },
      { width: 5, alpha: 1, color: line.color },
      { width: 1.6, alpha: 0.9, color: 0xffffff },
    ]
    for (const layer of layers) {
      g.moveTo(visible[0].x, visible[0].y)
      for (let i = 1; i < visible.length; i++) g.lineTo(visible[i].x, visible[i].y)
      g.stroke({ ...layer, cap: 'round', join: 'round' })
    }
    const head = visible[visible.length - 1]
    if (line.progress < 1) g.circle(head.x, head.y, 9).fill({ color: 0xffffff, alpha: 0.9 })
  }

  private partialPath(points: Point[], progress: number): Point[] {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y))
    let remaining = lengths.reduce((a, b) => a + b, 0) * progress
    const out: Point[] = [points[0]]
    for (let i = 0; i < lengths.length; i++) {
      if (remaining >= lengths[i]) {
        out.push(points[i + 1])
        remaining -= lengths[i]
      } else {
        const t = remaining / lengths[i]
        out.push({ x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t })
        break
      }
    }
    return out
  }

  private clearLines(): void {
    this.lines.forEach((line) => {
      gsap.killTweensOf(line)
      line.graphics.destroy()
    })
    this.lines = []
  }

  override destroy(): void {
    this.clear()
    super.destroy({ children: true })
  }
}
