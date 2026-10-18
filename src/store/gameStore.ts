import { create } from 'zustand'
import { sfx } from '../audio/sfx'
import { BET_OPTIONS, DEFAULT_BET, START_BALANCE, WIN_TIERS, type WinTier } from '../game/config'
import type { SlotGame } from '../game/engine/SlotGame'
import { roundMoney } from '../game/math/evaluate'
import { spin as rollSpin, spinWithMinMultiplier } from '../game/math/spin'

export type Phase = 'loading' | 'ready' | 'idle' | 'spinning' | 'presenting'

const BIG_WIN_MULTIPLIER = WIN_TIERS.find((t) => t.tier === 'big')!.minMultiplier

interface GameState {
  engine: SlotGame | null
  phase: Phase
  started: boolean
  loadProgress: number
  balance: number
  bet: number
  lastWin: number
  lastTier: WinTier
  turbo: boolean
  autoplay: boolean
  muted: boolean
  forceBigWin: boolean
  outOfCredits: boolean
  paytableOpen: boolean
  insets: { top: number; bottom: number }

  attachEngine: (engine: SlotGame | null) => void
  setLoadProgress: (progress: number) => void
  start: () => void
  spin: () => Promise<void>
  changeBet: (direction: 1 | -1) => void
  toggleTurbo: () => void
  toggleAutoplay: () => void
  toggleMute: () => void
  armBigWin: () => void
  refill: () => void
  setPaytableOpen: (open: boolean) => void
  setInset: (side: 'top' | 'bottom', px: number) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  engine: null,
  phase: 'loading',
  started: false,
  loadProgress: 0,
  balance: START_BALANCE,
  bet: DEFAULT_BET,
  lastWin: 0,
  lastTier: 'none',
  turbo: false,
  autoplay: false,
  muted: false,
  forceBigWin: false,
  outOfCredits: false,
  paytableOpen: false,
  insets: { top: 0, bottom: 0 },

  attachEngine: (engine) => {
    if (engine) {
      const { insets } = get()
      engine.setInsets(insets.top, insets.bottom)
    }
    set((s) => ({
      engine,
      phase: engine ? (s.started ? 'idle' : 'ready') : 'loading',
      autoplay: false,
    }))
  },

  setLoadProgress: (loadProgress) => set({ loadProgress }),

  start: () => {
    sfx.unlock()
    sfx.click()
    if (get().phase === 'ready') set({ phase: 'idle', started: true })
  },

  spin: async () => {
    const state = get()
    const engine = state.engine
    if (!engine?.isReady) return
    sfx.unlock()

    if (state.phase === 'spinning') {
      engine.quickStop()
      return
    }
    if (state.phase === 'presenting') {
      engine.skipPresentation()
      return
    }
    if (state.phase !== 'idle' || state.paytableOpen) return

    if (state.balance < state.bet) {
      set({ outOfCredits: true, autoplay: false })
      return
    }

    const result = state.forceBigWin ? spinWithMinMultiplier(state.bet, BIG_WIN_MULTIPLIER) : rollSpin(state.bet)
    set({
      phase: 'spinning',
      balance: roundMoney(state.balance - state.bet),
      lastWin: 0,
      lastTier: 'none',
      forceBigWin: false,
      outOfCredits: false,
    })

    try {
      await engine.spin(result, state.turbo)
      if (result.totalWin > 0 && get().engine === engine) {
        const isBigWin = result.tier !== 'none' && result.tier !== 'small'
        set({ phase: 'presenting', lastTier: result.tier, ...(isBigWin ? {} : { lastWin: result.totalWin }) })
        await engine.presentWin(result, get().turbo)
        set((s) => ({ balance: roundMoney(s.balance + result.totalWin), lastWin: result.totalWin }))
      }
    } finally {
      if (get().engine === engine) set({ phase: 'idle' })
    }

    const after = get()
    if (after.autoplay && after.engine === engine) {
      window.setTimeout(() => {
        const s = get()
        if (s.autoplay && s.phase === 'idle') void s.spin()
      }, after.turbo ? 250 : 650)
    }
  },

  changeBet: (direction) => {
    const { bet, phase } = get()
    if (phase !== 'idle') return
    const index = BET_OPTIONS.indexOf(bet as (typeof BET_OPTIONS)[number])
    const next = BET_OPTIONS[Math.min(BET_OPTIONS.length - 1, Math.max(0, index + direction))]
    if (next !== bet) {
      sfx.click()
      set({ bet: next, outOfCredits: false })
    }
  },

  toggleTurbo: () => {
    sfx.click()
    set((s) => ({ turbo: !s.turbo }))
  },

  toggleAutoplay: () => {
    sfx.click()
    const autoplay = !get().autoplay
    set({ autoplay })
    if (autoplay && get().phase === 'idle') void get().spin()
  },

  toggleMute: () => {
    const muted = !get().muted
    sfx.setMuted(muted)
    set({ muted })
    sfx.click()
  },

  armBigWin: () => {
    sfx.click()
    set((s) => ({ forceBigWin: !s.forceBigWin }))
  },

  refill: () => {
    sfx.click()
    set({ balance: START_BALANCE, outOfCredits: false })
  },

  setPaytableOpen: (paytableOpen) => {
    sfx.click()
    set({ paytableOpen })
  },

  setInset: (side, px) => {
    const insets = { ...get().insets, [side]: px }
    set({ insets })
    get().engine?.setInsets(insets.top, insets.bottom)
  },
}))
