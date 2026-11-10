import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import portrait from '../assets/figma/portrait.jpg'
import womanVideo from '../assets/figma/woman_sitting.mp4'
import watercolor from '../assets/figma/watercolor.png'
import crossingDesktop from '../assets/figma/crossing-lines.svg'
import crossingTablet from '../assets/figma/crossing-lines-tablet.svg'
import crossingMobile from '../assets/figma/crossing-lines-mobile.svg'
import { careerMemories, coachingAlternateImage, transitionMemories, type Memory } from '../content'
import { ParallaxImage } from '../motion/ParallaxImage'
import { ThreadDraw } from '../motion/ThreadDraw'
import { useDeviceCapability } from '../motion/device'
import { sound } from '../audio/soundEngine'
import { VideoScrubber } from '../motion/VideoScrubber'
import './Coaching.css'

gsap.registerPlugin(ScrollTrigger)

const DORMANT = '#C7BAA8'
const PIN_TOP_GAP = 56
// Opening video: 720×1280 with letterbox bars; the picture is 720×1098, the
// same framing as the portrait photo it hands over to.
const VIDEO_CROP = { top: 91, bottom: 91 }
const VIDEO_W = 720
const VIDEO_H = 1098
// Share of the pinned timeline spent playing the video full-screen
const VIDEO_PHASE = 4.2
// Camera path while it plays: from her lap and hands up to her face
// (vertical position within the picture, 0 = top, 1 = bottom)
const PAN_FROM = 0.8
const PAN_TO = 0.27

/** Covers a W×H box with the video picture, centred on the given focus. */
function coverAt(W: number, H: number, focusY: number, focusX = 0.5) {
  const scale = Math.max(W / VIDEO_W, H / VIDEO_H)
  const width = VIDEO_W * scale
  const height = VIDEO_H * scale
  const x = Math.min(0, Math.max(W - width, W / 2 - focusX * width))
  const y = Math.min(0, Math.max(H - height, H / 2 - focusY * height))
  return { width, height, x, y }
}

/** Height of the viewport with mobile toolbars collapsed (CSS 100lvh). */
function largeViewportHeight() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none'
  document.body.appendChild(probe)
  const height = probe.offsetHeight
  probe.remove()
  return Math.max(height, window.innerHeight)
}

// Captions that change while the video plays (all taken from the page copy)
const VIDEO_BEATS = [
  { kicker: 'Berlin · the Netherlands · Doha · Milan · Dublin', lines: ['Ten moves in', 'ten years.'] },
  { kicker: 'In the same week', lines: ['Excited, and', 'untethered.'] },
  { kicker: 'A big transition rarely needs a better plan', lines: ['It needs better', 'questions.'] },
]
const BEAT_STARTS = [0.1, 1.45, 2.8]

// Thread tones contrast with the cards: orange over the cream fronts,
// cream over the orange backs
const THREAD_FRONT = '#DD4A36'
const THREAD_BACK = '#FFF8EE'
const KNOT_RING_FRONT = '#FFFAF3'
const KNOT_RING_BACK = '#DD4A36'
// Image change: the outgoing photo drains of colour, the incoming one blooms into it
const DESATURATED = 'grayscale(1) contrast(0.95)'
const SATURATED = 'grayscale(0) contrast(1)'

type Point = { x: number; y: number }

/** Smooth curve through the points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(points: Point[]) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`
  }
  return d
}
// Collage placement of the six cards: rotation in degrees
const CARD_ROTATIONS = [-6, 4, -3, 5, -4, 6]

/** Splits copy into word spans so the reading reveal can play word by word. */
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((part, index) =>
        /^\s+$/.test(part) || part === '' ? (
          part
        ) : (
          <span key={index} className="cw">
            {part}
          </span>
        ),
      )}
    </>
  )
}

function MemoryFace({ memory, side }: { memory: Memory; side: 'front' | 'back' }) {
  return (
    <div className={`ccard__face ccard__face--${side} ${memory.image ? 'ccard__face--photo' : ''}`}>
      {memory.image ? <img src={memory.image} alt="" loading="lazy" /> : null}
      <span className="ccard__meta">{memory.meta}</span>
      <span className="ccard__title">{memory.title}</span>
    </div>
  )
}

