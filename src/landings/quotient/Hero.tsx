import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Camera, Check, RotateCcw } from 'lucide-react'
import { Btn, EASE, Eyebrow, MORPH, OUT, Pill, scrollToId, track } from './shared'

/* The hero phone plays the real widget once (about 9 s), then holds on the booked state with a Replay button. */
const STEPS = [900, 1900, 2900, 4100, 5200, 6300, 7400, 8500] // ms at which step 1..8 begins
const FINAL = 8
const POSTCODE = 'SW15'

function useSequence() {
  const reduce = !!useReducedMotion()
  const [step, setStep] = useState(reduce ? FINAL : 0)
  const [run, setRun] = useState(0)
  useEffect(() => {
    if (reduce) { setStep(FINAL); return }
    setStep(0)
    const ids = STEPS.map((t, i) => window.setTimeout(() => setStep(i + 1), t))
    return () => ids.forEach(window.clearTimeout)
  }, [reduce, run])
  const replay = useCallback(() => setRun((r) => r + 1), [])
  return { step, replay, reduce }
}

function Typed({ text, on }: { text: string; on: boolean }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!on) { setN(0); return }
    if (reduce) { setN(text.length); return }
    let i = 0
    const id = window.setInterval(() => { i += 1; setN(i); if (i >= text.length) window.clearInterval(id) }, 140)
    return () => window.clearInterval(id)
  }, [on, text, reduce])
  return <>{text.slice(0, n)}</>
}

const morph = { duration: 0.3, ease: MORPH }

function PhoneWidget({ step }: { step: number }) {
  const screenB = step >= 5
  return (
    <div className="qt-phone" aria-hidden="true">
      <div className="qt-phone-notch" />
      <div className="qt-phone-screen">
        <div className="qt-w-head">
          <span className="qt-w-logo">S</span>
          <span><b>Sparkle Cleaning</b><small>Instant quote</small></span>
        </div>
        <div className="qt-w-progress"><motion.i initial={false} animate={{ scaleX: Math.min(1, (step + 1) / (FINAL + 1)) }} transition={morph} /></div>
        <AnimatePresence mode="wait" initial={false}>
          {!screenB ? (
            <motion.div key="a" className="qt-w-body" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={morph}>
              <p className="qt-w-q">How many bedrooms?</p>
              <div className="qt-w-opts qt-w-opts-4">
                {['1', '2', '3', '4+'].map((b) => <span key={b} className={`qt-w-opt${step >= 1 && b === '3' ? ' is-on' : ''}`}>{b}</span>)}
              </div>
              <p className="qt-w-q">Type of clean</p>
              <div className="qt-w-opts qt-w-opts-2">
                {['Regular', 'Deep clean'].map((b) => <span key={b} className={`qt-w-opt${step >= 2 && b === 'Deep clean' ? ' is-on' : ''}`}>{b}</span>)}
              </div>
              <p className="qt-w-q">Postcode</p>
              <span className={`qt-w-input${step === 3 ? ' is-focus' : ''}`}><Typed text={POSTCODE} on={step >= 3} />{step === 3 && <i className="qt-caret" />}</span>
              <div className="qt-w-price-slot">
                <AnimatePresence initial={false}>
                  {step >= 4 && (
                    <motion.div className="qt-w-price" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.36, ease: OUT }}>
                      <small>Your price</small>
                      <strong className="qt-num">£180 to £230</strong>
                      <span>3 bedrooms · Deep clean · SW15</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div key="b" className="qt-w-body" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={morph}>
              <div className="qt-w-mini"><span>3 bed deep clean</span><b className="qt-num">£180 to £230</b></div>
              <p className="qt-w-q">Add photos (optional)</p>
              <div className="qt-w-photos">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`qt-w-photo qt-w-photo-${i}`}>
                    {i === 0 ? (
                      <motion.i className="qt-w-upload" initial={false} animate={{ scaleX: step >= 5 ? 1 : 0 }} transition={{ duration: 0.8, ease: EASE }} />
                    ) : <Camera size={14} />}
                  </span>
                ))}
              </div>
              <div className="qt-w-status">
                {step === 6 ? <><i className="qt-dot qt-dot-live" />Checking your photos</> : step > 6 ? <><Check size={13} />Photos added</> : <span className="qt-faint">Uploading 1 photo</span>}
              </div>
              <p className="qt-w-q">Pick a time</p>
              <div className="qt-w-slots">
                {['Wed 14:00', 'Thu 10:00', 'Thu 13:00', 'Fri 09:00'].map((s) => (
                  <span key={s} className={`qt-w-slot${step >= 7 && s === 'Thu 10:00' ? ' is-on' : ''}`}>{s}</span>
                ))}
              </div>
              <div className="qt-w-done-slot">
                <AnimatePresence initial={false}>
                  {step >= 8 && (
                    <motion.div className="qt-w-done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: OUT }}>
                      <Check size={16} /> Booked. See you Thursday at 10:00.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Tap step={step} />
      </div>
    </div>
  )
}

/* A soft fingertip ring that lands on whatever the current step taps. Positions are % of the screen. */
const TAPS: Record<number, [number, number]> = { 1: [63, 27], 2: [72, 41], 3: [40, 54], 7: [65, 69] }
function Tap({ step }: { step: number }) {
  const at = TAPS[step]
  return (
    <AnimatePresence>
      {at && (
        <motion.i
          key={step} className="qt-tap" style={{ left: `${at[0]}%`, top: `${at[1]}%` }}
          initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: [0, 1, 0], scale: [1.6, 1, 1] }} transition={{ duration: 0.7, ease: EASE }}
        />
      )}
    </AnimatePresence>
  )
}

