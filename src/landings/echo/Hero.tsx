import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Rss } from 'lucide-react'
import { Audiogram } from './Audiogram'
import { CHAPTERS, EASE, Eyebrow, Live, Reveal, TrialButton, Waveform, scrollToId, track } from './shared'

const TRANSCRIPT: [string, string, string][] = [
  ['Sam', '14:52', 'So when did you decide to charge by the audio hour instead of per seat?'],
  ['Priya', '15:05', 'The week three agencies asked for ten seats and used two. Seats were the wrong thing to count.'],
  ['Sam', '15:31', 'And customers were fine with that?'],
  ['Priya', '15:38', 'Relieved, honestly. Hours are what they already think in.'],
]

/** Sends the feed to the demo panel (section 6) and scrolls there. */
function FeedForm() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    let ok = false
    try { const u = new URL(value.trim()); ok = u.protocol === 'https:' || u.protocol === 'http:' } catch { ok = false }
    track('lp_feed_submitted', { valid: ok })
    if (!ok) { setError('That does not look like a feed URL. Paste the full link, starting with https://'); return }
    setError('')
    window.dispatchEvent(new CustomEvent('echo-feed', { detail: value.trim() }))
    scrollToId('demo')
  }
  return (
    <form className="ec-feed" onSubmit={submit} noValidate>
      <label htmlFor="ec-feed-input" className="ec-feed-label">Your podcast RSS feed</label>
      <div className="ec-feed-row">
        <span className="ec-feed-field">
          <Rss size={15} strokeWidth={1.5} aria-hidden="true" />
          <input
            id="ec-feed-input"
            type="url"
            inputMode="url"
            placeholder="Paste your podcast RSS feed"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'ec-feed-error' : undefined}
          />
        </span>
        <button type="submit" className="ec-btn ec-btn-secondary ec-btn-md">Try it on my show</button>
      </div>
      <p id="ec-feed-error" className="ec-feed-error" role="alert">{error}</p>
    </form>
  )
}

function HeroVisual() {
  const reduce = useReducedMotion()
  const layer = (i: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.42, delay: reduce ? 0 : 0.2 + i * 0.14, ease: EASE },
  })
  return (
    <div className="ec-hero-visual" role="img" aria-label="Echo episode workspace: transcript with speakers Sam and Priya, the Chapters tab with nine timestamps, a job writing the notes and a phone playing a Bars audiogram">
      <motion.div className="ec-frame ec-ws" {...layer(0)} aria-hidden="true">
        <div className="ec-ws-bar">
          <span className="ec-ws-crumb">The Bootstrapped Hour <b>/ Ep 87</b></span>
          <span className="ec-ws-tabs"><span>Notes</span><span className="is-on">Chapters</span><span>Quotes</span></span>
        </div>
        <div className="ec-ws-body">
          <div className="ec-ws-transcript">
            <Waveform bars={36} live={false} className="ec-ws-wave" />
            {TRANSCRIPT.map(([who, t, line]) => (
              <p key={t} className={`ec-ws-line ${who === 'Priya' ? 'is-priya' : ''}`}>
                <span className="ec-ws-who">{who} <time className="ec-mono">{t}</time></span>
                {line}
              </p>
            ))}
          </div>
          <ol className="ec-ws-chapters">
            {CHAPTERS.map(([t, title], i) => (
              <motion.li
                key={t}
                className={i === 3 ? 'is-current' : ''}
                initial={reduce ? { opacity: 1 } : { opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: reduce ? 0 : 0.9 + i * 0.04, ease: EASE }}
              >
                <time className="ec-mono">{t}</time><span>{title}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </motion.div>
      <motion.div className="ec-frame ec-job" {...layer(1)} aria-hidden="true">
        <div className="ec-job-head"><Live /> <b>Writing your notes</b><span className="ec-mono">3 of 4</span></div>
        <ol className="ec-job-steps">
          {['Uploaded', 'Transcribed', 'Writing', 'Ready'].map((s, i) => (
            <li key={s} className={i < 2 ? 'is-done' : i === 2 ? 'is-now' : ''}><i />{s}</li>
          ))}
        </ol>
      </motion.div>
      <motion.div className="ec-hero-phone" {...layer(2)}>
        <Audiogram variant="Bars" compact label="Bars audiogram with violet word-by-word captions" />
      </motion.div>
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const item = (i: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, delay: reduce ? 0 : i * 0.08, ease: EASE },
  })
  return (
    <header className="ec-hero" id="top">
      <div className="ec-ripples" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="ec-container ec-hero-grid">
        <div className="ec-hero-copy">
          <motion.div {...item(0)}><Eyebrow>For podcasters, podcast agencies and brands with a show</Eyebrow></motion.div>
          <motion.h1 className="ec-h1" {...item(1)}>Every episode, written up and clipped <em>before lunch.</em></motion.h1>
          <motion.p className="ec-lead" {...item(2)}>
            Drop in your episode or connect your RSS feed. Echo writes the show notes, chapters, pull quotes, newsletter,
            social posts and an SEO blog post in your voice, and renders vertical audiograms with captions.
          </motion.p>
          <motion.div className="ec-hero-ctas" {...item(3)}>
            <TrialButton location="hero" size="lg" />
            <FeedForm />
          </motion.div>
          <motion.p className="ec-trust" {...item(4)}>7 days free. 2 audio hours in the trial. Your first episode is ready in about 20 minutes.</motion.p>
        </div>
        <HeroVisual />
      </div>
    </header>
  )
}

const FORMATS = ['Interview shows', 'Solo expert shows', 'B2B company podcasts', 'Agency-produced shows', 'Coaching podcasts', 'Local business shows']

export function LogoStrip() {
  return (
    <section className="ec-strip" aria-label="Show formats Echo is made for">
      <Reveal className="ec-container" y={0}>
        <p className="ec-strip-line">Made for the shows people actually finish</p>
        <ul className="ec-formats">
          {FORMATS.map((f) => <li key={f}><span className="ec-fmt-bars" aria-hidden="true"><i /><i /><i /></span>{f}</li>)}
        </ul>
      </Reveal>
    </section>
  )
}