export function Coaching() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrubberRef = useRef<VideoScrubber | null>(null)
  const { isReducedMotion } = useDeviceCapability()

  // Load the opening video when the section is within two screens
  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section || isReducedMotion) return
    const scrubber = new VideoScrubber(womanVideo, canvas, VIDEO_CROP, () => canvas.classList.add('is-ready'))
    scrubberRef.current = scrubber
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        scrubber.load().catch(() => {
          /* the poster photo stays in place */
        })
      },
      { rootMargin: '200% 0px' },
    )
    observer.observe(section)
    return () => {
      observer.disconnect()
      scrubber.destroy()
      scrubberRef.current = null
    }
  }, [isReducedMotion])
  const alternate = coachingAlternateImage ?? portrait

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || isReducedMotion) return
    const q = gsap.utils.selector(section)
    const inner = q('.coaching__inner')[0] as HTMLElement
    const frame = q('.coaching__frame')[0] as HTMLElement
    const heading = q('.coaching__heading')[0] as HTMLElement
    const words = q('.cw') as HTMLElement[]
    const headline = q('.cstage__headline')[0] as HTMLElement
    const first = q('.cstage__w1')[0]
    const second = q('.cstage__w2')[0]
    const cards = q('.ccard') as HTMLElement[]
    const cardInners = q('.ccard__inner')
    const stage = q('.cstage')[0] as HTMLElement
    const realColors = words.map((word) => getComputedStyle(word).color)

    const mm = gsap.matchMedia()
    mm.add({ desktop: '(min-width: 1200px)', compact: '(max-width: 1199px)' }, (context) => {
      const desktop = Boolean(context.conditions?.desktop)
      const swapImage = (desktop ? q('.coaching__portrait-alt') : q('.cstage__thumb-alt'))[0]
      const baseImage = (desktop ? q('.coaching__portrait img') : q('.cstage__thumb img'))[0]
      const target = (desktop ? q('.coaching__portrait') : q('.cstage__thumb'))[0] as HTMLElement

      // Resting layout measurements (no transforms applied yet)
      const box = (el: Element) => el.getBoundingClientRect()
      const hl = box(headline)
      const hd = box(heading)
      const tg = box(target)
      const flipHeadline = {
        x: hd.left - hl.left,
        y: hd.top - hl.top,
        scale: Math.min(1, hd.width / Math.max(1, hl.width)),
      }
      const toTarget = cards.map((card) => {
        const r = box(card)
        return { x: tg.left + tg.width / 2 - (r.left + r.width / 2), y: tg.top + tg.height / 3 - (r.top + r.height / 2) }
      })

      // Thread from under the headline through each card's pin, first to last.
      // It is sewn: a strand runs behind the cards, and over each card it
      // surfaces as running stitches — in front, behind, in front again.
      const st = box(stage)
      const pins: Point[] = cards.map((card) => {
        const r = box(card)
        return { x: r.left + r.width / 2 - st.left, y: r.top + 12 - st.top }
      })
      const start: Point = { x: hl.left + Math.min(hl.width * 0.32, 180) - st.left, y: hl.bottom + 10 - st.top }
      const threadD = smoothPath([start, ...pins])
      const allStrands = Array.from(section.querySelectorAll<SVGPathElement>('.cstage__thread, .cstage__stitch, .cstage__reveal'))
      allStrands.forEach((path) => path.setAttribute('d', threadD))
      const threadLength = allStrands[0]?.getTotalLength() ?? 0
      // Behind-the-card strand + the reveal mask are drawn on with the scroll
      const drawn = Array.from(section.querySelectorAll<SVGPathElement>('.cstage__thread, .cstage__reveal'))
      const strandsFront = Array.from(section.querySelectorAll<SVGPathElement>('.strand-front'))
      const strandsBack = Array.from(section.querySelectorAll<SVGPathElement>('.strand-back'))
      // The "cloth": each card's footprint (with its tilt) clips the stitches
      Array.from(section.querySelectorAll<SVGPolygonElement>('.cstage__cloth')).forEach((poly, i) => {
        const r = box(cards[i])
        const cx = r.left + r.width / 2 - st.left
        const cy = r.top + r.height / 2 - st.top
        const a = (CARD_ROTATIONS[i] * Math.PI) / 180
        const corners = [
          [-r.width / 2, -r.height / 2],
          [r.width / 2, -r.height / 2],
          [r.width / 2, r.height / 2],
          [-r.width / 2, r.height / 2],
        ].map(([x, y]) => `${cx + x * Math.cos(a) - y * Math.sin(a)},${cy + x * Math.sin(a) + y * Math.cos(a)}`)
        poly.setAttribute('points', corners.join(' '))
      })
      const knots = Array.from(section.querySelectorAll<SVGCircleElement>('.cstage__knot'))
      knots.forEach((knot, i) => {
        knot.setAttribute('cx', `${pins[i].x}`)
        knot.setAttribute('cy', `${pins[i].y}`)
      })
      gsap.set(drawn, { strokeDasharray: threadLength, strokeDashoffset: threadLength })
      gsap.set(strandsFront, { stroke: THREAD_FRONT, opacity: 1 })
      gsap.set(strandsBack, { stroke: THREAD_BACK, opacity: 0 })
      gsap.set(knots, { fill: THREAD_FRONT, stroke: KNOT_RING_FRONT, scale: 0, transformOrigin: '50% 50%' })

      // Opening: the portrait arrives full-screen and settles into its slot.
      // Geometry is relative to the inner box as it sits once pinned.
      const reveal = q('.coaching__reveal')[0] as HTMLElement
      const pinGap = () => (desktop ? Math.max(PIN_TOP_GAP, (window.innerHeight - inner.offsetHeight) / 2) : 0)
      const fr = box(frame)
      const slot = { left: tg.left - fr.left, top: tg.top - fr.top, width: tg.width, height: tg.height }
      // Full-bleed: the frame's own width, and the *large* viewport height so
      // nothing shows beneath it when mobile browser toolbars collapse
      const screenW = () => frame.clientWidth
      const screenH = () => largeViewportHeight()
      const fullScreen = () => ({ left: 0, top: -pinGap(), width: screenW(), height: screenH() })
      gsap.set(reveal, { ...fullScreen(), autoAlpha: 1 })
      const media = q('.coaching__reveal-media')[0] as HTMLElement
      const panFrom = () => coverAt(screenW(), screenH(), PAN_FROM, desktop ? 0.5 : 0.46)
      const panTo = () => coverAt(screenW(), screenH(), PAN_TO, desktop ? 0.5 : 0.46)
      gsap.set(media, panFrom())

      gsap.set(stage, { autoAlpha: 1 })
      gsap.set(heading, { opacity: 0 })
      gsap.set(words, { opacity: 0, y: 6, filter: 'blur(8px)', color: DORMANT })
      gsap.set(cards, { opacity: 0, y: 90, scale: 0.85, rotation: (i: number) => CARD_ROTATIONS[i] * 0.3 })
      gsap.set(second, { rotationX: -90, yPercent: 45, opacity: 0 })
      // The second image wipes up over the first, like a page being turned
      gsap.set(swapImage, { opacity: 1, clipPath: 'inset(100% 0% 0% 0%)', filter: DESATURATED })
      gsap.set(baseImage, { filter: SATURATED })

      const forward = () => tl.scrollTrigger?.direction === 1
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: frame,
          // Always keep breathing room above the pinned section (more when it fits)
          start: () => `top top+=${pinGap()}`,
          end: () => `+=${Math.round(window.innerHeight * (desktop ? 10 : 7))}`,
          pin: true,
          scrub: 0.6,
          refreshPriority: 5,
          invalidateOnRefresh: true,
        },
      })

      // V — full screen: scrolling plays the video while the camera travels up
      // her body, and the captions change with it
      const vcopy = q('.vcopy')[0]
      const scrim = q('.coaching__reveal-scrim')[0]
      const beats = q('.vbeat')
      const digits = q('.vcopy__digit')
      const lineInners = q('.vbeat .vline > span')
      const fill = q('.vcopy__fill')[0]
      const knot = q('.vcopy__knot')[0]
      const meta = q('.vcopy__meta')[0]
      gsap.set(lineInners, { yPercent: 110 })
      gsap.set(digits, { yPercent: 110 })
      gsap.set(meta, { opacity: 0 })
      gsap.set(fill, { scaleX: 0, transformOrigin: '0% 50%' })
      gsap.set(knot, { left: '0%' })

      const playhead = { p: 0 }
      let lastP = 0
      tl.fromTo(
        playhead,
        { p: 0 },
        {
          p: 1,
          duration: VIDEO_PHASE,
          onUpdate: () => {
            scrubberRef.current?.setProgress(playhead.p)
            const moved = Math.abs(playhead.p - lastP)
            lastP = playhead.p
            if (moved > 0) sound.threadMove(moved * 900)
          },
        },
        0,
      )
      tl.fromTo(media, { x: () => panFrom().x, y: () => panFrom().y }, { x: () => panTo().x, y: () => panTo().y, duration: VIDEO_PHASE, ease: 'power1.inOut' }, 0)
      tl.to(meta, { opacity: 1, duration: 0.4 }, 0.02)
      tl.to(fill, { scaleX: 1, duration: VIDEO_PHASE }, 0)
      tl.to(knot, { left: '100%', duration: VIDEO_PHASE }, 0)
      beats.forEach((beat, i) => {
        const at = BEAT_STARTS[i]
        const inners = beat.querySelectorAll('.vline > span')
        if (i > 0) tl.call(() => forward() && sound.whoosh(0.9, 0.35), [], at)
        tl.to(inners, { yPercent: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' }, at)
        tl.to(digits[i], { yPercent: 0, duration: 0.5, ease: 'power3.out' }, at)
        const next = BEAT_STARTS[i + 1]
        if (next !== undefined) {
          tl.to(inners, { yPercent: -110, stagger: 0.06, duration: 0.45, ease: 'power3.in' }, next - 0.4)
          tl.to(digits[i], { yPercent: -110, duration: 0.4, ease: 'power3.in' }, next - 0.4)
        }
      })

      // S — captions lift away and the video glides into its place on the right
      tl.addLabel('settle', VIDEO_PHASE)
      tl.call(() => forward() && sound.whoosh(1.6, 0.5), [], 'settle+=0.02')
      tl.to([vcopy, scrim], { opacity: 0, y: -18, filter: 'blur(10px)', duration: 0.6, ease: 'power1.in' }, 'settle')
      tl.fromTo(reveal, { left: () => fullScreen().left, top: () => fullScreen().top, width: () => fullScreen().width, height: () => fullScreen().height }, { ...slot, duration: 1.8, ease: 'power3.inOut', immediateRender: false }, 'settle')
      // From the face-framed close-up to the exact portrait framing
      tl.fromTo(
        media,
        { width: () => panTo().width, height: () => panTo().height, x: () => panTo().x, y: () => panTo().y },
        { width: slot.width, height: slot.height, x: 0, y: 0, duration: 1.8, ease: 'power3.inOut', immediateRender: false },
        'settle',
      )
      // Soft hand-over to the real portrait underneath
      tl.to(reveal, { autoAlpha: 0, duration: 0.35 }, 'settle+=1.6')
      tl.addLabel('open', 'settle+=1.2')

      // A — memories surface under "Career Coaching"; the thread is drawn out
      // of the headline as the image settles
      tl.call(() => forward() && sound.whoosh(1.1, 0.55), [], 'open+=0.05')
      tl.to(cards, { opacity: 1, y: 0, scale: 1, rotation: (i: number) => CARD_ROTATIONS[i], stagger: 0.22, duration: 1.5, ease: 'power2.out' }, 'open+=0.4')
      // The thread is sewn down from the headline, reaching each card as it lands
      tl.to(drawn, { strokeDashoffset: 0, duration: 3, ease: 'power1.inOut' }, 'open')
      tl.to(knots, { scale: 1, stagger: 0.36, duration: 0.4, ease: 'back.out(2)' }, 'open+=0.9')
      tl.to({}, { duration: 1.4 })

      // C — the headline rotates to "Life Transition", cards and image turn over
      tl.addLabel('turn')
      tl.call(() => forward() && sound.whoosh(0.8, 0.5), [], 'turn')
      tl.to(first, { rotationX: 90, yPercent: -45, opacity: 0, duration: 1.4, ease: 'power2.in' }, 'turn')
      tl.to(second, { rotationX: 0, yPercent: 0, opacity: 1, duration: 1.4, ease: 'power2.out' }, 'turn+=0.9')
      tl.to(cardInners, { rotationY: 180, stagger: 0.22, duration: 1.6, ease: 'power2.inOut' }, 'turn')
      tl.to(baseImage, { filter: DESATURATED, duration: 1.2, ease: 'power1.out' }, 'turn')
      tl.to(swapImage, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'power2.inOut' }, 'turn+=0.5')
      tl.to(swapImage, { filter: SATURATED, duration: 1.4, ease: 'power1.inOut' }, 'turn+=1.8')
      // Thread takes on the colour opposite the turned cards
      tl.to(strandsFront, { opacity: 0, duration: 1.6 }, 'turn')
      tl.to(strandsBack, { opacity: 1, duration: 1.6 }, 'turn')
      tl.to(knots, { fill: THREAD_BACK, stroke: KNOT_RING_BACK, stagger: 0.22, duration: 1.2 }, 'turn')
      tl.to({}, { duration: 1.4 })

      // E — everything morphs into the final layout
      tl.addLabel('morph')
      tl.call(() => forward() && sound.whoosh(1.3, 0.6), [], 'morph')
      tl.to(headline, { ...flipHeadline, transformOrigin: '0% 0%', opacity: 0, filter: 'blur(6px)', duration: 2, ease: 'power2.inOut' }, 'morph')
      tl.fromTo(heading, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power1.out' }, 'morph+=1')
      tl.to(cards, { x: (i: number) => toTarget[i].x, y: (i: number) => toTarget[i].y, scale: 0.2, rotation: 0, opacity: 0, stagger: 0.1, duration: 1.6, ease: 'power2.in' }, 'morph+=0.3')
      tl.to(swapImage, { filter: DESATURATED, duration: 1, ease: 'power1.out' }, 'morph')
      tl.to(swapImage, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.6, ease: 'power2.inOut' }, 'morph+=0.5')
      tl.to(baseImage, { filter: SATURATED, duration: 1.4, ease: 'power1.inOut' }, 'morph+=1.2')
      // ...and is unpicked as the cards leave
      tl.to(drawn, { strokeDashoffset: threadLength, duration: 1.2, ease: 'power2.in' }, 'morph')
      tl.to(knots, { scale: 0, stagger: { each: 0.08, from: 'end' }, duration: 0.4 }, 'morph')
      if (!desktop) tl.to(stage, { autoAlpha: 0, filter: 'blur(10px)', duration: 1.1 }, 'morph+=1')

      // F — the copy is read in: word by word out of a blur, then into colour
      const read = (timeline: gsap.core.Timeline, at: string | number) => {
        const each = 3 / Math.max(1, words.length)
        timeline.to(words, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: { each }, duration: 0.45, ease: 'power1.out' }, at)
        timeline.to(words, { color: (i: number) => realColors[i], stagger: { each }, duration: 0.6 }, typeof at === 'number' ? at + 0.3 : '<+=0.3')
      }
      if (desktop) {
        tl.addLabel('read', '+=0.2')
        read(tl, 'read')
        tl.to({}, { duration: 0.4 })
      } else {
        const text = q('.coaching__text')[0]
        const reading = gsap.timeline({
          scrollTrigger: { trigger: text, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
        })
        read(reading, 0)
      }

      return () => {
        gsap.set([stage, heading, ...words, ...cards, headline, first, second, swapImage, baseImage, reveal, media, vcopy, scrim, meta, fill, knot, ...lineInners, ...digits, ...allStrands, ...knots], { clearProps: 'all' })
        gsap.set(cardInners, { clearProps: 'all' })
      }
    })

    return () => mm.revert()
  }, [isReducedMotion])

  return (
    <section className="coaching" id="about" aria-labelledby="coaching-heading" ref={sectionRef}>
      <ThreadDraw className="coaching__lines coaching__lines--desktop" src={crossingDesktop} width={1541} height={448.685} />
      <ThreadDraw className="coaching__lines coaching__lines--tablet" src={crossingTablet} width={858.275} height={266.35} />
      <ThreadDraw className="coaching__lines coaching__lines--mobile" src={crossingMobile} width={429.275} height={155.35} />

      {/* Pinned box keeps the section's Figma height so spacing below is preserved */}
      <div className="coaching__frame">
      <div className="coaching__inner">
        <div className="coaching__text">
          <h2 id="coaching-heading" className="coaching__heading">
            Career &amp; Life Transition Coaching
          </h2>
          <div className="coaching__story">
            <p className="coaching__lead">
              <Words text="I’ve moved more than ten times in ten years, across Berlin, the Netherlands, Doha, Milan and Dublin. My career changed shape along the way, too." />
            </p>
            <p className="coaching__lead coaching__lead--light">
              <Words text="I know what it’s like to start over, and to feel excited and untethered in the same week. What I’ve learned is that a big transition rarely needs a better plan. It needs better questions." />
            </p>
          </div>
          <div className="coaching__offer">
            <p className="coaching__body">
              <Words text="Coaching with me is one-to-one time to ask the right ones. Whether you’re changing careers, changing countries, or somewhere in between and unsure what’s next, I listen first and ask what you haven’t asked yet, to help you tell the noise from what’s true. There’s no formula. Most of the answers are already there, and we make enough room to hear them." />
            </p>
            <div className="coaching__focus">
              <p>
                <Words text="For the in-between: career changes, big moves, new chapters. Better questions, and room to hear your own answers." />
              </p>
              <ul>
                <li>
                  <Words text="> Career transitions" />
                </li>
                <li>
                  <Words text="> Relocation & life changes" />
                </li>
                <li>
                  <Words text="> Starting over, again" />
                </li>
              </ul>
            </div>
          </div>
        </div>

        <ParallaxImage className="coaching__portrait" parallaxY={0} fromScale={1.06}>
          <img
            src={portrait}
            width={574}
            height={875}
            alt="Julia Schulze sitting in a café chair, smiling, resting her head on her hand"
            loading="lazy"
          />
          {!isReducedMotion && (
            <img
              className={`coaching__portrait-alt ${coachingAlternateImage ? '' : 'coaching__portrait-alt--crop'}`}
              src={alternate}
              alt=""
              aria-hidden="true"
              loading="lazy"
            />
          )}
        </ParallaxImage>

        {/* Opening sequence: "Career Coaching" → "Life Transition Coaching" */}
        {!isReducedMotion && (
          <div className="cstage" aria-hidden="true">
            <p className="cstage__headline">
              <span className="cstage__swap">
                <span className="cstage__w1">Career</span>
                <span className="cstage__w2">Life Transition</span>
              </span>
              <span className="cstage__fixed">Coaching</span>
            </p>
            <div className="cstage__thumb">
              <img src={portrait} alt="" />
              <img
                className={`cstage__thumb-alt ${coachingAlternateImage ? '' : 'coaching__portrait-alt--crop'}`}
                src={alternate}
                alt=""
              />
            </div>
            {/* Sewn thread: one strand behind the cards... */}
            <svg className="cstage__threads cstage__threads--back" aria-hidden="true">
              <path className="cstage__thread strand-front" />
              <path className="cstage__thread strand-back" />
            </svg>
            {/* ...surfacing over each card as running stitches, pinned by knots */}
            <svg className="cstage__threads cstage__threads--front" aria-hidden="true">
              <defs>
                <clipPath id="cstage-cloth">
                  {careerMemories.map((memory) => (
                    <polygon key={memory.title} className="cstage__cloth" />
                  ))}
                </clipPath>
                <mask id="cstage-sewn" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="8000" height="8000">
                  <path className="cstage__reveal" />
                </mask>
              </defs>
              <g clipPath="url(#cstage-cloth)" mask="url(#cstage-sewn)">
                <path className="cstage__stitch strand-front" />
                <path className="cstage__stitch strand-back" />
              </g>
              {careerMemories.map((memory) => (
                <circle key={memory.title} className="cstage__knot" r="2.6" />
              ))}
            </svg>
            <div className="cstage__cards">
              {careerMemories.map((memory, index) => (
                <div
                  key={memory.title}
                  className="ccard"
                  style={{ '--card-i': index, '--paper': `url(${watercolor})` } as CSSProperties}
                >
                  <div className="ccard__inner">
                    <MemoryFace memory={memory} side="front" />
                    <MemoryFace memory={transitionMemories[index]} side="back" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* Opening image: full-screen as the section arrives, then settles.
          It lives on the full-width pinned frame, so full-bleed needs no
          measuring against the centred column. */}
        {!isReducedMotion && (
          <div className="coaching__reveal" aria-hidden="true">
            <div className="coaching__reveal-media">
              <img className="coaching__reveal-poster" src={portrait} alt="" />
              <canvas className="coaching__reveal-canvas" ref={canvasRef} />
            </div>
            <div className="coaching__reveal-scrim" />
            <div className="vcopy">
              <div className="vcopy__meta">
                <span className="vcopy__count">
                  {VIDEO_BEATS.map((_, i) => (
                    <span key={i} className="vcopy__digit">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  ))}
                </span>
                <span className="vcopy__total">/ {String(VIDEO_BEATS.length).padStart(2, '0')}</span>
                <span className="vcopy__track">
                  <span className="vcopy__fill" />
                  <span className="vcopy__knot" />
                </span>
                <span className="vcopy__label">Career &amp; Life Transition Coaching</span>
              </div>
              <div className="vcopy__beats">
                {VIDEO_BEATS.map((beat, i) => (
                  <div key={i} className="vbeat">
                    <p className="vbeat__kicker">
                      <span className="vline">
                        <span>{beat.kicker}</span>
                      </span>
                    </p>
                    <p className="vbeat__title">
                      <span className="vline">
                        <span>{beat.lines[0]}</span>
                      </span>
                      <span className="vline vline--accent">
                        <span>{beat.lines[1]}</span>
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
