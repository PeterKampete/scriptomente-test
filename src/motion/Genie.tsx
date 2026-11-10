import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useDeviceCapability } from './device'
import { sound } from '../audio/soundEngine'
import './Genie.css'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

type Origin = 'left' | 'right'

type GenieProps = {
  readonly id: string
  /** Expanded by the user (−) or collapsed (+). Height animates between them. */
  readonly open: boolean
  /** False until the thread first reaches this entry; content waits for it. */
  readonly summoned: boolean
  /** Side the toggle sits on: content streams out from (and back into) it. */
  readonly origin: Origin
  readonly className?: string
  readonly as?: 'div' | 'ul'
  readonly children: ReactNode
}

/**
 * "Genie out of the lamp" disclosure. The content streams out of the toggle's
 * side — narrow, skewed and blurred at first, then each child settles in turn
 * as if tethered to the one before it — while a puff of cloud dissolves over
 * it. Collapsing reverses the motion and smoothly folds the height away.
 */
export function Genie({ id, open, summoned, origin, className, as = 'div', children }: GenieProps) {
  const { isReducedMotion } = useDeviceCapability()
  const [puff, setPuff] = useState(0)
  const wasShown = useRef(open && summoned)
  // Every opening gets a fresh content layer. Re-opening while the previous
  // close is still running would otherwise cancel that exit and leave the
  // text stuck in its hidden state (only the cloud would appear).
  const [generation, setGeneration] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setGeneration((value) => value + 1)
  }

  const shown = open && summoned
  useEffect(() => {
    if (shown && !wasShown.current && !isReducedMotion) {
      setPuff((value) => value + 1)
      // Same moment and length as the cloud bloom (1.5s CSS animation)
      sound.whoosh(1.5, 0.9)
    }
    wasShown.current = shown
  }, [shown, isReducedMotion])

  const direction = origin === 'left' ? -1 : 1
  const container: Variants = isReducedMotion
    ? { hidden: { opacity: 0 }, shown: { opacity: 1 } }
    : {
        hidden: {
          opacity: 0,
          scaleX: 0.18,
          scaleY: 0.35,
          skewX: direction * -18,
          y: -18,
          filter: 'blur(14px)',
          transition: { duration: 0.55, ease: [0.55, 0, 0.75, 0.2], staggerChildren: 0.05, staggerDirection: -1 },
        },
        shown: {
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.95, ease: EASE_OUT, staggerChildren: 0.09, delayChildren: 0.12 },
        },
      }

  const MotionTag = (as === 'ul' ? motion.ul : motion.div) as ElementType

  return (
    <div className={`genie genie--${origin} ${className ?? ''}`}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="genie-height"
            className="genie__clip"
            initial={{ height: 0 }}
            animate={{ height: 'auto', transition: { duration: isReducedMotion ? 0 : 0.7, ease: EASE_OUT } }}
            exit={{
              height: 0,
              transition: { duration: isReducedMotion ? 0 : 0.6, ease: [0.65, 0, 0.35, 1], delay: isReducedMotion ? 0 : 0.12 },
            }}
          >
            <MotionTag
              key={generation}
              id={id}
              className="genie__content"
              style={{ transformOrigin: origin === 'left' ? '0% 0%' : '100% 0%' }}
              variants={container}
              initial="hidden"
              animate={summoned ? 'shown' : 'hidden'}
              exit="hidden"
            >
              {children}
            </MotionTag>
          </motion.div>
        )}
      </AnimatePresence>
      {puff > 0 && <CloudPuff key={puff} origin={origin} />}
    </div>
  )
}

type GenieItemProps = {
  readonly children: ReactNode
  readonly className?: string
  readonly as?: 'p' | 'li' | 'div'
}

/** A child that follows its predecessor out of the lamp. */
export function GenieItem({ children, className, as = 'div' }: GenieItemProps) {
  const { isReducedMotion } = useDeviceCapability()
  const variants: Variants = isReducedMotion
    ? { hidden: { opacity: 0 }, shown: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: -10, filter: 'blur(8px)', transition: { duration: 0.35 } },
        shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE_OUT } },
      }
  const MotionTag = motion[as] as ElementType
  return (
    <MotionTag className={className} variants={variants}>
      {children}
    </MotionTag>
  )
}

/** Soft cloud that blooms out of the toggle side and dissolves over the content. */
function CloudPuff({ origin }: { origin: Origin }) {
  return (
    <span className={`cloud-puff cloud-puff--${origin}`} aria-hidden="true">
      <span className="cloud-puff__blob cloud-puff__blob--1" />
      <span className="cloud-puff__blob cloud-puff__blob--2" />
      <span className="cloud-puff__blob cloud-puff__blob--3" />
      <span className="cloud-puff__blob cloud-puff__blob--4" />
      <span className="cloud-puff__blob cloud-puff__blob--5" />
    </span>
  )
}
