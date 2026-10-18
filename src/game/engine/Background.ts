import { Container, FillGradient, Graphics, Particle, ParticleContainer, Rectangle, Sprite, TilingSprite } from 'pixi.js'
import { backgroundTexture, type GeneratedTextures } from './assets'

const STAR_COUNT = 160
const STAR_COLORS = [0x22e8ff, 0xff2bd6, 0xa855f7, 0xffffff, 0xffe14d]

interface Star {
  particle: Particle
  speed: number
  phase: number
  twinkle: number
  alpha: number
}

export class Background extends Container {
  private readonly image: Sprite
  private readonly stars: ParticleContainer
  private readonly starData: Star[] = []
  private readonly vignette = new Graphics()
  private vignetteFill?: FillGradient
  private readonly scanlines: TilingSprite
  private screenW = 1
  private screenH = 1
  private parallax = { x: 0, y: 0 }
  private parallaxTarget = { x: 0, y: 0 }
  private time = 0

  constructor(textures: GeneratedTextures) {
    super()
    this.image = new Sprite({ texture: backgroundTexture(), anchor: 0.5 })

    this.stars = new ParticleContainer({
      texture: textures.softDot,
      blendMode: 'add',
      dynamicProperties: { position: true, color: true },
    })
    for (let i = 0; i < STAR_COUNT; i++) {
      const particle = new Particle({
        texture: textures.softDot,
        anchorX: 0.5,
        anchorY: 0.5,
        tint: STAR_COLORS[i % STAR_COLORS.length],
      })
      const scale = 0.08 + Math.random() ** 3 * 0.32
      particle.scaleX = particle.scaleY = scale
      this.stars.addParticle(particle)
      this.starData.push({
        particle,
        speed: 6 + scale * 70,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.6 + Math.random() * 2.2,
        alpha: 0.35 + Math.random() * 0.65,
      })
    }

    this.scanlines = new TilingSprite({ texture: textures.scanline, alpha: 0.16 })

    this.addChild(this.image, this.stars, this.vignette, this.scanlines)
  }

  resize(width: number, height: number): void {
    this.screenW = width
    this.screenH = height

    const tex = this.image.texture
    const cover = Math.max(width / tex.width, height / tex.height) * 1.06
    this.image.scale.set(cover)

    this.stars.boundsArea = new Rectangle(0, 0, width, height)
    for (const star of this.starData) {
      star.particle.x = Math.random() * width
      star.particle.y = Math.random() * height
    }

    this.vignetteFill?.destroy()
    const vignette = (this.vignetteFill = new FillGradient({
      type: 'radial',
      center: { x: 0.5, y: 0.45 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.45 },
      outerRadius: 0.75,
      colorStops: [
        { offset: 0, color: 'rgba(5,1,15,0.05)' },
        { offset: 0.6, color: 'rgba(5,1,15,0.28)' },
        { offset: 1, color: 'rgba(5,1,15,0.8)' },
      ],
    }))
    this.vignette.clear().rect(0, 0, width, height).fill(vignette)

    this.scanlines.width = width
    this.scanlines.height = height
  }

  setParallax(nx: number, ny: number): void {
    this.parallaxTarget.x = nx
    this.parallaxTarget.y = ny
  }

  update(dt: number): void {
    this.time += dt
    this.parallax.x += (this.parallaxTarget.x - this.parallax.x) * Math.min(1, dt * 3)
    this.parallax.y += (this.parallaxTarget.y - this.parallax.y) * Math.min(1, dt * 3)

    const breathe = 1 + Math.sin(this.time * 0.25) * 0.012
    const tex = this.image.texture
    const cover = Math.max(this.screenW / tex.width, this.screenH / tex.height) * 1.06 * breathe
    this.image.scale.set(cover)
    this.image.position.set(this.screenW / 2 - this.parallax.x * 18, this.screenH / 2 - this.parallax.y * 10)

    for (const star of this.starData) {
      const p = star.particle
      p.y -= star.speed * dt
      p.x -= this.parallax.x * star.speed * dt * 0.2
      if (p.y < -10) {
        p.y = this.screenH + 10
        p.x = Math.random() * this.screenW
      }
      if (p.x < -10) p.x = this.screenW + 10
      else if (p.x > this.screenW + 10) p.x = -10
      p.alpha = star.alpha * (0.45 + 0.55 * Math.sin(star.phase + this.time * star.twinkle))
    }

    this.scanlines.tilePosition.y = (this.time * 12) % 4
  }
}
