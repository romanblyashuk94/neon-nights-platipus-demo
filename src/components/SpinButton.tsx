import { cn } from '../lib/format'
import { useGameStore } from '../store/gameStore'
import { SkipIcon, SpinIcon, StopIcon } from './icons'

export function SpinButton() {
  const phase = useGameStore((s) => s.phase)
  const autoplay = useGameStore((s) => s.autoplay)
  const spin = useGameStore((s) => s.spin)

  const idle = phase === 'idle'
  const spinning = phase === 'spinning'
  const presenting = phase === 'presenting'
  const disabled = phase === 'loading' || phase === 'ready'

  const label = spinning ? 'STOP' : presenting ? 'SKIP' : autoplay ? 'AUTO' : 'SPIN'
  const Icon = spinning ? StopIcon : presenting ? SkipIcon : SpinIcon

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.currentTarget.blur()
        void spin()
      }}
      className="group relative grid size-22 shrink-0 place-items-center rounded-full outline-none disabled:opacity-40 sm:size-28"
    >
      <span
        className={cn(
          'absolute -inset-4 rounded-full bg-neon-pink/35 blur-2xl transition-opacity',
          idle ? 'animate-glow-pulse' : 'opacity-80',
        )}
      />
      <span
        className={cn(
          'absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--color-neon-cyan),var(--color-neon-pink),var(--color-neon-purple),var(--color-neon-yellow),var(--color-neon-cyan))]',
          spinning ? 'animate-spin-fast' : 'animate-spin-slow',
        )}
      />
      <span className="absolute inset-[5px] rounded-full bg-[radial-gradient(circle_at_32%_25%,#4a1d96,#12052e_58%,#07021a)] shadow-[inset_0_0_22px_rgba(255,43,214,0.5)] transition-all duration-200 group-hover:shadow-[inset_0_0_34px_rgba(34,232,255,0.75)] group-active:scale-95" />
      <span className="relative flex flex-col items-center gap-0.5 text-white transition-transform group-active:scale-90">
        <span className={cn(idle && 'transition-transform duration-500 group-hover:rotate-180')}>
          <Icon className="size-7 sm:size-9 drop-shadow-[0_0_8px_rgba(34,232,255,0.9)]" />
        </span>
        <span className="font-display text-xs font-black tracking-[0.25em] text-glow-cyan sm:text-sm">{label}</span>
      </span>
    </button>
  )
}
