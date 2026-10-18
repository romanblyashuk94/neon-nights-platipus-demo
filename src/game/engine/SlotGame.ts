import gsap from 'gsap'
import { ShockwaveFilter } from 'pixi-filters/shockwave'
import { Application, Container, EventEmitter, Rectangle, type Ticker } from 'pixi.js'
import type { WinTier } from '../config'
import { spin as rollSpin, type SpinResult } from '../math/spin'
import { createGeneratedTextures, type GeneratedTextures, installBitmapFonts, loadGameAssets } from './assets'
import { Background } from './Background'
import { BigWinOverlay } from './BigWinOverlay'
import { BOARD_BOUNDS, FRAME_PAD, LOGO_HEIGHT, REELS_W } from './layout'
import { Logo } from './Logo'
import { ReelFrame } from './ReelFrame'
import { NORMAL_TIMING, ReelSet, TURBO_TIMING } from './ReelSet'
import { WinPresenter } from './WinPresenter'

export interface SlotGameEvents {
  spinStart: []
  reelStop: [reel: number]
  win: [result: SpinResult]
  lineShown: []
  countTick: []
  tierUp: [tier: WinTier]
  bigWinEnd: []
}

interface Scene {
  root: Container
  background: Background
  board: Container
  logo: Logo
  frame: ReelFrame
  reelSet: ReelSet
  winPresenter: WinPresenter
  bigWin: BigWinOverlay
  textures: GeneratedTextures
}

const isBigTier = (tier: WinTier) => tier === 'big' || tier === 'mega' || tier === 'epic'

/**
 * Imperative PixiJS game client. React owns the HUD and talks to the game only
 * through this class: `spin()`, `presentWin()`, `quickStop()` and `events`.
 */
export class SlotGame {
  readonly events = new EventEmitter<SlotGameEvents>()

  private readonly app = new Application()
  private initPromise: Promise<void> | null = null
  private scene: Scene | null = null
  private destroyed = false
  private insets = { top: 0, bottom: 0 }
  private boardBase = { x: 0, y: 0 }
  private readonly shake = { x: 0, y: 0 }
  private readonly pointer = { x: 0, y: 0 }

  init(host: HTMLElement, onProgress: (progress: number) => void): Promise<void> {
    this.initPromise ??= this.doInit(host, onProgress)
    return this.initPromise
  }

  get isReady(): boolean {
    return this.scene !== null && !this.destroyed
  }

  setInsets(top: number, bottom: number): void {
    this.insets = { top, bottom }
    if (this.scene) this.layout()
  }

  async spin(result: SpinResult, turbo: boolean): Promise<void> {
    const scene = this.requireScene()
    scene.winPresenter.clear()
    this.events.emit('spinStart')
    await scene.reelSet.spin(result.grid, turbo ? TURBO_TIMING : NORMAL_TIMING, (reel) => this.events.emit('reelStop', reel))
  }

  async presentWin(result: SpinResult, turbo: boolean): Promise<void> {
    const scene = this.requireScene()
    if (result.wins.length === 0) return
    this.events.emit('win', result)

    const options = {
      turbo,
      onLineShown: () => this.events.emit('lineShown'),
      onCountTick: () => this.events.emit('countTick'),
    }

    if (!isBigTier(result.tier)) {
      await scene.winPresenter.present(result, { ...options, showTotal: true })
      return
    }

    await scene.winPresenter.present(result, { ...options, showTotal: false })
    await scene.bigWin.play(result.totalWin, result.bet, turbo, {
      onTierUp: (tier) => {
        this.shockwave()
        this.shakeBoard(tier === 'epic' ? 18 : tier === 'mega' ? 13 : 9, 0.55)
        this.events.emit('tierUp', tier)
      },
      onCountTick: () => this.events.emit('countTick'),
    })
    this.events.emit('bigWinEnd')
  }

  /** Slam stop while spinning. */
  quickStop(): void {
    this.scene?.reelSet.quickStop()
  }

