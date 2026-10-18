import { type BLEND_MODES, Container, Particle, ParticleContainer, Rectangle, type Texture } from 'pixi.js'

type Range = readonly [number, number]

export interface EmitOptions {
  x: number
  y: number
  count: number
  colors: readonly number[]
  /** Pixels per second. */
  speed: Range
  /** Radians; 0 points right, -PI/2 points up. */
  angle?: Range
  /** Seconds. */
  life: Range
  scale: Range
  gravity?: number
  drag?: number
  spin?: Range
  /** Spawn jitter radius around (x, y). */
  spread?: number
}

interface LiveParticle {
  particle: Particle
  vx: number
  vy: number
  age: number
  life: number
  gravity: number
  drag: number
  spin: number
  baseScale: number
}

const rand = ([min, max]: Range) => min + Math.random() * (max - min)

/** Pooled, ParticleContainer-backed emitter: thousands of sprites in one draw call. */
export class ParticleSystem extends Container {
  private readonly container: ParticleContainer
  private readonly live: LiveParticle[] = []
  private readonly pool: Particle[] = []
  private readonly texture: Texture
  private readonly maxParticles: number

  constructor(texture: Texture, blendMode: BLEND_MODES = 'add', maxParticles = 1500) {
    super()
    this.texture = texture
    this.maxParticles = maxParticles
    this.container = new ParticleContainer({
      texture,
      blendMode,
      boundsArea: new Rectangle(-4000, -4000, 8000, 8000),
      dynamicProperties: { position: true, rotation: true, color: true, vertex: true },
    })
    this.addChild(this.container)
  }

  get activeCount(): number {
    return this.live.length
  }

  spawn(options: EmitOptions): void {
    const angle = options.angle ?? [0, Math.PI * 2]
    for (let i = 0; i < options.count && this.live.length < this.maxParticles; i++) {
      const particle = this.pool.pop() ?? new Particle({ texture: this.texture, anchorX: 0.5, anchorY: 0.5 })
      const a = rand(angle)
      const speed = rand(options.speed)
      const spread = options.spread ?? 0
      const baseScale = rand(options.scale)

      particle.x = options.x + (Math.random() - 0.5) * spread * 2
      particle.y = options.y + (Math.random() - 0.5) * spread * 2
      particle.scaleX = particle.scaleY = baseScale
      particle.rotation = Math.random() * Math.PI * 2
      particle.tint = options.colors[Math.floor(Math.random() * options.colors.length)]
      particle.alpha = 1

      this.container.addParticle(particle)
      this.live.push({
        particle,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        age: 0,
        life: rand(options.life),
        gravity: options.gravity ?? 0,
        drag: options.drag ?? 0,
        spin: options.spin ? rand(options.spin) : 0,
        baseScale,
      })
    }
  }

  update(dt: number): void {
    let removed = false
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]
      p.age += dt
      if (p.age >= p.life) {
        this.live.splice(i, 1)
        this.pool.push(p.particle)
        removed = true
        continue
      }
      const t = p.age / p.life
      const damping = Math.max(0, 1 - p.drag * dt)
      p.vx *= damping
      p.vy = p.vy * damping + p.gravity * dt
      p.particle.x += p.vx * dt
      p.particle.y += p.vy * dt
      p.particle.rotation += p.spin * dt
      p.particle.alpha = t < 0.1 ? t / 0.1 : 1 - Math.pow((t - 0.1) / 0.9, 2)
      const scale = p.baseScale * (1 - t * 0.35)
      p.particle.scaleX = p.particle.scaleY = scale
    }

    if (removed) {
      const alive = new Set(this.live.map((p) => p.particle))
      this.container.particleChildren = this.container.particleChildren.filter((p) => alive.has(p as Particle))
      this.container.update()
    }
  }

  clear(): void {
    this.live.forEach((p) => this.pool.push(p.particle))
    this.live.length = 0
    this.container.removeParticles()
  }
}
