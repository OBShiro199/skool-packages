import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { CreditCard, DoorOpen, Puzzle, Pause, Play, Check } from 'lucide-react'
import { EASE, MORPH, OUT, Pill, Reveal, SectionHead } from './shared'
import { RiskTable } from './Hero'

/* 4. Logo strip: the stack it works with, set in type. No customer logos. */
const STACK = ['Stripe Billing', 'Stripe Checkout', 'Customer Portal', 'Next.js', 'Supabase', 'Resend']
export function LogoStrip() {
  return (
    <section className="rt-section rt-logos" aria-label="Works with">
      <div className="rt-rail">
        <Reveal className="rt-logos-inner">
          <p>Built for founders who bill with</p>
          <ul>{STACK.map((s) => <li key={s}>{s}</li>)}</ul>
        </Reveal>
      </div>
    </section>
  )
}

/* 5. Problem. */
const PROBLEMS = [
  { icon: CreditCard, t: 'Cards fail silently.', b: "Expired cards and bank declines cancel customers who never meant to leave. Stripe's default email is easy to miss." },
  { icon: DoorOpen, t: 'Cancel is one click.', b: 'The Customer Portal lets anyone leave without a question or an offer. You find out a day later from a Stripe email.' },
  { icon: Puzzle, t: 'Warning signs are scattered.', b: 'Seat cuts, downgrades, a card about to expire and a drop in logins all live in different places. Nobody adds them up.' },
]
export function Problem() {
  return (
    <section className="rt-section rt-band" id="problem">
      <div className="rt-rail">
        <SectionHead title="Churn is quiet until it's in your MRR chart" />
        <div className="rt-problems">
          {PROBLEMS.map(({ icon: I, t, b }, i) => (
            <Reveal key={t} delay={i * 0.025} className="rt-problem">
              <I size={16} strokeWidth={1.5} aria-hidden="true" />
              <h3>{t}</h3>
              <p>{b}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.08} className="rt-callout">
          <p>A $30k MRR SaaS at 5% churn loses $1,500 of MRR every month. That's $18,000 of ARR a year, compounding.</p>
          <pre className="rt-callout-math" aria-hidden="true">{'$30,000 × 5%  = $1,500 MRR / month\n$1,500  × 12  = $18,000 ARR / year'}</pre>
        </Reveal>
      </div>
    </section>
  )
}

/* 6. Product demo: a coded 16:9 player in place of the video. Plays while in view, pausable. */
const SCENES = ['Customers sorted by risk', 'Opening a customer', 'The signals add up', 'Cancel page: pause accepted']
const SEGS: [string, number, string][] = [['Card expiring', 25, 'a'], ['Usage down 64%', 25, 'b'], ['Seats cut', 15, 'c'], ['Annual to monthly', 13, 'd']]

function Scene({ i }: { i: number }) {
  if (i === 0) return <div className="rt-scene rt-scene-table"><RiskTable compact /></div>
  if (i === 1) return (
    <div className="rt-scene rt-scene-open">
      <div className="rt-open-card">
        <div className="rt-panel-head"><span className="rt-cust"><i className="rt-ava">A</i><b>Acme Ltd</b></span><Pill tone="high" dot>High</Pill></div>
        {['Card ends October 2026, renewal 3 Nov', 'Active 4 days in 2 weeks, was 11', 'Seats cut from 8 to 5', 'Annual to monthly price'].map((t, n) => (
          <motion.div key={t} className="rt-open-row" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.36, delay: 0.3 + n * 0.35, ease: EASE }}>{t}</motion.div>
        ))}
      </div>
    </div>
  )
  if (i === 2) return (
    <div className="rt-scene rt-scene-sum">
      <div className="rt-sum-bar">
        {SEGS.map(([l, p, k], n) => (
          <motion.span key={l} className={`rt-seg rt-seg-${k}`} style={{ width: `${p}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.4, delay: 0.2 + n * 0.45, ease: MORPH }}>
            <b className="rt-mono">+{p}</b>
          </motion.span>
        ))}
      </div>
      <div className="rt-sum-legend">{SEGS.map(([l, p, k]) => <span key={l}><i className={`rt-seg-${k}`} />{l} <b className="rt-mono">+{p}</b></span>)}</div>
      <motion.p className="rt-sum-total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.1, duration: 0.3 }}>
        <span className="rt-mono">25 + 25 + 15 + 13 =</span> <b className="rt-mono">78</b> <Pill tone="high" dot>High</Pill>
      </motion.p>
    </div>
  )
  return (
    <div className="rt-scene rt-scene-cancel">
      <div className="rt-cancel-card">
        <p className="rt-label">Why are you leaving?</p>
        <div className="rt-cancel-opt is-on">We're not using it enough right now</div>
        <motion.div className="rt-offer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.36, ease: OUT }}>
          <b>Pause for 2 months instead?</b>
          <span>Your data stays put. Billing restarts on 18 Dec.</span>
          <motion.span className="rt-offer-btn" initial={{ scale: 1 }} animate={{ scale: [1, 0.97, 1] }} transition={{ delay: 1.6, duration: 0.3 }}>Pause my plan</motion.span>
        </motion.div>
        <motion.span className="rt-toast" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.1, duration: 0.3, ease: OUT }}><Check size={13} /> Paused in Stripe</motion.span>
      </div>
    </div>
  )
}

function Player() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.25 })
  const reduce = !!useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (!inView || paused || reduce) return
    const id = window.setTimeout(() => setI((n) => (n + 1) % SCENES.length), 4200)
    return () => window.clearTimeout(id)
  }, [inView, paused, reduce, i])
  return (
    <motion.div ref={ref} className="rt-player" initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.32, ease: OUT }}>
      <div className="rt-player-stage" role="img" aria-label={`Product demo, scene ${i + 1} of 4: ${SCENES[i]}`}>
        <AnimatePresence mode="wait">
          <motion.div key={i} className="rt-player-scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Scene i={i} />
          </motion.div>
        </AnimatePresence>
        <span className="rt-player-cap rt-mono">{String(i + 1).padStart(2, '0')} · {SCENES[i]}</span>
      </div>
      <div className="rt-player-bar">
        <button type="button" className="rt-icon-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play the demo' : 'Pause the demo'}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <div className="rt-player-segs">
          {SCENES.map((s, n) => (
            <button key={s} type="button" className={`rt-player-seg${n === i ? ' is-on' : ''}${n < i ? ' is-done' : ''}`} onClick={() => setI(n)} aria-label={`Show scene ${n + 1}: ${s}`}>
              <i>{n === i && !paused && !reduce && <motion.b key={`${i}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 4.2, ease: 'linear' }} />}</i>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function Demo() {
  return (
    <section className="rt-section" id="demo">
      <div className="rt-rail">
        <SectionHead title="See the score explain itself" sub="Every score is a sum of plain-words signals. No black box, no guessing." center />
        <Player />
        <ol className="rt-captions">
          {['Install on Stripe', 'Scores by morning', 'Saves start the same day'].map((c, n) => <li key={c}><span className="rt-mono">{n + 1}.</span> {c}</li>)}
        </ol>
      </div>
    </section>
  )
}
