import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, MessageSquareWarning, Pause, Play, QrCode, ShieldOff, Star } from 'lucide-react'
import { EASE, Reveal, SectionHead, track } from './shared'
import { Phone, RatingScreen, SmsBubble, Stars, type RatingState } from './phone'

const TRADES = ['Dental', 'Clinics', 'Physio', 'Salons and spas', 'Barbers', 'Home services', 'Auto repair']

export function LogoStrip() {
  return (
    <section className="hl-section hl-logos" aria-label="Who Halo is for">
      <div className="hl-rail">
        <Reveal>
          <p className="hl-logos-line">Built for businesses that run on appointments and jobs</p>
          <ul className="hl-trades">
            {TRADES.map((t) => <li key={t}><a href="#top">{t}</a></li>)}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

const PROBLEMS = [
  { icon: QrCode, t: 'We ask at the desk.', b: 'And forget by the third customer of the day. A QR code on the counter gets scanned twice a month.' },
  { icon: MessageSquareWarning, t: 'We found out a week later.', b: 'A one star review sat unanswered while it put off every new customer who read it.' },
  { icon: ShieldOff, t: 'The cheap tools cheat.', b: 'Some review tools only send happy customers to Google. That is called review gating. Google bans it, and it can cost you reviews.' },
]

export function Problem() {
  return (
    <section className="hl-section hl-band" id="problem">
      <div className="hl-rail">
        <SectionHead eyebrow="Why the reviews do not come" title="Happy customers go home. Unhappy ones go on Google." />
        <div className="hl-problem-grid">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.08} className="hl-problem">
              <p.icon size={16} strokeWidth={1.5} className="hl-accent-ink" aria-hidden="true" />
              <h3>{p.t}</h3>
              <p>{p.b}</p>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="hl-closing">Ask everyone, the same way, at the right moment. Then listen.</p></Reveal>
      </div>
    </section>
  )
}

/* 6. Demo: a 40 second captioned walkthrough built in code, played on a 9:16 phone. Never autoplays with sound. */
type Scene = { at: number; caption: string; view: 'notify' | 'thread' | 'rate' | 'google' | 'posted' | 'rate2' | 'alert'; rating?: RatingState }
const SCENES: Scene[] = [
  { at: 0, caption: 'The text arrives two hours after the visit', view: 'notify' },
  { at: 3, caption: 'Maria taps the link', view: 'thread' },
  { at: 7, caption: 'Two taps: a star, then Google', view: 'rate', rating: { rating: 5, tap: 'star' } },
  { at: 12, caption: 'Post a review on Google', view: 'rate', rating: { rating: 5, tap: 'google', pressed: true } },
  { at: 15, caption: "Google's form opens with her stars", view: 'google' },
  { at: 20, caption: 'Posted', view: 'posted' },
  { at: 26, caption: 'Same page, 2 stars: the note opens under the same button', view: 'rate2', rating: { rating: 2, tap: 'star' } },
  { at: 30, caption: 'Tom tells the team privately', view: 'rate2', rating: { rating: 2, noteText: 'Waited 40 minutes past my time' } },
  { at: 33, caption: 'The owner gets an alert within a minute', view: 'alert' },
]
const LENGTH = 40
const CHIPS: [number, string][] = [[3, 'The text'], [12, 'Post on Google'], [26, 'Private note and alert']]
const mmss = (t: number) => `0:${String(Math.floor(t)).padStart(2, '0')}`

function DemoScreen({ scene, t }: { scene: Scene; t: number }) {
  if (scene.view === 'notify' || scene.view === 'thread') {
    return (
      <div className={`hl-v-msgs${scene.view === 'thread' ? ' thread' : ''}`}>
        <div className="hl-v-notify"><span className="hl-v-app">Messages · now</span><b>Brightside Dental</b><SmsBubble /></div>
        <div className="hl-v-thread">
          <p className="hl-v-thread-h">Brightside Dental</p>
          <div className="hl-v-bubble"><SmsBubble /></div>
          {scene.view === 'thread' && <span className="hl-thumb hl-v-tap" aria-hidden="true" />}
        </div>
      </div>
    )
  }
  if (scene.view === 'google') {
    return (
      <div className="hl-v-google">
        <p className="hl-v-g-h">Brightside Dental</p>
        <p className="hl-faint">Rate and review · Posting publicly</p>
        <Stars n={5} size={26} />
        <span className="hl-v-g-field">Share details of your own experience at this place</span>
        <span className="hl-v-g-post">Post</span>
      </div>
    )
  }
  if (scene.view === 'posted') {
    return <div className="hl-v-done"><span className="hl-v-done-ic"><Check size={20} /></span><p>Review posted on Google</p><Stars n={5} size={16} /></div>
  }
  if (scene.view === 'alert') {
    return (
      <div className="hl-v-alert">
        <p className="hl-v-app">Mail · owner's phone</p>
        <div className="hl-v-alert-card">
          <b>2 star feedback from Tom R. at Brightside Dental</b>
          <Stars n={2} size={14} />
          <p>"Waited 40 minutes past my time"</p>
          <p className="hl-faint">Tom R. · (555) 014-2290 · 10:42</p>
          <span className="hl-v-alert-btn">Open in Halo</span>
        </div>
      </div>
    )
  }
  const typed = scene.rating?.noteText ? scene.rating.noteText.slice(0, Math.max(0, Math.round((t - scene.at) * 12))) : undefined
  return <RatingScreen size="sm" business={scene.view === 'rate2' ? 'Brightside Dental' : undefined} state={{ ...scene.rating!, noteText: typed }} />
}

function DemoPlayer() {
  const reduce = useReducedMotion()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const started = useRef(false)
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      // 40 timeline seconds play in about 16 real seconds
      setT((v) => {
        const n = v + dt * 2.5
        if (n >= LENGTH) { setPlaying(false); return LENGTH - 0.01 }
        return n
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  useEffect(() => {
    const on = () => { if (reduce) return; started.current = true; setT(0); setPlaying(true) }
    window.addEventListener('halo-play-demo', on)
    return () => window.removeEventListener('halo-play-demo', on)
  }, [reduce])
  const play = () => { started.current = true; track('lp_demo_play'); if (t >= LENGTH - 0.1) setT(0); setPlaying(true) }
  const seek = (at: number, chip: string) => { started.current = true; track('lp_demo_seek', { chip }); setT(at + 0.01); if (!reduce) setPlaying(true) }
  const idx = SCENES.reduce((acc, s, i) => (t >= s.at ? i : acc), 0)
  const scene = SCENES[idx]
  const poster = !started.current
  return (
    <div className="hl-demo-grid">
      <Reveal className="hl-demo-phone-col">
        <Phone className="hl-demo-phone">
          <div className="hl-v-stage" aria-hidden="true">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={poster ? 'poster' : scene.view}
                className="hl-v-scene"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
              >
                {poster ? <RatingScreen size="sm" state={{ rating: 5 }} /> : <DemoScreen scene={scene} t={t} />}
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="hl-v-caption" aria-live="polite">{poster ? 'Captions on · 0:40' : scene.caption}</p>
          {!playing && (
            <button type="button" className="hl-v-play" onClick={play} aria-label={poster ? 'Play the 40 second demo' : 'Play'}>
              <Play size={20} aria-hidden="true" />
            </button>
          )}
        </Phone>
        <div className="hl-v-controls">
          <button type="button" className="hl-v-ctrl" onClick={() => (playing ? setPlaying(false) : play())} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className="hl-v-track" aria-hidden="true"><span style={{ transform: `scaleX(${t / LENGTH})` }} /></span>
          <span className="hl-data hl-v-time">{mmss(t)} / 0:40</span>
        </div>
      </Reveal>
      <Reveal delay={0.12} className="hl-demo-side">
        <ul className="hl-chips" aria-label="Jump to a moment">
          {CHIPS.map(([at, l]) => {
            const active = !poster && t >= at && t < (CHIPS.find(([a]) => a > at)?.[0] ?? LENGTH)
            return (
              <li key={l}>
                <button type="button" className={`hl-chip-btn${active ? ' on' : ''}`} onClick={() => seek(at, l)} aria-pressed={active}>
                  <span className="hl-data">{mmss(at)}</span>{l}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="hl-demo-note">Every customer sees the same Google button, whatever they rate. That is how Halo keeps you inside Google's rules.</p>
        <div className="hl-demo-legend" aria-hidden="true">
          <span><Star size={12} className="hl-star-ink" />5 stars: thank-you line asks them to share on Google</span>
          <span><Star size={12} className="hl-star-ink" />2 stars: the private note opens under the same button</span>
        </div>
      </Reveal>
    </div>
  )
}

export function Demo() {
  return (
    <section className="hl-section" id="demo">
      <div className="hl-rail">
        <SectionHead eyebrow="See it work" title="One text. Two taps. A Google review." />
        <DemoPlayer />
      </div>
    </section>
  )
}
