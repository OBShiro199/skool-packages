import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, ChevronDown, Eye, FileClock, Minus, Receipt } from 'lucide-react'
import { EASE, MORPH, Reveal, SealMark, SectionHead, StatusPill, TrialButton, track } from './shared'

/* ---------- 5. Problem ---------- */
const PROBLEMS = [
  { icon: FileClock, title: '"I will write it tonight."', body: "Three hours rebuilding last month's proposal, with the old client's name still in the footer." },
  { icon: Eye, title: '"Did they even open it?"', body: 'A PDF in an inbox tells you nothing. You find out it was a no when they stop replying.' },
  { icon: Receipt, title: '"Now send the invoice."', body: 'Signed by email, invoiced separately, deposit chased by hand. Every step is a chance to stall.' },
]

export function Problem() {
  return (
    <section className="sg-section" aria-label="The problem">
      <div className="sg-container">
        <SectionHead eyebrow="The gap that loses deals" title="The call went great. The proposal went out five days later." />
        <div className="sg-problems">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.title} className="sg-problem" delay={i * 0.08}>
              <p.icon size={20} strokeWidth={1.5} className="sg-problem-icon" aria-hidden="true" />
              <h3 className="sg-h3">{p.title}</h3>
              <p>{p.body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="sg-closing"><p>The first credible proposal in the inbox usually wins.</p></Reveal>
      </div>
    </section>
  )
}

/* ---------- 8. How it works, with the one ASCII diagram ---------- */
const STEPS = [
  { n: '1', title: 'Upload the call', body: 'Drop in the recording, record in the browser, or import from Zoom or Meet.' },
  { n: '2', title: 'Check and send', body: 'Fix the brief, tweak the draft, send a link. About 10 minutes.' },
  { n: '3', title: 'Get signed and paid', body: 'They read, sign and pay the deposit. You get an email at each step.' },
]

const ASCII = String.raw`  call.m4a   45 min, two speakers
      │
      ▼
  ┌───────────────────┐
  │ 1  transcribe     │  who said what
  │ 2  read the call  │  goals, pains, budget
  └─────────┬─────────┘
            ▼
  ┌───────────────────┐
  │ 3  draft          │◀─ your rate card
  │    good, better,  │  totals worked
  │    best           │  out by Signet,
  └─────────┬─────────┘  not by the AI
            ▼
     you check it, ~10 min
            ▼
  sent ─▶ viewed ─▶ signed ─▶ paid
  └─ an email to you at each step`

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  const reduce = useReducedMotion()
  const drawn = inView || !!reduce
  return (
    <section className="sg-section sg-band" id="how" aria-label="How it works">
      <div className="sg-container">
        <SectionHead eyebrow="Three steps" title="From call to deposit" />
        <div className="sg-how" ref={ref}>
          <div className="sg-steps">
            {(['h', 'v'] as const).map((d) => (
              <motion.span
                key={d}
                className={`sg-steps-line sg-steps-line-${d}`}
                aria-hidden="true"
                initial={{ clipPath: reduce ? 'inset(0 0 0 0)' : d === 'h' ? 'inset(0 100% 0 0)' : 'inset(0 0 100% 0)' }}
                animate={{ clipPath: drawn ? 'inset(0 0% 0% 0)' : d === 'h' ? 'inset(0 100% 0 0)' : 'inset(0 0 100% 0)' }}
                transition={{ duration: reduce ? 0 : 0.9, ease: MORPH }}
              />
            ))}
            <ol>
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.n}
                  className="sg-step"
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
                  animate={drawn ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: reduce ? 0 : 0.36, delay: reduce ? 0 : i * 0.3, ease: EASE }}
                >
                  <span className="sg-step-n sg-num" aria-hidden="true">{s.n}</span>
                  <div className="sg-step-card sg-paper">
                    <h3 className="sg-h3">{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
          <Reveal className="sg-ascii-wrap" delay={0.12}>
            <figure className="sg-ascii">
              <figcaption>What happens to a 45 minute call</figcaption>
              <pre role="img" aria-label="Diagram: the call is transcribed and read for goals, pains and budget, then drafted with three options priced from your rate card. You check it in about 10 minutes and send it. You get an email when it is sent, viewed, signed and paid.">{ASCII}</pre>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ---------- 9. Comparison ---------- */
const VENDORS = ['Signet', 'PandaDoc', 'Proposify', 'Qwilr', 'Better Proposals']
const ROWS: [string, string[]][] = [
  ['Starting price', ['$49/month (1 seat)', '$19/user/mo annual [verify]', '$19/user/mo annual, $29 monthly [verify]', '$35/user/mo annual [verify]', '$13 to $19/user/mo [verify]']],
  ['Drafts the proposal from a call recording', ['Yes', 'No', 'No', 'No', 'No']],
  ['Pulls goals, pains and budget out of the call', ['Yes', 'No', 'No', 'No', 'No']],
  ['Prices from your rate card, three options', ['Yes', 'Pricing tables', 'Pricing tables', 'Pricing tables', 'Pricing tables']],
  ['AI rewrite per section', ['Yes', 'AI assistant [verify]', 'AI assistant [verify]', 'AI assistant [verify]', '[verify]']],
  ['View tracking with time per section', ['Yes', 'Yes', 'Yes', 'Yes', 'Yes']],
  ['E-signature', ['Yes', 'Yes', 'Yes', 'Yes', 'Yes']],
  ['Deposit to your own Stripe account', ['Yes', 'Yes (payments add-on) [verify]', 'Yes [verify]', 'Yes [verify]', 'Yes [verify]']],
  ['Automatic follow-up after 3 days', ['Yes', 'Reminders [verify]', 'Reminders [verify]', '[verify]', 'Reminders [verify]']],
]

function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace('[verify]', '').trim()
  const body = text === 'Yes'
    ? <><Check size={14} strokeWidth={2} className="sg-yes" aria-hidden="true" /> Yes</>
    : text === 'No'
      ? <><Minus size={14} strokeWidth={1.75} className="sg-no" aria-hidden="true" /> No</>
      : text
  return (
    <>
      {body}
      {verify && !text && 'Not verified'}
      {verify && <sup className="sg-verify" title="Not yet verified on the vendor's pricing page">*</sup>}
    </>
  )
}

