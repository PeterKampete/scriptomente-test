import { useEffect } from 'react'
import { Hero } from '../components/Hero'
import { Services } from '../components/Services'
import { Experience } from '../components/Experience'
import { Coaching } from '../components/Coaching'
import { Contact } from '../components/Contact'
import { SiteFooter } from '../components/SiteFooter'
import { PageBackdrop } from '../components/PageBackdrop'
import { SoundToggle } from '../components/SoundToggle'
import { CookieConsent } from '../components/CookieConsent'
import { Intro } from '../intro/Intro'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { destroyScroll, initScroll } from '../motion/scroll'
import './HomePage.css'

export function HomePage() {
  useEffect(() => {
    initScroll()
    // All sections are mounted: measure every ScrollTrigger (intro pin first)
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => {
      cancelAnimationFrame(frame)
      destroyScroll()
    }
  }, [])

  return (
    <div className="page">
      <PageBackdrop />
      <Intro>
        <Hero />
      </Intro>
      <main>
        <Services />
        <Experience />
        <Coaching />
        <Contact />
      </main>
      <SiteFooter />
      <SoundToggle />
      <CookieConsent />
    </div>
  )
}
