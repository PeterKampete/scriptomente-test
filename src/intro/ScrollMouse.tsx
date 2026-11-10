import { lazy, Suspense, useEffect, useState } from 'react'
import scrollMouseUrl from '../assets/figma/scroll_mouse.lottie?url'
import { loadDotLottie, recolorLottie } from '../motion/dotLottie'

// lottie-web is code-split; lottie-react is CommonJS and can arrive double-wrapped
type LottieComponent = typeof import('lottie-react').default
const Lottie = lazy(async () => {
  const mod = await import('lottie-react')
  const component = (mod.default as LottieComponent & { default?: LottieComponent }).default ?? mod.default
  return { default: component }
})

// The file's neutral greys, re-tinted to the brand: the darker strokes become
// brand red, the lighter ones a soft red that reads as the same family on cream
const BRAND: [number, number, number] = [221 / 255, 74 / 255, 54 / 255]
const SOFT: [number, number, number] = [236 / 255, 164 / 255, 150 / 255]
const tint = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const light = Math.min(1, Math.max(0, ((r + g + b) / 3 - 0.6) / 0.27))
  return [0, 1, 2].map((i) => BRAND[i] + (SOFT[i] - BRAND[i]) * light) as [number, number, number]
}

let cached: Promise<Record<string, unknown>> | null = null
function loadAnimation() {
  cached ??= loadDotLottie(scrollMouseUrl).then((data) => {
    recolorLottie(data, tint)
    return data
  })
  return cached
}

/**
 * The intro's "scroll" cue: the scroll_mouse.lottie animation, looping. The
 * old bobbing arrow holds its place until the animation has loaded (and stays
 * if the browser can't unpack .lottie files).
 */
export function ScrollMouse({ className }: { className?: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let active = true
    if (typeof DecompressionStream === 'undefined') return
    loadAnimation()
      .then((animation) => active && setData(animation))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const fallback = <span className="scroll-mouse__arrow">↓</span>
  return (
    <span className={`scroll-mouse ${className ?? ''}`} aria-hidden="true">
      {data ? (
        <Suspense fallback={fallback}>
          <Lottie animationData={data} loop autoplay className="scroll-mouse__anim" rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }} />
        </Suspense>
      ) : (
        fallback
      )}
    </span>
  )
}