export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduce = useReducedMotion()
  useEffect(() => { if (inView) track('lp_compare_viewed') }, [inView])
  return (
    <section className="sg-section" id="compare" aria-label="Compare">
      <div className="sg-container">
        <SectionHead eyebrow="Compare" title="The only one that writes the first draft from your call" />
        <p className="sg-swipe" aria-hidden="true">Swipe to compare →</p>
        <div className="sg-table-wrap sg-frame" ref={ref} tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
          <table className="sg-table">
            <thead>
              <tr>
                <th scope="col"><span className="sg-sr">Feature</span></th>
                {VENDORS.map((v, i) => (
                  <th key={v} scope="col" className={i === 0 ? 'is-us' : ''}>
                    {i === 0 ? <span className="sg-us-chip"><SealMark size={14} /> Signet</span> : v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, cells], r) => (
                <motion.tr
                  key={label}
                  initial={{ opacity: reduce ? 1 : 0 }}
                  animate={inView || reduce ? { opacity: 1 } : {}}
                  transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : r * 0.04, ease: EASE }}
                >
                  <th scope="row">{label}</th>
                  {cells.map((c, i) => <td key={i} className={i === 0 ? 'is-us' : ''}><Cell v={c} /></td>)}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sg-table-note">
          Signet is cheaper for small teams because you pay per workspace, not per seat. Studio covers 3 people for $99.
        </p>
        <p className="sg-footnote">* Entry plans, per user per month, checked Oct 2026 from comparison sites. Confirm on each vendor's pricing page before launch.</p>
      </div>
    </section>
  )
}

/* ---------- 10. Testimonials slot (development only until there are 3 real quotes) ---------- */
const TESTIMONIALS: { quote: string; name: string; role: string; company: string }[] = []

