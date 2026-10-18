import gsap from 'gsap'
import { GlowFilter } from 'pixi-filters/glow'
import { Container, Sprite } from 'pixi.js'
import { SYMBOLS, type SymbolId } from '../config'
import { symbolTexture } from './assets'
import { SYMBOL_SIZE } from './layout'

export class SymbolView extends Container {
  symbol: SymbolId
  private readonly sprite: Sprite
  private glow: GlowFilter | null = null
  private baseScale = 1

  constructor(symbol: SymbolId) {
    super()
    this.symbol = symbol
    this.sprite = new Sprite({ anchor: 0.5 })
    this.addChild(this.sprite)
    this.setSymbol(symbol)
  }

  setSymbol(symbol: SymbolId): void {
    this.symbol = symbol
    const texture = symbolTexture(symbol)
    this.sprite.texture = texture
    const size = symbol === 'wild' ? SYMBOL_SIZE * 1.08 : SYMBOL_SIZE
    this.baseScale = size / Math.max(texture.width, texture.height)
    this.sprite.scale.set(this.baseScale)
  }

  highlight(): void {
    gsap.killTweensOf(this.sprite.scale)
    gsap.killTweensOf(this.sprite)
    this.sprite.alpha = 1
    this.sprite.tint = 0xffffff

    if (!this.glow) {
      this.glow = new GlowFilter({ distance: 14, outerStrength: 0, quality: 0.25 })
    }
    this.glow.color = SYMBOLS[this.symbol].color
    this.sprite.filters = [this.glow]
    gsap
      .timeline()
      .fromTo(this.glow, { outerStrength: 0 }, { outerStrength: 2.2, duration: 0.25, ease: 'power2.out' })
      .to(this.glow, { outerStrength: 1.1, duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1 })

    const s = this.baseScale
    gsap
      .timeline()
      .fromTo(this.sprite.scale, { x: s * 0.85, y: s * 0.85 }, { x: s * 1.18, y: s * 1.18, duration: 0.22, ease: 'back.out(3)' })
      .to(this.sprite.scale, { x: s * 1.05, y: s * 1.05, duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  }

  dim(): void {
    this.reset()
    gsap.to(this.sprite, { alpha: 0.28, duration: 0.25 })
    this.sprite.tint = 0x9a8fb8
  }

  reset(): void {
    gsap.killTweensOf(this.sprite.scale)
    gsap.killTweensOf(this.sprite)
    if (this.glow) gsap.killTweensOf(this.glow)
    this.sprite.filters = null
    this.sprite.alpha = 1
    this.sprite.tint = 0xffffff
    this.sprite.scale.set(this.baseScale)
  }

  override destroy(): void {
    this.reset()
    this.glow?.destroy()
    super.destroy({ children: true })
  }
}
