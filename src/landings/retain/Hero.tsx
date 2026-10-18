import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion, useInView } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Btn, EASE, Eyebrow, OUT, Pill, scrollToId, track, type Tone } from './shared'

type Row = { name: string; mrr: number; score: number; reason: string }
const BASE: Row[] = [
  { name: 'Northwind', mrr: 290, score: 82, reason: 'Cancel scheduled' },
  { name: 'Acme Ltd', mrr: 480, score: 78, reason: 'Card expires before renewal' },
  { name: 'Globex', mrr: 149, score: 54, reason: 'Seats cut from 6 to 4' },
  { name: 'Initech', mrr: 99, score: 41, reason: 'Trial ends in 3 days' },
  { name: 'Stark Labs', mrr: 349, score: 47, reason: 'Downgraded to Starter on 9 Oct' },
  { name: 'Wayne Studio', mrr: 129, score: 23, reason: 'Usage down 20% this month' },
  { name: 'Umbrella Co', mrr: 640, score: 12, reason: 'No warning signs' },
  { name: 'Hooli', mrr: 199, score: 8, reason: 'No warning signs' },
]
/* Events that land while the table is in view: a failed payment pushes Globex up; Initech converts. */
const EVENTS: ((r: Row[]) => Row[])[] = [
  (r) => r,
  (r) => r.map((x) => x.name === 'Globex' ? { ...x, score: 89, reason: 'Renewal payment failed' } : x),
  (r) => r.map((x) => x.name === 'Initech' ? { ...x, score: 6, reason: 'Converted to paid' } : x),
  (r) => r.map((x) => x.name === 'Globex' ? { ...x, score: 54, reason: 'Card updated, invoice paid' } : x),
]
export const band = (s: number): [Tone, string] => s >= 70 ? ['high', 'High'] : s >= 40 ? ['watch', 'Watch'] : ['low', 'Low']