export function Testimonials() {
  if (TESTIMONIALS.length < 3 && !import.meta.env.DEV) return null
  return (
    <section className="sg-section sg-band" aria-label="Early users">
      <div className="sg-container">
        <SectionHead eyebrow="Early users" title="What people are saying" />
        <div className="sg-quotes">
          {[0, 1, 2].map((i) => (
            <Reveal key={i} className="sg-quote is-placeholder" delay={i * 0.08}>
              <p className="sg-quote-text">Your first customer quote goes here</p>
              <p className="sg-quote-eg">For example: "Sent the proposal 40 minutes after the call. Signed the next morning."</p>
              <div className="sg-quote-who">
                <span className="sg-avatar" aria-hidden="true" />
                <span><b>Name</b><em>Role, company</em></span>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="sg-dev-note">Placeholder cards show in development only. In production this section stays hidden until it has 3 real quotes.</p>
      </div>
    </section>
  )
}

/* ---------- 11. Pricing ---------- */
type Plan = {
  id: string; name: string; monthly: number; yearly: number; perMonthAnnual: string; for: string
  seats: string; proposals: string; minutes: string; rewrites: string; zoom: boolean; brandRemove: boolean; perPerson: boolean; brand: string
}
const PLANS: Plan[] = [
  { id: 'solo', name: 'Solo', monthly: 49, yearly: 490, perMonthAnnual: '40.83', for: 'Freelancers and consultants', seats: '1', proposals: '10 a month', minutes: '600 a month', rewrites: '100 a month', zoom: false, brandRemove: false, perPerson: false, brand: 'Logo and 1 colour' },
  { id: 'studio', name: 'Studio', monthly: 99, yearly: 990, perMonthAnnual: '82.50', for: 'Small agencies', seats: '3', proposals: '25 a month', minutes: '1,500 a month', rewrites: '250 a month', zoom: true, brandRemove: true, perPerson: true, brand: 'Brand kit' },
  { id: 'agency', name: 'Agency', monthly: 199, yearly: 1990, perMonthAnnual: '165.83', for: 'Growing agencies', seats: '10', proposals: '50 a month', minutes: '3,000 a month', rewrites: '500 a month', zoom: true, brandRemove: true, perPerson: true, brand: 'Brand kit' },
]

function Price({ value }: { value: string }) {
  const reduce = useReducedMotion()
  return (
    <span className="sg-price-slot">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="sg-price-val sg-num"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: MORPH }}
        >
          ${value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const set = (a: boolean) => { setAnnual(a); track('lp_pricing_toggle', { interval: a ? 'year' : 'month' }) }
  return (
    <section className="sg-section" id="pricing" aria-label="Pricing">
      <div className="sg-container">
        <SectionHead eyebrow="Pricing" title="Pay per workspace, not per seat" sub="Every plan starts with a 7 day free trial. Cancel any time from Billing." center />
        <div className="sg-toggle-row">
          <div className="sg-toggle" role="radiogroup" aria-label="Billing interval">
            <button type="button" role="radio" aria-checked={!annual} className={!annual ? 'is-on' : ''} onClick={() => set(false)}>Monthly</button>
            <button type="button" role="radio" aria-checked={annual} className={annual ? 'is-on' : ''} onClick={() => set(true)}>Annual</button>
            <motion.span className="sg-toggle-thumb" aria-hidden="true" initial={false} animate={{ x: annual ? '100%' : '0%' }} transition={{ duration: 0.3, ease: MORPH }} />
          </div>
          <span className="sg-free-chip">2 months free</span>
        </div>
        <div className="sg-plans">
          {PLANS.map((p, i) => {
            const pop = p.id === 'studio'
            const rows: [string, string | boolean][] = [
              ['Seats', p.seats], ['Proposals from calls', p.proposals], ['Call minutes', p.minutes], ['AI rewrites', p.rewrites],
              ['Zoom and Meet import', p.zoom], ['Remove "Sent with Signet"', p.brandRemove], ['Per-person analytics', p.perPerson],
            ]
            return (
              <Reveal key={p.id} className={`sg-plan sg-plan-${p.id} ${pop ? 'is-pop' : ''}`} delay={i * 0.08}>
                <div className="sg-plan-head">
                  <h3 className="sg-h3">{p.name}</h3>
                  <span className={`sg-pop-chip ${pop ? '' : 'is-hidden'}`} aria-hidden={!pop}>Most popular</span>
                </div>
                <p className="sg-plan-for">{p.for}</p>
                <p className="sg-plan-price">
                  <Price value={annual ? p.perMonthAnnual : String(p.monthly)} />
                </p>
                <p className="sg-plan-bill sg-num">{annual ? `per month, $${p.yearly.toLocaleString('en-US')}/year billed yearly` : 'per month, billed monthly'}</p>
                <TrialButton location={`pricing_${p.id}`} plan={p.id} />
                <dl className="sg-plan-rows">
                  {rows.map(([k, v]) => (
                    <div key={k} className={v === false ? 'is-off' : ''}>
                      <dt>{k}</dt>
                      <dd>{v === true ? <><Check size={14} strokeWidth={2} aria-hidden="true" /><span className="sg-sr">Included</span></> : v === false ? <><Minus size={14} aria-hidden="true" /><span className="sg-sr">Not included</span></> : v}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="sg-plan-incl">
                  {['Unlimited blank and template proposals', 'E-signature and deposits', 'View tracking and follow-ups', p.brand].map((x) => (
                    <li key={x}><Check size={14} strokeWidth={1.75} aria-hidden="true" />{x}</li>
                  ))}
                </ul>
              </Reveal>
            )
          })}
        </div>
        <Reveal className="sg-roi"><p>Win one extra $5,000 project a quarter and Studio pays for itself 15 times over.</p></Reveal>
        <p className="sg-risk">No setup fee. No contract. Deposits go straight to your Stripe.</p>
      </div>
    </section>
  )
}

/* ---------- 12. FAQ ---------- */
export const FAQ: [string, string][] = [
  ['Do I need to record my calls?', 'Yes, Signet works from a recording. Use Zoom or Google Meet cloud recording, a phone voice memo, or the recorder built into Signet. Always tell the other people on the call that you are recording.'],
  ['Which meeting tools work?', 'Any. If you can get an audio or video file, you can upload it. Zoom and Google Meet recordings can also be imported directly on Studio and Agency.'],
  ['Will it make up prices?', 'No. It only prices with the services and rules in your catalogue, and the totals are calculated by Signet, not the AI.'],
  ['How accurate is the transcript?', 'Very good on clear audio, and it separates speakers. You review the brief before anything is drafted, so you can fix any detail it misheard.'],
  ['Where does the deposit money go?', 'Straight into your own Stripe account. Signet never holds your money and takes no cut. Stripe charges its normal card fee.'],
  ['Is the e-signature legally binding?', 'Typed and drawn e-signatures with a timestamp, IP address and a fingerprint of the signed content are widely accepted for service agreements. If your industry needs a specific signature standard, check before you rely on it.'],
  ['What does tamper-evident mean?', 'When a client signs, we store a SHA-256 fingerprint of exactly what they saw. Both sides get it by email. Change one word and the fingerprint no longer matches.'],
  ['Can my team use it?', 'Yes. Studio includes 3 seats and Agency 10. Everyone shares your brand, templates and price list.'],
  ['What happens when I hit a limit?', 'You get a warning at 80%. At 100% you can still edit and send proposals; drafting from new calls and rewrites pause until next month or until you upgrade.'],
  ["Is my client's data safe?", 'Recordings and proposals are private to your workspace. Share links use long random tokens, and public pages only ever show the version you sent.'],
  ['Can I cancel?', 'Yes, in two clicks from Billing. You keep access until the end of the period you paid for.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const reduce = useReducedMotion()
  return (
    <section className="sg-section sg-band" id="faq" aria-label="FAQ">
      <div className="sg-container sg-faq-grid">
        <SectionHead eyebrow="FAQ" title="Frequently asked questions" />
        <div className="sg-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className={`sg-faq-item ${isOpen ? 'is-open' : ''}`}>
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('lp_faq_opened', { index: i }) }}
                  >
                    <span>{q}</span>
                    <ChevronDown size={16} strokeWidth={1.5} className="sg-faq-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-a-${i}`}
                      role="region"
                      aria-labelledby={`faq-q-${i}`}
                      className="sg-faq-a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: MORPH }}
                    >
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

/* ---------- 13. Final CTA ---------- */
export function FinalCta() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const statuses = ['Sent', 'Viewed', 'Signed'] as const
  return (
    <section className="sg-section sg-tint sg-final" aria-label="Start your trial">
      <div className="sg-container sg-final-inner">
        <div className="sg-final-pills" ref={ref} aria-label="Sent, viewed, signed" role="img">
          {statuses.map((s, i) => (
            <motion.span
              key={s}
              initial={{ opacity: reduce ? 1 : 0.25 }}
              animate={{ opacity: inView || reduce ? 1 : 0.25 }}
              transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.2 + i * 0.6, ease: EASE }}
            >
              <StatusPill status={s} />
            </motion.span>
          ))}
        </div>
        <Reveal className="sg-final-copy">
          <h2 className="sg-h2">Send the next proposal before the client cools off.</h2>
          <p className="sg-sub">Upload your last discovery call and see the draft in about 10 minutes.</p>
          <TrialButton location="final" size="lg" />
          <p className="sg-trust">7 days free. No setup fee.</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 14. Footer ---------- */
const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Compare', 'Changelog']],
  ['Resources', ['Documentation', 'Proposal templates', 'Discovery call checklist']],
  ['Company', ['About', 'Contact']],
  ['Legal', ['Privacy', 'Terms']],
]
const ANCHOR: Record<string, string> = { Features: '#features', Pricing: '#pricing', Compare: '#compare' }

export function Footer() {
  return (
    <footer className="sg-footer">
      <div className="sg-container">
        <div className="sg-foot-cols">
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <p className="sg-foot-h">{h}</p>
              <ul>{links.map((l) => <li key={l}><a href={ANCHOR[l] ?? '#top'}>{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="sg-foot-bottom">
          <span className="sg-wordmark"><SealMark /> Signet</span>
          <span>Made for people who sell their time.</span>
          <span className="sg-num">© {new Date().getFullYear()} Signet</span>
        </div>
      </div>
    </footer>
  )
}
