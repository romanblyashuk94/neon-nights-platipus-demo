import { useEffect, useState } from 'react'
import { cn } from '../lib/format'
import { useGameStore } from '../store/gameStore'

const BASE = import.meta.env.BASE_URL

function LoadingProgress() {
  const percent = useGameStore((s) => Math.round(s.loadProgress * 100))

  return (
    <div className="w-64 sm:w-80">
      <div className="h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        <div
          className="h-full rounded-full bg-linear-to-r from-neon-cyan via-neon-purple to-neon-pink shadow-[0_0_16px_rgba(255,43,214,0.8)] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 font-display text-xs font-bold tracking-[0.4em] text-violet-200/60">LOADING {percent}%</p>
    </div>
  )
}

export function LoadingScreen() {
  const ready = useGameStore((s) => s.phase === 'ready')
  const start = useGameStore((s) => s.start)
  const visible = !useGameStore((s) => s.started)
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    if (visible) return
    const timer = window.setTimeout(() => setMounted(false), 700)
    return () => window.clearTimeout(timer)
  }, [visible])

  if (!mounted) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-night-950 transition-all duration-700',
        visible ? 'opacity-100' : 'pointer-events-none scale-110 opacity-0',
      )}
    >
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-md"
        style={{ backgroundImage: `url(${BASE}assets/bg.jpg)` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,var(--color-night-950)_75%)]" />

      <div className="relative flex flex-col items-center px-6 text-center">
        <h1 className="font-display text-5xl font-black tracking-[0.12em] sm:text-7xl">
          <span className="text-neon-pink text-glow-pink">NEON</span>{' '}
          <span className="animate-flicker text-neon-cyan text-glow-cyan">NIGHTS</span>
        </h1>
        <p className="mt-3 text-sm font-bold tracking-[0.5em] text-violet-200/70 sm:text-base">5 REELS · 10 LINES · WILDS</p>

        <div className="mt-12 h-24">
          {ready ? (
            <button
              type="button"
              onClick={start}
              className="group relative animate-pop-in rounded-full px-12 py-4 font-display text-xl font-black tracking-[0.3em] text-white"
            >
              <span className="absolute -inset-3 animate-glow-pulse rounded-full bg-neon-pink/40 blur-2xl" />
              <span className="absolute inset-0 rounded-full bg-linear-to-r from-neon-pink via-neon-purple to-neon-cyan bg-[length:200%_100%] animate-shimmer" />
              <span className="absolute inset-[3px] rounded-full bg-night-900 transition group-hover:bg-night-800" />
              <span className="relative text-glow-cyan">PLAY</span>
            </button>
          ) : (
            <LoadingProgress />
          )}
        </div>
        <p className="text-xs tracking-[0.3em] text-violet-200/40">{ready ? 'PRESS SPACE OR TAP TO START' : '\u00a0'}</p>
      </div>
    </div>
  )
}
