import { useState, type FormEvent } from 'react'
import submitArrow from '../assets/figma/submit-arrow.svg'
import submitArrowMobile from '../assets/figma/submit-arrow-mobile.svg'
import { contactTopics } from '../content'
import { BrandSelect } from './BrandSelect'
import { Reveal } from '../motion/Reveal'
import { ScrollRevealText } from '../motion/ScrollRevealText'
import './Contact.css'

type Fields = { name: string; email: string; topic: string; message: string }
type Errors = Partial<Record<keyof Fields, string>>

const EMPTY: Fields = { name: '', email: '', topic: '', message: '' }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(fields: Fields): Errors {
  const errors: Errors = {}
  if (!fields.name.trim()) errors.name = 'Please tell me your name.'
  if (!fields.email.trim()) errors.email = 'Please add your email address.'
  else if (!EMAIL_PATTERN.test(fields.email.trim())) errors.email = 'That email address doesn’t look right.'
  if (!fields.message.trim()) errors.message = 'Please write a short message.'
  return errors
}

export function Contact() {
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'unavailable'>('idle')

  const update = (key: keyof Fields) => (value: string) => {
    setFields((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
    setStatus('idle')
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(fields)
    setErrors(nextErrors)
    const firstInvalid = (Object.keys(nextErrors) as (keyof Fields)[])[0]
    if (firstInvalid) {
      event.currentTarget.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus()
      return
    }
    // No submission endpoint exists yet; never pretend the message was sent.
    setStatus('unavailable')
  }

  const fieldProps = (key: keyof Fields) => ({
    id: `contact-${key}`,
    name: key,
    value: fields[key],
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `contact-${key}-error` : undefined,
  })

  const error = (key: keyof Fields) =>
    errors[key] ? (
      <span id={`contact-${key}-error`} className="contact-field__error">
        {errors[key]}
      </span>
    ) : null

  return (
    <section className="contact" id="contact" aria-labelledby="contact-heading">
      <div className="contact__inner">
        <div className="contact__intro">
          <Reveal as="p" className="contact__eyebrow" y={12}>
            START A CONVERSATION
          </Reveal>
          <ScrollRevealText
            as="h2"
            id="contact-heading"
            className="contact__heading"
            segments={[
              { text: 'Let’s ' },
              { text: 'talk.', className: 'contact__heading-accent' },
            ]}
          />
          <Reveal as="p" className="contact__lead" delay={0.1}>
            <span>A question, an idea, or something you’re</span>{' '}
            <span>still figuring out. Tell me what’s on your</span> <span>mind.</span>
          </Reveal>
          <Reveal as="p" className="contact__note" delay={0.2}>
            No fixed plan needed.
          </Reveal>
        </div>

        <Reveal className="contact__form-wrap" y={30} amount={0.2}>
          <form className="contact-form" noValidate onSubmit={onSubmit}>
          <div className="contact-form__fields">
            <div className="contact-field">
              <label className="visually-hidden" htmlFor="contact-name">
                Name
              </label>
              <input
                {...fieldProps('name')}
                type="text"
                autoComplete="name"
                placeholder="Name"
                required
                onChange={(event) => update('name')(event.target.value)}
              />
              {error('name')}
            </div>
            <div className="contact-field">
              <label className="visually-hidden" htmlFor="contact-email">
                Email
              </label>
              <input
                {...fieldProps('email')}
                type="email"
                autoComplete="email"
                placeholder="Email"
                required
                onChange={(event) => update('email')(event.target.value)}
              />
              {error('email')}
            </div>
            <div className="contact-field contact-field--full">
              <BrandSelect
                id="contact-topic"
                name="topic"
                label="What are you reaching out about?"
                placeholder="What are you reaching out about?"
                options={contactTopics}
                value={fields.topic}
                onChange={update('topic')}
              />
            </div>
            <div className="contact-field contact-field--full">
              <label className="visually-hidden" htmlFor="contact-message">
                Your message
              </label>
              <textarea
                {...fieldProps('message')}
                placeholder="Your message"
                required
                onChange={(event) => update('message')(event.target.value)}
              />
              {error('message')}
            </div>
          </div>

          <button type="submit" className="contact-form__submit btn-book">
            <span>Let’s talk.</span>
            <img className="contact-form__submit-icon" src={submitArrow} width={20.2803} height={20.2803} alt="" />
            <img
              className="contact-form__submit-icon contact-form__submit-icon--mobile"
              src={submitArrowMobile}
              width={15.2803}
              height={15.2803}
              alt=""
            />
          </button>

          <p className="contact-form__status" role="status">
            {status === 'unavailable'
              ? 'Thanks! Online sending isn’t set up yet, so your message hasn’t been sent. Please reach out via LinkedIn or Instagram for now.'
              : ''}
          </p>
          </form>
        </Reveal>
      </div>
    </section>
  )
}
