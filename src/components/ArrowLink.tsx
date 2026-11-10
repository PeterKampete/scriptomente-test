import { useEffect, useRef, type MouseEvent } from 'react'
import { gsap } from 'gsap'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { getDeviceCapability } from '../motion/device'
import './ArrowLink.css'

gsap.registerPlugin(MorphSVGPlugin)

type Props = {
  readonly href: string
  readonly label: string
  /** "light" = cream on the red hero, "brand" = red on cream. */
  readonly tone?: 'light' | 'brand'
  readonly className?: string
  readonly external?: boolean
  readonly onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

// The design's diagonal arrow (↗), in a 24-unit box: shaft + head
const ARROW_SHAFT = 'M6.5 17.5 L17.5 6.5'
const ARROW_HEAD = 'M10.5 6.5 L17.5 6.5 L17.5 13.5'
// Chain-link icon: the two interlocking links
const LINK_A = 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'
const LINK_B = 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'

/**
 * Underlined uppercase link with the design's diagonal arrow. Hover/focus
 * plays the official site's fill sweep, and the arrow morphs into a chain
 * link (and back on leave).
 */
export function ArrowLink({ href, label, tone = 'light', className, external, onClick }: Props) {
  const shaftRef = useRef<SVGPathElement>(null)
  const headRef = useRef<SVGPathElement>(null)
  const morph = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const shaft = shaftRef.current
    const head = headRef.current
    if (!shaft || !head) return
    const instant = getDeviceCapability().isReducedMotion
    const tl = gsap.timeline({ paused: true, defaults: { duration: instant ? 0 : 0.55, ease: 'power3.inOut' } })
    tl.to(shaft, { morphSVG: { shape: LINK_A, shapeIndex: 'auto' } }, 0)
    tl.to(head, { morphSVG: { shape: LINK_B, shapeIndex: 'auto' } }, instant ? 0 : 0.05)
    morph.current = tl
    return () => {
      tl.kill()
      shaft.setAttribute('d', ARROW_SHAFT)
      head.setAttribute('d', ARROW_HEAD)
    }
  }, [])

  const toLink = () => morph.current?.timeScale(1).play()
  const toArrow = () => morph.current?.timeScale(1.4).reverse()

  return (
    <a
      href={href}
      className={`arrow-link arrow-link--${tone} ${className ?? ''}`}
      onClick={onClick}
      onPointerEnter={toLink}
      onPointerLeave={toArrow}
      onFocus={toLink}
      onBlur={toArrow}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      <span>{label}</span>
      <svg className="arrow-link__icon" width="12.5" height="12.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path ref={shaftRef} d={ARROW_SHAFT} />
        <path ref={headRef} d={ARROW_HEAD} />
      </svg>
    </a>
  )
}
