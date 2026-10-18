import { GlowFilter } from 'pixi-filters/glow'
import { Container, FillGradient, Text } from 'pixi.js'

/** "NEON NIGHTS" sign with a glow and the occasional neon-tube flicker. */
export class Logo extends Container {
  private readonly neon: Text
  private readonly nights: Text
  private readonly nightsGlow: GlowFilter
  private readonly gradients: FillGradient[]
  private time = 0
  private flickerUntil = 0
  private nextFlicker = 2.5

  constructor() {
    super()

    const pinkFill = new FillGradient({
      colorStops: [
        { offset: 0, color: '#ffe3fa' },
        { offset: 0.55, color: '#ff5fe0' },
        { offset: 1, color: '#c026d3' },
      ],
    })
    const cyanFill = new FillGradient({
      colorStops: [
        { offset: 0, color: '#e9feff' },
        { offset: 0.55, color: '#5cf2ff' },
        { offset: 1, color: '#0891b2' },
      ],
    })
    this.gradients = [pinkFill, cyanFill]

    const base = { fontFamily: 'Orbitron', fontWeight: '900', fontSize: 66, letterSpacing: 8, padding: 12 } as const

    this.neon = new Text({
      text: 'NEON',
      anchor: { x: 1, y: 0.5 },
      resolution: 2,
      style: { ...base, fill: pinkFill, stroke: { color: '#ffffff', width: 1.5 } },
    })
    this.neon.x = -14
    this.neon.filters = [new GlowFilter({ color: 0xff2bd6, distance: 18, outerStrength: 2.4, quality: 0.2 })]

    this.nights = new Text({
      text: 'NIGHTS',
      anchor: { x: 0, y: 0.5 },
      resolution: 2,
      style: { ...base, fill: cyanFill, stroke: { color: '#ffffff', width: 1.5 } },
    })
    this.nights.x = 14
    this.nightsGlow = new GlowFilter({ color: 0x22e8ff, distance: 18, outerStrength: 2.4, quality: 0.2 })
    this.nights.filters = [this.nightsGlow]

    const tagline = new Text({
      text: '5 REELS  ·  10 LINES  ·  WILDS',
      anchor: 0.5,
      resolution: 2,
      style: { fontFamily: 'Rajdhani', fontWeight: '700', fontSize: 17, letterSpacing: 7, fill: 0xd8c8ff },
    })
    tagline.y = 44
    tagline.alpha = 0.75

    this.addChild(this.neon, this.nights, tagline)
  }

  update(dt: number): void {
    this.time += dt

    if (this.time > this.nextFlicker) {
      this.flickerUntil = this.time + 0.35 + Math.random() * 0.3
      this.nextFlicker = this.time + 3 + Math.random() * 5
    }

    const flickering = this.time < this.flickerUntil
    const on = !flickering || Math.sin(this.time * 90) * Math.sin(this.time * 37) > -0.1
    this.nights.alpha = on ? 1 : 0.35
    this.nightsGlow.outerStrength = on ? 2.2 + Math.sin(this.time * 3) * 0.4 : 0.4
  }

  override destroy(): void {
    super.destroy({ children: true })
    this.gradients.forEach((g) => g.destroy())
  }
}
