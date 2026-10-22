import type { ComponentType, SVGProps } from 'react'
import { cn } from '../lib/format'
import { useReportInset } from '../lib/hooks'
import { useGameStore } from '../store/gameStore'
import { BalanceDisplay } from './BalanceDisplay'
import { BetSelector } from './BetSelector'
import { AutoIcon, BoltIcon } from './icons'
import { SpinButton } from './SpinButton'

function ToggleButton({
  label,
  active,
  onClick,
  icon: Icon,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: ComponentType<SVGProps<SVGSVGElement>>
  color: 'yellow' | 'pink'
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={(e) => {
        e.currentTarget.blur()
        onClick()
      }}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 ring-1 transition active:scale-95 sm:px-3 sm:py-2',
        active
          ? color === 'yellow'
            ? 'bg-neon-yellow/15 text-neon-yellow ring-neon-yellow/60 shadow-[0_0_20px_rgba(255,225,77,0.4)]'
            : 'bg-neon-pink/15 text-neon-pink ring-neon-pink/60 shadow-[0_0_20px_rgba(255,43,214,0.4)]'
          : 'bg-black/35 text-violet-200/70 ring-white/10 hover:text-white hover:ring-white/25',
      )}
    >
      <span className={cn(active && color === 'pink' && 'animate-spin-slow')}>
        <Icon className="size-4 sm:size-5" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs">{label}</span>
    </button>
  )
}

function TurboToggle() {
  const turbo = useGameStore((s) => s.turbo)
  const toggleTurbo = useGameStore((s) => s.toggleTurbo)
  return <ToggleButton label="Turbo" icon={BoltIcon} active={turbo} onClick={toggleTurbo} color="yellow" />
}

function AutoToggle() {
  const autoplay = useGameStore((s) => s.autoplay)
  const toggleAutoplay = useGameStore((s) => s.toggleAutoplay)
  return <ToggleButton label="Auto" icon={AutoIcon} active={autoplay} onClick={toggleAutoplay} color="pink" />
}

function OutOfCreditsBanner() {
  const outOfCredits = useGameStore((s) => s.outOfCredits)
  const refill = useGameStore((s) => s.refill)
  if (!outOfCredits) return null

  return (
    <div className="pointer-events-auto mb-3 flex animate-pop-in items-center gap-3 rounded-2xl border border-neon-pink/40 bg-night-900/90 px-4 py-2 shadow-[0_0_30px_rgba(255,43,214,0.35)] backdrop-blur">
      <span className="font-semibold text-pink-100">Not enough credits for this bet</span>
      <button
        type="button"
        onClick={refill}
        className="rounded-xl bg-neon-pink px-3 py-1 font-display text-xs font-bold tracking-widest text-night-950 transition hover:brightness-110"
      >
        REFILL
      </button>
    </div>
  )
}

export function ControlPanel() {
  const ref = useReportInset<HTMLDivElement>('bottom')

  return (
    <div ref={ref} className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-2 pb-2 sm:px-4 sm:pb-4">
      <OutOfCreditsBanner />

      <div className="pointer-events-auto relative w-full max-w-5xl rounded-[28px] border border-white/10 bg-night-900/70 px-3 py-2.5 shadow-[0_0_50px_rgba(124,58,237,0.28)] backdrop-blur-xl sm:px-6 sm:py-3">
        <div className="absolute inset-x-10 -top-px h-px bg-linear-to-r from-transparent via-neon-cyan to-transparent" />
        <div className="absolute inset-x-24 -bottom-px h-px bg-linear-to-r from-transparent via-neon-pink to-transparent" />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
          <BalanceDisplay />
          <SpinButton />
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
            <BetSelector />
            <TurboToggle />
            <AutoToggle />
          </div>
        </div>
      </div>

      <p className="mt-2 hidden text-xs font-semibold tracking-[0.2em] text-violet-200/40 sm:block short:hidden">
        <Kbd>SPACE</Kbd> spin / stop · <Kbd>T</Kbd> turbo · <Kbd>A</Kbd> auto · <Kbd>M</Kbd> sound
      </p>
    </div>
  )
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-display text-[10px] text-violet-100/70">{children}</kbd>
}
