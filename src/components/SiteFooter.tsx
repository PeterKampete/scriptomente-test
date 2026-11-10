import { externalLinks } from '../content'
import { ArrowLink } from './ArrowLink'
import { FooterLottieLogo } from './FooterLottieLogo'
import { Reveal } from '../motion/Reveal'
import './SiteFooter.css'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Reveal className="site-footer__inner" y={24} amount={0.5}>
        <a href="#top" className="site-footer__logo" aria-label="Scriptomente – back to top">
          <FooterLottieLogo className="site-footer__logo-art" />
        </a>
        <p className="site-footer__legal">
          ©2026 - Scriptomente | All Rights Reversed |{' '}
          <a className="footer-link" href={externalLinks.legalNotice}>
            Legal Notice
          </a>{' '}
          |{' '}
          <a className="footer-link" href={externalLinks.privacyPolicy}>
            Privacy Policy
          </a>
        </p>
        <nav className="site-footer__social" aria-label="Social">
          <ArrowLink tone="brand" href={externalLinks.instagram} label="INSTAGRAM" external className="site-footer__link" />
          <ArrowLink tone="brand" href={externalLinks.linkedin} label="LINKEDIN" external className="site-footer__link site-footer__link--linkedin" />
        </nav>
      </Reveal>
    </footer>
  )
}
