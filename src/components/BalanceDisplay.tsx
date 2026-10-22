import { cn } from '../lib/format'
import { useAnimatedCredits } from '../lib/hooks'
import { useGameStore } from '../store/gameStore'

function Meter({ label, value, duration, highlight }: { label: string; value: number; duration: number; highlight?: boolean }) {
  const valueRef = useAnimatedCredits<HTMLDivElement>(value, duration)

  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl bg-black/35 px-3 py-1.5 ring-1 transition-shadow duration-300 sm:px-4 sm:py-2',
        highlight ? 'ring-neon-yellow/60 shadow-[0_0_24px_rgba(255,225,77,0.35)]' : 'ring-white/10',
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-200/60 sm:text-xs">{label}</div>
      <div
        ref={valueRef}
        className={cn(
          'truncate font-display text-base font-bold tabular-nums sm:text-2xl',
          highlight ? 'text-neon-yellow text-glow-yellow' : 'text-white',
        )}
      />
    </div>
  )
}

export function BalanceDisplay() {
  const balance = useGameStore((s) => s.balance)
  const lastWin = useGameStore((s) => s.lastWin)

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:gap-3">
      <Meter label="Balance" value={balance} duration={700} />
      <Meter label="Win" value={lastWin} duration={lastWin > 0 ? 1100 : 150} highlight={lastWin > 0} />
    </div>
  )
}
