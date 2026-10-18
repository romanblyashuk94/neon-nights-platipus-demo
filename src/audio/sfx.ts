import type { WinTier } from '../game/config'

interface ToneOptions {
  freq: number
  type?: OscillatorType
  duration: number
  gain?: number
  attack?: number
  slideTo?: number
  delay?: number
  filter?: number
}

interface NoiseOptions {
  duration: number
  gain?: number
  from: number
  to?: number
  q?: number
  delay?: number
}

/** All game sounds are synthesized with the Web Audio API, so no audio files ship. */
class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private muted = false

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (!this.ctx) {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = this.muted ? 0 : 0.55

      const delay = ctx.createDelay()
      delay.delayTime.value = 0.16
      const feedback = ctx.createGain()
      feedback.gain.value = 0.22
      const wet = ctx.createGain()
      wet.gain.value = 0.25
      master.connect(ctx.destination)
      master.connect(delay)
      delay.connect(feedback).connect(delay)
      delay.connect(wet).connect(ctx.destination)

      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

      this.ctx = ctx
      this.master = master
      this.noiseBuffer = buffer
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.03)
  }

  click(): void {
    this.tone({ freq: 1400, type: 'square', duration: 0.04, gain: 0.05, slideTo: 900, filter: 3000 })
  }

  spinStart(): void {
    this.noise({ duration: 0.4, gain: 0.18, from: 300, to: 2400, q: 1.2 })
    this.tone({ freq: 110, type: 'sawtooth', duration: 0.35, gain: 0.08, slideTo: 220, filter: 900 })
  }

  reelStop(reel: number): void {
    this.tone({ freq: 160 - reel * 6, type: 'sine', duration: 0.16, gain: 0.45, slideTo: 55 })
    this.noise({ duration: 0.05, gain: 0.12, from: 2600, q: 0.8 })
  }

  tick(): void {
    this.tone({ freq: 2100, type: 'triangle', duration: 0.03, gain: 0.06 })
  }

  lineShown(): void {
    this.tone({ freq: 1318, type: 'sine', duration: 0.18, gain: 0.07 })
    this.tone({ freq: 1976, type: 'sine', duration: 0.18, gain: 0.04, delay: 0.05 })
  }

  win(tier: WinTier): void {
    const notes = tier === 'small' ? [523, 659, 784, 1047] : [523, 659, 784, 1047, 1319, 1568]
    notes.forEach((freq, i) => {
      this.tone({ freq, type: 'triangle', duration: 0.22, gain: 0.16, delay: i * 0.075 })
      this.tone({ freq: freq * 2, type: 'sine', duration: 0.15, gain: 0.04, delay: i * 0.075 })
    })
  }

  tierUp(tier: WinTier): void {
    const root = tier === 'epic' ? 392 : tier === 'mega' ? 349 : 294
    ;[1, 1.25, 1.5, 2].forEach((ratio, i) => {
      this.tone({ freq: root * ratio, type: 'sawtooth', duration: 0.9, gain: 0.07, attack: 0.02, filter: 2600, delay: i * 0.03 })
    })
    this.noise({ duration: 0.7, gain: 0.15, from: 400, to: 6000, q: 0.7 })
    this.tone({ freq: 55, type: 'sine', duration: 0.5, gain: 0.5, slideTo: 35 })
  }

  private tone({ freq, type = 'sine', duration, gain = 0.2, attack = 0.005, slideTo, delay = 0, filter }: ToneOptions) {
    const { ctx, master } = this
    if (!ctx || !master || this.muted) return
    const t = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration)
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(gain, t + attack)
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    let node: AudioNode = osc
    if (filter) {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = filter
      node = node.connect(lp)
    }
    node.connect(env).connect(master)
    osc.start(t)
    osc.stop(t + duration + 0.05)
  }

  private noise({ duration, gain = 0.1, from, to, q = 1, delay = 0 }: NoiseOptions) {
    const { ctx, master, noiseBuffer } = this
    if (!ctx || !master || !noiseBuffer || this.muted) return
    const t = ctx.currentTime + delay
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = q
    bp.frequency.setValueAtTime(from, t)
    if (to) bp.frequency.exponentialRampToValueAtTime(to, t + duration)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(gain, t + 0.01)
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    src.connect(bp).connect(env).connect(master)
    src.start(t)
    src.stop(t + duration + 0.05)
  }
}

export const sfx = new Sfx()
