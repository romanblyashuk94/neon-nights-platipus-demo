import { BET_OPTIONS } from '../game/config'
import { formatCredits } from '../lib/format'
import { useGameStore } from '../store/gameStore'

function StepButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      aria-label={label === '+' ? 'Increase bet' : 'Decrease bet'}
      onClick={(e) => {
        e.currentTarget.blur()
        onClick()
      }}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-xl bg-white/5 font-display text-lg font-bold text-neon-cyan ring-1 ring-neon-cyan/30 transition hover:bg-neon-cyan/15 hover:shadow-[0_0_16px_rgba(34,232,255,0.45)] active:scale-90 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:shadow-none sm:size-10"
    >
      {label}
    </button>
  )
}

export function BetSelector() {
  const bet = useGameStore((s) => s.bet)
  const phase = useGameStore((s) => s.phase)
  const changeBet = useGameStore((s) => s.changeBet)
  const locked = phase !== 'idle'

  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-black/35 p-1.5 ring-1 ring-white/10">
      <StepButton label="−" onClick={() => changeBet(-1)} disabled={locked || bet === BET_OPTIONS[0]} />
      <div className="min-w-14 text-center sm:min-w-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-200/60 sm:text-xs">Bet</div>
        <div key={bet} className="animate-pop-in font-display text-base font-bold tabular-nums text-white sm:text-xl">
          {formatCredits(bet)}
        </div>
      </div>
      <StepButton label="+" onClick={() => changeBet(1)} disabled={locked || bet === BET_OPTIONS[BET_OPTIONS.length - 1]} />
    </div>
  )
}
