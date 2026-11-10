import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import backArrow from '../assets/figma/back-arrow.svg'
import backArrowMobile from '../assets/figma/back-arrow-mobile.svg'
import { externalLinks } from '../content'
import { usePrefersReducedMotion } from '../motion/device'
import { sound } from '../audio/soundEngine'
import { CookieSwitch } from './CookieSwitch'
import './CookieConsent.css'

export type ConsentChoice = {
  essential: true
  analytics: boolean
  marketing: boolean
  savedAt: string
}

const STORAGE_KEY = 'scriptomente-consent'
/** Dispatch this on window (e.g. from a footer link) to reopen the settings. */
export const OPEN_COOKIE_SETTINGS = 'scriptomente:cookie-settings'
/** Fired on window with the saved choice, for analytics / marketing loaders. */
export const CONSENT_CHANGED = 'scriptomente:consent'
const SHOW_DELAY_MS = 1400

function readChoice(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ConsentChoice) : null
  } catch {
    return null
  }
}

function saveChoice(analytics: boolean, marketing: boolean) {
  const choice: ConsentChoice = { essential: true, analytics, marketing, savedAt: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice))
  } catch {
    /* storage unavailable: the choice holds for this visit only */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: choice }))
}

type View = 'banner' | 'customize'

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/**
 * Figma cookie banner: "Cookie Banner | Mobile" 14:568 + "Mobile Customize"
 * 14:583, and the tablet "Cookie Cover" 14:517 / 14:531 (also used on desktop).
 *
 * The card rises out of a blur; its contents follow line by line. Switching to
 * "Customize" lets the old view drift away while the card grows to the new
 * height, then the categories and their switches arrive one by one.
 */