const LEADS: [string, string, string, 'amber' | 'accent' | 'blue' | 'green'][] = [
  ['J. Patel', 'End of tenancy · SW18', '£260 to £320', 'accent'],
  ['M. Okafor', 'Regular clean · SW19', '£70 to £90', 'green'],
  ['R. Hughes', 'Oven clean · SW15', '£45 to £55', 'amber'],
]
const TONE_LABEL = { amber: 'New', accent: 'Quoted', blue: 'Booked', green: 'Won' }

function Inbox({ step }: { step: number }) {
  const booked = step >= 8
  return (
    <div className="qt-browser" aria-hidden="true">
      <div className="qt-browser-bar"><i /><i /><i /><span>app.quotient.app/leads</span></div>
      <div className="qt-inbox-head"><b>Leads</b><span className="qt-faint">All sources</span></div>
      <div className="qt-inbox-rows">
        <motion.div className="qt-inbox-row is-new" initial={false} animate={{ backgroundColor: booked ? 'rgba(238,248,247,1)' : 'rgba(255,255,255,1)' }} transition={{ duration: 0.4, ease: EASE }}>
          <span className="qt-inbox-name">New lead · SW15</span>
          <span className="qt-faint">3 bed deep clean</span>
          <span className="qt-num">£180 to £230</span>
          <Pill tone={booked ? 'blue' : step >= 4 ? 'accent' : 'amber'} dot>{booked ? 'Booked' : step >= 4 ? 'Quoted' : 'New'}</Pill>
        </motion.div>
        {LEADS.map(([n, j, p, t]) => (
          <div key={n} className="qt-inbox-row">
            <span className="qt-inbox-name">{n}</span><span className="qt-faint">{j}</span><span className="qt-num">{p}</span>
            <Pill tone={t} dot>{TONE_LABEL[t]}</Pill>
          </div>
        ))}
      </div>
    </div>
  )
}

const COPY = {
  main: {
    eyebrow: 'For cleaners, gardeners, painters, window cleaners and removals',
    h1: 'Customers get a price in 60 seconds. You get the booking.',
    sub: 'Put an instant quote calculator on your website. Customers answer a few questions, see a price range, add photos and book a slot with a deposit. Quotient texts them if they go quiet.',
  },
  agencies: {
    eyebrow: 'For web agencies that build sites for trades',
    h1: 'Add instant quotes to every trades site you build.',
    sub: 'One subscription covers up to 10 client businesses. Each gets its own calculator, calendar, texting number and deposits to their own Stripe. You set it up once and charge a monthly fee.',
  },
}

export function Hero({ variant, onMain }: { variant: 'main' | 'agencies'; onMain: () => void }) {
  const c = COPY[variant]
  const { step, replay, reduce } = useSequence()
  const rise = (delay: number) => reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.36, delay, ease: OUT } }
  return (
    <section className="qt-section qt-hero" id="top">
      <div className="qt-rail qt-hero-grid">
        <div className="qt-hero-copy" key={variant}>
          <motion.div {...rise(0)}><Eyebrow>{c.eyebrow}</Eyebrow></motion.div>
          <motion.h1 {...rise(0.08)}>{c.h1}</motion.h1>
          <motion.p {...rise(0.16)} className="qt-hero-sub">{c.sub}</motion.p>
          <motion.div {...rise(0.24)} className="qt-cta-row">
            <Btn size="lg" href="/signup" onClick={() => track('lp_cta_clicked', { location: 'hero' })}>Start free trial <ArrowRight size={16} /></Btn>
            {variant === 'main'
              ? <Btn size="lg" variant="secondary" href="#demo" onClick={() => scrollToId('demo')}>Try the demo below</Btn>
              : <Btn size="lg" variant="secondary" href="#book-call" onClick={() => track('lp_agency_call_clicked')}>Book a 15 minute call</Btn>}
          </motion.div>
          <motion.p {...rise(0.32)} className="qt-trust">7 day free trial · Set up in 20 minutes · Works on Wix, Squarespace and WordPress</motion.p>
          {variant === 'agencies' && <button type="button" className="qt-textlink" onClick={onMain}>Back to the main page</button>}
        </div>
        <div className="qt-hero-visual" role="img" aria-label="Quote widget on a phone: a customer picks 3 bedrooms and a deep clean in SW15, sees a price of £180 to £230, adds a photo and books Thursday at 10:00. Behind it, the owner's leads inbox marks the new lead as booked.">
          <motion.div className="qt-hero-browser" {...(reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.3, ease: OUT } })}>
            <Inbox step={step} />
          </motion.div>
          <motion.div className="qt-hero-phone" {...(reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.18, ease: OUT } })}>
            <PhoneWidget step={step} />
          </motion.div>
          <div className="qt-replay-slot">
            <button type="button" className="qt-replay" onClick={replay} style={{ visibility: step >= FINAL && !reduce ? 'visible' : 'hidden' }}>
              <RotateCcw size={14} /> Replay
            </button>
          </div>
        </div>
      </div>
      <div className="qt-tape" aria-hidden="true" />
    </section>
  )
}
