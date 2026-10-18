import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import {
  CalendarClock, Check, ChevronDown, FileDown, Landmark, Mail, MessageSquareText, Minus, Pause, Play, ShieldCheck, Split,
} from 'lucide-react'
import {
  Button, Crosshairs, EASE, MORPH, Reveal, SectionHead, StatusPill, TrialButton, Wordmark, scrollToId, track, type Status,
} from './shared'

/* ------------------------------------------------------------------ 5. Problem */

const PROBLEMS: [typeof CalendarClock, string, string][] = [
  [CalendarClock, '“I’ll chase it on Friday.”', 'Then Friday is busy, and the invoice is three weeks late before you notice.'],
  [MessageSquareText, '“How do I say this nicely?”', 'Writing the third reminder to a client you like takes longer than the work did.'],
  [Split, '“Did they pay half?”', 'Deposits, part payments and bank transfers end up in a spreadsheet nobody trusts.'],
]

export function Problem() {
  return (
    <section className="tl-section tl-band" aria-labelledby="tl-problem-h">
      <div className="tl-container">
        <SectionHead n="03" id="tl-problem-h" eyebrow="The awkward part of freelancing" title="You did the work. Now you are the debt collector." />
        <ul className="tl-problems">
          {PROBLEMS.map(([Icon, t, d], i) => (
            <Reveal as="li" key={t} delay={i * 0.08} className="tl-problem">
              <span className="tl-problem-icon"><Icon size={18} strokeWidth={1.5} aria-hidden="true" /></span>
              <h3 className="tl-h3">{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="tl-closing"><p>Late payment is a system problem. Tally is the system.</p></Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 6. Demo (a coded stand-in for the 45 second recording) */

const DURATION = 45
const SCENES: { at: number; caption: string }[] = [
  { at: 0, caption: 'Create an invoice for Northwind Coffee' },
  { at: 4, caption: 'Send it from your own domain' },
  { at: 10, caption: 'The client opens it on their phone' },
  { at: 18, caption: 'A reminder goes out at +3 days' },
  { at: 24, caption: 'They reply "paying Friday". Tally pauses until Saturday' },
  { at: 33, caption: 'They pay by bank transfer. Everything stops' },
  { at: 40, caption: 'The dashboard updates' },
]
const CHIPS: [number, string][] = [[4, '0:04 Send'], [18, '0:18 The reminder'], [33, '0:33 Paid']]
const fmt = (t: number) => `0:${String(Math.floor(t)).padStart(2, '0')}`

function DemoScene({ i }: { i: number }) {
  const rows: [string, string][] = [['Brand identity, phase 2', '$1,800.00'], ['Two revision rounds', '$600.00']]
  if (i === 0) return (
    <div className="tl-sc"><div className="tl-sc-card tl-frame">
      <span className="tl-sc-k tl-mono">New invoice · INV-0042</span>
      <b>Northwind Coffee</b>
      {rows.map(([d, a], k) => (
        <motion.div key={d} className="tl-sc-row" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + k * 0.4, duration: 0.36, ease: EASE }}><span>{d}</span><span className="tl-money">{a}</span></motion.div>
      ))}
      <div className="tl-sc-row is-total"><span>Total</span><span className="tl-money">$2,400.00</span></div>
    </div></div>
  )
  if (i === 1) return (
    <div className="tl-sc"><div className="tl-sc-card tl-frame">
      <span className="tl-sc-k">From</span>
      <b>Moss Studio &lt;accounts@billing.moss.studio&gt;</b>
      <span className="tl-sc-k">Subject</span><span>INV-0042 from Moss Studio · $2,400.00</span>
      <motion.span className="tl-sc-sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.24 }}><StatusPill status="Sent" /> PDF attached</motion.span>
    </div></div>
  )
  if (i === 2) return (
    <div className="tl-sc"><div className="tl-sc-phone">
      <span className="tl-phone-brand"><i /> Moss Studio</span>
      <b className="tl-money">$2,400.00</b><span className="tl-sc-k">Due 15 Nov</span>
      <span className="tl-phone-pay">View and pay</span>
    </div>
    <motion.span className="tl-sc-side" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, duration: 0.36, ease: EASE }}><StatusPill status="Viewed" /> 2 Nov, 10:14</motion.span></div>
  )
  if (i === 3) return (
    <div className="tl-sc"><div className="tl-sc-card tl-frame">
      <span className="tl-sc-k tl-mono">18 Nov · 9:00 client time</span>
      <b>Quick reminder: INV-0042 for $2,400.00</b>
      <span>Hi Dana, this is now three days past due. Could you take a look?</span>
      <span className="tl-sc-sent"><StatusPill status="Overdue" /> Reminder 3 of 5 sent</span>
    </div></div>
  )
  if (i === 4) return (
    <div className="tl-sc"><div className="tl-sc-card tl-frame">
      <span className="tl-sc-k">Reply from Dana</span>
      <b>“Sorry, paying Friday.”</b>
      <motion.span className="tl-paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.24 }}><i /> Promise to pay · paused until Saturday</motion.span>
    </div></div>
  )
  if (i === 5) return (
    <div className="tl-sc"><div className="tl-sc-card tl-frame">
      <span className="tl-sc-k">Payment received · bank transfer (ACH)</span>
      <b className="tl-money">$2,400.00</b>
      <span className="tl-sc-sent"><StatusPill status="Paid" /> Receipt sent · 2 reminders cancelled</span>
    </div></div>
  )
  return (
    <div className="tl-sc"><div className="tl-sc-dash">
      {[['Outstanding', '$10,080'], ['Overdue', '$750'], ['Paid this month', '$6,400']].map(([k, v], n) => (
        <motion.div key={k} className="tl-frame" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.12, duration: 0.36, ease: EASE }}><span>{k}</span><b className="tl-money">{v}</b></motion.div>
      ))}
    </div></div>
  )
}

