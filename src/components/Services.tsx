import { useRef, useState, type CSSProperties } from 'react'
import threadUpper from '../assets/figma/thread-upper.svg'
import { services, type Service } from '../content'
import { ToggleButton } from './ToggleButton'
import { ScrollRevealText } from '../motion/ScrollRevealText'
import { Reveal } from '../motion/Reveal'
import { ThreadDraw } from '../motion/ThreadDraw'
import { Genie, GenieItem } from '../motion/Genie'
import { useThreadTouch } from '../motion/useThreadTouch'
import { sound } from '../audio/soundEngine'
import './Services.css'

/**
 * Desktop row geometry from the Figma frame (px from each row's top rule):
 * [rowHeight, toggleTop, titleTop, listTop, numberTop, contentX, listX, numberX]
 * The rows are intentionally not uniform in the design.
 */
const desktopRows: Record<string, number[]> = {
  '01': [261, 51, 75.5, 85.5, 62, 92.5, 813.5, 0],
  '02': [249.26, 39.48, 74.48, 74.49, 61.44, 89.5, 810, -6.5],
  '03': [253.77, 44.22, 66.22, 66.22, 53.54, 91, 812, -4],
  '04': [221.43, 40.45, 75.45, 98.45, 49.91, 94, 812, -5],
}
const rowVars = ['h', 'tog', 'title', 'list', 'num', 'cx', 'lx', 'nx']

function rowStyle(number: string): CSSProperties {
  const style: Record<string, string> = {}
  desktopRows[number].forEach((value, index) => {
    style[`--row-${rowVars[index]}`] = `${value}px`
  })
  return style as CSSProperties
}

function ServiceRow({ service, index }: { service: Service; index: number }) {
  const toggleRef = useRef<HTMLButtonElement>(null)
  // This section has its own impact: a plucked note that rises row by row
  const touched = useThreadTouch(toggleRef, () => sound.pluck(index))
  // Rows start folded (+). The first time the thread lights this toggle, the
  // details pop out on their own; from then on (or as soon as the visitor
  // clicks first) the toggle is entirely theirs.
  const [expanded, setExpanded] = useState(false)
  const [settled, setSettled] = useState(false)
  if (touched && !settled) {
    setSettled(true)
    setExpanded(true)
  }

  const descId = `service-${service.number}-desc`
  const listId = `service-${service.number}-list`

  return (
    <li className={`service ${touched ? '' : 'is-dormant'}`} style={rowStyle(service.number)}>
      <span className="service__number" aria-hidden="true">
        {service.number}
      </span>
      <div className="service__main">
        <h3 className="service__title">{service.title}</h3>
        <Genie id={descId} open={expanded} summoned origin="right">
          <GenieItem as="p" className="service__description">
            {service.compact?.description ? (
              <>
                <span className="only-wide">{service.description}</span>
                <span className="only-compact">{service.compact.description}</span>
              </>
            ) : (
              service.description
            )}
          </GenieItem>
        </Genie>
      </div>
      <Genie id={listId} as="ul" className="service__items" open={expanded} summoned origin="right">
        {service.items.map((item) => (
          <GenieItem as="li" key={item} className={service.compact?.items ? 'only-wide' : undefined}>
            {item}
          </GenieItem>
        ))}
        {service.compact?.items?.map((item) => (
          <GenieItem as="li" key={`compact-${item}`} className="only-compact">
            {item}
          </GenieItem>
        ))}
      </Genie>
      <ToggleButton
        ref={toggleRef}
        className="service__toggle"
        expanded={expanded}
        lit={touched}
        controls={`${descId} ${listId}`}
        label={service.title}
        onToggle={() => {
          setSettled(true)
          setExpanded((value) => !value)
        }}
      />
    </li>
  )
}

export function Services() {
  return (
    <section className="services" id="services" aria-labelledby="services-heading">
      <ThreadDraw className="services__thread" src={threadUpper} width={1302.1} height={1685.84} />

      <div className="services__inner">
        <div className="services__header">
          <Reveal as="p" className="services__intro">
            I work alongside founders and teams on the questions, <br className="services__break" />
            the plans, and the details, from first story to first sale.
          </Reveal>
          <ScrollRevealText
            as="h2"
            id="services-heading"
            className="services__heading"
            segments={[
              { text: 'Ways we can', className: 'services__heading-line' },
              { text: ' ' },
              { text: 'work together.', className: 'services__heading-line services__heading-line--accent' },
            ]}
          />
        </div>

        <ul className="services__list">
          {services.map((service, index) => (
            <ServiceRow key={service.number} service={service} index={index} />
          ))}
        </ul>
      </div>
    </section>
  )
}
