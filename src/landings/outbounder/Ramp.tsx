import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Btn, MORPH, Reveal, SectionHead, fmt, scrollToId, track } from './shared'

/* ---------- Sending rules (mirrors lib/sending/rules.ts in the product PRD, section 14.2) ---------- */
const CAP_START = 20
const CAP_MID = 25
const CAP_MAX = 30
/** Per-inbox daily cap by inbox age: 20 for days 0 to 13, 25 for days 14 to 27, then 30. */
export function rampCap(ageDays: number, dailyCap = CAP_MAX) {
  if (ageDays < 14) return Math.min(CAP_START, dailyCap)
  if (ageDays < 28) return Math.min(CAP_MID, dailyCap)
  return dailyCap
}
const weekly = (inboxes: number, days: number, week: number) => inboxes * rampCap((week - 1) * 7) * days

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function WarmupChart({ inboxes, days }: { inboxes: number; days: number }) {
  const reduce = useReducedMotion()
  const weeks = [1, 2, 3, 4, 5, 6, 7, 8]
  const vals = weeks.map((w) => weekly(inboxes, days, w))
  const peak = Math.max(...vals)
  const top = Math.max(100, Math.ceil((peak * 1.25) / 100) * 100)
  const base = vals[0]
  return (
    <figure className="ob-chart" aria-label={`Inbox warm-up: ${fmt(vals[0])} sends a week in weeks 1 and 2, ${fmt(vals[2])} in weeks 3 and 4, ${fmt(vals[4])} from week 5.`}>
      <div className="ob-chart-head">
        <span>Inbox warm-up <span className="ob-faint">· sends per week</span></span>
        <span className="ob-chart-legend"><i className="ob-leg-bar" /> {inboxes} {inboxes === 1 ? 'inbox' : 'inboxes'} x cap x {days} {days === 1 ? 'day' : 'days'}</span>
      </div>
      <div className="ob-chart-plot" aria-hidden="true">
        {[1, 0.5, 0].map((g) => (
          <span key={g} className="ob-grid" style={{ bottom: `${g * 100}%` }}><span className="ob-mono">{fmt(Math.round(top * g))}</span></span>
        ))}
        <div className="ob-bars">
          {vals.map((v, i) => {
            const cap = rampCap(i * 7)
            const delta = base ? Math.round(((v - base) / base) * 100) : 0
            const step = i === 0 || i === 2 || i === 4
            return (
              <div className={`ob-bar-col${step ? ' ob-bar-step' : ''}`} key={i}>
                <motion.span
                  className={`ob-bar ob-bar-${cap}`}
                  initial={false}
                  animate={{ scaleY: v / top }}
                  transition={{ duration: reduce ? 0 : 0.4, ease: MORPH }}
                />
                <span className="ob-bar-label" style={{ bottom: `calc(${(v / top) * 100}% + 6px)` }}>
                  {step && delta > 0 && <span className="ob-delta ob-mono">+{delta}%</span>}
                  <span className="ob-mono ob-bar-v">{fmt(v)}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="ob-bars ob-bars-x" aria-hidden="true">
        {weeks.map((w, i) => <span key={w} className={i === 0 || i === 2 || i === 4 ? 'ob-x-step' : undefined}><span className="ob-mono">W{w}</span><span className="ob-mono ob-cap-x">{rampCap(i * 7)}/day</span></span>)}
      </div>
    </figure>
  )
}

export function Calculator() {
  const [inboxes, setInboxes] = useState(3)
  const [days, setDays] = useState<boolean[]>([true, true, true, true, false, false, false])
  const n = days.filter(Boolean).length
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const id = window.setTimeout(() => track('calculator_used', { inboxes, days: n }), 400)
    return () => window.clearTimeout(id)
  }, [inboxes, n])
  const out = [
    ['Weeks 1 to 2', weekly(inboxes, n, 1)],
    ['Weeks 3 to 4', weekly(inboxes, n, 3)],
    ['From week 5', weekly(inboxes, n, 5)],
  ] as const

  return (
    <section className="ob-section" id="calculator" aria-labelledby="calc-h">
      <div className="ob-rail ob-pad">
        <Reveal className="ob-calc">
          <div className="ob-calc-inputs">
            <h3 id="calc-h">How many emails can you safely send?</h3>
            <label className="ob-field">
              <span className="ob-field-row"><span>Inboxes</span><span className="ob-mono ob-fixed">{inboxes}</span></span>
              <input
                type="range" min={1} max={6} step={1} value={inboxes}
                onChange={(e) => setInboxes(Number(e.target.value))}
                aria-valuetext={`${inboxes} inboxes`}
                style={{ ['--p' as string]: `${((inboxes - 1) / 5) * 100}%` }}
              />
              <span className="ob-ticks-row ob-mono" aria-hidden="true">{[1, 2, 3, 4, 5, 6].map((k) => <span key={k}>{k}</span>)}</span>
            </label>
            <fieldset className="ob-field">
              <legend className="ob-field-row"><span>Send days per week</span><span className="ob-mono ob-fixed">{n}</span></legend>
              <div className="ob-daychips">
                {DAYS.map((d, i) => (
                  <button
                    key={d} type="button" aria-pressed={days[i]}
                    className={`ob-daychip${days[i] ? ' on' : ''}`}
                    onClick={() => setDays((p) => p.map((v, k) => (k === i ? !v : v)))}
                  >{d}</button>
                ))}
              </div>
            </fieldset>
            <ul className="ob-calc-out" aria-live="polite">
              {out.map(([label, v]) => (
                <li key={label}><span className="ob-calc-l">{label}{label === 'From week 5' ? ': up to' : ':'}</span><span className="ob-calc-n"><span className="ob-mono">{fmt(v)}</span> <span className="ob-calc-u">a week</span></span></li>
              ))}
            </ul>
            <p className="ob-calc-note">Starter's 3 inboxes cover about 1,000 emails a month once they have ramped. Growth's 6 cover 2,700.</p>
            <a className="ob-link" href="/tools/inbox-calculator">Open the full calculator <ArrowRight size={14} aria-hidden="true" /></a>
          </div>
          <WarmupChart inboxes={inboxes} days={n} />
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- How it works + terminal sequence diagram ---------- */

type Seg = [string, string?]
const SEQ: Seg[][] = [
  [['$ ', 'f'], ['outbounder sequence '], ['sarah@northpeak.studio', 'a']],
  [['']],
  [[' you          outbounder          sarah', 'h']],
  [['   |               |                |', 'f']],
  [['   |', 'f'], ['-- approve --->', 'a'], ['|                |', 'f']],
  [['   |               |', 'f'], ['-- step 1 ----->', 'a'], ['|', 'f'], [' day 0', 'd']],
  [['   |               |', 'f'], ['-- step 2 ----->', 'a'], ['|', 'f'], [' day 3', 'd']],
  [['   |               |', 'f'], ['<----- reply ---', 'i'], ['|', 'f'], [' day 4', 'd']],
  [['   |               |', 'f'], [' > ', 'f'], ['interested', 'chip'], ['   |', 'f']],
  [['   |', 'f'], ['<--- alert ----', 'a'], ['|                |', 'f']],
  [['   |               |', 'f'], [' x step 3       ', 'x'], ['|', 'f'], [' day 8', 'd']],
  [['   |               |                |', 'f']],
  [['done ', 'ok'], ['1 reply · sequence stopped', 'f']],
]

const LEGEND: [string, string, string][] = [
  ['step 1', 'day 0', 'Claude writes it from their website'],
  ['step 2', 'day 3', 'Your template, same thread'],
  ['step 3', 'day 8', 'Your template, new thread'],
  ['reply', 'any day', 'Labelled, alert sent, sequence stops'],
]

function SequenceTerminal() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const reduce = !!useReducedMotion()
  const [shown, setShown] = useState(reduce ? SEQ.length : 0)
  useEffect(() => {
    if (reduce) { setShown(SEQ.length); return }
    if (!inView) return
    const id = window.setTimeout(
      () => setShown((s) => (s >= SEQ.length ? 1 : s + 1)),
      shown >= SEQ.length ? 4200 : shown === 0 ? 500 : 340,
    )
    return () => window.clearTimeout(id)
  }, [inView, shown, reduce])
  const text = useMemo(() => SEQ.map((l) => l.map((s) => s[0]).join('')).join('\n'), [])

  return (
    <div className="ob-term" ref={ref}>
      <div className="ob-term-bar" aria-hidden="true">
        <i /><i /><i />
        <span className="ob-mono">sequence · 3 steps · stops on reply</span>
      </div>
      <div className="ob-term-grid">
      <pre className="ob-term-body" aria-label="Sequence diagram: you approve, Outbounder sends step 1 on day 0 and step 2 on day 3. Sarah replies on day 4, the reply is labelled interested, you get an alert and step 3 on day 8 is cancelled.">
        <span className="ob-sr">{text}</span>
        <span aria-hidden="true">
          {SEQ.map((line, i) => (
            <span key={i} className={`ob-term-line${i < shown ? ' on' : ''}${i === shown - 1 && i > 0 ? ' last' : ''}`}>
              {line.map(([t, c], k) => <span key={k} className={c ? `t-${c}` : undefined}>{t}</span>)}
              {'\n'}
            </span>
          ))}
        </span>
      </pre>
      <dl className="ob-term-legend">
        {LEGEND.map(([k, d, v], i) => (
          <div key={k} className={i < 3 ? '' : 'ob-term-legend-reply'}>
            <dt className="ob-mono">{k}<span>{d}</span></dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      </div>
    </div>
  )
}

const STEPS = [
  ['Describe your buyer.', 'Titles, countries, company size and your one-sentence offer. You see a real first line before you pay.'],
  ['Connect a domain.', 'Buy a lookalike domain on Porkbun, paste the records we show you, create 2 inboxes. Outbounder checks it for you.'],
  ['Review and launch.', "Approve the emails you like. Outbounder sends them in each lead's morning and stops the moment anyone replies."],
]

export function HowItWorks() {
  return (
    <section className="ob-section" id="how" aria-labelledby="how-h">
      <div className="ob-rail ob-pad">
        <SectionHead id="how-h" title="Three steps. About 20 minutes the first time." />
        <ol className="ob-steps">
          {STEPS.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.08} className="ob-step">
              <span className="ob-step-n ob-mono" aria-hidden="true">0{i + 1}</span>
              <h3><span className="ob-sr">Step {i + 1}: </span>{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ol>
        <Reveal className="ob-how-term">
          <SequenceTerminal />
        </Reveal>
        <div className="ob-center">
          <Btn onClick={() => { track('hero_cta_clicked', { button: 'trial', location: 'how' }); scrollToId('pricing') }}>Start 7-day free trial</Btn>
        </div>
      </div>
    </section>
  )
}
