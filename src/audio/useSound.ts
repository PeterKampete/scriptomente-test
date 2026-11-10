import { useSyncExternalStore } from 'react'
import { sound, type SoundState } from './soundEngine'

let snapshot: SoundState = sound.state
sound.subscribe((state) => {
  snapshot = state
})

export function useSoundState(): SoundState {
  return useSyncExternalStore(
    (onChange) => sound.subscribe(onChange),
    () => snapshot,
  )
}
