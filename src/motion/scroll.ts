// Ported from scriptomente/client/lib/scroll.ts
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getDeviceCapability } from './device'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null
let tickerCallback: ((time: number) => void) | null = null

/**
 * Global scroll setup: Lenis smooth scroll driven from GSAP's single RAF loop
 * so ScrollTrigger-scrubbed effects stay in sync. Skipped under reduced motion.
 */
export function initScroll(): void {
  if (lenis || getDeviceCapability().isReducedMotion) return

  lenis = new Lenis({ lerp: 0.08, smoothWheel: true, anchors: true })
  lenis.on('scroll', ScrollTrigger.update)

  tickerCallback = (time: number) => lenis?.raf(time * 1000)
  gsap.ticker.add(tickerCallback)
  gsap.ticker.lagSmoothing(0)
}

export function destroyScroll(): void {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback)
    tickerCallback = null
  }
  lenis?.destroy()
  lenis = null
}

/** Freezes page scrolling while an overlay (the mobile menu) is open. */
export function lockScroll(): void {
  lenis?.stop()
  document.documentElement.classList.add('is-scroll-locked')
}

export function unlockScroll(): void {
  document.documentElement.classList.remove('is-scroll-locked')
  lenis?.start()
}

/** Smoothly scrolls to an in-page anchor such as "#contact". */
export function scrollToHash(hash: string): void {
  const target = hash === '#top' ? 0 : document.querySelector<HTMLElement>(hash)
  if (target === null) return
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.4, force: true })
  } else if (target === 0) {
    window.scrollTo({ top: 0 })
  } else {
    target.scrollIntoView()
  }
  history.replaceState(null, '', hash)
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __ST: typeof ScrollTrigger }).__ST = ScrollTrigger
}
