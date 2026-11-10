import { forwardRef } from 'react'
import './ToggleButton.css'

type Props = {
  readonly expanded: boolean
  readonly controls: string
  readonly label: string
  readonly onToggle: () => void
  /** The scroll-drawn thread has reached this toggle: it glows. */
  readonly lit?: boolean
  readonly className?: string
}

/**
 * Circular −/+ disclosure button. The glyph is drawn with two bars sized to the
 * Figma "−" (13×2 on the 35px circle), so the "+" matches it exactly and the
 * two morph into each other.
 */
export const ToggleButton = forwardRef<HTMLButtonElement, Props>(function ToggleButton(
  { expanded, controls, label, onToggle, lit = true, className },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`toggle ${expanded ? 'toggle--expanded' : ''} ${lit ? 'toggle--lit' : ''} ${className ?? ''}`}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
      onClick={onToggle}
    >
      <span className="toggle__bar toggle__bar--h" aria-hidden="true" />
      <span className="toggle__bar toggle__bar--v" aria-hidden="true" />
    </button>
  )
})
