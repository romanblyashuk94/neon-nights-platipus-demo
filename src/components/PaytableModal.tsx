import { PAYLINE_COLORS, PAYLINES, REEL_COUNT, ROW_COUNT, SYMBOLS, type SymbolDef } from '../game/config'
import { formatCredits } from '../lib/format'
import { useGameStore } from '../store/gameStore'
import { CloseIcon } from './icons'

const BASE = import.meta.env.BASE_URL
const ORDERED = Object.values(SYMBOLS).sort((a, b) => b.pays[5] - a.pays[5])
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`

function SymbolCard({ symbol, bet }: { symbol: SymbolDef; bet: number }) {
  const isWild = symbol.id === 'wild'
  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10"
      style={{ boxShadow: `inset 0 0 24px ${hex(symbol.color)}22` }}
    >
      <img src={`${BASE}assets/symbols/${symbol.id}.png`} alt={symbol.name} className="size-16 shrink-0 object-contain" draggable={false} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-xs font-bold tracking-[0.2em]" style={{ color: hex(symbol.color) }}>
          {symbol.name.toUpperCase()}
        </div>
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-sm tabular-nums">
          {([5, 4, 3] as const).map((count) => (
            <div key={count} className="contents">
              <dt className="font-bold text-violet-200/50">{count}×</dt>
              <dd className="text-right font-semibold text-white">{formatCredits(symbol.pays[count] * bet)}</dd>
            </div>
          ))}
        </dl>
        {isWild && <p className="mt-1 text-xs leading-tight text-violet-200/60">Substitutes for every symbol</p>}
      </div>
    </div>
  )
}

function PaylineDiagram({ index }: { index: number }) {
  const rows = PAYLINES[index]
  const color = hex(PAYLINE_COLORS[index])
  return (
    <div className="rounded-xl bg-black/30 p-2 ring-1 ring-white/10">
      <div className="mb-1 text-center font-display text-[10px] font-bold" style={{ color }}>
        {index + 1}
      </div>
      <div className="grid grid-cols-5 gap-0.5">
        {Array.from({ length: ROW_COUNT }, (_, row) =>
          Array.from({ length: REEL_COUNT }, (_, reel) => (
            <span
              key={`${row}-${reel}`}
              className="aspect-square rounded-[3px]"
              style={rows[reel] === row ? { background: color, boxShadow: `0 0 6px ${color}` } : { background: 'rgb(255 255 255 / 0.08)' }}
            />
          )),
        )}
      </div>
    </div>
  )
}

export function PaytableModal() {
  const open = useGameStore((s) => s.paytableOpen)
  return open ? <Paytable /> : null
}

function Paytable() {
  const setOpen = useGameStore((s) => s.setPaytableOpen)
  const bet = useGameStore((s) => s.bet)

  return (
    <div
      className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-night-950/70 p-4 backdrop-blur-md"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paytable"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-3xl animate-pop-in overflow-y-auto rounded-3xl border border-white/10 bg-night-900/95 p-5 shadow-[0_0_80px_rgba(255,43,214,0.25)] sm:p-7"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 grid size-9 place-items-center rounded-xl text-violet-200/70 ring-1 ring-white/10 transition hover:text-white hover:ring-white/30"
        >
          <CloseIcon className="size-5" />
        </button>

        <h2 className="font-display text-2xl font-black tracking-[0.2em] text-neon-pink text-glow-pink">PAYTABLE</h2>
        <p className="mt-1 text-sm text-violet-200/60">
          Payouts for the current bet of <span className="font-bold text-white">{formatCredits(bet)}</span>. Wins pay left to
          right on adjacent reels; the highest win per line is paid.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ORDERED.map((symbol) => (
            <SymbolCard key={symbol.id} symbol={symbol} bet={bet} />
          ))}
        </div>

        <h3 className="mt-7 font-display text-sm font-bold tracking-[0.3em] text-neon-cyan text-glow-cyan">10 PAYLINES</h3>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {PAYLINES.map((_, i) => (
            <PaylineDiagram key={i} index={i} />
          ))}
        </div>

        <p className="mt-6 text-xs text-violet-200/40">Demo game for presentation purposes · simulated RTP ≈ 97.7% · no real money.</p>
      </div>
    </div>
  )
}
