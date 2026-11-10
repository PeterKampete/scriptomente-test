import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import logoSvg from '../assets/figma/logo-brand.svg?raw'
import { getDeviceCapability } from '../motion/device'
import { sound } from '../audio/soundEngine'
import { HeroReadyContext } from './introState'
import './Intro.css'

gsap.registerPlugin(ScrollTrigger)

/** Scroll distance of the pinned intro, in viewport heights. */
const RUNWAY_VH = 2.6

// Logo path indices (Figma export): 0–7 "MIND MOOD", 8–16 "BRAIN FOOD".
const MIND_MOOD = [0, 1, 2, 3, 4, 5, 6, 7]
const BRAIN_FOOD = [8, 9, 10, 11, 12, 13, 14, 15, 16]

// Timeline (fractions of the pinned scroll)
const LIFT_END = 0.12 // letters lift off their arcs onto the orbit
const TRAVEL_START = 0.04
const TRAVEL_END = 0.9
const REVOLUTIONS = 1.15
const HOOK_START = 0.44 // the thread drops from the tail of "MOOD"
const PULL_START = 0.55 // ...and starts pulling the page down
const ARRIVED = 0.97

type Letter = {
  el: SVGPathElement
  cx: number
  cy: number
  baseRotation: number // degrees the glyph is rotated on its original arc
  offset: number // arc-length offset from the word's middle letter
  inward: boolean // MIND MOOD reads with its tops toward the centre
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const deg = (rad: number) => (rad * 180) / Math.PI
const wrapDeg = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180

function circleFrom(a: DOMPoint, b: DOMPoint, c: DOMPoint) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d
  const uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d
  return { x: ux, y: uy, r: Math.hypot(a.x - ux, a.y - uy) }
}

/**
 * Cinematic entrance. The Scriptomente logo opens the page, big and centred.
 * While the page is pinned, the logo's own "BRAIN FOOD" and "MIND MOOD" letters
 * lift off their arcs and wrap round the wordmark; the tail of "MOOD" then
 * casts a thread that hooks the hidden page and pulls it down into view.
 */
