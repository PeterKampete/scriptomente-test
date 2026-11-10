// Adapted from scriptomente/client/components/layout/footer-lottie-logo.tsx
import { lazy, Suspense, useEffect, useState } from 'react'
import logoBrand from '../assets/figma/logo-brand.svg'
import { useDeviceCapability } from '../motion/device'

// Code-split lottie-web out of the main bundle; it loads with the footer logo.
// lottie-react is CommonJS, so the component can arrive double-wrapped.
type LottieComponent = typeof import('lottie-react').default
const Lottie = lazy(async () => {
  const mod = await import('lottie-react')
  const component = (mod.default as LottieComponent & { default?: LottieComponent }).default ?? mod.default
  return { default: component }
})

type Props = {
  readonly className?: string
  /** Lottie JSON served from /public (kept out of the JS bundle). */
  readonly src?: string
}

/**
 * Footer wordmark as the official site's looping Lottie animation. The static
 * Figma logo holds the space (no layout shift) until the animation is ready,
 * and stays for reduced-motion users.
 */
export function FooterLottieLogo({ className, src = '/logos/logo-lottie-brand.json' }: Props) {
  const { isReducedMotion } = useDeviceCapability()
  const [animationData, setAnimationData] = useState<unknown>(null)

  useEffect(() => {
    if (isReducedMotion) return
    let active = true
    fetch(src)
      .then((res) => res.json())
      .then((data) => {
        if (active) setAnimationData(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [src, isReducedMotion])

  const fallback = <img className={className} src={logoBrand} width={190} height={50.604} alt="Scriptomente" />
  if (!animationData) return fallback

  return (
    <Suspense fallback={fallback}>
      <Lottie animationData={animationData} loop autoplay className={className} aria-label="Scriptomente" role="img" />
    </Suspense>
  )
}