function DemoPlayer() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (reduce || userPaused) return
    if (inView) { setPlaying(true); if (!started) { setStarted(true); track('lp_demo_played', { trigger: 'autoplay' }) } } else setPlaying(false)
  }, [inView, reduce, userPaused, started])
  useEffect(() => {
    const on = () => { setUserPaused(false); setStarted(true); setT(0); setPlaying(true) }
    window.addEventListener('tally-play', on)
    return () => window.removeEventListener('tally-play', on)
  }, [])
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setT((v) => {
      const n = v + 0.2
      if (n >= DURATION * 0.9 && v < DURATION * 0.9) track('lp_demo_completed', { seconds: Math.round(n) })
      return n >= DURATION ? 0 : n
    }), 100)
    return () => window.clearInterval(id)
  }, [playing])
  const scene = SCENES.reduce((acc, s, i) => (t >= s.at ? i : acc), 0)
  const seek = (to: number) => { setT(to); setStarted(true); if (!reduce) { setUserPaused(false); setPlaying(true) } }
  const toggle = () => { if (playing) { setPlaying(false); setUserPaused(true) } else { setUserPaused(false); setStarted(true); setPlaying(true) } }
  const poster = !started
  return (
    <div className="tl-demo">
      <figure className="tl-video tl-frame">
        <div ref={ref} className="tl-video-stage" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.div key={scene} className="tl-video-scene" initial={{ opacity: 0 }} animate={{ opacity: poster ? 0.5 : 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <DemoScene i={scene} />
            </motion.div>
          </AnimatePresence>
          {!poster && <p className="tl-caption">{SCENES[scene].caption}</p>}
        </div>
        {poster && (
          <button type="button" className="tl-play" onClick={() => { toggle(); track('lp_demo_played', { trigger: 'button' }) }} aria-label="Play the 45 second demo">
            <Play size={24} strokeWidth={1.5} />
          </button>
        )}
        <div className="tl-video-bar">
          <button type="button" className="tl-video-toggle" onClick={toggle} aria-label={playing ? 'Pause demo' : 'Play demo'}>
            {playing ? <Pause size={13} strokeWidth={1.75} /> : <Play size={13} strokeWidth={1.75} />}
          </button>
          <span className="tl-video-track"><span style={{ transform: `scaleX(${t / DURATION})` }} /></span>
          <span className="tl-video-time tl-mono">{fmt(t)} / 0:45</span>
        </div>
      </figure>
      <div className="tl-chips" role="group" aria-label="Jump to a moment in the demo">
        {CHIPS.map(([at, label]) => (
          <button key={at} type="button" className={`tl-chip ${scene === SCENES.findIndex((s) => s.at === at) ? 'is-on' : ''}`} onClick={() => { seek(at); track('lp_demo_played', { trigger: 'chip' }) }}>{label}</button>
        ))}
      </div>
      <details className="tl-transcript">
        <summary>Read the transcript <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" /></summary>
        <ol>{SCENES.map((s) => <li key={s.at}><span className="tl-mono">{fmt(s.at)}</span>{s.caption}.</li>)}</ol>
      </details>
    </div>
  )
}

export function Demo() {
  return (
    <section className="tl-section" id="demo" aria-labelledby="tl-demo-h">
      <div className="tl-container">
        <SectionHead n="04" id="tl-demo-h" center eyebrow="See it work" title="Send once. Tally handles the rest." />
        <Reveal><DemoPlayer /></Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 8. How it works */

const STEPS: [string, string][] = [
  ['Connect', 'Connect Stripe and verify your email domain. About 10 minutes, once.'],
  ['Send', 'Create an invoice, add your client, hit Send.'],
  ['Get paid', 'Tally reminds them until they pay, then sends the receipt and tells you.'],
]

const SCHEDULE = String.raw`  day    -3      0       +3      +7      +14
         o-------o-------o-------o-------o
         nudge   due     remind  firmer  final

  client replies "paying Friday 20 Nov"
         o-------o-------o . . . . . . . . . paused until 21 Nov
                                 then carries on if still unpaid

  client pays (in full) at any point
         o-------x  every later step is cancelled
                    receipt to the client, a note to you`

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduce = useReducedMotion()
  const drawn = inView || !!reduce
  return (
    <section className="tl-section tl-band" id="how" aria-labelledby="tl-how-h">
      <div className="tl-container">
        <SectionHead n="06" id="tl-how-h" eyebrow="Three steps" title="Set it up once. Then send." />
        <div ref={ref} className="tl-steps-wrap">
          <motion.span className="tl-steps-line" aria-hidden="true" initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: drawn ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.9, ease: MORPH }} />
          <ol className="tl-steps">
            {STEPS.map(([t, d], i) => (
              <motion.li
                key={t} className="tl-step tl-frame"
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
                animate={drawn ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.36, delay: reduce ? 0 : 0.15 + i * 0.3, ease: EASE }}
              >
                <span className="tl-step-n tl-mono">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="tl-h3">{t}</h3>
                <p>{d}</p>
              </motion.li>
            ))}
          </ol>
        </div>
        <Reveal className="tl-ascii tl-frame" delay={0.1}>
          <div className="tl-ascii-head"><span>How the reminder schedule behaves</span><span className="tl-mono">schedule.txt</span></div>
          <pre className="tl-mono" role="img" aria-label="Reminder schedule: a nudge 3 days before, one on the due date, then reminders 3, 7 and 14 days after. If the client replies promising to pay on 20 November, reminders pause until 21 November and carry on only if still unpaid. If the client pays in full at any point, every later step is cancelled and a receipt is sent.">{SCHEDULE}</pre>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 9. Compare */

const COLS = ['Tally', 'FreshBooks', 'Bonsai', 'Invoice Ninja', 'Chaser']
const ROWS: [string, ...string[]][] = [
  ['Starting price', '$19/month', '$23/month Lite, 5 billable clients [verify]', '$15/month Basic monthly, $9 annual [verify]', 'Free; Pro about $14/month [verify]', 'From about £199/month [verify]'],
  ['Sends from your own email domain', 'Yes', '[verify]', '[verify]', 'Yes, with your own SMTP [verify]', 'Yes [verify]'],
  ['5-step escalating reminders, editable', 'Yes', 'Reminders [verify]', 'Reminders [verify]', 'Reminders [verify]', 'Yes'],
  ['Pauses when the client replies', 'Yes', '[verify]', '[verify]', '[verify]', '[verify]'],
  ['Understands "I\'ll pay Friday"', 'Yes', 'No [verify]', 'No [verify]', 'No [verify]', '[verify]'],
  ['Card and bank payments to your own Stripe', 'Yes', 'Own processor [verify]', 'Yes [verify]', 'Yes', 'Payment portal [verify]'],
  ['Partial payments and deposits', 'Yes', 'Yes [verify]', '[verify]', 'Yes', '[verify]'],
  ['Built for', 'Freelancers and small agencies', 'Small businesses, accounting', 'Freelancers, all-in-one', 'Freelancers, self-host option', 'Finance teams with an accounting system'],
]

function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace('[verify]', '').trim()
  return (
    <>
      {text === 'Yes' && <Check size={13} strokeWidth={2} aria-hidden="true" className="tl-yes" />}
      {text === 'No' && <Minus size={13} strokeWidth={2} aria-hidden="true" className="tl-no" />}
      {text}{verify && <span className="tl-verify">{text ? ' ' : ''}to verify</span>}
    </>
  )
}

