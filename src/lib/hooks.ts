import { useLayoutEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { formatCredits } from './format'

/**
 * Tweens the credits shown in the returned element toward `target` (ease-out cubic).
 * Frames are written to the DOM, not to state, so the meter doesn't re-render every frame;
 * the element must have no React-managed children.
 */
export function useAnimatedCredits<T extends HTMLElement>(target: number, duration = 600) {
  const ref = useRef<T>(null)
  const current = useRef(target)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const from = current.current
    if (from === target) {
      el.textContent = formatCredits(target)
      return
    }
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const next = from + (target - from) * (1 - Math.pow(1 - t, 3))
      current.current = next
      el.textContent = formatCredits(next)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return ref
}

/** Reports how much screen space a HUD bar covers so the game can lay out around it. */
export function useReportInset<T extends HTMLElement>(side: 'top' | 'bottom') {
  const ref = useRef<T>(null)
  const setInset = useGameStore((s) => s.setInset)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const report = () => {
      const rect = el.getBoundingClientRect()
      setInset(side, side === 'top' ? rect.bottom : window.innerHeight - rect.top)
    }
    report()
    const observer = new ResizeObserver(report)
    observer.observe(el)
    window.addEventListener('resize', report)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', report)
    }
  }, [side, setInset])

  return ref
}
