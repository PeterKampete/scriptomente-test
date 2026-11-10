import { useEffect, useRef, useState, type RefObject } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getDeviceCapability } from './device'
import { DRAW_LINE } from './ThreadDraw'
import { sound } from '../audio/soundEngine'

const defaultImpact = () => sound.pop()

/**
 * True once the scroll-drawn thread has reached the given element (its centre
 * crosses the same viewport line the threads draw to). Reversible: scrolling
 * back above it un-touches it again. Always true under reduced motion.
 */
export function useThreadTouch(
  ref: RefObject<HTMLElement | null>,
  /** Sound for the moment of impact; defaults to the bassy pop. */
  onImpact: () => void = defaultImpact,
): boolean {
  const [touched, setTouched] = useState(() => getDeviceCapability().isReducedMotion)

  const impact = useRef(onImpact)
  useEffect(() => {
    impact.current = onImpact
  })

  useEffect(() => {
    const el = ref.current
    if (!el || getDeviceCapability().isReducedMotion) return
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: `center ${DRAW_LINE}`,
      end: 'max',
      onToggle: (self) => {
        setTouched(self.isActive)
        // The thread has just arrived at this toggle while scrolling down
        if (self.isActive && self.direction === 1) impact.current()
      },
      onRefresh: (self) => setTouched(self.progress > 0),
    })
    return () => trigger.kill()
  }, [ref])

  return touched
}
