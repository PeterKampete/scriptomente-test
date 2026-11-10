import { useCallback, useId, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import logoLight from '../assets/figma/logo-light.svg'
import menuIcon from '../assets/figma/menu-icon.svg'
import heroLine from '../assets/figma/hero-line.svg'
import heroDots from '../assets/figma/hero-dots.svg'
import heroThreadTablet from '../assets/figma/hero-thread-tablet.svg'
import heroDotsTablet from '../assets/figma/hero-dots-tablet.svg'
import heroThreadMobile from '../assets/figma/hero-thread-mobile.svg'
import heroDotsMobile from '../assets/figma/hero-dots-mobile.svg'
import { navLinks } from '../content'
import { ArrowLink } from './ArrowLink'
import { MobileMenu } from './MobileMenu'
import { Reveal, RevealItem, Stagger } from '../motion/Reveal'
import { ThreadDraw } from '../motion/ThreadDraw'
import { useDeviceCapability } from '../motion/device'
import { INTRO_PIN, useHeroReady } from '../intro/introState'
import './Hero.css'

export function Hero() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const { isReducedMotion } = useDeviceCapability()
  // Plays the official-site entrance once the intro has pulled the page in
  const heroReady = useHeroReady()

  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <header className="hero" id="top">
      <div className="hero__inner">
        {/* Official-site header entrance: slides down out of a blur */}
        <motion.div
          className="site-nav"
          initial={isReducedMotion ? false : { y: '-100%', opacity: 0, filter: 'blur(10px)' }}
          animate={
            heroReady || isReducedMotion
              ? { y: '0%', opacity: 1, filter: 'blur(0px)' }
              : { y: '-100%', opacity: 0, filter: 'blur(10px)' }
          }
          transition={{ duration: 1.3, ease: [0.25, 0, 0, 1] }}
        >
          <a href="#top" className="site-nav__logo" aria-label="Scriptomente – back to top">
            <img src={logoLight} width={190} height={50.604} alt="Scriptomente" />
          </a>

          <nav className="site-nav__links" aria-label="Main">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="nav-link">
                {link.label}
              </a>
            ))}
          </nav>
          <ArrowLink href="#contact" label="LET’S TALK" className="site-nav__cta" />

          <button
            ref={menuButtonRef}
            type="button"
            className="site-nav__menu-button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <img src={menuIcon} width={45.0007} height={15.0286} alt="" />
          </button>
        </motion.div>

        <MobileMenu id={menuId} open={menuOpen} onClose={closeMenu} returnFocusRef={menuButtonRef} />

        <Reveal as="p" className="hero__eyebrow" trigger="mount" play={heroReady} y={12} duration={0.8}>
          JULIA SCHULZE / STRATEGY, BRAND &amp; GROWTH
        </Reveal>

        <div className="hero__main">
          <Stagger
            as="h1"
            className="hero__title"
            trigger="mount"
            play={heroReady}
            staggerChildren={0.55}
            delayChildren={0.15}
          >
            <RevealItem as="span" className="hero__title-line" y={24} duration={1.1}>
              Find the thread.
            </RevealItem>{' '}
            <RevealItem
              as="span"
              className="hero__title-line hero__title-line--italic"
              y={24}
              duration={1.1}
            >
              Connect the dots.
            </RevealItem>
          </Stagger>

          <Reveal className="hero__intro" trigger="mount" play={heroReady} y={16} duration={0.8} delay={1.0}>
            <p>
              Hi, I’m Julia. I help businesses find their <br className="hero__break" />
              story, plan the work, and sell the result.
            </p>
            <ArrowLink href="#contact" label="LET’S TALK" className="hero__cta" />
          </Reveal>
        </div>

        <Reveal as="p" className="hero__tagline" trigger="mount" play={heroReady} y={12} delay={1.3}>
          Expect the unexpected.
        </Reveal>
        <a href="#services" className="hero__scroll nav-link">
          SCROLL ↓
        </a>
      </div>

      {/* Decorative thread: draws itself as the page scrolls */}
      <ThreadDraw pinnedContainer={INTRO_PIN} className="hero__thread hero__thread--desktop" src={heroLine} width={876.233} height={416.297} />
      <ThreadDraw
        pinnedContainer={INTRO_PIN}
        className="hero__thread hero__thread--tablet"
        src={heroThreadTablet}
        width={695.393}
        height={912.426}
      />
      <ThreadDraw
        pinnedContainer={INTRO_PIN}
        className="hero__thread hero__thread--mobile"
        src={heroThreadMobile}
        width={411.546}
        height={996.594}
      />

      {/* The thread's dots are revealed by the same drawing edge as the thread */}
      <ThreadDraw pinnedContainer={INTRO_PIN} className="hero__dots-img hero__dots-img--desktop" src={heroDots} width={1257.19} height={857.5} />
      <ThreadDraw pinnedContainer={INTRO_PIN} className="hero__dots-img hero__dots-img--tablet" src={heroDotsTablet} width={277} height={72.1035} />
      <ThreadDraw pinnedContainer={INTRO_PIN} className="hero__dots-img hero__dots-img--mobile" src={heroDotsMobile} width={188} height={102.395} />
    </header>
  )
}
