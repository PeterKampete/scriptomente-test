/**
 * Cinematic sound design, synthesised live with the Web Audio API (no files).
 *
 *  - pop():          dry, bassy "thock" when the thread reaches a −/+ toggle
 *  - whoosh():       soft airy breath when a cloud puff blooms
 *  - threadMove(px): feeds an ambient "journey" bed whose level and brightness
 *                    follow how fast the thread is currently being drawn
 *
 * Browsers only allow audio after a user gesture, so the engine unlocks on the
 * first click / tap / key press. The listener's on/off choice is remembered.
 */

type Listener = (state: SoundState) => void
export type SoundState = { enabled: boolean; unlocked: boolean }

const STORAGE_KEY = 'scriptomente-sound'
/** Overall loudness; every sound below is also kept soft on its own. */
const MASTER_VOLUME = 0.35

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private ambient: { gain: GainNode; filter: BiquadFilterNode } | null = null
  private curtain: { gain: GainNode; band: BiquadFilterNode; swell: GainNode } | null = null
  private curtainPending = 0
  private curtainSpeed = 0
  private enabled = true
  private unlocked = false
  private listeners = new Set<Listener>()
  private pendingPx = 0
  private speed = 0
  private lastFrame = 0
  private rafId = 0
  private lastPop = 0
  private lastWhoosh = 0

  constructor() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'off') this.enabled = false
    } catch {
      /* storage unavailable: keep default */
    }
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlock()
        if (this.unlocked) {
          window.removeEventListener('pointerdown', unlock)
          window.removeEventListener('keydown', unlock)
          window.removeEventListener('touchend', unlock)
        }
      }
      window.addEventListener('pointerdown', unlock)
      window.addEventListener('keydown', unlock)
      window.addEventListener('touchend', unlock)
    }
  }

  get state(): SoundState {
    return { enabled: this.enabled, unlocked: this.unlocked }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.state))
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
    } catch {
      /* ignore */
    }
    if (enabled) this.unlock()
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(enabled ? MASTER_VOLUME : 0, this.ctx.currentTime, 0.08)
    }
    this.emit()
  }

  /** Create / resume the audio graph. Must run inside a user gesture. */
  unlock() {
    if (!this.enabled) return
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -14
      compressor.knee.value = 12
      compressor.ratio.value = 3
      compressor.attack.value = 0.003
      compressor.release.value = 0.2
      const master = ctx.createGain()
      master.gain.value = MASTER_VOLUME
      master.connect(compressor).connect(ctx.destination)
      this.ctx = ctx
      this.master = master
      this.noise = this.makePinkNoise(ctx, 3)
      this.buildAmbient()
    }
    if (this.ctx.state !== 'running') {
      this.ctx.resume().then(() => {
        this.unlocked = true
        this.emit()
      })
    } else if (!this.unlocked) {
      this.unlocked = true
      this.emit()
    }
  }

  private ready(): AudioContext | null {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== 'running') return null
    return this.ctx
  }

  private makePinkNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
    return buffer
  }

  private softClip(ctx: AudioContext, drive: number): WaveShaperNode {
    const shaper = ctx.createWaveShaper()
    const curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1
      curve[i] = Math.tanh(drive * x) / Math.tanh(drive)
    }
    shaper.curve = curve
    return shaper
  }

  /** Dry, bassy pop: a pitched-down sine "thock", a tiny transient and a sub tail. */
  pop(intensity = 1) {
    const ctx = this.ready()
    if (!ctx || !this.master) return
    const now = ctx.currentTime
    // Avoid machine-gunning when several toggles light in the same frame
    const t = Math.max(now, this.lastPop + 0.06)
    this.lastPop = t
    const detune = 1 + (Math.random() - 0.5) * 0.08

    const out = ctx.createGain()
    out.gain.value = 0.5 * intensity
    out.connect(this.master)

    // Body
    const body = ctx.createOscillator()
    body.type = 'sine'
    body.frequency.setValueAtTime(165 * detune, t)
    body.frequency.exponentialRampToValueAtTime(48 * detune, t + 0.13)
    const bodyGain = ctx.createGain()
    bodyGain.gain.setValueAtTime(0.0001, t)
    bodyGain.gain.exponentialRampToValueAtTime(0.8, t + 0.006)
    bodyGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.26)
    const warmth = this.softClip(ctx, 1.4)
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 520
    body.connect(bodyGain).connect(warmth).connect(tone).connect(out)
    body.start(t)
    body.stop(t + 0.3)

    // Sub tail
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(52 * detune, t)
    const subGain = ctx.createGain()
    subGain.gain.setValueAtTime(0.0001, t)
    subGain.gain.exponentialRampToValueAtTime(0.26, t + 0.012)
    subGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.34)
    sub.connect(subGain).connect(out)
    sub.start(t)
    sub.stop(t + 0.36)

    // Transient click (keeps it "dry" and defined)
    if (this.noise) {
      const click = ctx.createBufferSource()
      click.buffer = this.noise
      const band = ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 1100
      band.Q.value = 0.7
      const clickGain = ctx.createGain()
      clickGain.gain.setValueAtTime(0.0001, t)
      clickGain.gain.exponentialRampToValueAtTime(0.08, t + 0.002)
      clickGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.022)
      click.connect(band).connect(clickGain).connect(out)
      click.start(t, Math.random() * 2)
      click.stop(t + 0.03)
    }
  }

  /**
   * Plucked thread: a soft, warm string note with a felt-hammer touch, used
   * when the thread lights a toggle in "Ways we can work together". `step`
   * climbs a major-pentatonic scale, so the rows form a rising phrase.
   */
  pluck(step = 0) {
    const ctx = this.ready()
    if (!ctx || !this.master) return
    const now = ctx.currentTime
    const t = Math.max(now, this.lastPop + 0.06)
    this.lastPop = t
    // D major pentatonic from D4: D E F# A B, then up an octave
    const scale = [0, 2, 4, 7, 9, 12, 14, 16]
    const freq = 293.66 * Math.pow(2, scale[Math.min(step, scale.length - 1)] / 12)

    const out = ctx.createGain()
    out.gain.value = 0.42
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.Q.value = 0.6
    // The string darkens as it rings out, like a real pluck
    tone.frequency.setValueAtTime(freq * 7, t)
    tone.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.9)
    tone.connect(out).connect(this.master)

    // Fundamental + gentle overtones, each decaying faster than the last
    const partials: Array<[number, number, number, OscillatorType]> = [
      [1, 0.5, 1.6, 'triangle'],
      [2, 0.16, 0.9, 'sine'],
      [3, 0.07, 0.5, 'sine'],
      [1.003, 0.18, 1.4, 'sine'], // slight detune = a little shimmer
    ]
    for (const [ratio, level, decay, type] of partials) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.setValueAtTime(freq * ratio, t)
      const env = ctx.createGain()
      env.gain.setValueAtTime(0.0001, t)
      env.gain.exponentialRampToValueAtTime(level, t + 0.008)
      env.gain.exponentialRampToValueAtTime(0.0005, t + decay)
      osc.connect(env).connect(tone)
      osc.start(t)
      osc.stop(t + decay + 0.05)
    }

    // Felt touch: a short, low, muffled thump under the note
    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(140, t)
    thump.frequency.exponentialRampToValueAtTime(70, t + 0.08)
    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(0.0001, t)
    thumpGain.gain.exponentialRampToValueAtTime(0.22, t + 0.005)
    thumpGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.14)
    thump.connect(thumpGain).connect(out)
    thump.start(t)
    thump.stop(t + 0.16)
  }

  /** Tiny felt "tick" for a switch: brighter when turning on, duller when off. */
  switchTick(on = true) {
    const ctx = this.ready()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const out = ctx.createGain()
    out.gain.value = 0.32
    out.connect(this.master)
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(on ? 880 : 520, t)
    osc.frequency.exponentialRampToValueAtTime(on ? 1320 : 340, t + 0.05)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.35, t + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0005, t + 0.09)
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2400
    osc.connect(env).connect(tone).connect(out)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  /** Soft airy breath for a cloud puff; `duration` matches the visual bloom. */
  whoosh(duration = 1.5, level = 1) {
    const ctx = this.ready()
    if (!ctx || !this.master || !this.noise) return
    const t = ctx.currentTime
    // One cloud = one breath, even when several parts of an item bloom together
    if (t - this.lastWhoosh < 0.08) return
    this.lastWhoosh = t
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true

    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 0.7
    band.frequency.setValueAtTime(380, t)
    band.frequency.exponentialRampToValueAtTime(950, t + duration * 0.35)
    band.frequency.exponentialRampToValueAtTime(450, t + duration)

    const air = ctx.createBiquadFilter()
    air.type = 'lowpass'
    air.frequency.value = 1800

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.06 * level, t + duration * 0.3)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    const pan = ctx.createStereoPanner()
    pan.pan.setValueAtTime(-0.35, t)
    pan.pan.linearRampToValueAtTime(0.35, t + duration)

    src.connect(band).connect(air).connect(gain).connect(pan).connect(this.master)
    src.start(t, Math.random() * 1.5)
    src.stop(t + duration + 0.05)
  }

  /** Ambient bed: a low, slowly drifting chord + breathy texture, silent until fed. */
  private buildAmbient() {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noise) return
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 260
    filter.Q.value = 0.6
    const gain = ctx.createGain()
    gain.gain.value = 0
    const pan = ctx.createStereoPanner()
    filter.connect(gain).connect(pan).connect(this.master)

    const voices: [OscillatorType, number, number, number][] = [
      ['triangle', 110, 0, 0.32],
      ['sine', 164.81, 6, 0.22],
      ['sine', 220, -5, 0.16],
      ['sine', 329.63, 3, 0.06],
    ]
    const drift = ctx.createOscillator()
    drift.frequency.value = 0.07
    const driftDepth = ctx.createGain()
    driftDepth.gain.value = 7
    drift.connect(driftDepth)
    drift.start()
    for (const [type, freq, detune, level] of voices) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = freq
      osc.detune.value = detune
      driftDepth.connect(osc.detune)
      const voiceGain = ctx.createGain()
      voiceGain.gain.value = level
      osc.connect(voiceGain).connect(filter)
      osc.start()
    }

    const texture = ctx.createBufferSource()
    texture.buffer = this.noise
    texture.loop = true
    const textureBand = ctx.createBiquadFilter()
    textureBand.type = 'bandpass'
    textureBand.frequency.value = 700
    textureBand.Q.value = 0.8
    const textureGain = ctx.createGain()
    textureGain.gain.value = 0.3
    texture.connect(textureBand).connect(textureGain).connect(filter)
    texture.start()

    // Slow stereo sway gives the "journey" a sense of travel
    const sway = ctx.createOscillator()
    sway.frequency.value = 0.11
    const swayDepth = ctx.createGain()
    swayDepth.gain.value = 0.4
    sway.connect(swayDepth).connect(pan.pan)
    sway.start()

    this.ambient = { gain, filter }
    this.buildCurtain()
  }

  /**
   * Curtain bed: heavy fabric sliding — soft band-limited noise with a slow,
   * irregular flutter, over a low swell. Silent until the page is pulled.
   */
  private buildCurtain() {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noise) return
    const fabric = ctx.createBufferSource()
    fabric.buffer = this.noise
    fabric.loop = true
    const high = ctx.createBiquadFilter()
    high.type = 'highpass'
    high.frequency.value = 160
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 520
    band.Q.value = 0.55

    // Flutter: the fabric's level wobbles with a slow, noisy modulator
    const flutter = ctx.createGain()
    flutter.gain.value = 0.6
    const modSource = ctx.createBufferSource()
    modSource.buffer = this.noise
    modSource.loop = true
    modSource.playbackRate.value = 0.02
    const modDepth = ctx.createGain()
    modDepth.gain.value = 2.2
    modSource.connect(modDepth).connect(flutter.gain)
    modSource.start()

    const gain = ctx.createGain()
    gain.gain.value = 0
    fabric.connect(high).connect(band).connect(flutter).connect(gain).connect(this.master)
    fabric.start()

    // Low swell gives the drape its weight
    const body = ctx.createOscillator()
    body.type = 'sine'
    body.frequency.value = 64
    const swell = ctx.createGain()
    swell.gain.value = 0
    body.connect(swell).connect(this.master)
    body.start()

    this.curtain = { gain, band, swell }
  }

  /** Report how far the page moved during the intro pull; drives the curtain. */
  curtainMove(px: number) {
    if (!this.enabled || px <= 0) return
    this.curtainPending += px
    if (!this.rafId) {
      this.lastFrame = performance.now()
      this.rafId = requestAnimationFrame(this.tick)
    }
  }

  /** The drape comes to rest: a soft, low fabric settle. */
  curtainSettle() {
    const ctx = this.ready()
    if (!ctx || !this.master || !this.noise) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.setValueAtTime(900, t)
    low.frequency.exponentialRampToValueAtTime(260, t + 0.7)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
    src.connect(low).connect(gain).connect(this.master)
    src.start(t, Math.random() * 1.5)
    src.stop(t + 0.85)

    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(90, t)
    thump.frequency.exponentialRampToValueAtTime(45, t + 0.25)
    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(0.0001, t)
    thumpGain.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    thump.connect(thumpGain).connect(this.master)
    thump.start(t)
    thump.stop(t + 0.45)
  }

  /** Report thread growth in px; the ambient bed follows the drawing speed. */
  threadMove(px: number) {
    if (!this.enabled || px <= 0) return
    this.pendingPx += px
    if (!this.rafId) {
      this.lastFrame = performance.now()
      this.rafId = requestAnimationFrame(this.tick)
    }
  }

  private tick = (time: number) => {
    const dt = Math.max(0.001, (time - this.lastFrame) / 1000)
    this.lastFrame = time
    const instant = this.pendingPx / dt
    this.pendingPx = 0
    // Smooth the speed so the bed swells and settles like movement, not noise
    this.speed += (instant - this.speed) * Math.min(1, dt * 6)
    const curtainInstant = this.curtainPending / dt
    this.curtainPending = 0
    this.curtainSpeed += (curtainInstant - this.curtainSpeed) * Math.min(1, dt * 5)

    const ctx = this.ready()
    if (ctx && this.curtain) {
      const amount = Math.min(1, this.curtainSpeed / 1400)
      const level = Math.pow(amount, 0.7)
      this.curtain.gain.gain.setTargetAtTime(level * 0.11, ctx.currentTime, amount > 0.02 ? 0.08 : 0.35)
      this.curtain.swell.gain.setTargetAtTime(level * 0.06, ctx.currentTime, 0.2)
      this.curtain.band.frequency.setTargetAtTime(380 + amount * 520, ctx.currentTime, 0.15)
    }
    if (ctx && this.ambient) {
      const amount = Math.min(1, this.speed / 900)
      const level = Math.pow(amount, 0.8) * 0.07
      this.ambient.gain.gain.setTargetAtTime(level, ctx.currentTime, amount > 0.02 ? 0.12 : 0.45)
      this.ambient.filter.frequency.setTargetAtTime(220 + amount * 650, ctx.currentTime, 0.25)
    }

    if (this.speed > 1 || this.pendingPx > 0 || this.curtainSpeed > 1 || this.curtainPending > 0) {
      this.rafId = requestAnimationFrame(this.tick)
    } else {
      this.speed = 0
      this.curtainSpeed = 0
      this.rafId = 0
      if (ctx && this.ambient) this.ambient.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.45)
      if (ctx && this.curtain) {
        this.curtain.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.35)
        this.curtain.swell.gain.setTargetAtTime(0, ctx.currentTime, 0.35)
      }
    }
  }
}

export const sound = new SoundEngine()

// Dev-only handle so automated checks can confirm sounds line up with visuals
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __sound: SoundEngine }).__sound = sound
}
