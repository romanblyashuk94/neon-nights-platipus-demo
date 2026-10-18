import { Assets, BitmapFont, Cache, Graphics, type Renderer, Texture } from 'pixi.js'
import { SYMBOL_IDS, type SymbolId } from '../config'

const BASE = import.meta.env.BASE_URL

const ASSETS = [
  { alias: 'bg', src: `${BASE}assets/bg.jpg` },
  ...SYMBOL_IDS.map((id) => ({ alias: `symbol-${id}`, src: `${BASE}assets/symbols/${id}.png` })),
]

let registered = false

export async function loadGameAssets(onProgress: (progress: number) => void): Promise<void> {
  if (!registered) {
    Assets.add(ASSETS)
    registered = true
  }

  const fonts = Promise.all([
    document.fonts.load('900 64px Orbitron'),
    document.fonts.load('700 32px Orbitron'),
    document.fonts.load('700 32px Rajdhani'),
  ])

  await Promise.all([Assets.load(ASSETS.map((a) => a.alias), onProgress), fonts])
}

export function symbolTexture(id: SymbolId): Texture {
  return Assets.get<Texture>(`symbol-${id}`)
}

export function backgroundTexture(): Texture {
  return Assets.get<Texture>('bg')
}

export interface GeneratedTextures {
  softDot: Texture
  sparkle: Texture
  coin: Texture
  scanline: Texture
  destroy(): void
}

/** Procedural textures rendered once at startup, so no extra image files are needed. */
export function createGeneratedTextures(renderer: Renderer): GeneratedTextures {
  const make = (g: Graphics, resolution = 2) => {
    const texture = renderer.generateTexture({ target: g, resolution, antialias: true })
    g.destroy()
    return texture
  }

  const dot = new Graphics()
  const radius = 32
  for (let i = 0; i < 16; i++) {
    dot.circle(radius, radius, radius * (1 - i / 16)).fill({ color: 0xffffff, alpha: 0.035 + i * 0.006 })
  }
  dot.circle(radius, radius, radius * 0.18).fill({ color: 0xffffff, alpha: 1 })

  const sparkle = new Graphics()
  const r = 32
  const w = 5
  sparkle
    .poly([r, 0, r + w, r - w, r * 2, r, r + w, r + w, r, r * 2, r - w, r + w, 0, r, r - w, r - w])
    .fill(0xffffff)
  sparkle.circle(r, r, 7).fill({ color: 0xffffff, alpha: 0.9 })

  const coin = new Graphics()
  coin.circle(24, 24, 23).fill(0xffb627).stroke({ color: 0xfff3b0, width: 3 })
  coin.circle(24, 24, 16).stroke({ color: 0xd98e04, width: 3 })
  coin.star(24, 24, 5, 10, 4.5).fill(0xfff6cc)

  const scan = new Graphics()
  scan.rect(0, 0, 4, 2).fill({ color: 0x000000, alpha: 0 })
  scan.rect(0, 2, 4, 2).fill({ color: 0x000000, alpha: 0.55 })

  const textures = {
    softDot: make(dot),
    sparkle: make(sparkle),
    coin: make(coin),
    scanline: make(scan, 1),
  }

  return {
    ...textures,
    destroy() {
      Object.values(textures).forEach((t) => t.destroy(true))
    },
  }
}

export const WIN_FONT = 'NeonDigits'
export const SMALL_WIN_FONT = 'NeonDigitsSmall'

/** Bitmap fonts for counters that change every frame (no canvas re-render per update). */
export function installBitmapFonts(): void {
  if (Cache.has(`${WIN_FONT}-bitmap`)) return
  const chars = [['0', '9'], '.,+x WINLE']
  const resolution = Math.min(window.devicePixelRatio || 1, 2)

  BitmapFont.install({
    name: WIN_FONT,
    chars,
    resolution,
    padding: 24,
    style: {
      fontFamily: 'Orbitron',
      fontWeight: '900',
      fontSize: 96,
      fill: 0xfff3a3,
      stroke: { color: 0x4c0a63, width: 8, join: 'round' },
      dropShadow: { color: 0xff2bd6, blur: 18, distance: 0, alpha: 0.9, angle: 0 },
    },
  })

  BitmapFont.install({
    name: SMALL_WIN_FONT,
    chars,
    resolution,
    padding: 12,
    style: {
      fontFamily: 'Orbitron',
      fontWeight: '700',
      fontSize: 34,
      fill: 0xffffff,
      stroke: { color: 0x14052e, width: 5, join: 'round' },
      dropShadow: { color: 0x22e8ff, blur: 8, distance: 0, alpha: 0.9, angle: 0 },
    },
  })
}
