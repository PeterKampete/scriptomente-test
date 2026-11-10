import { createContext, useContext } from 'react'

/** Whether the hero may play its entrance. The intro keeps it true so the page's
 *  content is already in place when the curtain brings it down. */
export const HeroReadyContext = createContext(true)

export function useHeroReady(): boolean {
  return useContext(HeroReadyContext)
}

/** Selector of the pinned intro wrapper, for ScrollTriggers living inside it. */
export const INTRO_PIN = '.intro'
