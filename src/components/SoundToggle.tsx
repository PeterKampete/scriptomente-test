import { sound } from '../audio/soundEngine'
import { useSoundState } from '../audio/useSound'
import './SoundToggle.css'

/** Floating sound switch with a live equaliser while sound is playing. */
export function SoundToggle() {
  const { enabled, unlocked } = useSoundState()
  const playing = enabled && unlocked
  return (
    <button
      type="button"
      className={`sound-toggle ${playing ? 'sound-toggle--on' : ''}`}
      aria-pressed={playing}
      aria-label={playing ? 'Turn sound off' : 'Turn sound on'}
      onClick={() => sound.setEnabled(!playing)}
    >
      <span className="sound-toggle__bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="sound-toggle__label">{playing ? 'SOUND ON' : 'SOUND OFF'}</span>
    </button>
  )
}
