import { useEffect, useState, type ReactNode } from "react";
import { useReportInset } from "../lib/hooks";
import { useGameStore } from "../store/gameStore";
import { FullscreenIcon, InfoIcon, SoundOffIcon, SoundOnIcon } from "./icons";

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.currentTarget.blur();
        onClick();
      }}
      className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-night-900/60 text-violet-100/80 backdrop-blur-md transition hover:border-neon-cyan/50 hover:text-neon-cyan hover:shadow-[0_0_18px_rgba(34,232,255,0.4)] active:scale-90"
    >
      {children}
    </button>
  );
}

function BigWinArmedBadge() {
  const armed = useGameStore((s) => s.forceBigWin);
  if (!armed) return null;

  return (
    <span className="animate-pop-in rounded-full border border-neon-yellow/60 bg-neon-yellow/15 px-3 py-1 font-display text-[10px] font-bold tracking-[0.25em] text-neon-yellow shadow-[0_0_20px_rgba(255,225,77,0.45)]">
      BIG WIN ARMED
    </span>
  );
}

function MuteButton() {
  const muted = useGameStore((s) => s.muted);
  const toggleMute = useGameStore((s) => s.toggleMute);

  return (
    <IconButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
      {muted ? (
        <SoundOffIcon className="size-5" />
      ) : (
        <SoundOnIcon className="size-5" />
      )}
    </IconButton>
  );
}

function FullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <IconButton
      label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
      onClick={toggleFullscreen}
    >
      <FullscreenIcon className="size-5" />
    </IconButton>
  );
}

export function TopBar() {
  const ref = useReportInset<HTMLElement>("top");
  const setPaytableOpen = useGameStore((s) => s.setPaytableOpen);

  return (
    <header
      ref={ref}
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4"
    >
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-neon-cyan/40 bg-night-900/60 px-3 py-1 font-display text-[10px] font-bold tracking-[0.3em] text-neon-cyan backdrop-blur-md">
          DEMO FOR PLATIPUS
        </span>
        <span className="hidden rounded-full border border-white/10 bg-night-900/50 px-3 py-1 text-xs font-semibold tracking-[0.15em] text-violet-200/60 backdrop-blur-md md:inline">
          React · PixiJS v8 · Tailwind
        </span>
        <BigWinArmedBadge />
      </div>

      <div className="pointer-events-auto flex gap-2">
        <IconButton label="Paytable" onClick={() => setPaytableOpen(true)}>
          <InfoIcon className="size-5" />
        </IconButton>
        <MuteButton />
        <FullscreenButton />
      </div>
    </header>
  );
}
