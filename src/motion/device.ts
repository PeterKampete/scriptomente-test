// Ported from scriptomente/client/utils/device.ts and hooks/useDeviceCapability.ts
import { useEffect, useState } from 'react'

export type DeviceCapability = {
  readonly isDesktop: boolean
  readonly isReducedMotion: boolean
  readonly enableParallax: boolean
}

const FALLBACK: DeviceCapability = {
  isDesktop: false,
  isReducedMotion: false,
  enableParallax: false,
}

/**
 * Feature-detects whether the device can comfortably run the heavier scroll
 * effects (parallax, blur), and respects the reduced-motion preference.
 */
export function getDeviceCapability(): DeviceCapability {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return FALLBACK
  }
  const isDesktop = window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 1280
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return { isDesktop, isReducedMotion, enableParallax: isDesktop && !isReducedMotion }
}

export function useDeviceCapability(): DeviceCapability {
  const [device] = useState<DeviceCapability>(getDeviceCapability)
  return device
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => getDeviceCapability().isReducedMotion)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}