export function RiskTable({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = !!useReducedMotion()
  const [ev, setEv] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setEv((e) => (e + 1) % EVENTS.length), 2600)
    return () => window.clearInterval(id)
  }, [inView, reduce])
  const rows = useMemo(() => {
    let r = BASE
    for (let i = 0; i <= (reduce ? 0 : ev); i++) r = EVENTS[i](r)
    return [...r].sort((a, b) => b.score - a.score)
  }, [ev, reduce])
  const changed = ev === 1 ? 'Globex' : ev === 2 ? 'Initech' : ev === 3 ? 'Globex' : ''
  return (
    <div ref={ref} className={`rt-table${compact ? ' is-compact' : ''}`}>
      <div className="rt-tr rt-th"><span>Customer</span><span>MRR</span><span>Risk</span><span className="rt-col-reason">Top reason</span></div>
      {rows.map((r) => {
        const [tone, label] = band(r.score)
        return (
          <motion.div key={r.name} layout={!reduce} transition={{ duration: 0.5, ease: EASE }}
            className={`rt-tr${r.name === 'Acme Ltd' ? ' is-sel' : ''}${r.name === changed ? ' is-flash' : ''}`}>
            <span className="rt-cust"><i className="rt-ava" aria-hidden="true">{r.name[0]}</i>{r.name}</span>
            <span className="rt-mono">${r.mrr}</span>
            <span className="rt-score"><b className="rt-mono">{r.score}</b><Pill tone={tone} dot>{label}</Pill></span>
            <span className="rt-col-reason rt-reason">{r.reason}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

const SIGNALS: [string, number][] = [
  ['Their card ends October 2026. Renewal is on 3 Nov.', 25],
  ['Used the product on 4 days in the last 2 weeks, down from 11 (-64%).', 25],
  ['Cut seats from 8 to 5 on 12 Oct.', 15],
  ['Moved from the annual to the monthly price on 2 Oct.', 13],
]
function Panel() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3, once: true })
  const reduce = !!useReducedMotion()
  const [n, setN] = useState(reduce ? SIGNALS.length : 0)
  useEffect(() => {
    if (!inView || reduce) return
    const ids = SIGNALS.map((_, i) => window.setTimeout(() => setN(i + 1), 700 + i * 650))
    return () => ids.forEach(window.clearTimeout)
  }, [inView, reduce])
  const score = SIGNALS.slice(0, n).reduce((s, [, p]) => s + p, 0)
  const [tone, label] = band(score)
  return (
    <div ref={ref} className="rt-panel">
      <div className="rt-panel-head">
        <span className="rt-cust"><i className="rt-ava" aria-hidden="true">A</i><b>Acme Ltd</b></span>
        <span className="rt-mono rt-faint">$480 MRR</span>
      </div>
      <div className="rt-panel-score">
        <span className="rt-big rt-mono">{score}</span>
        <Pill tone={tone} dot>{label}</Pill>
        <span className="rt-meter" aria-hidden="true"><motion.i initial={false} animate={{ scaleX: score / 100 }} transition={{ duration: 0.5, ease: EASE }} /></span>
      </div>
      <p className="rt-label">Signals</p>
      <ul className="rt-signals">
        {SIGNALS.map(([t, p], i) => (
          <motion.li key={t} initial={false} animate={{ opacity: i < n ? 1 : 0.25 }} transition={{ duration: 0.36, ease: EASE }}>
            <span>{t}</span><b className="rt-mono">+{p}</b>
          </motion.li>
        ))}
      </ul>
      <motion.div className="rt-ai" initial={false} animate={{ opacity: n >= SIGNALS.length ? 1 : 0, y: n >= SIGNALS.length ? 0 : 4 }} transition={{ duration: 0.36, ease: OUT }}>
        <span className="rt-ai-tag"><Sparkles size={12} /> AI summary</span>
        <p>Card expires before the 3 Nov renewal and usage has dropped since the seat cut. Send the card reminder now and offer a quick check-in.</p>
      </motion.div>
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const rise = (i: number) => reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, delay: i * 0.06, ease: OUT } }
  return (
    <section className="rt-section rt-hero" id="top">
      <div className="rt-grid-bg" aria-hidden="true" />
      <div className="rt-rail">
        <div className="rt-hero-copy">
          <motion.div {...rise(0)}><Eyebrow>For SaaS on Stripe Billing</Eyebrow></motion.div>
          <motion.h1 {...rise(1)}>Save customers before they cancel</motion.h1>
          <motion.p {...rise(2)} className="rt-hero-sub">
            Retain reads your Stripe, scores every customer for churn risk in plain words, chases failed payments in your brand
            and shows a fair offer when someone clicks Cancel.
          </motion.p>
          <motion.div {...rise(3)} className="rt-cta-row">
            <Btn size="lg" href="/signup" onClick={() => track('hero_cta_clicked', { kind: 'primary' })}>Start free trial <ArrowRight size={16} /></Btn>
            <Btn size="lg" variant="secondary" href="#demo" onClick={() => { track('hero_cta_clicked', { kind: 'secondary' }); scrollToId('demo') }}>See how the score works</Btn>
          </motion.div>
          <motion.p {...rise(4)} className="rt-trust">7 day trial · No card needed · Installs on Stripe in two clicks</motion.p>
        </div>
        <motion.div className="rt-shot" {...(reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.36, delay: 0.18, ease: OUT } })}
          role="img" aria-label="Retain's Customers page sorted by churn risk, with the side panel open on Acme Ltd: score 78, High, made of four plain-words signals and an AI summary">
          <div className="rt-shot-bar">
            <span className="rt-shot-dots"><i /><i /><i /></span>
            <span className="rt-mono">Customers · sorted by risk</span>
            <span className="rt-live"><i className="rt-dot rt-dot-live" />Synced with Stripe</span>
          </div>
          <div className="rt-shot-body">
            <div className="rt-shot-table"><RiskTable /></div>
            <Panel />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
