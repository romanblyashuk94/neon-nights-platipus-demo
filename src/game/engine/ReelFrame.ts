import { GlowFilter } from 'pixi-filters/glow'
import { Container, FillGradient, Graphics, Sprite } from 'pixi.js'
import { REEL_COUNT } from '../config'
import type { GeneratedTextures } from './assets'
import { CELL_W, FRAME_PAD, FRAME_RADIUS, REELS_H, REELS_W, reelX } from './layout'

const LIGHT_COLORS = [0xff2bd6, 0x22e8ff, 0xffe14d]

function roundedRectPoints(x: number, y: number, w: number, h: number, r: number, spacing: number) {
  const straightW = w - 2 * r
  const straightH = h - 2 * r
  const arc = (Math.PI / 2) * r
  const perimeter = 2 * straightW + 2 * straightH + 4 * arc
  const count = Math.round(perimeter / spacing)
  const segments: [number, (t: number) => [number, number]][] = [
    [straightW, (t) => [x + r + t, y]],
    [arc, (t) => polar(x + w - r, y + r, -Math.PI / 2 + t / r)],
    [straightH, (t) => [x + w, y + r + t]],
    [arc, (t) => polar(x + w - r, y + h - r, t / r)],
    [straightW, (t) => [x + w - r - t, y + h]],
    [arc, (t) => polar(x + r, y + h - r, Math.PI / 2 + t / r)],
    [straightH, (t) => [x, y + h - r - t]],
    [arc, (t) => polar(x + r, y + r, Math.PI + t / r)],
  ]
  function polar(cx: number, cy: number, angle: number): [number, number] {
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
  }

  const points: [number, number][] = []
  for (let i = 0; i < count; i++) {
    let d = (i / count) * perimeter
    for (const [length, at] of segments) {
      if (d <= length) {
        points.push(at(d))
        break
      }
      d -= length
    }
  }
  return points
}

/** Static cabinet art behind the reels (`back`) and the neon tubes/lights over them (`front`). */
export class ReelFrame {
  readonly back = new Container()
  readonly front = new Container()

  private readonly outerGlow: GlowFilter
  private readonly innerGlow: GlowFilter
  private readonly lights: Sprite[] = []
  private readonly gradients: FillGradient[] = []
  private excitement = 0
  private excitementTarget = 0
  private time = 0

  constructor(textures: GeneratedTextures) {
    const x = -FRAME_PAD
    const y = -FRAME_PAD
    const w = REELS_W + FRAME_PAD * 2
    const h = REELS_H + FRAME_PAD * 2

    const aura = new Graphics()
    for (let i = 14; i >= 1; i--) {
      const grow = i * 5
      aura
        .roundRect(x - grow, y - grow, w + grow * 2, h + grow * 2, FRAME_RADIUS + grow)
        .stroke({ color: i % 2 ? 0xff2bd6 : 0x7c3aed, width: 6, alpha: 0.05 * (1 - i / 15) })
    }

    const panel = new Graphics()
      .roundRect(x, y, w, h, FRAME_RADIUS)
      .fill({ color: 0x07021a, alpha: 0.92 })

    const columnFill = this.track(
      new FillGradient({
        colorStops: [
          { offset: 0, color: '#1d0c47' },
          { offset: 0.5, color: '#0a0324' },
          { offset: 1, color: '#1d0c47' },
        ],
      }),
    )
    const columns = new Graphics()
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      columns.roundRect(reelX(reel), 0, CELL_W, REELS_H, 14).fill(columnFill)
      columns.roundRect(reelX(reel), 0, CELL_W, REELS_H, 14).stroke({ color: 0xffffff, width: 1, alpha: 0.07 })
    }
    this.back.addChild(aura, panel, columns)

    const shadeTop = this.track(
      new FillGradient({
        colorStops: [
          { offset: 0, color: 'rgba(5,1,15,0.9)' },
          { offset: 1, color: 'rgba(5,1,15,0)' },
        ],
      }),
    )
    const shadeBottom = this.track(
      new FillGradient({
        colorStops: [
          { offset: 0, color: 'rgba(5,1,15,0)' },
          { offset: 1, color: 'rgba(5,1,15,0.9)' },
        ],
      }),
    )
    const shade = new Graphics()
      .rect(0, 0, REELS_W, 56)
      .fill(shadeTop)
      .rect(0, REELS_H - 56, REELS_W, 56)
      .fill(shadeBottom)

    const outer = new Graphics()
      .roundRect(x, y, w, h, FRAME_RADIUS)
      .stroke({ color: 0xff2bd6, width: 6 })
      .roundRect(x, y, w, h, FRAME_RADIUS)
      .stroke({ color: 0xffd6f6, width: 1.5, alpha: 0.9 })
    this.outerGlow = new GlowFilter({ color: 0xff2bd6, distance: 22, outerStrength: 2.2, quality: 0.25 })
    outer.filters = [this.outerGlow]

    const inner = new Graphics()
      .roundRect(-7, -7, REELS_W + 14, REELS_H + 14, 18)
      .stroke({ color: 0x22e8ff, width: 3 })
      .roundRect(-7, -7, REELS_W + 14, REELS_H + 14, 18)
      .stroke({ color: 0xe0fcff, width: 1, alpha: 0.85 })
    this.innerGlow = new GlowFilter({ color: 0x22e8ff, distance: 14, outerStrength: 1.6, quality: 0.25 })
    inner.filters = [this.innerGlow]

    const lightLayer = new Container()
    const ring = roundedRectPoints(x - 17, y - 17, w + 34, h + 34, FRAME_RADIUS + 14, 34)
    ring.forEach(([lx, ly], i) => {
      const light = new Sprite({
        texture: textures.softDot,
        anchor: 0.5,
        x: lx,
        y: ly,
        scale: 0.36,
        tint: LIGHT_COLORS[i % LIGHT_COLORS.length],
        blendMode: 'add',
      })
      this.lights.push(light)
      lightLayer.addChild(light)
    })

    this.front.addChild(shade, inner, outer, lightLayer)
  }

  setExcited(on: boolean): void {
    this.excitementTarget = on ? 1 : 0
  }

  update(dt: number): void {
    this.time += dt
    this.excitement += (this.excitementTarget - this.excitement) * Math.min(1, dt * 4)

    const pulse = Math.sin(this.time * 2.2)
    this.outerGlow.outerStrength = 1.8 + pulse * 0.5 + this.excitement * 1.8
    this.innerGlow.outerStrength = 1.3 - pulse * 0.3 + this.excitement * 1.2

    const head = this.time * (3 + this.excitement * 14)
    this.lights.forEach((light, i) => {
      const d = (((i - head) % 4) + 4) % 4
      const chase = d < 1.5 ? 1 - d / 1.5 : 0
      const flash = this.excitement * (Math.sin(this.time * 18 + (i % 2) * Math.PI) * 0.5 + 0.5)
      const glow = Math.max(chase, flash)
      light.alpha = 0.2 + 0.8 * glow
      light.scale.set(0.3 + 0.12 * glow)
    })
  }

  destroy(): void {
    this.back.destroy({ children: true })
    this.front.destroy({ children: true })
    this.gradients.forEach((g) => g.destroy())
  }

  private track(gradient: FillGradient): FillGradient {
    this.gradients.push(gradient)
    return gradient
  }
}
