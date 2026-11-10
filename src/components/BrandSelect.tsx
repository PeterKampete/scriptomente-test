import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import chevronDown from '../assets/figma/chevron-down.svg'
import { useDeviceCapability } from '../motion/device'
import './BrandSelect.css'

type Props = {
  readonly id: string
  readonly name: string
  readonly label: string
  readonly placeholder: string
  readonly options: readonly string[]
  readonly value: string
  readonly onChange: (value: string) => void
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/**
 * Brand dropdown (accessible listbox). The panel draws open like the site's
 * thread: a line runs down the options with a knot at each, options are
 * numbered like the services list, and the highlighted one gets the official
 * fill sweep.
 */
export function BrandSelect({ id, name, label, placeholder, options, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const labelId = useId()
  const listId = `${id}-listbox`
  const { isReducedMotion } = useDeviceCapability()
  const selectedIndex = options.indexOf(value)

  const openList = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    setActive(index)
    setOpen(true)
  }
  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }
  const choose = (index: number) => {
    onChange(options[index])
    close()
  }

  // Focus the list when it opens; close on outside pointer down
  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  // Keep the highlighted option in view
  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, id])

  const onButtonKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openList(event.key === 'ArrowUp' ? Math.max(0, (selectedIndex >= 0 ? selectedIndex : options.length) - 1) : undefined)
    }
  }

  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((i) => Math.min(last, i + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(last)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        close(false)
        break
      default:
        // Type-ahead: jump to the first option starting with the typed letters
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const now = Date.now()
          typed.current.text = now - typed.current.at > 600 ? event.key : typed.current.text + event.key
          typed.current.at = now
          const match = options.findIndex((o) => o.toLowerCase().startsWith(typed.current.text.toLowerCase()))
          if (match >= 0) setActive(match)
        }
    }
  }

  return (
    <div className={`brand-select ${open ? 'brand-select--open' : ''}`} ref={rootRef}>
      <span id={labelId} className="visually-hidden">
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={`brand-select__trigger ${value ? '' : 'is-placeholder'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${id}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
      >
        <span className="brand-select__value">{value || placeholder}</span>
        <img className="brand-select__chevron" src={chevronDown} width={12.7455} height={7.06008} alt="" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="brand-select__panel"
            initial={isReducedMotion ? { opacity: 0 } : { clipPath: 'inset(0% 0% 100% 0%)', opacity: 1 }}
            animate={isReducedMotion ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 0.55, ease: EASE } }}
            exit={isReducedMotion ? { opacity: 0 } : { clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: 0.35, ease: [0.65, 0, 0.35, 1] } }}
          >
            <motion.span
              className="brand-select__thread"
              aria-hidden="true"
              initial={isReducedMotion ? false : { scaleY: 0 }}
              animate={{ scaleY: 1, transition: { duration: 0.75, ease: EASE, delay: 0.1 } }}
            />
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={labelId}
              aria-activedescendant={`${id}-opt-${active}`}
              className="brand-select__list"
              data-lenis-prevent
              onKeyDown={onListKey}
            >
              {options.map((option, index) => (
                <motion.li
                  key={option}
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`brand-select__option ${index === active ? 'is-active' : ''} ${index === selectedIndex ? 'is-selected' : ''}`}
                  initial={isReducedMotion ? false : { opacity: 0, y: -8, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: EASE, delay: 0.12 + index * 0.06 } }}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  <span className="brand-select__knot" aria-hidden="true" />
                  <span className="brand-select__number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="brand-select__label">{option}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
