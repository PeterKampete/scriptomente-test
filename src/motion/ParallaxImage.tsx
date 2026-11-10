// Adapted from scriptomente/client/components/motion/parallax-image.tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getDeviceCapability, useDeviceCapability } from './device'

gsap.registerPlugin(ScrollTrigger)

type Props = {
  readonly children: ReactNode
  /** Classes for the clip frame; it defines the visible size. */
  readonly className?: string
  /** Scale the image starts at for the entrance. */
  readonly fromScale?: number
  readonly duration?: number
  readonly revealStart?: string
  /** Parallax travel in px (negative drifts up on scroll). 0 disables it. */
  readonly parallaxY?: number
  readonly scrub?: number | boolean
}

/**
 * A fixed clip frame holding an oversized inner layer: fades/settles in when
 * scrolled into view, then drifts with scroll on capable desktops.
 */
export function ParallaxImage({
  children,
  className,
  fromScale = 1.04,
  duration = 1,
  revealStart = 'top 80%',
  parallaxY = -32,
  scrub = 1,
}: Props) {
  const { enableParallax } = useDeviceCapability()
  const frameRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = frameRef.current
    const layer = layerRef.current
    if (!frame || !layer) return
    const { enableParallax, isReducedMotion } = getDeviceCapability()
    if (isReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        layer,
        { opacity: 0, scale: fromScale },
        {
          opacity: 1,
          scale: 1,
          duration,
          ease: 'power2.out',
          scrollTrigger: { trigger: frame, start: revealStart, toggleActions: 'play none none none' },
        },
      )
      if (enableParallax && parallaxY !== 0) {
        gsap.to(layer, {
          y: parallaxY,
          ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub },
        })
      }
    }, frame)
    return () => ctx.revert()
  }, [fromScale, duration, revealStart, parallaxY, scrub])

  // Oversize the layer only where the parallax actually runs, so the image
  // keeps its exact framing everywhere else (official site behaviour).
  const pad = enableParallax && parallaxY !== 0 ? Math.abs(parallaxY) + 2 : 0
  return (
    <div ref={frameRef} className={className} style={{ overflow: 'hidden' }}>
      <div
        ref={layerRef}
        style={{ position: 'absolute', inset: `-${pad}px 0`, willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  )
}
