// Ported from scriptomente/client/components/motion/reveal.tsx and stagger.tsx
import type { ElementType, ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useDeviceCapability } from './device'

/** Shared "calm" easing used across every Framer-owned reveal. */
const EASE: [number, number, number, number] = [0.25, 0, 0, 1]

type Tag = 'div' | 'section' | 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'li' | 'span'

type RevealProps = {
  readonly children: ReactNode
  readonly className?: string
  readonly as?: Tag
  readonly y?: number
  readonly blur?: number
  readonly duration?: number
  readonly delay?: number
  /** "inView" reveals on scroll-into-view; "mount" plays immediately. */
  readonly trigger?: 'inView' | 'mount'
  readonly amount?: number
  /** For "mount": hold the element hidden until this becomes true. */
  readonly play?: boolean
}

/** A single element that fades (and optionally rises / unblurs) into place. */
export function Reveal({
  children,
  className,
  as = 'div',
  y = 20,
  blur,
  duration = 0.7,
  delay = 0,
  trigger = 'inView',
  amount = 0.3,
  play = true,
}: RevealProps) {
  const { isReducedMotion, enableParallax } = useDeviceCapability()
  const useBlur = enableParallax && typeof blur === 'number'

  const hidden = isReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y, ...(useBlur ? { filter: `blur(${blur}px)` } : {}) }
  const visible = isReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, ...(useBlur ? { filter: 'blur(0px)' } : {}) }

  const MotionTag = motion[as] as ElementType
  const motionProps =
    trigger === 'mount'
      ? { initial: hidden, animate: play ? visible : hidden }
      : { initial: hidden, whileInView: visible, viewport: { once: true, amount } }

  return (
    <MotionTag className={className} transition={{ duration, delay, ease: EASE }} {...motionProps}>
      {children}
    </MotionTag>
  )
}

type StaggerProps = {
  readonly children: ReactNode
  readonly className?: string
  readonly as?: Tag
  readonly staggerChildren?: number
  readonly delayChildren?: number
  readonly trigger?: 'inView' | 'mount'
  readonly amount?: number
  readonly play?: boolean
}

/** Orchestration container: reveals its `RevealItem` descendants in sequence. */
export function Stagger({
  children,
  className,
  as = 'div',
  staggerChildren = 0.06,
  delayChildren = 0,
  trigger = 'inView',
  amount = 0.2,
  play = true,
}: StaggerProps) {
  const { isReducedMotion } = useDeviceCapability()
  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: isReducedMotion ? 0 : staggerChildren, delayChildren },
    },
  }
  const MotionTag = motion[as] as ElementType
  const motionProps =
    trigger === 'mount'
      ? { initial: 'hidden', animate: play ? 'visible' : 'hidden' }
      : { initial: 'hidden', whileInView: 'visible', viewport: { once: true, amount } }

  return (
    <MotionTag className={className} variants={container} {...motionProps}>
      {children}
    </MotionTag>
  )
}

type RevealItemProps = {
  readonly children: ReactNode
  readonly className?: string
  readonly as?: Tag
  readonly y?: number
  readonly blur?: number
  readonly duration?: number
}

/** A single item revealed by a parent `Stagger`. */
export function RevealItem({
  children,
  className,
  as = 'div',
  y = 16,
  blur,
  duration = 0.5,
}: RevealItemProps) {
  const { isReducedMotion, enableParallax } = useDeviceCapability()
  const useBlur = enableParallax && typeof blur === 'number'
  const variants: Variants = {
    hidden: isReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y, ...(useBlur ? { filter: `blur(${blur}px)` } : {}) },
    visible: {
      opacity: 1,
      ...(isReducedMotion ? {} : { y: 0, ...(useBlur ? { filter: 'blur(0px)' } : {}) }),
      transition: { duration, ease: EASE },
    },
  }
  const MotionTag = motion[as] as ElementType
  return (
    <MotionTag className={className} variants={variants}>
      {children}
    </MotionTag>
  )
}
