import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Brush, Car, Clock, Droplets, Flower2, MessageSquareOff, Play, Sparkles, SquareStack, Truck, Pause, Info } from 'lucide-react'
import { MORPH, OUT, Reveal, SectionHead, track } from './shared'

/* 4. Logo strip: trade icons, not customer logos. Fixed 64px row. */
const TRADES = [
  { icon: Sparkles, label: 'Domestic cleaning' }, { icon: SquareStack, label: 'Window cleaning' }, { icon: Flower2, label: 'Gardening' },
  { icon: Brush, label: 'Painting and decorating' }, { icon: Truck, label: 'Removals' }, { icon: Droplets, label: 'Pressure washing' },
]
export function LogoStrip() {
  return (
    <section className="qt-section qt-logos" aria-label="Trades Quotient is built for">
      <div className="qt-rail">
        <Reveal className="qt-logos-inner">
          <p className="qt-faint">Built for the jobs people book online</p>
          <ul>
            {TRADES.map(({ icon: I, label }) => <li key={label}><I size={16} strokeWidth={1.5} aria-hidden="true" />{label}</li>)}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

/* 5. Problem. */
const PROBLEMS = [
  { icon: Clock, title: 'Quote requests arrive at 9pm.', body: 'You see them tomorrow on a ladder, and ring back at 6pm.' },
  { icon: Car, title: 'Surveys for small jobs.', body: 'A 40 minute drive to look at three bedrooms you could have priced from a photo.' },
  { icon: MessageSquareOff, title: 'Quotes go quiet.', body: 'Nobody chases, because you are doing the work you already booked.' },
]
export function Problem() {
  return (
    <section className="qt-section qt-band" id="problem">
      <div className="qt-rail">
        <SectionHead eyebrow="The problem" title="The first business to send a price usually gets the job" />
        <div className="qt-problems">
          {PROBLEMS.map(({ icon: I, title, body }, i) => (
            <Reveal key={title} delay={i * 0.08} className="qt-problem">
              <span className="qt-icon-box"><I size={18} strokeWidth={1.5} aria-hidden="true" /></span>
              <p><b className="qt-ink">{title}</b> {body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.24}><p className="qt-problem-line">Quotient answers in seconds, checks the photos, books the slot and chases for you.</p></Reveal>
      </div>
    </section>
  )
}

/* 6. Live demo: a working cleaning calculator for the fake business "Sparkle Cleaning". Nothing is sent. */
const TYPES = [{ id: 'regular', label: 'Regular', x: 1 }, { id: 'deep', label: 'Deep clean', x: 1.4 }, { id: 'eot', label: 'End of tenancy', x: 1.7 }] as const
const EXTRAS = [{ id: 'oven', label: 'Oven', p: 25 }, { id: 'fridge', label: 'Fridge', p: 15 }, { id: 'windows', label: 'Inside windows', p: 20 }] as const
const ZONE_A = ['SW15', 'SW18', 'SW19']
const ZONE_B = ['SW11', 'SW6', 'SW13', 'SW14', 'SW17', 'SW20']
const round5Down = (n: number) => Math.floor(n / 5) * 5
const round5Up = (n: number) => Math.ceil(n / 5) * 5

function quote(beds: number, baths: number, type: number, extras: string[], postcode: string) {
  const district = postcode.trim().toUpperCase().split(' ')[0]
  if (!district) return { state: 'empty' as const }
  const zone = ZONE_A.includes(district) ? 0 : ZONE_B.includes(district) ? 10 : -1
  if (zone < 0) return { state: 'out' as const }
  const base = 40 + beds * 30 + (baths - 1) * 15
  const extra = EXTRAS.filter((e) => extras.includes(e.id)).reduce((s, e) => s + e.p, 0)
  const mid = Math.max(70, base * TYPES[type].x + extra + zone)
  return { state: 'ok' as const, low: round5Down(mid), high: round5Up(mid * 1.25), zone }
}

function Seg<T extends string | number>({ label, options, value, onChange }: { label: string; options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="qt-d-field">
      <legend>{label}</legend>
      <div className="qt-d-opts" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" aria-pressed={value === o.v} className={`qt-d-opt${value === o.v ? ' is-on' : ''}`} onClick={() => onChange(o.v)}>{o.l}</button>
        ))}
      </div>
    </fieldset>
  )
}

function DemoWidget() {
  const [beds, setBeds] = useState(3)
  const [baths, setBaths] = useState(1)
  const [type, setType] = useState(1)
  const [extras, setExtras] = useState<string[]>([])
  const [postcode, setPostcode] = useState('SW15')
  const [slot, setSlot] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const interacted = useRef(false)
  const q = useMemo(() => quote(beds, baths, type, extras, postcode), [beds, baths, type, extras, postcode])
  const touch = () => { if (!interacted.current) { interacted.current = true; track('lp_demo_interacted') } setSubmitted(false) }
  useEffect(() => { if (interacted.current && q.state === 'ok') track('lp_demo_priced') }, [q])
  return (
    <div className="qt-demo-card">
      <div className="qt-w-head">
        <span className="qt-w-logo">S</span>
        <span><b>Sparkle Cleaning</b><small>Demo calculator</small></span>
        <span className="qt-demo-tag">Demo</span>
      </div>
      <div className="qt-demo-body">
        <Seg label="Bedrooms" value={beds} onChange={(v) => { touch(); setBeds(v) }} options={[1, 2, 3, 4, 5].map((n) => ({ v: n, l: n === 5 ? '5+' : String(n) }))} />
        <Seg label="Bathrooms" value={baths} onChange={(v) => { touch(); setBaths(v) }} options={[1, 2, 3].map((n) => ({ v: n, l: n === 3 ? '3+' : String(n) }))} />
        <Seg label="Type of clean" value={type} onChange={(v) => { touch(); setType(v) }} options={TYPES.map((t, i) => ({ v: i, l: t.label }))} />
        <fieldset className="qt-d-field">
          <legend>Extras</legend>
          <div className="qt-d-opts qt-d-extras">
            {EXTRAS.map((e) => {
              const on = extras.includes(e.id)
              return (
                <button key={e.id} type="button" aria-pressed={on} className={`qt-d-opt${on ? ' is-on' : ''}`}
                  onClick={() => { touch(); setExtras((x) => on ? x.filter((i) => i !== e.id) : [...x, e.id]) }}>
                  {e.label} <span className="qt-faint">+£{e.p}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
        <label className="qt-d-field">
          <span className="qt-d-legend">Postcode</span>
          <input className="qt-d-input" value={postcode} maxLength={8} autoComplete="off" spellCheck={false}
            onChange={(e) => { touch(); setPostcode(e.target.value) }} aria-describedby="qt-d-hint" />
          <span id="qt-d-hint" className="qt-d-hint">Try SW15, SW11 or E1</span>
        </label>
        <div className="qt-d-price" aria-live="polite">
          <small>Your price</small>
          <AnimatePresence mode="wait" initial={false}>
            <motion.strong key={q.state === 'ok' ? `${q.low}-${q.high}` : q.state} className="qt-num"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: MORPH }}>
              {q.state === 'ok' ? `£${q.low} to £${q.high}` : q.state === 'out' ? "We don't cover this area yet" : 'Enter your postcode'}
            </motion.strong>
          </AnimatePresence>
          <span className="qt-faint">{q.state === 'ok' && q.zone ? 'Includes a £10 travel surcharge' : 'Final price confirmed on the day'}</span>
        </div>
        <fieldset className="qt-d-field">
          <legend>Example slots</legend>
          <div className="qt-d-opts" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {['Thu 10:00', 'Thu 13:00', 'Fri 09:00', 'Sat 11:00'].map((s) => (
              <button key={s} type="button" aria-pressed={slot === s} className={`qt-d-opt${slot === s ? ' is-on' : ''}`} onClick={() => { touch(); setSlot(s) }}>{s}</button>
            ))}
          </div>
        </fieldset>
        <button type="button" className="qt-btn qt-btn-primary qt-btn-md qt-btn-full" onClick={() => setSubmitted(true)}>Book {slot ?? 'a slot'}</button>
        <p className="qt-d-note" role="status" style={{ visibility: submitted ? 'visible' : 'hidden' }}>
          <Info size={14} aria-hidden="true" /> This is a demo. Start a free trial to get your own.
        </p>
      </div>
    </div>
  )
}

/* The owner side: a builder poster that plays a short coded tour on demand. */
const TOUR = [
  { cap: 'Pick the cleaning template', hi: -1 },
  { cap: 'Set your rate per bedroom', hi: 1 },
  { cap: 'Add a deep clean multiplier', hi: 2 },
  { cap: 'Add postcode zones', hi: 3 },
  { cap: 'Copy the snippet', hi: 4 },
]
const RULES: [string, string][] = [['Call-out base', '£40'], ['Per bedroom', '£30'], ['Deep clean', 'x 1.4'], ['Zone B (SW11, SW6)', '+£10'], ['Embed snippet', 'Copy']]
function Tour() {
  const reduce = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setI((n) => { if (n >= TOUR.length - 1) { setPlaying(false); return n } return n + 1 }), reduce ? 400 : 2200)
    return () => window.clearInterval(id)
  }, [playing, reduce])
  const toggle = () => {
    if (!playing) { track('lp_tour_played'); setI(0) }
    setPlaying((p) => !p)
  }
  const hi = playing || i > 0 ? TOUR[i].hi : -1
  return (
    <div className="qt-tour">
      <div className="qt-browser qt-tour-frame" role="img" aria-label="The calculator builder's pricing tab with base, per bedroom, deep clean and postcode zone rules">
        <div className="qt-browser-bar"><i /><i /><i /><span>Calculator builder · Pricing</span></div>
        <div className="qt-tour-rules">
          {RULES.map(([l, v], n) => (
            <div key={l} className={`qt-rule${hi === n ? ' is-on' : ''}`}><span>{l}</span><b className="qt-num">{v}</b></div>
          ))}
        </div>
        <div className="qt-tour-cap">
          <span>{TOUR[i].cap}</span>
          <span className="qt-tour-bar"><motion.i initial={false} animate={{ scaleX: (i + 1) / TOUR.length }} transition={{ duration: 0.36, ease: MORPH }} /></span>
        </div>
      </div>
      <button type="button" className="qt-btn qt-btn-secondary qt-btn-md" onClick={toggle} aria-pressed={playing}>
        {playing ? <><Pause size={14} /> Pause the tour</> : <><Play size={14} /> Watch the 60 second tour</>}
      </button>
    </div>
  )
}

export function Demo() {
  return (
    <section className="qt-section" id="demo">
      <div className="qt-rail">
        <SectionHead eyebrow="Try it" title="This is what your customers see" sub="A demo cleaning calculator. Change the answers and watch the price. Nothing is sent anywhere." />
        <div className="qt-demo-grid">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.36, ease: OUT }}>
            <DemoWidget />
          </motion.div>
          <div className="qt-demo-side">
            <Tour />
          </div>
        </div>
      </div>
    </section>
  )
}
