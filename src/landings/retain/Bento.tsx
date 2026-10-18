import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Check, X, MousePointer2, Mail, CreditCard, ShieldCheck, ArrowRight } from 'lucide-react'
import { EASE, Example, MORPH, OUT, Pill, Reveal, SectionHead, useLoop } from './shared'
import { band } from './Hero'

function Tile({ span, eyebrow, title, body, bullets, label, children, delay = 0 }: {
  span: 2 | 3 | 4 | 6; eyebrow: string; title: string; body: string; bullets: string[]; label: string; children: ReactNode; delay?: number
}) {
  return (
    <Reveal className={`rt-tile rt-span-${span}`} delay={delay}>
      <div className="rt-tile-vis" role="img" aria-label={label}>{children}</div>
      <div className="rt-tile-text">
        <span className="rt-kicker">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{body}</p>
        <ul className="rt-ticks">{bullets.map((b) => <li key={b}><Check size={14} aria-hidden="true" />{b}</li>)}</ul>
      </div>
    </Reveal>
  )
}

function useCount(to: number, start: boolean, ms = 800) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!start) return
    if (reduce) { setV(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / ms); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, start, ms, reduce])
  return reduce ? to : v
}

/* 7.1 Scores as stacked signal bars with the top reason in plain words. */
const SCORES: { n: string; parts: number[]; why: string }[] = [
  { n: 'Northwind', parts: [60, 22], why: 'Scheduled a cancel at period end' },
  { n: 'Acme Ltd', parts: [25, 25, 15, 13], why: 'Card ends before the 3 Nov renewal' },
  { n: 'Globex', parts: [35, 19], why: 'Renewal payment failed on 14 Oct' },
  { n: 'Initech', parts: [25, 16], why: 'Trial ends in 3 days, 2 logins' },
  { n: 'Umbrella Co', parts: [12], why: 'No warning signs' },
]
function ScoreRow({ n, parts, why, i, on }: { n: string; parts: number[]; why: string; i: number; on: boolean }) {
  const total = parts.reduce((a, b) => a + b, 0)
  const v = useCount(total, on, 700 + i * 120)
  const [tone, label] = band(total)
  return (
    <div className="rt-score-row">
      <span className="rt-score-name">{n}</span>
      <span className="rt-stack" aria-hidden="true">
        {parts.map((p, k) => (
          <motion.i key={k} className={`rt-stack-${k}`} style={{ width: `${p}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: on ? 1 : 0 }} transition={{ duration: 0.5, delay: i * 0.08 + k * 0.12, ease: MORPH }} />
        ))}
      </span>
      <span className="rt-score-v"><b className="rt-mono">{v}</b><Pill tone={tone} dot>{label}</Pill></span>
      <span className="rt-score-why">{why}</span>
    </div>
  )
}
function ScoresVis() {
  const ref = useRef<HTMLDivElement>(null)
  const on = useInView(ref, { amount: 0.4, once: true })
  return (
    <div ref={ref} className="rt-scores">
      <div className="rt-scores-head"><span className="rt-mono">risk 0 to 100</span><span className="rt-live"><i className="rt-dot rt-dot-live" />Rescored after every Stripe event</span></div>
      {SCORES.map((s, i) => <ScoreRow key={s.n} {...s} i={i} on={on} />)}
    </div>
  )
}

/* 7.2 Failed payment: email, the update-card page, then the invoice is paid. */
function RecoverVis() {
  const { ref, step } = useLoop(5, 1300, 4)
  return (
    <div ref={ref} className="rt-recover">
      <div className={`rt-mail${step >= 2 ? ' is-back' : ''}`}>
        <span className="rt-mail-from"><Mail size={12} /> Acme Analytics · billing</span>
        <b>Your payment didn't go through</b>
        <span className="rt-faint">Update your card to keep your plan running.</span>
        <span className={`rt-mail-btn${step === 1 ? ' is-press' : ''}`}>Update card</span>
      </div>
      <motion.div className="rt-card-page" initial={false} animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 10 }} transition={{ duration: 0.36, ease: EASE }}>
        <span className="rt-label">Update your card</span>
        <span className="rt-field rt-mono"><CreditCard size={12} /> {step >= 3 ? '•••• 4242   09/29' : '•••• ____'}</span>
        <span className="rt-paid" style={{ visibility: step >= 4 ? 'visible' : 'hidden' }}><Pill tone="low" dot>Invoice paid</Pill><b className="rt-mono">+$480</b></span>
      </motion.div>
      <motion.span className="rt-cursor" initial={false} animate={{ x: step === 1 ? 0 : 40, y: step === 1 ? 0 : 30, opacity: step <= 1 ? 1 : 0 }} transition={{ duration: 0.4, ease: EASE }}><MousePointer2 size={15} /></motion.span>
    </div>
  )
}

/* 7.3 Cancel flow: a reason, one offer that fits, and a clear way out. */
const REASONS = ['Too expensive', 'Not using it enough', 'Missing a feature', 'Something else']
function CancelVis() {
  const { ref, step } = useLoop(5, 1200, 4)
  return (
    <div ref={ref} className="rt-cancel">
      <p className="rt-label">Why are you leaving?</p>
      <div className="rt-reasons">
        {REASONS.map((r) => <span key={r} className={`rt-reason-opt${step >= 1 && r === 'Not using it enough' ? ' is-on' : ''}`}><i />{r}</span>)}
      </div>
      <motion.div className="rt-offer is-small" initial={false} animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 6 }} transition={{ duration: 0.3, ease: OUT }}>
        <b>Pause for 2 months instead?</b>
        <span className="rt-offer-row">
          <span className={`rt-offer-btn${step >= 3 ? ' is-done' : ''}`}>{step >= 3 ? <><Check size={12} /> Paused</> : 'Pause my plan'}</span>
          <span className="rt-cancel-link">Cancel anyway</span>
        </span>
      </motion.div>
    </div>
  )
}

/* 7.4 Win-back: the one ASCII piece, plus three drafted emails. */
const FLOW = `customer cancels in Stripe
        │
        ▼
Claude drafts 3 emails
from their usage + reason
        │
        ├─ day 3  ──▶ email 1
        ├─ day 10 ──▶ email 2
        └─ day 30 ──▶ email 3

stops the moment they
  ├─ come back    ──▶ won-back MRR counted
  └─ unsubscribe  ──▶ nothing more is sent`
function WinbackVis() {
  const { ref, step } = useLoop(6, 1100, 5)
  const days = ['Day 3', 'Day 10', 'Day 30']
  return (
    <div ref={ref} className="rt-winback">
      <pre className="rt-ascii" aria-label="Win-back flow: when a customer cancels in Stripe, Claude drafts three emails from their usage and reason, sent on day 3, day 10 and day 30. The sequence stops the moment they come back, and the won-back MRR is counted, or the moment they unsubscribe.">{FLOW}</pre>
      <div className="rt-drafts">
        {days.map((d, i) => {
          const drafted = step > i
          const approved = step >= 5 || (step === 4 && i === 0)
          return (
            <div key={d} className={`rt-draft${drafted ? ' is-on' : ''}`}>
              <span className="rt-draft-top"><span className="rt-mono">{d}</span>{approved ? <Pill tone="accent" dot>Approved</Pill> : drafted ? <Pill tone="grey">Draft</Pill> : <span className="rt-typing" aria-hidden="true"><i /><i /><i /></span>}</span>
              <span className="rt-draft-lines" aria-hidden="true">
                <motion.i initial={false} animate={{ scaleX: drafted ? 1 : 0.2 }} transition={{ duration: 0.5, ease: MORPH }} style={{ width: '90%' }} />
                <motion.i initial={false} animate={{ scaleX: drafted ? 1 : 0.1 }} transition={{ duration: 0.5, delay: 0.08, ease: MORPH }} style={{ width: '70%' }} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* 7.5 Dashboard tiles and saved vs churned bars. */
const WEEKS: [number, number][] = [[620, 180], [540, 260], [700, 310], [480, 340], [520, 420], [410, 460], [380, 520], [350, 540]]
function DashVis() {
  const ref = useRef<HTMLDivElement>(null)
  const on = useInView(ref, { amount: 0.4, once: true })
  const tiles: [string, number][] = [['MRR at risk', 3240], ['Saved MRR', 1240], ['Recovered payments', 860], ['Won-back MRR', 390]]
  return (
    <div ref={ref} className="rt-dash">
      <div className="rt-dash-tiles">{tiles.map(([l, v], i) => <DashTile key={l} l={l} v={v} on={on} i={i} />)}</div>
      <div className="rt-chart">
        <div className="rt-chart-head"><b>Saved vs churned MRR</b><span className="rt-legend"><i className="is-churn" />Churned<i className="is-saved" />Saved</span></div>
        <div className="rt-bars">
          {WEEKS.map(([c, s], i) => (
            <span key={i} className="rt-bar-pair">
              <motion.i className="is-churn" style={{ height: `${c / 7.2}%` }} initial={{ scaleY: 0 }} animate={{ scaleY: on ? 1 : 0 }} transition={{ duration: 0.5, delay: i * 0.06, ease: MORPH }} />
              <motion.i className="is-saved" style={{ height: `${s / 7.2}%` }} initial={{ scaleY: 0 }} animate={{ scaleY: on ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.06, ease: MORPH }} />
            </span>
          ))}
        </div>
      </div>
      <Example />
    </div>
  )
}
function DashTile({ l, v, on, i }: { l: string; v: number; on: boolean; i: number }) {
  const n = useCount(v, on, 700 + i * 100)
  return <div className="rt-dash-tile"><small>{l}</small><b className="rt-mono">${n.toLocaleString('en-US')}</b></div>
}

export function Features() {
  return (
    <section className="rt-section rt-band" id="features">
      <div className="rt-grid-bg is-soft" aria-hidden="true" />
      <div className="rt-rail">
        <SectionHead eyebrow="Features" title="What Retain does" center />
        <div className="rt-bento">
          <Tile span={4} eyebrow="Risk score" title="Know who's leaving this month, and why"
            body="Retain scores every customer from 0 to 100 using failed payments, expiring cards, downgrades, seat cuts, trials ending and drops in usage. Each point comes with a sentence you can read in two seconds."
            bullets={['Updated every night and after every Stripe event', 'One-line AI summary with a suggested action', 'Score accuracy shown every month']}
            label="Five customers with stacked signal bars adding up to a risk score from 0 to 100, each with a plain-words top reason"><ScoresVis /></Tile>
          <Tile span={2} delay={0.025} eyebrow="Recovery" title="Win back failed payments in your brand"
            body="When a renewal fails, Retain sends short emails from your product name with one button. Your customer updates their card on a clean page and the invoice is paid straight away."
            bullets={['Smart Retries checklist with exact Stripe settings', 'Card-expiring reminders before the charge fails', 'Recovered revenue tracked per case']}
            label="A failed payment email with an update card button, the update-card page, and an invoice paid tag"><RecoverVis /></Tile>
          <Tile span={2} eyebrow="Cancel flow" title="One fair offer before they go"
            body="Swap the one-click cancel for a short page: why are you leaving, one offer that fits the reason, and a clear way out. Pauses, discounts and downgrades are applied in Stripe the moment they accept."
            bullets={['Signed requests, so nobody can game your discounts', 'Exit interview tagged by AI', 'Never more than two clicks to cancel']}
            label="A cancel page: the customer picks not using it enough, sees pause for 2 months instead, and accepts; a cancel anyway link stays visible"><CancelVis /></Tile>
          <Tile span={4} delay={0.025} eyebrow="Win-back" title="Personal win-back emails, written from what they used"
            body="Claude drafts three short emails for each cancelled customer from their own usage and reason. Approve them in a click, or let them send. Stops the moment they come back or unsubscribe."
            bullets={['Day 3, 10 and 30 by default', 'Your offer, your signature, your tone', 'Won-back MRR counted for you']}
            label="A text diagram of the win-back flow beside three drafted emails for day 3, day 10 and day 30 being approved"><WinbackVis /></Tile>
          <Tile span={6} eyebrow="Dashboard" title="The numbers that pay for Retain"
            body="MRR at risk, saved MRR, recovered payments, won-back MRR and churn reasons on one page, with the exact formula behind each number."
            bullets={['Weekly digest email on Monday', 'Reasons by MRR, not only by count', 'Export to CSV']}
            label="Dashboard tiles for MRR at risk, saved MRR, recovered payments and won-back MRR, and a weekly saved versus churned MRR bar chart, marked example data"><DashVis /></Tile>
        </div>
      </div>
    </section>
  )
}

/* 7.6 Trust. */
const CAN = ['Read customers, subscriptions, invoices and payment method expiry dates', 'Pause a subscription when a customer accepts a pause', 'Add a discount you set up when a customer accepts it', 'Switch a customer to a cheaper price you chose', 'Schedule a cancel at the end of the period when a customer confirms']
const CANT = ['Create charges or refunds', 'Move money or change payouts', 'See full card numbers', 'Change your Stripe settings', 'Do anything after you uninstall']
export function Trust() {
  return (
    <section className="rt-section" id="security">
      <div className="rt-rail">
        <Reveal className="rt-trust-box">
          <div className="rt-trust-head">
            <span className="rt-eyebrow"><ShieldCheck size={13} /> Security</span>
            <h2>You see every permission before you install</h2>
          </div>
          <div className="rt-trust-cols">
            <div>
              <h3>Retain can</h3>
              <ul>{CAN.map((c) => <li key={c}><Check size={14} className="rt-can" aria-hidden="true" />{c}</li>)}</ul>
            </div>
            <div>
              <h3>Retain can't</h3>
              <ul>{CANT.map((c) => <li key={c}><X size={14} className="rt-cant" aria-hidden="true" />{c}</li>)}</ul>
            </div>
          </div>
          <p className="rt-trust-note">Access uses short-lived tokens from Stripe's own app install. Uninstall in Stripe &gt; Settings &gt; Installed apps and access stops at once.</p>
          <a className="rt-link" href="/docs/stripe-permissions">Read how Retain uses Stripe <ArrowRight size={14} /></a>
        </Reveal>
      </div>
    </section>
  )
}