export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.5 })
  useEffect(() => { if (seen) track('lp_compare_viewed') }, [seen])
  const reduce = useReducedMotion()
  return (
    <section className="tl-section" id="compare" aria-labelledby="tl-compare-h">
      <div className="tl-container">
        <SectionHead n="07" id="tl-compare-h" eyebrow="Compare" title="Built around the follow-up as much as the invoice" />
        <p className="tl-swipe" aria-hidden="true">Swipe to compare</p>
        <div ref={ref} className="tl-table-frame tl-frame">
          <div className="tl-table-scroll">
            <table className="tl-table">
              <caption className="tl-sr">Tally compared with FreshBooks, Bonsai, Invoice Ninja and Chaser. Entry plans, checked October 2026.</caption>
              <thead>
                <tr>
                  <th scope="col"><span className="tl-sr">Feature</span></th>
                  {COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'is-us' : ''}>{i === 0 ? <span className="tl-us-chip">Tally</span> : c}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, ...vals], r) => (
                  <motion.tr key={label} initial={reduce ? { opacity: 1 } : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.2, delay: reduce ? 0 : r * 0.04 }}>
                    <th scope="row">{label}</th>
                    {vals.map((v, i) => <td key={i} className={i === 0 ? 'is-us' : ''}><Cell v={v} /></td>)}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="tl-table-note">Already use an accounting tool? Keep it. Tally exports clean CSVs for your accountant, in Xero and QuickBooks layouts.</p>
        <p className="tl-fine">Competitor prices are entry plans taken from comparison sites in October 2026. Cells marked “to verify” still need checking on each vendor's own pricing page.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 10. Testimonials slot */

