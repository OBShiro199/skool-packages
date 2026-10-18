import { useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight, Calculator, CalendarCheck, Check, ChevronDown, Layers, Minus, PhoneMissed, X } from 'lucide-react'
import { EASE, LiveDot, MORPH, Reveal, Ticks, TrialButton, Wordmark, scrollToId, track, useCount } from './shared'

/* ---------- 4. Logo strip ---------- */
const SEGMENTS = ['Recruitment agencies', 'Marketing agencies', 'Dev studios', 'B2B SaaS', 'Wholesale', 'Consultancies']
export function LogoStrip() {
  return (
    <section className="et-logos" aria-labelledby="et-logos-h">
      <p id="et-logos-h" className="et-logos-cap">Built for teams that sell by phone</p>
      <ul className="et-logos-row">
        {SEGMENTS.map((s, i) => (
          <Reveal as="li" key={s} delay={i * 0.04}>{s}</Reveal>
        ))}
      </ul>
    </section>
  )
}

/* ---------- 5. Problem ---------- */
const PAINS = [
  { Icon: Calculator, t: 'Per-seat maths that never stops.', b: 'A 6 person team on a mid-tier CRM plus a dialer pays $500 to $900 a month before anyone sells anything.' },
  { Icon: PhoneMissed, t: 'Calls that never get logged.', b: 'Reps dial from their mobiles and forget the notes, so the pipeline is a guess.' },
  { Icon: Layers, t: 'Twenty tabs to do one thing.', b: 'Big CRMs bury "call, note, next step" under menus your team does not need.' },
]
export function Problem() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const v = useCount(149, 600, inView)
  return (
    <section className="et-section" aria-labelledby="et-problem-h">
      <div className="et-wrap">
        <Reveal className="et-head">
          <h2 id="et-problem-h" className="et-h2">You pay for a CRM. Then you pay again to call.</h2>
          <p className="et-sub">Most small sales teams run a per-seat CRM and a per-seat dialer that never agree. The calls happen in one app, the notes in another, and the manager sees neither.</p>
        </Reveal>
        <div className="et-pains">
          {PAINS.map(({ Icon, t, b }, i) => (
            <Reveal key={t} delay={i * 0.04} className="et-pain">
              <span className="et-icon-box" aria-hidden="true"><Icon size={16} strokeWidth={1.5} /></span>
              <h3 className="et-pain-t">{t}</h3>
              <p>{b}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="et-stat" ref={ref}>
            <span className="et-stat-num et-bignum" aria-hidden="true">${v}</span>
            <p><strong>A 6 person team on Etcher pays $149 a month, calling included.</strong></p>
            <a href="#pricing" className="et-link" onClick={(e) => { e.preventDefault(); scrollToId('pricing') }}>See the maths <ArrowRight size={14} aria-hidden="true" /></a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 8. How it works (with the page's one ASCII diagram) ---------- */
const STEPS = [
  { t: 'Import your leads.', b: 'CSV from HubSpot, Pipedrive, a spreadsheet or LinkedIn exports.' },
  { t: 'Buy a number.', b: 'Pick a local US or UK number and assign it to each rep.' },
  { t: 'Invite the team and call.', b: 'Unlimited seats. Everyone dials from the browser today.' },
]
const ASCII = String.raw`  click  +1 (415) 555 0142
          |
          v
  +----------------+   rings from the browser
  |   softphone    |-- on your local number
  +-------+--------+
          |  04:12  connected  rec *
          v
  +----------------+   outcome, note, task
  |    wrap-up     |-- three clicks
  +-------+--------+
          |
          v
  timeline  call 4:12  Meeting booked
  deal      Proposal ---> Negotiation`
export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  return (
    <section className="et-section" id="how" aria-labelledby="et-how-h">
      <div className="et-wrap">
        <Reveal className="et-head">
          <h2 id="et-how-h" className="et-h2">Live this afternoon.</h2>
        </Reveal>
        <ol className="et-steps" ref={ref}>
          {STEPS.map((s, i) => (
            <li key={s.t} className="et-step">
              <div className="et-step-top">
                <motion.span className="et-step-n et-num" initial={reduce ? false : { opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.3, delay: i * 0.08 }}>{i + 1}</motion.span>
                {i < STEPS.length - 1 && (
                  <motion.span className="et-connector" aria-hidden="true" initial={reduce ? false : { scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}} transition={{ duration: 0.5, delay: 0.12 + i * 0.12, ease: MORPH }} />
                )}
              </div>
              <h3 className="et-h3">{s.t}</h3>
              <p className="et-body">{s.b}</p>
            </li>
          ))}
        </ol>
        <Reveal className="et-ascii-row">
          <figure className="et-ascii">
            <pre aria-hidden="true">{ASCII}</pre>
            <figcaption className="et-sr">Diagram: clicking a phone number rings the softphone in the browser, the call connects and records, the wrap-up takes three clicks, and the call lands on the timeline while the deal moves from Proposal to Negotiation.</figcaption>
          </figure>
          <div className="et-ascii-copy">
            <span className="et-kicker">What happens after step 3</span>
            <p className="et-body">Nobody types a call log. The click starts it, the hang-up finishes it, and the outcome you pick lands on the person, the company and the deal.</p>
            <div className="et-cta-row">
              <TrialButton location="how_it_works" />
            </div>
            <a href="#faq" className="et-link" onClick={(e) => { e.preventDefault(); track('migration_click', { location: 'how_it_works' }); scrollToId('faq') }}>Or let us move your HubSpot data for free <ArrowRight size={14} aria-hidden="true" /></a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 9. Comparison ---------- */
const COLS = ['Etcher', 'Attio', 'HubSpot Sales Hub', 'Pipedrive', 'Close']
type Cell = string
const ROWS: [string, Cell[]][] = [
  ['Price model', ['Flat, unlimited seats', 'Per seat', 'Per seat', 'Per seat', 'Per seat']],
  ['Price for a 6 person team', ['$149/month', 'Plus about $174 to $216/month', 'Professional about $540 to $600/month†', 'Growth about $234 to $294/month†', 'Essentials about $210 to $294/month†']],
  ['Browser calling built in', ['Yes', 'No (via integrations)', 'Yes, paid tiers†', 'Add-on†', 'Yes']],
  ['Call minutes included', ['1,000/month', 'n/a', 'Limited†', 'Add-on', 'Add-on†']],
  ['Call recording to the timeline', ['Yes', 'No', 'Yes, paid tiers', 'Add-on', 'Yes']],
  ['Buy local US and UK numbers in-app', ['Yes', 'No', 'Limited†', 'Add-on', 'Yes']],
  ['Multiple pipelines + weighted forecast', ['Yes', 'Yes', 'Yes', 'Yes', 'Yes']],
  ['CSV import with dedupe', ['Yes', 'Yes', 'Yes', 'Yes', 'Yes']],
  ['Custom fields', ['Yes', 'Yes', 'Yes', 'Yes', 'Yes']],
  ['Free migration from HubSpot', ['Yes', 'No', 'n/a', 'No†', 'No†']],
]
function CellView({ v }: { v: string }) {
  if (v === 'Yes') return <span className="et-yes"><Check size={14} strokeWidth={2} aria-hidden="true" /> Yes</span>
  if (v === 'No' || v === 'No†') return <span className="et-no"><X size={13} aria-hidden="true" /> {v}</span>
  if (v === 'n/a') return <span className="et-na"><Minus size={13} aria-hidden="true" /> n/a</span>
  return <span>{v}</span>
}
export function Compare() {
  const [scrolled, setScrolled] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const reduce = useReducedMotion()
  return (
    <section className="et-section" id="compare" aria-labelledby="et-compare-h">
      <div className="et-wrap">
        <Reveal className="et-head">
          <h2 id="et-compare-h" className="et-h2">Flat price. Calling included.</h2>
          <p className="et-sub">Etcher does the core of a CRM and the dialer, for one price, however many people join.</p>
        </Reveal>
        <div className={`et-swipe ${scrolled ? 'gone' : ''}`} aria-hidden="true">Swipe to compare <ArrowRight size={12} /></div>
        <div className={`et-table-wrap ${inView ? 'revealed' : ''}`} ref={ref} onScroll={() => !scrolled && setScrolled(true)} tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
          <table className="et-table">
            <thead>
              <tr>
                <td />
                {COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'et-us' : ''}>{i === 0 ? <span className="et-us-head"><span className="et-mark-sm" aria-hidden="true" />{c}</span> : c}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, cells], r) => (
                <motion.tr key={label} initial={reduce ? false : { opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.3, delay: Math.min(r * 0.025, 0.27), ease: EASE }}>
                  <th scope="row">{label}</th>
                  {cells.map((c, i) => <td key={i} className={i === 0 ? 'et-us' : ''}><CellView v={c} /></td>)}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="et-foot-note">Prices checked Oct 2026 from each vendor's pricing page, for 6 users. † Based on third-party summaries; check the vendor's own page. Tell us if anything is out of date.</p>
      </div>
    </section>
  )
}

/* ---------- 10. Testimonials (flagged off until there are real ones) ---------- */
const SHOW_TESTIMONIALS = false as boolean
export function Testimonials() {
  if (!SHOW_TESTIMONIALS) return null
  return <section className="et-section" aria-label="Teams that switched"><h2 className="et-h2">Teams that switched</h2></section>
}

/* ---------- 11. Pricing ---------- */
const MONTHLY_INCLUDES = ['Unlimited seats', '1,000 call minutes a month', 'Up to 3 phone numbers', 'Call recording with consent message', 'Unlimited pipelines (up to 20)', 'CSV import and export', 'Reports and weekly digest', 'Free HubSpot migration']
const ANNUAL_INCLUDES = ['Everything in Monthly', 'Save $839 a year compared with paying monthly']
function Price({ value, unit, note }: { value: string; unit: string; note: string }) {
  const reduce = useReducedMotion()
  return (
    <div className="et-price-box">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={value + unit} className="et-price" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: reduce ? 0 : 0.18, ease: MORPH }}>
          <span className="et-bignum et-price-num">{value}</span><span className="et-price-unit">{unit}</span>
          <span className="et-price-note">{note}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const set = (a: boolean) => { setAnnual(a); track('pricing_toggle', { interval: a ? 'annual' : 'monthly' }) }
  return (
    <section className="et-section" id="pricing" aria-labelledby="et-pricing-h">
      <div className="et-wrap">
        <Reveal className="et-head et-head-center">
          <h2 id="et-pricing-h" className="et-h2">One price for the whole team.</h2>
          <p className="et-sub">Every plan starts with a 7-day free trial. Add as many teammates as you like.</p>
          <div className="et-toggle" role="radiogroup" aria-label="Billing interval">
            {[false, true].map((a) => (
              <button key={String(a)} type="button" role="radio" aria-checked={annual === a} className={annual === a ? 'on' : ''} onClick={() => set(a)}>
                {annual === a && <motion.span layoutId="et-toggle-pill" className="et-toggle-pill" transition={{ duration: reduce ? 0 : 0.22, ease: MORPH }} />}
                <span className="et-toggle-label">{a ? <>Annual · <b>save $839</b></> : 'Monthly'}</span>
              </button>
            ))}
          </div>
        </Reveal>
        <div className="et-plans">
          <Reveal className="et-plan">
            <div className="et-plan-head"><h3 className="et-h3">Monthly</h3></div>
            <Price value={annual ? '$1,788' : '$149'} unit={annual ? '/year' : '/month'} note={annual ? 'Paid as $149 each month' : 'Billed monthly'} />
            <p className="et-plan-for">For teams that want to start today.</p>
            <TrialButton location="pricing_monthly" plan="monthly" />
            <Ticks items={MONTHLY_INCLUDES} />
          </Reveal>
          <Reveal className="et-plan et-plan-firm" delay={0.04}>
            <div className="et-plan-head"><h3 className="et-h3">Annual</h3><span className="et-pill et-pill-accent">Best value</span></div>
            <Price value={annual ? '$949' : '$79'} unit={annual ? '/year' : '/month'} note={annual ? 'That is $79/month billed yearly' : 'Billed yearly as $949'} />
            <p className="et-plan-for">For teams that are staying.</p>
            <TrialButton location="pricing_annual" plan="annual" />
            <Ticks items={ANNUAL_INCLUDES} />
          </Reveal>
        </div>
        <div className="et-plans-notes">
          <p>Need more minutes? Add 1,000 for $39 in a click. Using your own Twilio account or SIP carrier? Minutes are on your carrier's bill and not capped.</p>
          <p className="et-small">Call minutes cover calls on Etcher numbers to and from the US and UK. Other countries: bring your own Twilio account.</p>
        </div>
      </div>
    </section>
  )
}

/* ---------- 12. FAQ ---------- */
export const FAQ: [string, string][] = [
  ['Is it really unlimited seats?', 'Yes. $149 a month or $949 a year covers your whole team. Invite as many people as you need.'],
  ['How does calling work?', 'Etcher rings from the browser over the internet. You buy a local number inside Etcher (or connect your own Twilio account) and click any phone number to call. A headset is all you need.'],
  ['What counts towards the 1,000 minutes?', 'Every minute of a connected call on an Etcher number, inbound or outbound, rounded up per call. Unanswered calls do not use minutes. You can buy 1,000 more for $39.'],
  ['Which countries can I call and buy numbers in?', 'Numbers in the US and the UK. Calls to the US and UK are included. For other countries, connect your own Twilio account and calls go on your Twilio bill.'],
  ['Can I record calls?', 'Yes, an admin turns recording on. By default an announcement tells the other person the call may be recorded. Recordings are kept for 12 months and only the rep on the call and admins can play them.'],
  ['Do I need a UK business to get a UK number?', 'UK numbers need a short compliance check that the phone regulator requires. Fill in your business details in Etcher and approval usually takes a few working days.'],
  ['Can you move our data from HubSpot?', 'Yes, free. Book a call and we move your contacts, companies and deals, and set up your pipeline, before your trial ends.'],
  ['Can I import from a spreadsheet?', 'Yes. Upload a CSV, match the columns, and Etcher skips duplicates by email and company domain.'],
  ['Can I use my own phone system?', "Yes. Connect your own Twilio account, or bring your SIP carrier through Twilio, and calls go on your carrier's bill with no minute cap."],
  ['Is my data safe?', "Each workspace's data is isolated at the database level, Twilio keys never reach the browser, and you can export everything or delete your workspace at any time."],
  ['What happens after the trial?', 'Your card is charged $149 (or $949 for annual). Cancel any time in Billing before then and you will not be charged.'],
  ['What if we stop paying?', 'Your workspace becomes read-only. You can still log in and export everything for 30 days.'],
]
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const reduce = useReducedMotion()
  return (
    <section className="et-section" id="faq" aria-labelledby="et-faq-h">
      <div className="et-wrap et-faq-grid">
        <Reveal className="et-head">
          <h2 id="et-faq-h" className="et-h2">Questions sales teams ask</h2>
        </Reveal>
        <div className="et-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className={`et-faq-item ${isOpen ? 'open' : ''}`}>
                <h3>
                  <button type="button" id={`et-faq-q${i}`} aria-expanded={isOpen} aria-controls={`et-faq-a${i}`} onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('faq_open', { index: i }) }}>
                    <span>{q}</span>
                    <ChevronDown size={16} className="et-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`et-faq-a${i}`} role="region" aria-labelledby={`et-faq-q${i}`} className="et-faq-a"
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? { height: 0, opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.24, ease: MORPH }}
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
  return (
    <section className="et-section et-final" aria-labelledby="et-final-h">
      <div className="et-wrap et-final-inner">
        <Reveal className="et-head et-head-center">
          <h2 id="et-final-h" className="et-h2">Your next call should log itself.</h2>
          <p className="et-sub">Start a 7-day trial, import your leads and make your first call today.</p>
          <div className="et-cta-row et-cta-center">
            <TrialButton location="final_cta" />
            <a href="#faq" className="et-btn et-btn-secondary et-btn-lg" onClick={(e) => { e.preventDefault(); track('migration_click', { location: 'final_cta' }) }}>
              <CalendarCheck size={15} aria-hidden="true" /> Book a free HubSpot migration
            </a>
          </div>
          <p className="et-micro">7 days free · Unlimited seats · Cancel any time</p>
        </Reveal>
        <Reveal className="et-final-dock">
          <div className="et-dock et-dock-wrap" role="img" aria-label="Softphone dock in wrap-up with Meeting booked selected">
            <div className="et-dock-top"><span className="et-dock-state"><LiveDot tone="ghost" /> Wrap-up · Sarah Jones</span><span className="et-num et-faint">04:12</span></div>
            <span className="et-panel-label">Outcome</span>
            <div className="et-chips">
              {['Connected', 'Meeting booked', 'Left voicemail', 'No answer'].map((o) => <span key={o} className={`et-chip ${o === 'Meeting booked' ? 'on' : ''}`}>{o}</span>)}
            </div>
            <span className="et-panel-label">Note</span>
            <div className="et-note">Demo with their two team leads on Thursday.</div>
            <div className="et-dock-foot"><span className="et-faint">Skip</span><span className="et-dock-btn et-dock-save">Save</span></div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 14. Footer ---------- */
const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Calling', 'Pricing', 'Changelog']],
  ['Compare', ['vs Attio', 'vs HubSpot', 'vs Pipedrive', 'vs Close']],
  ['For', ['Recruitment agencies', 'Marketing agencies', 'B2B sales teams']],
  ['Company', ['Contact', 'Privacy', 'Terms', 'Status']],
]
const FOOT_TARGET: Record<string, string> = { Features: 'product', Calling: 'calling', Pricing: 'pricing' }
export function Footer() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <footer className="et-footer">
      <div className="et-wrap">
        <div className="et-foot-cols">
          {FOOT.map(([h, links]) => (
            <div key={h} className={`et-foot-col ${open === h ? 'open' : ''}`}>
              <h2>
                <button type="button" aria-expanded={open === h} onClick={() => setOpen(open === h ? null : h)}>
                  {h} <ChevronDown size={14} className="et-chev" aria-hidden="true" />
                </button>
                <span className="et-foot-h">{h}</span>
              </h2>
              <ul>
                {links.map((l) => (
                  <li key={l}><a href={FOOT_TARGET[l] ? `#${FOOT_TARGET[l]}` : '#top'} onClick={(e) => { e.preventDefault(); if (FOOT_TARGET[l]) scrollToId(FOOT_TARGET[l]); if (h === 'Compare') track('compare_open', { competitor: l.slice(3) }) }}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="et-foot-bottom">
          <Wordmark />
          <span>© 2026 Etcher</span>
          <span className="et-foot-line">The CRM your team calls from.</span>
        </div>
      </div>
    </footer>
  )
}
