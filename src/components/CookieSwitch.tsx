import { motion, type Variants } from 'framer-motion'
import { sound } from '../audio/soundEngine'

type Props = {
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  /** Id of the element that names this switch (the category title). */
  readonly labelledBy: string
  readonly describedBy?: string
  readonly variants?: Variants
}

/**
 * Figma "Switch" (40 × 22, 18px knob; 36.4 × 17.6 on mobile). The knob springs
 * across with a little squash, the track floods with brand red and a ring
 * ripples out when it turns on.
 */
export function CookieSwitch({ checked, onChange, labelledBy, describedBy, variants }: Props) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={`cswitch ${checked ? 'cswitch--on' : ''}`}
      variants={variants}
      onClick={() => {
        sound.switchTick(!checked)
        onChange(!checked)
      }}
    >
      <span className="cswitch__ripple" key={checked ? 'on' : 'off'} aria-hidden="true" />
      <span className="cswitch__knob" aria-hidden="true" />
    </motion.button>
  )
}