export function Testimonials() {
  return (
    <section className="tl-section tl-band" aria-labelledby="tl-quotes-h">
      <div className="tl-container">
        <SectionHead n="08" id="tl-quotes-h" eyebrow="Early users" title="What freelancers say" />
        <ul className="tl-testis">
          {[0, 1, 2].map((i) => (
            <Reveal as="li" key={i} delay={i * 0.08} className="tl-testi">
              <p>Your first customer quote goes here</p>
              <span className="tl-testi-who"><i aria-hidden="true" />Name · Role · Business</span>
            </Reveal>
          ))}
        </ul>
        <p className="tl-fine">Placeholder slot, shown on this example only. The live page hides it until there are three real quotes, shared with permission.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 11. Pricing */

type Plan = { id: string; name: string; for: string; monthly: string; annualMo: string; annual: string; spoken: string; pop?: boolean; rows: [string, string][] }
const PLANS: Plan[] = [
  { id: 'solo', name: 'Solo', for: 'Freelancers', monthly: '19', annualMo: '15.83', annual: '$190/year', spoken: '15 dollars 83',
    rows: [['Seats', '1'], ['Invoices sent a month', '50'], ['Reminder sequences', '1'], ['Sending domains', '1'], ['Replies read by AI', '100 a month'], ['"Write in my voice"', '10 a month'], ['Remove "Sent with Tally"', '']] },
  { id: 'studio', name: 'Studio', for: 'Small studios', monthly: '39', annualMo: '32.50', annual: '$390/year', spoken: '32 dollars 50', pop: true,
    rows: [['Seats', '3'], ['Invoices sent a month', '250'], ['Reminder sequences', '5'], ['Sending domains', '1'], ['Replies read by AI', '500 a month'], ['"Write in my voice"', '30 a month'], ['Remove "Sent with Tally"', 'Yes']] },
  { id: 'agency', name: 'Agency', for: 'Agencies with several brands', monthly: '79', annualMo: '65.83', annual: '$790/year', spoken: '65 dollars 83',
    rows: [['Seats', '10'], ['Invoices sent a month', '750'], ['Reminder sequences', 'Unlimited'], ['Sending domains', '3'], ['Replies read by AI', '1,500 a month'], ['"Write in my voice"', '60 a month'], ['Remove "Sent with Tally"', 'Yes']] },
]
const EVERY = ['Unlimited clients', 'Card and bank payments to your Stripe', 'Recurring invoices, deposits and part payments', 'Multi-currency', 'CSV exports for your accountant']
const TRUST: [typeof Landmark, string, string][] = [
  [Landmark, 'Your money, your Stripe', 'Clients pay into your own Stripe account. Tally never holds funds.'],
  [Mail, 'Your domain', 'Invoices and reminders come from your address, verified with DNS.'],
  [ShieldCheck, 'Private by default', 'Pay links are long random codes. Nobody can browse other invoices.'],
  [FileDown, 'Your data', 'Export every invoice and payment to CSV whenever you like.'],
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const set = (a: boolean) => { if (a !== annual) { setAnnual(a); track('lp_pricing_toggle', { interval: a ? 'year' : 'month' }) } }
  const studio = PLANS[1]
  return (
    <section className="tl-section" id="pricing" aria-labelledby="tl-pricing-h">
      <div className="tl-container">
        <SectionHead n="09" id="tl-pricing-h" center eyebrow="Pricing" title="Simple plans. No cut of your payments." sub="Every plan starts with a 7 day free trial. Cancel any time from Billing." />
        <div className="tl-toggle-row">
          <div className="tl-toggle" role="radiogroup" aria-label="Billing interval">
            <motion.span className="tl-toggle-thumb" aria-hidden="true" animate={{ x: annual ? 100 : 0 }} transition={{ duration: reduce ? 0 : 0.2, ease: MORPH }} />
            {[['Monthly', false], ['Annual', true]].map(([l, a]) => (
              <button
                key={String(l)} type="button" role="radio" aria-checked={annual === a} className={annual === a ? 'is-on' : ''}
                tabIndex={annual === a ? 0 : -1}
                onClick={() => set(a as boolean)}
                onKeyDown={(e) => { if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); set(!annual); const sib = (e.currentTarget.parentElement?.querySelectorAll('button')[annual ? 0 : 1]) as HTMLButtonElement | undefined; sib?.focus() } }}
              >{l as string}</button>
            ))}
          </div>
          <span className="tl-free-chip">2 months free</span>
        </div>
        <p className="tl-sr" aria-live="polite">{annual ? `Studio, ${studio.spoken} a month, billed yearly` : 'Studio, 39 dollars a month, billed monthly'}</p>
        <ul className="tl-plans">
          {PLANS.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 0.08} className={`tl-plan ${p.pop ? 'is-pop' : ''}`}>
              <div className="tl-plan-top"><h3 className="tl-h3">{p.name}</h3><span className={`tl-pop-chip ${p.pop ? '' : 'is-hidden'}`}>Most popular</span></div>
              <p className="tl-plan-for">{p.for}</p>
              <div className="tl-price">
                <span className="tl-price-cur">$</span>
                <span className="tl-price-slot">
                  <span className="is-ghost" aria-hidden="true">{p.annualMo}<small>/mo</small></span>
                  <AnimatePresence initial={false}>
                    <motion.span key={annual ? 'a' : 'm'} className="tl-price-v" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2 }}>
                      {annual ? p.annualMo : p.monthly}<small>/mo</small>
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
              <p className="tl-price-note">{annual ? `${p.annual}, billed yearly` : 'Billed monthly'}</p>
              <Button size="md" href={`#signup?plan=${p.id}&interval=${annual ? 'year' : 'month'}`} onClick={() => track('lp_cta_clicked', { location: `pricing_${p.id}` })}>Start free trial</Button>
              <dl className="tl-plan-rows">
                {p.rows.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v === 'Yes' ? <><Check size={13} strokeWidth={2} aria-hidden="true" /> Yes</> : v || <span className="tl-dash">Not included</span>}</dd></div>
                ))}
              </dl>
              <ul className="tl-plan-every">{EVERY.map((e) => <li key={e}><Check size={13} strokeWidth={1.75} aria-hidden="true" />{e}</li>)}</ul>
            </Reveal>
          ))}
        </ul>
        <Reveal className="tl-trust-strip">
          <ul>
            {TRUST.map(([Icon, l, d]) => (
              <li key={l}><Icon size={16} strokeWidth={1.5} aria-hidden="true" /><b>{l}</b><span>{d}</span></li>
            ))}
          </ul>
        </Reveal>
        <Reveal className="tl-zero"><p>Tally takes 0% of your payments. Stripe charges its normal fee on your account.</p><p className="tl-risk">No setup fee. No contract. Your data exports to CSV any time.</p></Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 12. FAQ */

