import gsap from 'gsap'
import { BitmapText, Container, FillGradient, Graphics, Rectangle, Sprite, Text } from 'pixi.js'
import { WIN_TIERS, type WinTier } from '../config'
import { type GeneratedTextures, WIN_FONT } from './assets'
import { ParticleSystem } from './particles'
import { formatMoney } from './WinPresenter'

type BigTier = Exclude<WinTier, 'none' | 'small'>

const TIER_STYLE: Record<BigTier, { color: number; coinsPerSecond: number; duration: number }> = {
  big: { color: 0xff2bd6, coinsPerSecond: 55, duration: 3.4 },
  mega: { color: 0x22e8ff, coinsPerSecond: 95, duration: 5 },
  epic: { color: 0xffe14d, coinsPerSecond: 150, duration: 6.5 },
}

const ASCENDING = [...WIN_TIERS].sort((a, b) => a.minMultiplier - b.minMultiplier)

export interface BigWinCallbacks {
  onTierUp: (tier: BigTier) => void
  onCountTick: () => void
}

/** Full-screen celebration: escalating BIG → MEGA → EPIC title, count-up, coin fountain. */
export class BigWinOverlay extends Container {
  private readonly dim = new Graphics()
  private readonly rays = new Graphics({ blendMode: 'add' })
  private readonly halo: Sprite
  private readonly content = new Container()
  private readonly title: Text
  private readonly amount: BitmapText
  private readonly hint: Text
  private readonly coins: ParticleSystem
  private readonly sparkles: ParticleSystem
  private readonly titleFill: FillGradient

  private screenW = 1
  private screenH = 1
  private tier: BigTier = 'big'
  private phase: 'idle' | 'counting' | 'holding' | 'closing' = 'idle'
  private coinBudget = 0
  private time = 0
  private countTween: gsap.core.Tween | null = null
  private holdCall: gsap.core.Tween | null = null
  private resolvePlay: (() => void) | null = null
  private finalAmount = 0

  constructor(textures: GeneratedTextures) {
    super()
    this.visible = false
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.on('pointertap', () => this.skip())

    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2
      const a1 = a0 + (Math.PI * 2) / 48
      this.rays
        .moveTo(0, 0)
        .lineTo(Math.cos(a0) * 1400, Math.sin(a0) * 1400)
        .lineTo(Math.cos(a1) * 1400, Math.sin(a1) * 1400)
        .closePath()
        .fill({ color: 0xffffff, alpha: 0.07 })
    }

    this.halo = new Sprite({ texture: textures.softDot, anchor: 0.5, scale: 13, blendMode: 'add', alpha: 0.55 })

    this.titleFill = new FillGradient({
      colorStops: [
        { offset: 0, color: '#fffce8' },
        { offset: 0.45, color: '#ffe14d' },
        { offset: 1, color: '#ff7a1a' },
      ],
    })
    this.title = new Text({
      text: 'BIG WIN',
      anchor: 0.5,
      resolution: 2,
      style: {
        fontFamily: 'Orbitron',
        fontWeight: '900',
        fontSize: 128,
        letterSpacing: 6,
        fill: this.titleFill,
        stroke: { color: '#2e0650', width: 12, join: 'round' },
        dropShadow: { color: TIER_STYLE.big.color, blur: 30, distance: 0, alpha: 1, angle: 0 },
        padding: 60,
      },
    })
    this.title.y = -70

    this.amount = new BitmapText({ text: '0.00', anchor: 0.5, style: { fontFamily: WIN_FONT, fontSize: 112 } })
    this.amount.y = 80

    this.hint = new Text({
      text: 'TAP TO CONTINUE',
      anchor: 0.5,
      resolution: 2,
      style: { fontFamily: 'Rajdhani', fontWeight: '700', fontSize: 22, letterSpacing: 8, fill: 0xe9ddff },
    })
    this.hint.y = 190
    this.hint.alpha = 0

    this.coins = new ParticleSystem(textures.coin, 'normal', 900)
    this.sparkles = new ParticleSystem(textures.sparkle, 'add', 400)