export function CookieConsent() {
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = useState(false)
  const [view, setView] = useState<View>('banner')
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const observer = useRef<ResizeObserver | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)

  useEffect(() => {
    let timer = 0
    if (!readChoice()) timer = window.setTimeout(() => setVisible(true), reduced ? 0 : SHOW_DELAY_MS)
    const reopen = () => {
      const stored = readChoice()
      setAnalytics(stored?.analytics ?? false)
      setMarketing(stored?.marketing ?? false)
      setView('customize')
      setVisible(true)
    }
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen)
    }
  }, [reduced])

  // The card's height follows whichever view is on stage
  const measure = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect()
    if (!node) return
    observer.current = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0].blockSize))
    observer.current.observe(node)
  }, [])

  useEffect(() => () => observer.current?.disconnect(), [])

  // Move focus to the new view's heading after a view change (not on first show)
  useLayoutEffect(() => {
    if (!visible) {
      moved.current = false
      return
    }
    if (!moved.current) {
      moved.current = true
      return
    }
    const id = window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), reduced ? 0 : 450)
    return () => window.clearTimeout(id)
  }, [view, visible, reduced])

  const finish = (nextAnalytics: boolean, nextMarketing: boolean) => {
    saveChoice(nextAnalytics, nextMarketing)
    setAnalytics(nextAnalytics)
    setMarketing(nextMarketing)
    setVisible(false)
    sound.whoosh(0.9, 0.45)
  }

  const switchView = (next: View) => {
    sound.whoosh(0.8, 0.35)
    setView(next)
  }

  const t = (seconds: number) => (reduced ? 0 : seconds)

  const card: Variants = {
    hidden: { opacity: 0, y: 70, scale: 0.97, filter: 'blur(14px)' },
    shown: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: t(1.05), ease: EASE_OUT },
    },
    leave: {
      opacity: 0,
      y: 48,
      scale: 0.98,
      filter: 'blur(10px)',
      transition: { duration: t(0.55), ease: [0.55, 0, 0.75, 0.2] },
    },
  }
  const stage: Variants = {
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: { staggerChildren: t(0.08), delayChildren: t(0.28) } },
    leave: { opacity: 0, x: -18, filter: 'blur(6px)', transition: { duration: t(0.3), ease: 'easeIn' } },
  }
  const line: Variants = {
    hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
    shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: t(0.75), ease: EASE_OUT } },
  }
  // Switches pop in from a squeezed pill, knob sliding into place
  const toggle: Variants = {
    hidden: { opacity: 0, scaleX: 0.4, scaleY: 0.7, filter: 'blur(4px)' },
    shown: {
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      filter: 'blur(0px)',
      transition: { type: 'spring', stiffness: 420, damping: 18, mass: 0.7, delay: t(0.25) },
    },
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          key="cookie"
          className="cookie"
          role="dialog"
          aria-modal="false"
          aria-labelledby={view === 'banner' ? 'cookie-title' : 'cookie-essential'}
          variants={card}
          initial="hidden"
          animate="shown"
          exit="leave"
          onAnimationStart={(definition) => {
            if (definition === 'shown') sound.whoosh(1.2, 0.5)
          }}
        >
          <motion.div
            className="cookie__frame"
            initial={false}
            animate={{ height }}
            transition={{ duration: t(0.65), ease: [0.65, 0, 0.35, 1] }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {view === 'banner' ? (
                <motion.div
                  key="banner"
                  ref={measure}
                  className="cookie__view cookie__view--banner"
                  variants={stage}
                  initial="hidden"
                  animate="shown"
                  exit="leave"
                >
                  <motion.h2 ref={headingRef} id="cookie-title" className="cookie__title" tabIndex={-1} variants={line}>
                    Only Essential Cookies.
                  </motion.h2>
                  <motion.div className="cookie__text" variants={line}>
                    <p>
                      Scriptomente uses only technically necessary cookies to ensure the website functions properly.
                      No advertising, no tracking, no third-party providers — a calm and thoughtful approach, even
                      here.
                    </p>
                    <p>
                      For more information, please refer to our{' '}
                      <a className="cookie__link" href={externalLinks.privacyPolicy}>
                        Privacy Policy.
                      </a>
                    </p>
                  </motion.div>
                  <div className="cookie__actions cookie__actions--banner">
                    <motion.button type="button" className="cbtn cbtn--solid" variants={line} onClick={() => finish(true, true)}>
                      <span>ACCEPT ALL</span>
                    </motion.button>
                    <motion.button type="button" className="cbtn" variants={line} onClick={() => finish(false, false)}>
                      <span>ONLY ESSENTIALS</span>
                    </motion.button>
                    <motion.button type="button" className="cbtn" variants={line} onClick={() => switchView('customize')}>
                      <span>CUSTOMIZE</span>
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="customize"
                  ref={measure}
                  className="cookie__view cookie__view--customize"
                  variants={stage}
                  initial="hidden"
                  animate="shown"
                  exit="leave"
                >
                  <motion.button type="button" className="cookie__back" variants={line} onClick={() => switchView('banner')}>
                    <img className="cookie__back-arrow cookie__back-arrow--tablet" src={backArrow} width={19.5263} height={7.36396} alt="" />
                    <img className="cookie__back-arrow cookie__back-arrow--mobile" src={backArrowMobile} width={14.4078} height={5.4336} alt="" />
                    <span>BACK</span>
                  </motion.button>

                  <div className="cookie__groups">
                    <motion.div className="cgroup" variants={line}>
                      <h2 ref={headingRef} id="cookie-essential" className="cookie__title" tabIndex={-1}>
                        Essential
                      </h2>
                      <div className="cgroup__row cgroup__row--essential">
                        <p id="cookie-essential-desc" className="cgroup__desc">
                          Required for the website to function. These cookies cannot be disabled.
                        </p>
                        <p className="cgroup__always">Always Active</p>
                      </div>
                    </motion.div>

                    <motion.div className="cgroup" variants={line}>
                      <h3 id="cookie-analytics" className="cookie__title">
                        Analytics
                      </h3>
                      <div className="cgroup__row">
                        <p id="cookie-analytics-desc" className="cgroup__desc cgroup__desc--analytics">
                          Anonymous analytics to help us improve the website thoughtfully.
                        </p>
                        <CookieSwitch
                          checked={analytics}
                          onChange={setAnalytics}
                          labelledBy="cookie-analytics"
                          describedBy="cookie-analytics-desc"
                          variants={toggle}
                        />
                      </div>
                    </motion.div>

                    <motion.div className="cgroup" variants={line}>
                      <h3 id="cookie-marketing" className="cookie__title">
                        Marketing
                      </h3>
                      <div className="cgroup__row">
                        <p id="cookie-marketing-desc" className="cgroup__desc cgroup__desc--marketing">
                          Content and information that may be relevant to your practice.
                        </p>
                        <CookieSwitch
                          checked={marketing}
                          onChange={setMarketing}
                          labelledBy="cookie-marketing"
                          describedBy="cookie-marketing-desc"
                          variants={toggle}
                        />
                      </div>
                    </motion.div>
                  </div>

                  <div className="cookie__actions cookie__actions--customize">
                    <motion.button type="button" className="cbtn" variants={line} onClick={() => finish(true, true)}>
                      <span>ACCEPT ALL</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      className="cbtn cbtn--solid"
                      variants={line}
                      onClick={() => finish(analytics, marketing)}
                    >
                      <span>SAVE PREFERENCES</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
