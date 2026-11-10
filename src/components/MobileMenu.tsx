import { useEffect, useRef, type MouseEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import logoBrand from '../assets/figma/logo-brand.svg'
import { navLinks } from '../content'
import { ArrowLink } from './ArrowLink'
import { lockScroll, scrollToHash, unlockScroll } from '../motion/scroll'
import { usePrefersReducedMotion } from '../motion/device'
import { sound } from '../audio/soundEngine'
import './MobileMenu.css'

type Props = {
  readonly id: string
  readonly open: boolean
  readonly onClose: () => void
  /** The burger button; focus returns to it when the menu closes. */
  readonly returnFocusRef: RefObject<HTMLButtonElement | null>
}

const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const
const EASE_OUT = [0.22, 1, 0.36, 1] as const

/**
 * Figma "modal" (mobile 14:268, tablet 14:320): the full-screen cream menu.
 * It drops in like a curtain from the top; the rule draws across, the close
 * cross scissors open, and the links rise out of a blur one after another.
 * Leaving plays the same moves in reverse.
 */
export function MobileMenu({ id, open, onClose, returnFocusRef }: Props) {
  const reduced = usePrefersReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    lockScroll()
    sound.whoosh(1.1, 0.55)
    const sheet = sheetRef.current
    const returnTo = returnFocusRef.current
    const focusTimer = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), reduced ? 0 : 420)

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !sheet) return
      // Keep keyboard focus inside the menu while it is open
      const focusable = sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const onResize = () => {
      if (window.innerWidth >= 1200) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      unlockScroll()
      sound.whoosh(0.9, 0.4)
      returnTo?.focus({ preventScroll: true })
    }
  }, [open, onClose, reduced, returnFocusRef])

  // Close first, then glide to the section once the page can scroll again
  const go = (event: MouseEvent<HTMLAnchorElement>) => {
    const hash = event.currentTarget.getAttribute('href')
    if (!hash?.startsWith('#')) return
    event.preventDefault()
    onClose()
    window.setTimeout(() => scrollToHash(hash), reduced ? 0 : 380)
  }

  const t = (seconds: number) => (reduced ? 0 : seconds)

  const sheet: Variants = {
    hidden: { clipPath: 'inset(0% 0% 100% 0%)' },
    shown: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: t(0.85), ease: EASE_CURTAIN } },
    leave: {
      clipPath: 'inset(0% 0% 100% 0%)',
      transition: { duration: t(0.7), ease: EASE_CURTAIN, delay: t(0.18) },
    },
  }
  const fade: Variants = {
    hidden: { opacity: 0, y: -10, filter: 'blur(6px)' },
    shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: t(0.7), ease: EASE_OUT, delay: t(0.35) } },
    leave: { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: t(0.25) } },
  }
  const rule: Variants = {
    hidden: { scaleX: 0 },
    shown: { scaleX: 1, transition: { duration: t(0.9), ease: EASE_CURTAIN, delay: t(0.3) } },
    leave: { scaleX: 0, transition: { duration: t(0.4), ease: EASE_CURTAIN } },
  }
  const bar = (angle: number): Variants => ({
    hidden: { rotate: 0, scaleY: 0.4, opacity: 0 },
    shown: { rotate: angle, scaleY: 1, opacity: 1, transition: { duration: t(0.75), ease: EASE_OUT, delay: t(0.45) } },
    leave: { rotate: 0, scaleY: 0.4, opacity: 0, transition: { duration: t(0.3) } },
  })
  const list: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: t(0.09), delayChildren: t(0.42) } },
    leave: { transition: { staggerChildren: t(0.04), staggerDirection: -1 } },
  }
  const item: Variants = {
    hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
    shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: t(0.8), ease: EASE_OUT } },
    leave: { opacity: 0, y: -12, filter: 'blur(6px)', transition: { duration: t(0.22) } },
  }
  const cta: Variants = {
    hidden: { clipPath: 'inset(0% 100% 0% 0%)' },
    shown: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: t(0.8), ease: EASE_CURTAIN } },
    leave: { clipPath: 'inset(0% 0% 0% 100%)', transition: { duration: t(0.35), ease: EASE_CURTAIN } },
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          ref={sheetRef}
          id={id}
          className="menu-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          variants={sheet}
          initial="hidden"
          animate="shown"
          exit="leave"
        >
          <div className="menu-sheet__inner">
            <div className="menu-sheet__nav">
              <motion.span className="menu-sheet__rule" variants={rule} aria-hidden="true" />
              <motion.a href="#top" className="menu-sheet__logo" aria-label="Scriptomente – back to top" onClick={go} variants={fade}>
                <img src={logoBrand} width={134} height={35.689} alt="Scriptomente" />
              </motion.a>
              <button ref={closeRef} type="button" className="menu-sheet__close" aria-label="Close menu" onClick={onClose}>
                <motion.span className="menu-sheet__bar" variants={bar(-45)} />
                <motion.span className="menu-sheet__bar" variants={bar(45)} />
              </button>
            </div>

            <nav className="menu-sheet__body" aria-label="Mobile">
              <motion.ul className="menu-sheet__links" variants={list}>
                {navLinks.map((link) => (
                  <motion.li key={link.href} variants={item}>
                    <a href={link.href} className="nav-link" onClick={go}>
                      {link.label}
                    </a>
                  </motion.li>
                ))}
                <motion.li className="menu-sheet__cta-item" variants={item}>
                  <motion.div className="menu-sheet__cta" variants={cta}>
                    <ArrowLink href="#contact" label="LET’S TALK" className="arrow-link--bar" onClick={go} />
                  </motion.div>
                </motion.li>
              </motion.ul>
            </nav>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