export function Intro({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<SVGPathElement>(null)
  const hookRef = useRef<SVGCircleElement>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)
  const [enabled] = useState(() => !getDeviceCapability().isReducedMotion)
  const [heroReady, setHeroReady] = useState(!enabled)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const stage = stageRef.current
    const logo = logoRef.current
    const thread = threadRef.current
    const hook = hookRef.current
    const hint = hintRef.current
    const hero = wrap?.querySelector<HTMLElement>('.hero')
    const page = wrap?.closest<HTMLElement>('.page')
    if (!enabled || !wrap || !stage || !logo || !thread || !hook || !hint || !hero) return

    const svg = logo.querySelector('svg')
    if (!svg) return
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.removeAttribute('style')
    svg.setAttribute('overflow', 'visible')
    const paths = Array.from(svg.querySelectorAll('path'))
    paths.forEach((p, i) => p.classList.add(MIND_MOOD.includes(i) || BRAIN_FOOD.includes(i) ? 'intro__arc-letter' : 'intro__mark'))

    // Orbit around the wordmark (logo units; viewBox is 190 × 50.6)
    const ns = 'http://www.w3.org/2000/svg'
    const orbit = document.createElementNS(ns, 'path')
    const [ox, oy, rx, ry] = [95, 25.3, 112, 44]
    orbit.setAttribute('d', `M ${ox - rx} ${oy} A ${rx} ${ry} 0 1 1 ${ox + rx} ${oy} A ${rx} ${ry} 0 1 1 ${ox - rx} ${oy}`)
    orbit.setAttribute('fill', 'none')
    svg.appendChild(orbit)
    const L = orbit.getTotalLength()
    const pointAt = (s: number) => {
      const len = ((s % L) + L) % L
      return orbit.getPointAtLength(len)
    }
    const tangentAt = (s: number) => {
      const a = pointAt(s - 0.5)
      const b = pointAt(s + 0.5)
      return deg(Math.atan2(b.y - a.y, b.x - a.x))
    }
    const nearestS = (x: number, y: number) => {
      let best = 0
      let bestD = Infinity
      for (let i = 0; i < 400; i++) {
        const s = (i / 400) * L
        const p = orbit.getPointAtLength(s)
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < bestD) {
          bestD = d
          best = s
        }
      }
      return best
    }

    // Measure each word on its original arc
    const words = [
      { indices: BRAIN_FOOD, inward: false },
      { indices: MIND_MOOD, inward: true },
    ].map(({ indices, inward }) => {
      const centres = indices.map((i) => {
        const b = paths[i].getBBox()
        return new DOMPoint(b.x + b.width / 2, b.y + b.height / 2)
      })
      const mid = Math.floor(indices.length / 2)
      const circle = circleFrom(centres[0], centres[mid], centres[centres.length - 1])
      const angles = centres.map((c) => Math.atan2(c.y - circle.y, c.x - circle.x))
      const sMid = nearestS(centres[mid].x, centres[mid].y)
      const letters: Letter[] = indices.map((i, k) => ({
        el: paths[i],
        cx: centres[k].x,
        cy: centres[k].y,
        baseRotation: deg(angles[k]) + (inward ? -90 : 90),
        offset: (angles[k] - angles[mid]) * circle.r * 1.12,
        inward,
      }))
      return { letters, sMid }
    })
    const tail = words[1].letters[words[1].letters.length - 1] // the final "D"

    let lastTravel = 0
    let lastPull = 0
    let hooked = false
    let arrived = false

    const render = (p: number) => {
      const lift = easeOut(clamp01(p / LIFT_END))
      const travel = easeInOut(clamp01((p - TRAVEL_START) / (TRAVEL_END - TRAVEL_START))) * L * REVOLUTIONS
      for (const word of words) {
        for (const letter of word.letters) {
          const s = word.sMid + letter.offset + travel
          const pt = pointAt(s)
          const tangent = tangentAt(s)
          const target = letter.inward ? tangent + 180 : tangent
          const rotate = wrapDeg(target - letter.baseRotation) * lift
          const x = letter.cx + (pt.x - letter.cx) * lift
          const y = letter.cy + (pt.y - letter.cy) * lift
          letter.el.setAttribute('transform', `translate(${x} ${y}) rotate(${rotate}) translate(${-letter.cx} ${-letter.cy})`)
        }
      }

      // Ambient bed follows the letters' travel
      const ctm = svg.getScreenCTM()
      const scale = ctm ? ctm.a : 1
      const moved = (travel - lastTravel) * scale
      lastTravel = travel
      if (moved > 0) sound.threadMove(moved)

      // The hook: a thread from the tail of "MOOD" up to the page above
      const vh = window.innerHeight
      const vw = window.innerWidth
      const heroH = hero.offsetHeight
      const pull = easeInOut(clamp01((p - PULL_START) / (1 - PULL_START)))
      const heroY = -heroH * (1 - pull)
      // Curtain sound follows exactly how far the page moved this frame
      const pulled = Math.abs(pull - lastPull) * heroH
      lastPull = pull
      if (pulled > 0) sound.curtainMove(pulled)
      gsap.set(hero, { y: heroY })
      const tailS = words[1].sMid + tail.offset + travel - 3
      const tailPt = ctm ? pointAt(tailS).matrixTransform(ctm) : new DOMPoint()
      const stageBox = stage.getBoundingClientRect()
      const tx = tailPt.x - stageBox.left
      const ty = tailPt.y - stageBox.top
      const hx = vw / 2
      const hy = heroH + heroY // bottom edge of the incoming page
      const drop = clamp01((p - HOOK_START) / (PULL_START - HOOK_START))
      thread.setAttribute('d', `M ${tx} ${ty} C ${tx} ${ty - vh * 0.25}, ${hx} ${hy + vh * 0.3}, ${hx} ${hy}`)
      const length = thread.getTotalLength()
      thread.style.strokeDasharray = `${length}`
      thread.style.strokeDashoffset = `${length * (1 - drop)}`
      thread.style.opacity = drop > 0 ? '1' : '0'
      hook.setAttribute('cx', `${hx}`)
      hook.setAttribute('cy', `${hy}`)
      hook.style.opacity = drop >= 1 ? '1' : '0'

      // The stage gives way as the page settles over it
      stage.style.setProperty('--stage-fade', `${1 - clamp01((p - 0.86) / 0.12)}`)
      hint.style.opacity = `${1 - clamp01(p / 0.06)}`

      // Sounds, exactly on the visual beats
      if (!hooked && drop >= 1) {
        hooked = true
        sound.pop(1.15) // the hook catches the page
      } else if (hooked && drop < 1) {
        hooked = false
      }
      if (!arrived && p >= ARRIVED) {
        arrived = true
        sound.curtainSettle() // the drape comes to rest
        setHeroReady(true)
      } else if (arrived && p < ARRIVED - 0.05) {
        arrived = false
      }
    }

    const state = { p: 0 }
    let trigger: ScrollTrigger | undefined
    const ctx = gsap.context(() => {
      gsap.to(state, {
        p: 1,
        ease: 'none',
        onUpdate: () => render(state.p),
        scrollTrigger: {
          id: 'intro',
          trigger: wrap,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * RUNWAY_VH)}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.7,
          refreshPriority: 10,
          onRefresh: (self) => {
            trigger = self
            page?.style.setProperty('--intro-space', `${Math.round(self.end - self.start)}px`)
          },
        },
      })
    }, wrap)

    // Measure everything with the page in its resting place
    const onRefreshInit = () => gsap.set(hero, { y: 0 })
    const onRefresh = () => render(state.p)
    ScrollTrigger.addEventListener('refreshInit', onRefreshInit)
    ScrollTrigger.addEventListener('refresh', onRefresh)
    render(0)

    // Keyboard users focusing into the page skip straight past the intro
    const onFocusIn = () => {
      if (trigger && trigger.progress < 1) window.scrollTo({ top: trigger.end + 1 })
    }
    hero.addEventListener('focusin', onFocusIn)
    // "Back to top" links land on the page, not on the intro
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href="#top"]')
      if (!link || !trigger) return
      event.preventDefault()
      event.stopPropagation()
      window.scrollTo({ top: trigger.end + 1, behavior: 'smooth' })
    }
    document.addEventListener('click', onClick, true)

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', onRefreshInit)
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      hero.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('click', onClick, true)
      ctx.revert()
      orbit.remove()
      page?.style.removeProperty('--intro-space')
    }
  }, [enabled])

  // Re-run layout once fonts have settled so the pin distance is exact
  useEffect(() => {
    if (!enabled) return
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [enabled])

  return (
    <HeroReadyContext.Provider value={heroReady}>
      <div className="intro" ref={wrapRef}>
        {enabled && (
          <div className="intro__stage" ref={stageRef} aria-hidden="true">
            <div className="intro__logo" ref={logoRef} dangerouslySetInnerHTML={{ __html: logoSvg }} />
            <svg className="intro__hook" width="100%" height="100%">
              <path ref={threadRef} className="intro__thread" />
              <circle ref={hookRef} className="intro__hook-dot" r="4" />
            </svg>
            <p className="intro__hint" ref={hintRef}>
              <span className="intro__hint-inner">
                <span>SCROLL TO BEGIN</span>
                <span className="intro__hint-arrow">↓</span>
              </span>
            </p>
          </div>
        )}
        {children}
      </div>
    </HeroReadyContext.Provider>
  )
}
