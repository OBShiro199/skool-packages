import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, Sparkles } from 'lucide-react'
import { EASE, MORPH, Reveal, Signature, Tick, useCountUp, useLoopStep } from './shared'

type Feature = { id: string; eyebrow: string; title: string; body: string; bullets: string[]; size: string; visual: ReactNode }

/* ---------- 7.1 Brief card ---------- */
function BriefVisual() {
  const { ref, step, reduce } = useLoopStep(6, 900)
  const rows: [string, ReactNode][] = [
    ['Goal', 'Online orders that keep up with the café queue'],
    ['Pain', 'Slow store on phones, one in three carts lost'],
    ['Budget', <mark key="m" className={step >= 3 ? 'is-on' : ''}>"We spent about $20k with our last agency"</mark>],
    ['Open question', 'Who owns the Shopify account today?'],
  ]
  return (
    <div ref={ref} className="sg-paper sg-v-brief" role="img" aria-label="Call brief with goals, pains and a highlighted budget signal: we spent about $20k with our last agency">
      <div className="sg-v-head"><span>Brief</span><span className="sg-v-faint">Jane Cole · 45:12</span></div>
      <ul aria-hidden="true">
        {rows.map(([k, v], n) => (
          <li key={k} className={reduce || step >= n ? 'is-in' : ''}>
            <b>{k}</b><span>{v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- 7.2 Three pricing options ---------- */
function OptionsVisual() {
  const { ref, step, inView } = useLoopStep(2, 2600)
  const good = useCountUp(6400, 900, inView)
  const better = useCountUp(12000, 900, inView)
  const best = useCountUp(18500, 900, inView)
  const opts: [string, number, boolean][] = [['Good', good, false], ['Better', better, true], ['Best', best, false]]
  return (
    <div ref={ref} className="sg-v-opts" role="img" aria-label="Three pricing options, Good $6,400, Better $12,000 marked Recommended, Best $18,500">
      {opts.map(([name, v, rec]) => (
        <div key={name} className={`sg-paper sg-opt ${rec ? 'is-rec' : ''}`} aria-hidden="true">
          <span className="sg-opt-tier">{name}</span>
          <span className={`sg-opt-pill ${rec ? '' : 'is-hidden'}`}>Recommended</span>
          <span className="sg-opt-total sg-num">${v.toLocaleString('en-US')}</span>
          <span className="sg-opt-lines"><i /><i /><i style={{ width: '60%' }} /></span>
          <span className={`sg-opt-rush ${rec && step === 1 ? 'is-on' : ''}`}>Rush fee applied</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- 7.3 Rewrite with inline diff ---------- */
function RewriteVisual() {
  const { ref, step } = useLoopStep(3, 2200)
  return (
    <div ref={ref} className="sg-paper sg-v-rewrite" role="img" aria-label="An exec summary mid-rewrite, with struck-through words removed and new words added">
      <div className="sg-v-head" aria-hidden="true">
        <span>Exec summary</span>
        <span className="sg-rw-prompt"><Sparkles size={12} strokeWidth={1.5} /> Rewrite: <b>shorter, more confident</b></span>
      </div>
      <p className="sg-rw-text" aria-hidden="true">
        <span className={step >= 1 ? 'sg-del' : ''}>We think we could probably help you</span>
        <span className={`sg-add ${step >= 1 ? 'is-on' : ''}`}> We will</span>
        {' move Northwind to a faster Shopify theme '}
        <span className={step >= 1 ? 'sg-del' : ''}>at some point before the launch</span>
        <span className={`sg-add ${step >= 1 ? 'is-on' : ''}`}> six weeks before the spring launch</span>.
      </p>
      <div className="sg-rw-actions" aria-hidden="true">
        <span className={`sg-mini-btn sg-mini-primary ${step === 2 ? 'is-pressed' : ''}`}>{step === 2 ? <><Check size={12} /> Kept</> : 'Keep'}</span>
        <span className="sg-mini-btn">Discard</span>
      </div>
    </div>
  )
}

/* ---------- 7.4 Section heatmap ---------- */
function HeatmapVisual() {
  const { ref, inView, reduce } = useLoopStep(1, 1000)
  const rows: [string, number, string][] = [
    ['Exec summary', 0.38, '1 min 36 s'],
    ['Scope', 0.52, '2 min 10 s'],
    ['Timeline', 0.24, '58 s'],
    ['Pricing', 1, '4 min 12 s'],
    ['Terms', 0.16, '41 s'],
  ]
  return (
    <div ref={ref} className="sg-paper sg-v-heat" role="img" aria-label="Activity heatmap: the client spent 4 minutes 12 seconds on Pricing, longer than any other section">
      <div className="sg-v-head" aria-hidden="true">
        <span>Opened 3 times</span>
        <span className="sg-v-live"><span className="sg-live" /> Viewing now</span>
      </div>
      <ul aria-hidden="true">
        {rows.map(([name, w, time], n) => (
          <li key={name} className={w === 1 ? 'is-max' : ''}>
            <span className="sg-heat-name">{name}</span>
            <span className="sg-heat-bar">
              <motion.i
                initial={{ scaleX: reduce ? w : 0 }}
                animate={{ scaleX: inView || reduce ? w : 0 }}
                transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : n * 0.08, ease: MORPH }}
              />
            </span>
            <span className="sg-heat-time sg-num">{w === 1 ? `Pricing: ${time}` : time}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- 7.5 Phone sign block ---------- */
function PhoneVisual() {
  const { ref, step, reduce } = useLoopStep(4, 1400)
  // 0 blank, 1 signing, 2 signed, 3 paid
  const [cycle, setCycle] = useState(0)
  useEffect(() => { if (step === 0) setCycle((c) => c + 1) }, [step])
  return (
    <div ref={ref} className="sg-phone" role="img" aria-label="Phone showing the sign block with Jane Cole's signature and a Pay $3,600 deposit button">
      <div className="sg-phone-screen" aria-hidden="true">
        <span className="sg-phone-notch" />
        <p className="sg-phone-kicker">Northwind Coffee</p>
        <p className="sg-phone-title">Accept and sign</p>
        <div className="sg-phone-opt"><span>Better</span><b className="sg-num">$12,000</b></div>
        <div className="sg-phone-pad">
          <Signature key={cycle} play={reduce || step >= 1} className="sg-phone-sig" />
          <span className="sg-phone-base" />
        </div>
        <p className="sg-phone-name">Jane Cole</p>
        <span className={`sg-phone-pay ${step === 3 ? 'is-paid' : ''}`}>
          {step === 3 ? <><Tick size={11} /> Deposit paid</> : 'Pay $3,600 deposit'}
        </span>
        <p className="sg-phone-hash sg-num">Fingerprint 3fa9c1e2...7b0d</p>
      </div>
    </div>
  )
}

/* ---------- 7.6 Analytics tiles ---------- */
function StatsVisual() {
  const { ref, inView, reduce } = useLoopStep(1, 1000)
  const win = useCountUp(42, 900, inView)
  const deal = useCountUp(8400, 900, inView)
  const days = useCountUp(1.6, 900, inView, 1)
  return (
    <div ref={ref} className="sg-v-stats" role="img" aria-label="Analytics tiles: win rate 42%, average deal size $8,400, time to sign 1.6 days">
      <div className="sg-paper sg-stat" aria-hidden="true">
        <span>Win rate</span><b className="sg-num">{win}%</b>
        <svg viewBox="0 0 120 32" className="sg-spark">
          <motion.path d="M2 28 L20 24 L38 26 L56 18 L74 20 L92 10 L118 6" fill="none" stroke="currentColor" strokeWidth="1.5"
            initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: inView || reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.9, ease: EASE }} />
        </svg>
      </div>
      <div className="sg-paper sg-stat" aria-hidden="true"><span>Average deal size</span><b className="sg-num">${deal.toLocaleString('en-US')}</b><em>Last 90 days</em></div>
      <div className="sg-paper sg-stat" aria-hidden="true"><span>Time to sign</span><b className="sg-num">{days.toFixed(1)} days</b><em>Sent to signed</em></div>
      <div className="sg-paper sg-stat sg-stat-team" aria-hidden="true">
        <span>By person</span>
        <ul>
          {[['Maya', 0.48], ['Tom', 0.36], ['Priya', 0.41]].map(([n, v]) => (
            <li key={n as string}><em>{n}</em><span className="sg-heat-bar"><motion.i initial={{ scaleX: reduce ? (v as number) : 0 }} animate={{ scaleX: inView || reduce ? (v as number) : 0 }} transition={{ duration: reduce ? 0 : 0.5, ease: MORPH }} /></span><b className="sg-num">{Math.round((v as number) * 100)}%</b></li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const FEATURES: Feature[] = [
  {
    id: 'brief', size: 'wide', eyebrow: 'Call to brief',
    title: 'Every goal, pain and budget hint, with the client\'s own words.',
    body: 'Signet transcribes the call, tells the speakers apart and pulls out what matters. Fix anything it got wrong before a single word of the proposal is written.',
    bullets: ['Upload MP3, M4A, MP4 or record in the browser', 'Import Zoom and Google Meet recordings', 'Open questions flagged so you can ask before you send'],
    visual: <BriefVisual />,
  },
  {
    id: 'draft', size: 'narrow', eyebrow: 'Brief to proposal',
    title: 'A full proposal with three options, priced from your rate card.',
    body: 'Exec summary, problem, solution, scope, timeline, good/better/best pricing, terms and next steps. It only prices with the services and rules you set, so there are no made-up numbers.',
    bullets: ['Your logo and brand colour', 'Rush fees and minimums applied for you', 'Start from a template that already wins'],
    visual: <OptionsVisual />,
  },
  {
    id: 'edit', size: 'narrow', eyebrow: 'Make it yours',
    title: 'Change a paragraph in one click.',
    body: 'A clean block editor. Hit Rewrite on any section and say what you want: shorter, more confident, mention the Shopify migration. See the change before you keep it.',
    bullets: ['Drag sections into any order', 'Inline diff before anything changes', 'Autosaves as you type'],
    visual: <RewriteVisual />,
  },
  {
    id: 'track', size: 'wide', eyebrow: 'Tracking',
    title: 'See exactly when they opened it, and what they read twice.',
    body: 'Get an email the first time they open it. See time spent on each section, and which pricing option they lingered on, before you pick up the phone.',
    bullets: ['Opened, signed and paid alerts', 'Time per section', 'Polite follow-up after 3 days, on autopilot'],
    visual: <HeatmapVisual />,
  },
  {
    id: 'close', size: 'row', eyebrow: 'Close',
    title: 'Signature and deposit, in under two minutes on a phone.',
    body: 'Clients type and draw their signature, then pay the deposit by card. The money goes straight to your own Stripe account. Every signature is stored with a time, an IP address and a fingerprint of exactly what was signed.',
    bullets: ['Deposit paid to your Stripe, not ours', 'Tamper-evident fingerprint on every signature', 'Signed copy emailed to both sides'],
    visual: <PhoneVisual />,
  },
  {
    id: 'team', size: 'row', eyebrow: 'Workspaces',
    title: 'One brand, one price list, the whole team.',
    body: 'Invite your team, share templates and keep everyone on the same rates. See win rate, average deal size and time to sign for the business or for each person.',
    bullets: ['Owner, admin and member roles', 'Shared templates and catalogue', 'Win rate and time to sign'],
    visual: <StatsVisual />,
  },
]

export function Features() {
  return (
    <section className="sg-section" id="features" aria-label="Features">
      <div className="sg-container">
        <div className="sg-bento">
          {FEATURES.map((f, n) => (
            <article key={f.id} className={`sg-tile sg-tile-${f.size}`} aria-labelledby={`f-${f.id}`}>
              <Reveal className="sg-tile-copy" delay={(n % 2) * 0.08}>
                <span className="sg-eyebrow">{f.eyebrow}</span>
                <h2 className="sg-h3 sg-tile-title" id={`f-${f.id}`}>{f.title}</h2>
                <p className="sg-tile-body">{f.body}</p>
                <ul className="sg-bullets">
                  {f.bullets.map((b) => <li key={b}><Check size={14} strokeWidth={1.75} aria-hidden="true" />{b}</li>)}
                </ul>
              </Reveal>
              <Reveal className="sg-tile-visual" delay={(n % 2) * 0.08 + 0.12} scale>
                {f.visual}
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