export const FAQ: [string, string][] = [
  ['Where does the money go?', 'Straight into your own Stripe account. Tally never holds your money and takes no cut. Stripe charges its normal fee on each payment.'],
  ['Do I need a Stripe account?', 'No. If you do not have one, Tally helps you create one in a few minutes. If you prefer bank transfers only, put your bank details on the invoice and record payments by hand.'],
  ['Will reminders annoy my clients?', 'They are short, polite and sent in working hours. They stop the moment the client pays or replies, and you can turn them off for any client.'],
  ['What happens when a client replies?', 'Reminders pause at once and the reply is forwarded to your inbox. If they promise a date, Tally waits until the day after before carrying on.'],
  ['Does Tally read my emails?', 'Only replies to the invoices and reminders Tally sent. It never sees your inbox.'],
  ['Why do I need to verify a domain?', 'So invoices come from your own address, which clients recognise and open. You add two or three DNS records once. Until then, Tally sends from a shared address with your business name.'],
  ['Can clients pay part of an invoice?', 'Yes, if you allow it. You set a minimum, they choose the amount, and reminders carry on for what is left.'],
  ['Which currencies can I invoice in?', 'Any currency your Stripe account accepts for cards. Bank payments depend on the currency and your country: ACH for USD, SEPA for EUR, Bacs for GBP, where Stripe supports them.'],
  ['Can I charge late fees?', 'Yes, optionally. You choose a fixed amount or a percentage, when it applies, and a cap. It is off until you turn it on.'],
  ['Does it work with my accountant?', 'Yes. Export invoices and payments as CSV, including layouts ready for Xero and QuickBooks imports. Direct sync is on the roadmap.'],
  ['Can my team use it?', 'Studio includes 3 seats and Agency 10. Everyone shares clients, invoices and reminders.'],
  ['Can I cancel?', 'Yes, in two clicks from Billing. Invoices already sent stay visible to your clients.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const reduce = useReducedMotion()
  return (
    <section className="tl-section tl-band" id="faq" aria-labelledby="tl-faq-h">
      <div className="tl-container tl-faq-grid">
        <SectionHead n="10" id="tl-faq-h" eyebrow="FAQ" title="Before you send the first one" />
        <div className="tl-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className={`tl-faq-item ${isOpen ? 'is-open' : ''}`}>
                <h3>
                  <button type="button" id={`tl-faq-q${i}`} aria-expanded={isOpen} aria-controls={`tl-faq-a${i}`} onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('lp_faq_opened', { index: i }) }}>
                    <span className="tl-faq-n tl-mono" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <span className="tl-faq-q">{q}</span>
                    <ChevronDown size={16} strokeWidth={1.75} className="tl-faq-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`tl-faq-a${i}`} role="region" aria-labelledby={`tl-faq-q${i}`} className="tl-faq-a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3, ease: MORPH }}>
                      <p>{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 13. Final CTA */

const FINAL: Status[] = ['Sent', 'Overdue', 'Paid']
export function FinalCta() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduce = useReducedMotion()
  return (
    <section className="tl-section tl-final tl-ruled" aria-labelledby="tl-final-h">
      <Crosshairs />
      <div ref={ref} className="tl-container tl-final-inner">
        <h2 className="tl-h2" id="tl-final-h">Stop chasing. Start getting paid.</h2>
        <p className="tl-sub">Send your next invoice with Tally and let the reminders take care of themselves.</p>
        <ol className="tl-final-pills" aria-label="Sent, reminded, paid">
          {FINAL.map((s, i) => (
            <motion.li key={s} initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }} animate={inView || reduce ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.6, ease: EASE }}>
              {s === 'Overdue' ? <span className="tl-status is-reminded"><i aria-hidden="true" />Reminded</span> : <StatusPill status={s} />}
              {i < FINAL.length - 1 && <span className="tl-mono tl-final-arrow" aria-hidden="true">--&gt;</span>}
            </motion.li>
          ))}
        </ol>
        <TrialButton location="final" size="lg" />
        <p className="tl-trust">7 days free. No setup fee.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 14. Footer */

const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Compare', 'Changelog']],
  ['Resources', ['Documentation', 'Invoice template', 'Late payment email templates', 'Days-to-pay calculator']],
  ['Company', ['About', 'Contact']],
  ['Legal', ['Privacy', 'Terms']],
]
const ANCHOR: Record<string, string> = { Features: 'features', Pricing: 'pricing', Compare: 'compare' }

export function Footer() {
  return (
    <footer className="tl-footer">
      <div className="tl-container">
        <div className="tl-foot-cols">
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <h2 className="tl-foot-h">{h}</h2>
              <ul>{links.map((l) => <li key={l}><a href={`#${ANCHOR[l] ?? 'top'}`} onClick={(e) => { if (ANCHOR[l]) { e.preventDefault(); scrollToId(ANCHOR[l]) } }}>{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="tl-foot-bottom">
          <Wordmark />
          <span>Invoices that chase themselves.</span>
          <span className="tl-foot-copy">© 2026 Tally</span>
        </div>
      </div>
    </footer>
  )
}
