import { useEffect, useRef } from 'react'
import { sfx } from '../audio/sfx'
import { SlotGame } from '../game/engine/SlotGame'
import { useGameStore } from '../store/gameStore'

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let game: SlotGame | null = null

    // Deferred so React StrictMode's mount → unmount → mount only ever creates one Application.
    const timer = window.setTimeout(() => {
      const instance = (game = new SlotGame())
      const { events } = instance
      events.on('spinStart', () => sfx.spinStart())
      events.on('reelStop', (reel) => sfx.reelStop(reel))
      events.on('win', (result) => sfx.win(result.tier))
      events.on('lineShown', () => sfx.lineShown())
      events.on('countTick', () => sfx.tick())
      events.on('tierUp', (tier) => sfx.tierUp(tier))

      instance
        .init(host, (progress) => useGameStore.getState().setLoadProgress(progress))
        .then(() => {
          if (instance.isReady) useGameStore.getState().attachEngine(instance)
        })
        .catch((error: unknown) => console.error('Failed to start the game', error))
    }, 0)

    return () => {
      window.clearTimeout(timer)
      if (game) {
        if (useGameStore.getState().engine === game) useGameStore.getState().attachEngine(null)
        void game.destroy()
      }
    }
  }, [])

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden" />
}
