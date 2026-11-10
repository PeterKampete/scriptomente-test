import { createContext, useContext } from 'react'

/** False while the intro is still pulling the page in; the hero waits for it. */
export const HeroReadyContext = createContext(true)

export function useHeroReady(): boolean {
  return useContext(HeroReadyContext)
}

/** Selector of the pinned intro wrapper, for ScrollTriggers living inside it. */
export const INTRO_PIN = '.intro'
