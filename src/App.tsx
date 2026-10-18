import { useEffect } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { GameCanvas } from './components/GameCanvas'
import { LoadingScreen } from './components/LoadingScreen'
import { PaytableModal } from './components/PaytableModal'
import { TopBar } from './components/TopBar'
import { useGameStore } from './store/gameStore'

function useHotkeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const state = useGameStore.getState()

      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault()
        ;(document.activeElement as HTMLElement | null)?.blur?.()
      }

      if (state.paytableOpen) {
        if (event.code === 'Escape') state.setPaytableOpen(false)
        return
      }

      if (state.phase === 'ready') {
        if (event.code === 'Space' || event.code === 'Enter') state.start()
        return
      }

      switch (event.code) {
        case 'Space':
          void state.spin()
          break
        case 'KeyB':
          state.armBigWin()
          break
        case 'KeyT':
          state.toggleTurbo()
          break
        case 'KeyA':
          state.toggleAutoplay()
          break
        case 'KeyM':
          state.toggleMute()
          break
        case 'KeyI':
          state.setPaytableOpen(true)
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

export default function App() {
  useHotkeys()

  return (
    <main className="relative h-full w-full overflow-hidden bg-night-950">
      <GameCanvas />
      <TopBar />
      <ControlPanel />
      <PaytableModal />
      <LoadingScreen />
    </main>
  )
}