    this.content.addChild(this.halo, this.title, this.amount, this.hint)
    this.addChild(this.dim, this.rays, this.coins, this.content, this.sparkles)
  }

  get isActive(): boolean {
    return this.phase !== 'idle'
  }

  resize(width: number, height: number): void {
    this.screenW = width
    this.screenH = height
    this.hitArea = new Rectangle(0, 0, width, height)
    this.dim.clear().rect(0, 0, width, height).fill({ color: 0x05010f, alpha: 0.8 })
    this.rays.position.set(width / 2, height / 2 - 20)
    this.content.position.set(width / 2, height / 2)
    this.content.scale.set(Math.min(1, width / 980, height / 640))
  }

  play(amount: number, bet: number, turbo: boolean, callbacks: BigWinCallbacks): Promise<void> {
    this.finalAmount = amount
    this.phase = 'counting'
    this.visible = true
    this.alpha = 1
    this.coinBudget = 0

    const finalTier = [...ASCENDING].reverse().find((t) => amount >= t.minMultiplier * bet)?.tier ?? 'big'
    this.setTier('big')
    callbacks.onTierUp('big')

    this.dim.alpha = 0
    gsap.to(this.dim, { alpha: 1, duration: 0.35 })
    this.rays.alpha = 0
    gsap.to(this.rays, { alpha: 1, duration: 0.6 })
    this.hint.alpha = 0
    this.amount.text = '0.00'
    gsap.fromTo(this.content.scale, { x: 0.2, y: 0.2 }, { x: this.content.scale.x, y: this.content.scale.y, duration: 0.6, ease: 'back.out(2)' })

    const counter = { value: 0 }
    let lastTick = 0
    const duration = TIER_STYLE[finalTier].duration * (turbo ? 0.55 : 1)

    return new Promise((resolve) => {
      this.resolvePlay = resolve
      this.countTween = gsap.to(counter, {
        value: amount,
        duration,
        ease: 'power1.inOut',
        onUpdate: () => {
          this.amount.text = formatMoney(counter.value)
          const reached = [...ASCENDING].reverse().find((t) => counter.value >= t.minMultiplier * bet)?.tier
          if (reached && reached !== this.tier && ASCENDING.findIndex((t) => t.tier === reached) > ASCENDING.findIndex((t) => t.tier === this.tier)) {
            this.setTier(reached)
            callbacks.onTierUp(reached)
          }
          const now = performance.now()
          if (now - lastTick > 60) {
            lastTick = now
            callbacks.onCountTick()
          }
        },
        onComplete: () => this.hold(finalTier, callbacks),
      })
    })
  }

  /** First tap fast-forwards the count, second tap closes. */
  skip(): void {
    if (this.phase === 'counting') this.countTween?.progress(1)
    else if (this.phase === 'holding') this.close()
  }

  update(dt: number): void {
    if (this.phase === 'idle') return
    this.time += dt
    this.rays.rotation += dt * 0.25
    this.halo.alpha = 0.45 + Math.sin(this.time * 3) * 0.12
    this.title.scale.set(1 + Math.sin(this.time * 4) * 0.025)
    if (this.phase === 'holding') this.hint.alpha = 0.55 + Math.sin(this.time * 4) * 0.35

    if (this.phase === 'counting' || this.phase === 'holding') {
      this.coinBudget += dt * TIER_STYLE[this.tier].coinsPerSecond * (this.phase === 'holding' ? 0.35 : 1)
      const count = Math.floor(this.coinBudget)
      this.coinBudget -= count
      if (count > 0) this.emitCoins(count)
    }
    this.coins.update(dt)
    this.sparkles.update(dt)
  }

  private hold(finalTier: BigTier, callbacks: BigWinCallbacks): void {
    if (this.tier !== finalTier) {
      this.setTier(finalTier)
      callbacks.onTierUp(finalTier)
    }
    this.countTween = null
    this.phase = 'holding'
    this.amount.text = formatMoney(this.finalAmount)
    gsap.fromTo(this.amount.scale, { x: 1.35, y: 1.35 }, { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    this.holdCall = gsap.delayedCall(2.6, () => this.close())
  }

  private close(): void {
    if (this.phase === 'closing') return
    this.phase = 'closing'
    this.holdCall?.kill()
    gsap.to(this, {
      alpha: 0,
      duration: 0.4,
      onComplete: () => {
        this.visible = false
        this.phase = 'idle'
        this.coins.clear()
        this.sparkles.clear()
        this.resolvePlay?.()
        this.resolvePlay = null
      },
    })
  }

  private setTier(tier: BigTier): void {
    this.tier = tier
    const label = WIN_TIERS.find((t) => t.tier === tier)!.label
    const { color } = TIER_STYLE[tier]
    this.title.text = label
    this.title.style.dropShadow = { color, blur: 30, distance: 0, alpha: 1, angle: 0 }
    this.rays.tint = color
    this.halo.tint = color
    gsap.fromTo(this.title, { alpha: 0.2 }, { alpha: 1, duration: 0.25 })
    gsap.fromTo(this.content.pivot, { y: -12 }, { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })

    this.sparkles.spawn({
      x: this.screenW / 2,
      y: this.screenH / 2 - 60,
      count: 60,
      colors: [0xffffff, color, 0xffe14d],
      speed: [200, 900],
      life: [0.6, 1.3],
      scale: [0.4, 1],
      drag: 2,
      spin: [-6, 6],
    })
  }

  private emitCoins(count: number): void {
    const left = Math.random() < 0.5
    this.coins.spawn({
      x: this.screenW / 2 + (left ? -1 : 1) * this.screenW * 0.18,
      y: this.screenH + 30,
      count,
      colors: [0xffffff, 0xfff0b3, 0xffd77a],
      speed: [this.screenH * 1.05, this.screenH * 1.6],
      angle: left ? [-Math.PI / 2 - 0.55, -Math.PI / 2 + 0.2] : [-Math.PI / 2 - 0.2, -Math.PI / 2 + 0.55],
      life: [1.6, 2.4],
      scale: [0.55, 1.05],
      gravity: this.screenH * 1.5,
      spin: [-9, 9],
      spread: 40,
    })
  }

  override destroy(): void {
    this.countTween?.kill()
    this.holdCall?.kill()
    gsap.killTweensOf(this)
    gsap.killTweensOf(this.dim)
    gsap.killTweensOf(this.rays)
    gsap.killTweensOf(this.title)
    this.titleFill.destroy()
    super.destroy({ children: true })
  }
}