  /** Fast-forwards the win count-up / big win overlay. */
  skipPresentation(): void {
    if (!this.scene) return
    if (this.scene.bigWin.isActive) this.scene.bigWin.skip()
    else this.scene.winPresenter.skip()
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return
    this.destroyed = true
    window.removeEventListener('pointermove', this.onPointerMove)
    this.events.removeAllListeners()

    try {
      await this.initPromise
    } catch {
      // init failure is irrelevant once we are tearing down
    }

    gsap.killTweensOf(this.shake)
    if (this.scene) {
      this.app.ticker.remove(this.tick)
      this.app.renderer.off('resize', this.layout)
      this.scene.frame.destroy()
      this.scene.textures.destroy()
    }
    if (this.app.renderer) {
      this.app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true })
    }
    this.scene = null
  }

  private async doInit(host: HTMLElement, onProgress: (progress: number) => void): Promise<void> {
    await this.app.init({
      resizeTo: host,
      background: '#05010f',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
      powerPreference: 'high-performance',
    })
    if (this.destroyed) return

    this.app.canvas.style.position = 'absolute'
    this.app.canvas.style.inset = '0'
    host.appendChild(this.app.canvas)

    await loadGameAssets(onProgress)
    if (this.destroyed) return

    installBitmapFonts()
    this.scene = this.buildScene()
    this.app.stage.addChild(this.scene.root)

    this.app.renderer.on('resize', this.layout)
    window.addEventListener('pointermove', this.onPointerMove)
    this.app.ticker.add(this.tick)
    this.layout()
  }

  private buildScene(): Scene {
    const textures = createGeneratedTextures(this.app.renderer)

    let initial = rollSpin(1)
    while (initial.wins.length > 0) initial = rollSpin(1)

    const background = new Background(textures)
    const frame = new ReelFrame(textures)
    const reelSet = new ReelSet(initial.grid)
    const winPresenter = new WinPresenter(reelSet, frame, textures)
    const logo = new Logo()
    logo.position.set(REELS_W / 2, -FRAME_PAD - LOGO_HEIGHT + 44)

    const board = new Container()
    board.addChild(frame.back, reelSet, frame.front, logo, winPresenter)
    board.pivot.set(BOARD_BOUNDS.x + BOARD_BOUNDS.width / 2, BOARD_BOUNDS.y + BOARD_BOUNDS.height / 2)

    const bigWin = new BigWinOverlay(textures)
    const root = new Container()
    root.addChild(background, board, bigWin)

    return { root, background, board, logo, frame, reelSet, winPresenter, bigWin, textures }
  }

  private readonly layout = (): void => {
    if (!this.scene) return
    const { width, height } = this.app.screen
    const { background, bigWin, board } = this.scene

    background.resize(width, height)
    bigWin.resize(width, height)

    const availableH = Math.max(120, height - this.insets.top - this.insets.bottom)
    const scale = Math.min((width - 24) / BOARD_BOUNDS.width, (availableH - 28) / BOARD_BOUNDS.height, 1.3)
    board.scale.set(scale)
    this.boardBase = { x: width / 2, y: this.insets.top + availableH / 2 }
  }

  private readonly tick = (ticker: Ticker): void => {
    if (!this.scene) return
    const dt = Math.min(ticker.deltaMS / 1000, 0.05)
    const { background, frame, logo, reelSet, winPresenter, bigWin, board } = this.scene

    background.update(dt)
    frame.update(dt)
    logo.update(dt)
    reelSet.update(dt)
    winPresenter.update(dt)
    bigWin.update(dt)

    board.position.set(
      this.boardBase.x + this.shake.x - this.pointer.x * 6,
      this.boardBase.y + this.shake.y - this.pointer.y * 4,
    )
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = (event.clientY / window.innerHeight) * 2 - 1
    this.scene?.background.setParallax(this.pointer.x, this.pointer.y)
  }

  private shockwave(): void {
    if (!this.scene) return
    const { root } = this.scene
    const { width, height } = this.app.screen
    const filter = new ShockwaveFilter({
      center: { x: width / 2, y: height / 2 },
      amplitude: 26,
      wavelength: 170,
      speed: Math.max(width, height) * 0.9,
      brightness: 1.15,
      radius: -1,
    })
    root.filterArea = new Rectangle(0, 0, width, height)
    root.filters = [filter]
    gsap.to(filter, {
      time: 1.3,
      duration: 1.3,
      ease: 'none',
      onComplete: () => {
        if (root.destroyed) return
        if (Array.isArray(root.filters) && root.filters[0] === filter) root.filters = null
        filter.destroy()
      },
    })
  }

  private shakeBoard(intensity: number, duration: number): void {
    gsap.killTweensOf(this.shake)
    const steps = Math.round(duration / 0.035)
    const timeline = gsap.timeline()
    for (let i = 0; i < steps; i++) {
      const falloff = 1 - i / steps
      timeline.to(this.shake, {
        x: (Math.random() * 2 - 1) * intensity * falloff,
        y: (Math.random() * 2 - 1) * intensity * falloff,
        duration: 0.035,
        ease: 'none',
      })
    }
    timeline.to(this.shake, { x: 0, y: 0, duration: 0.06 })
  }

  private requireScene(): Scene {
    if (!this.scene) throw new Error('SlotGame is not initialised')
    return this.scene
  }
}
