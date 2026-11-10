import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getDeviceCapability } from './device'
import { sound } from '../audio/soundEngine'
import './ThreadDraw.css'

gsap.registerPlugin(ScrollTrigger)

type Props = {
  readonly src: string
  readonly width: number
  readonly height: number
  readonly className?: string
  readonly scrub?: number | boolean
  /** Set when the thread lives inside a pinned section (the intro). */
  readonly pinnedContainer?: string
}

/**
 * Viewport line the drawing edge follows. Every thread uses the same line, so
 * consecutive thread segments hand off seamlessly while scrolling.
 */
export const DRAW_LINE = '75%'
const FEATHER_PX = 48
const DRAW_RATIO = parseFloat(DRAW_LINE) / 100

/** Scroll position at which an element edge meets the drawing line. */
function edge(el: HTMLElement, side: 'top' | 'bottom') {
  const rect = el.getBoundingClientRect()
  return (side === 'top' ? rect.top : rect.bottom) + window.scrollY - window.innerHeight * DRAW_RATIO
}

/** Length of the pinned intro runway (0 when there is no intro). */
function introLength() {
  const intro = ScrollTrigger.getById('intro')
  return intro ? intro.end - intro.start : 0
}

/**
 * Decorative thread that draws itself downward as the user scrolls. The
 * artwork is the exact Figma SVG; a feathered mask is advanced by a scrubbed
 * ScrollTrigger so the visible end of the thread tracks the reading position.
 */
export function ThreadDraw({ src, width, height, className, scrub = 0.6, pinnedContainer }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (getDeviceCapability().isReducedMotion) {
      el.classList.add('thread-draw--static')
      return
    }

    const state = { progress: 0 }
    let last = 0
    const apply = () => {
      const p = state.progress
      el.style.setProperty('--draw', `calc(${p * 100}% + ${p * FEATHER_PX}px)`)
      // Feed the ambient "journey" bed with how much thread was just drawn
      const grown = (p - last) * el.offsetHeight
      last = p
      if (grown > 0) sound.threadMove(grown)
    }

    const ctx = gsap.context(() => {
      gsap.to(state, {
        progress: 1,
        ease: 'none',
        onUpdate: apply,
        scrollTrigger: {
          trigger: el,
          ...(pinnedContainer
            ? {
                // Inside the pinned intro: the page only becomes visible after
                // the intro's scroll runway, so shift the range by its length.
                start: () => edge(el, 'top') + introLength(),
                end: () => edge(el, 'bottom') + introLength(),
              }
            : { start: `top ${DRAW_LINE}`, end: `bottom ${DRAW_LINE}` }),
          // Scrub smoothing also gives the visible part a short draw-in on load
          scrub,
        },
      })
    }, el)
    return () => ctx.revert()
  }, [scrub, pinnedContainer])

  return (
    <div ref={ref} aria-hidden="true" className={`thread-draw ${className ?? ''}`}>
      <img src={src} width={width} height={height} alt="" decoding="async" />
    </div>
  )
}
