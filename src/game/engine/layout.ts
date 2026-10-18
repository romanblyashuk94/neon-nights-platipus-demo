import { REEL_COUNT, ROW_COUNT } from '../config'

export const CELL_W = 176
export const CELL_H = 160
export const REEL_GAP = 8
export const SYMBOL_SIZE = 150

export const REELS_W = REEL_COUNT * CELL_W + (REEL_COUNT - 1) * REEL_GAP
export const REELS_H = ROW_COUNT * CELL_H

export const FRAME_PAD = 22
export const FRAME_RADIUS = 30
export const LOGO_HEIGHT = 128
/** Distance from the frame edge to the outer edge of the marquee lights. */
export const LIGHTS_REACH = 30

/** Board-local bounds of everything that has to fit on screen (logo + frame + glow). */
export const BOARD_BOUNDS = {
  x: -FRAME_PAD - LIGHTS_REACH,
  y: -FRAME_PAD - LOGO_HEIGHT,
  width: REELS_W + (FRAME_PAD + LIGHTS_REACH) * 2,
  height: REELS_H + FRAME_PAD * 2 + LOGO_HEIGHT + LIGHTS_REACH,
}

export function reelX(reel: number): number {
  return reel * (CELL_W + REEL_GAP)
}

export function cellCenter(reel: number, row: number): { x: number; y: number } {
  return { x: reelX(reel) + CELL_W / 2, y: row * CELL_H + CELL_H / 2 }
}
