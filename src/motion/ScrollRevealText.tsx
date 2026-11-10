// Adapted from scriptomente/client/components/motion/scroll-reveal-text.tsx.
// Supports mixed-style segments (e.g. regular + italic brand-coloured words):
// each letter fills into its own computed colour.
import { Fragment, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getDeviceCapability } from './device'

gsap.registerPlugin(ScrollTrigger)

export type TextSegment = { text: string; className?: string }

type Props = {
  readonly segments: TextSegment[]
  readonly className?: string
  readonly as?: 'h2' | 'h3' | 'p' | 'span'
  readonly id?: string
  /** Colour letters start from before scroll fills them in. */
  readonly fromColor?: string
  readonly start?: string
  readonly end?: string
  readonly scrub?: number | boolean
}

/** Warm light grey that reads as "unwritten" against the cream background. */
const DEFAULT_FROM_COLOR = '#C7BAA8'

/** Scroll-scrubbed text: letters "write themselves" in as the user scrolls. */
export function ScrollRevealText({
  segments,
  className,
  as = 'h2',
  id,
  fromColor = DEFAULT_FROM_COLOR,
  start = 'top 90%',
  end = 'top 45%',
  scrub = 1.2,
}: Props) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>(null)
  const key = segments.map((s) => s.text).join('|')

  useEffect(() => {
    const el = ref.current
    if (!el || getDeviceCapability().isReducedMotion) return
    const letters = Array.from(el.querySelectorAll<HTMLElement>('[data-letter]'))
    if (!letters.length) return
    const colors = letters.map((letter) => getComputedStyle(letter).color)

    const ctx = gsap.context(() => {
      gsap.fromTo(
        letters,
        { color: fromColor },
        {
          color: (index: number) => colors[index],
          ease: 'none',
          stagger: 0.5,
          scrollTrigger: { trigger: el, start, end, scrub },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [fromColor, start, end, scrub, key])

  const content = segments.map((segment, segmentIndex) => (
    <span key={segmentIndex} className={segment.className}>
      {segment.text.split(/(\s+)/).map((word, wordIndex) =>
        /^\s+$/.test(word) || word === '' ? (
          <Fragment key={wordIndex}>{word}</Fragment>
        ) : (
          <span key={wordIndex} style={{ whiteSpace: 'nowrap' }}>
            {word.split('').map((char, charIndex) => (
              <span key={charIndex} data-letter>
                {char}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  ))

  // Screen readers get the plain text; the per-letter spans are presentational.
  const label = segments.map((s) => s.text).join('')
  const Tag = as
  return (
    <Tag ref={ref} className={className} id={id}>
      <span className="visually-hidden">{label}</span>
      <span aria-hidden="true">{content}</span>
    </Tag>
  )
}
