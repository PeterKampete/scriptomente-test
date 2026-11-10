import { useRef, useState, type CSSProperties } from 'react'
import threadDesktop from '../assets/figma/thread-timeline.svg'
import threadTablet from '../assets/figma/thread-timeline-tablet.svg'
import threadMobile from '../assets/figma/thread-timeline-mobile.svg'
import { experiences, type Experience as ExperienceEntry } from '../content'
import { ToggleButton } from './ToggleButton'
import { Reveal } from '../motion/Reveal'
import { ScrollRevealText } from '../motion/ScrollRevealText'
import { ThreadDraw } from '../motion/ThreadDraw'
import { Genie, GenieItem } from '../motion/Genie'
import { useThreadTouch } from '../motion/useThreadTouch'
import './Experience.css'

/**
 * Where each entry sits on the thread, per Figma frame (desktop 1440 / tablet
 * 768 / mobile 375). Values are px on that frame's canvas, relative to the top
 * of this section: [top, contentLeft, contentWidth, toggleLeft, toggleTop, bodyWidth?]
 */
type Slot = [number, number, number, number, number, number?]
type Placement = { align: 'left' | 'right'; desktop: Slot; tablet: Slot; mobile: Slot }

const placements: Record<string, Placement> = {
  google: { align: 'left', desktop: [453, 360, 789, 281, 9], tablet: [405, 140, 508, 82, 7], mobile: [196, 77, 259, 33, 4, 243] },
  monks: { align: 'right', desktop: [892, 290, 761, 1095, 2], tablet: [757, 88, 489, 607, 12], mobile: [466, 67, 243, 334, 0] },
  ogilvy: { align: 'left', desktop: [1288, 359, 719, 279, 9], tablet: [1103, 141, 517, 80, 4], mobile: [806, 63, 276, 27, 4, 260] },
  tlgg: { align: 'right', desktop: [1618, 328, 814, 1182, 9], tablet: [1368, 95, 530, 655, 6], mobile: [1057, 77, 248, 339, 0] },
  ibm: { align: 'left', desktop: [2112, 334, 844, 263, 9], tablet: [1742, 132, 524, 76, 0], mobile: [1376, 74, 267, 32, 0, 238] },
  doha: { align: 'right', desktop: [2518, 285, 784, 1102, 4, 641], tablet: [2065, 157, 410, 605, 7, 385], mobile: [1689, 57, 245, 324, 0, 220] },
}

/**
 * Tablet/mobile text-box corrections in px, measured against the Figma frames
 * (Figma gives each title/date its own fixed-height box): [title, date, body]
 * margin offsets. Desktop needs none beyond the CSS.
 */
const textOffsets: Record<string, { tablet: number[]; mobile: number[] }> = {
  google: { tablet: [-2, -2, -2], mobile: [1, -2, -1] },
  monks: { tablet: [0, -2, 4], mobile: [-1, -5, 3] },
  ogilvy: { tablet: [-1, 2, 0], mobile: [4, 2, -1] },
  tlgg: { tablet: [-4, -6, 4], mobile: [-4, -6, 4] },
  ibm: { tablet: [-2, -4, 2], mobile: [-4, -1, 2] },
  doha: { tablet: [1, 0, 4], mobile: [-2, -10, 0] },
}

const order = experiences.map((entry) => entry.id)
const breakpoints = ['desktop', 'tablet', 'mobile'] as const
const prefix = { desktop: 'd', tablet: 't', mobile: 'm' } as const

function placementStyle(id: string): CSSProperties {
  const placement = placements[id]
  const next = placements[order[order.indexOf(id) + 1]]
  const style: Record<string, string> = {}
  for (const bp of breakpoints) {
    const [top, left, width, toggleLeft, toggleTop, bodyWidth] = placement[bp]
    const p = prefix[bp]
    style[`--${p}-x`] = `${left}px`
    style[`--${p}-w`] = `${width}px`
    style[`--${p}-bw`] = `${bodyWidth ?? width}px`
    style[`--${p}-tx`] = `${toggleLeft - left}px`
    style[`--${p}-ty`] = `${toggleTop}px`
    style[`--${p}-h`] = next ? `${next[bp][0] - top}px` : 'auto'
    if (bp !== 'desktop') {
      const [title, meta, body] = textOffsets[id][bp]
      style[`--${p}-dt`] = `${title}px`
      style[`--${p}-dm`] = `${meta}px`
      style[`--${p}-db`] = `${body}px`
    }
  }
  return style as CSSProperties
}

function TimelineEntry({ entry }: { entry: ExperienceEntry }) {
  const [expanded, setExpanded] = useState(true)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const touched = useThreadTouch(toggleRef)
  const [summoned, setSummoned] = useState(touched)
  if (touched && !summoned) setSummoned(true)

  const bodyId = `experience-${entry.id}-body`
  const align = placements[entry.id].align

  return (
    <li
      className={`timeline-entry timeline-entry--${align} timeline-entry--${entry.id} ${touched ? '' : 'is-dormant'}`}
      style={placementStyle(entry.id)}
    >
      <ToggleButton
        ref={toggleRef}
        className="timeline-entry__toggle"
        expanded={expanded}
        lit={touched}
        controls={bodyId}
        label={entry.title}
        onToggle={() => setExpanded((value) => !value)}
      />
      <div className="timeline-entry__content">
        <h3 className="timeline-entry__title">{entry.title}</h3>
        <p className="timeline-entry__meta">{entry.meta}</p>
        <Genie id={bodyId} open={expanded} summoned={summoned} origin={align}>
          <GenieItem as="p" className="timeline-entry__body">
            {entry.body}
          </GenieItem>
        </Genie>
      </div>
    </li>
  )
}

export function Experience() {
  return (
    <section className="experience" id="experience" aria-labelledby="experience-heading">
      <div className="experience__canvas">
        <ThreadDraw className="experience__thread experience__thread--desktop" src={threadDesktop} width={1439.53} height={3339.97} />
        <ThreadDraw className="experience__thread experience__thread--tablet" src={threadTablet} width={728.105} height={2793.92} />
        <ThreadDraw className="experience__thread experience__thread--mobile" src={threadMobile} width={386.324} height={2330.84} />

        <div className="experience__intro">
          <ScrollRevealText
            as="h2"
            id="experience-heading"
            className="experience__heading"
            segments={[
              { text: 'Where I ' },
              { text: 'come from.', className: 'experience__heading-accent' },
            ]}
          />
          <Reveal as="p" className="experience__lead" delay={0.1}>
            Brands, agencies, cities. Different perspectives, connected by a way of paying attention.
          </Reveal>
        </div>

        <ol className="timeline">
          {experiences.map((entry) => (
            <TimelineEntry key={entry.id} entry={entry} />
          ))}
        </ol>
      </div>
    </section>
  )
}
