import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'

/** Smoothly tweens a displayed number toward `target` (ease-out cubic). */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [value, setValue] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    const from = current.current
    if (from === target) return
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const next = from + (target - from) * (1 - Math.pow(1 - t, 3))
      current.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
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
