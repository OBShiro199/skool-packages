import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight, BellRing, CalendarCheck, Check, ChevronDown, CircleCheck, Minus } from 'lucide-react'
import { EASE, MORPH, Reveal, SectionHead, TrialButton, Wordmark, ctaClick, track, useLoop } from './parts'

/* ---------- 8. How it works (with the page's ASCII diagram) ---------- */
const STEPS = [
  { t: 'Add your services.', d: 'Name, length, price and deposit. “Skin fade, 45 min, $35, $10 deposit.”' },
  { t: 'Set your hours and connect your calendar.', d: 'Pick your working days, connect Google Calendar and Stripe.' },
  { t: 'Share your link.', d: 'Put it in your Instagram bio, print the QR code, send it on WhatsApp.' },
]

const ASCII: [number, string][] = [
  [0, ' tap bookwell.app/b/fade-room'],
  [0, '            |'],
  [1, ' +----------v----------+'],
  [1, ' | 1 pick Wed  14:30   |<-- Google Calendar'],
  [1, ' +----------+----------+    blocks busy times'],
  [1, '            |'],
  [2, ' +----------v----------+'],
  [2, ' | 2 pay $10 deposit   |--> your Stripe'],
  [2, ' +----------+----------+    `--> your bank'],
  [2, '            |'],
  [3, ' +----------v----------+'],
  [3, ' | 3 booked            |--> added to your'],
  [3, ' +----------+----------+    Google Calendar'],
  [3, '            |'],
  [4, '   text now ---> text 24 h before'],
]

function AsciiFlow() {
  const { ref, step } = useLoop(5, 1100, -1)
  return (
    <div className="bw-ascii-card" ref={ref}>
      <div className="bw-ascii-top">
        <span className="bw-eyebrow"><i />What happens when someone books</span>
        <span className="bw-ascii-live" aria-hidden="true">{step >= 0 ? `step ${step} / 4` : 'flow'}</span>
      </div>
      <pre className="bw-ascii" role="img" aria-label="Flow: a customer taps your link, picks a time that Google Calendar has not blocked, pays a $10 deposit to your Stripe and on to your bank, the booking is added to your Google Calendar, then a text is sent now and another 24 hours before.">
        {ASCII.map(([s, line], i) => (
          <span key={i} className={s === step ? 'on' : s < step ? 'past' : ''}>{line + '\n'}</span>
        ))}
      </pre>
    </div>
  )
}

export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const drawn = inView || !!reduce
  return (
    <section className="bw-sec bw-surface" id="how" aria-labelledby="bw-how-h">
      <div className="bw-wrap bw-how">
        <div className="bw-how-main">
          <SectionHead title={<span id="bw-how-h">Live in 10 minutes.</span>} />
          <ol className="bw-steps" ref={ref}>
            <motion.i className="bw-steps-line" aria-hidden="true" initial={false} animate={{ scale: drawn ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.9, ease: EASE }} />
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <motion.span className="bw-step-n" initial={false} animate={drawn ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0.3 }} transition={{ duration: 0.3, delay: reduce ? 0 : 0.15 + i * 0.3, ease: EASE }}>
                  {i + 1}
                </motion.span>
                <div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <Reveal className="bw-how-cta"><TrialButton location="how_it_works" /></Reveal>
        </div>
        <Reveal className="bw-how-side" delay={0.08}><AsciiFlow /></Reveal>
      </div>
    </section>
  )
}

/* ---------- 9. Comparison table ---------- */
const COLS = ['Bookwell', 'Calendly', 'Square Appointments', 'Fresha', 'Booksy']
const ROWS: [string, string[]][] = [
  ['Built for local service shops', ['Yes', 'No, built for meetings', 'Yes', 'Yes', 'Yes']],
  ['Card deposits to your own account', ['Yes', 'Paid plans, via Stripe', 'Yes', 'Yes', 'Yes']],
  ['SMS reminders included', ['Yes', 'Paid plans', 'Yes', 'Paid per message', 'Yes']],
  ['Google Calendar two-way', ['Yes', 'Yes', 'Limited', 'Limited', 'Limited']],
  ['Customer needs an app or account', ['No', 'No', 'No', 'Often', 'Often']],
  ['Price for one person', ['$19/month', '[verify]', '[verify]', '[verify]', '[verify]']],
]
function Cell({ v, own }: { v: string; own: boolean }) {
  if (v === '[verify]') return <span className="bw-verify">[verify]</span>
  if (v === 'Yes') return <span className={`bw-yes${own ? ' own' : ''}`}><Check size={14} strokeWidth={2.8} aria-hidden="true" />Yes</span>
  if (v === 'No' && own) return <span className="bw-yes own"><Check size={14} strokeWidth={2.8} aria-hidden="true" />No</span>
  if (v === 'No') return <span className="bw-no"><Minus size={14} aria-hidden="true" />No</span>
  return <span className={own ? 'bw-own-txt' : 'bw-soft-txt'}>{v}</span>
}

export function Compare() {
  const [swiped, setSwiped] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  return (
    <section className="bw-sec bw-bg" aria-labelledby="bw-compare-h">
      <div className="bw-wrap">
        <SectionHead
          title={<span id="bw-compare-h">Made for one-person shops, priced like it.</span>}
          sub="Big booking apps are built for salons with ten chairs or for sales calls. Bookwell does the five things you need."
        />
        <Reveal>
          <p className={`bw-swipe${swiped ? ' gone' : ''}`} aria-hidden="true">Swipe to compare →</p>
          <div
            className="bw-table-wrap"
            ref={ref}
            tabIndex={0}
            role="region"
            aria-label="Comparison table, scrolls sideways"
            onScroll={() => { if (!swiped) { setSwiped(true); track('compare_scroll') } }}
          >
            <table className="bw-table">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Feature</span></th>
                  {COLS.map((c, i) => (
                    <th key={c} scope="col" className={i === 0 ? 'own' : ''}>
                      {i === 0 ? <span className={`bw-own-head${inView && !reduce ? ' glow' : ''}`}><Wordmark /></span> : c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, vals]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {vals.map((v, i) => <td key={i} className={i === 0 ? 'own' : ''}><Cell v={v} own={i === 0} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="bw-foot-note">Prices checked [Month Year]. Competitor features change, tell us if we are out of date.</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 10. Testimonials slot (hidden until there are real quotes) ---------- */
const SHOW_TESTIMONIALS = false
export function Testimonials() {
  if (!SHOW_TESTIMONIALS) return null
  return (
    <section className="bw-sec bw-surface" aria-labelledby="bw-quotes-h">
      <div className="bw-wrap"><SectionHead title={<span id="bw-quotes-h">Shops that stopped chasing no-shows</span>} /></div>
    </section>
  )
}

/* ---------- 11. Pricing ---------- */
const PLANS = [
  {
    id: 'solo', name: 'Solo', m: 19, y: 190, line: 'For one person with one calendar.',
    inc: ['Unlimited bookings', 'Up to 300 reminder texts a month (150 bookings)', 'Card deposits', 'Google Calendar sync', 'Booking link and QR code'],
  },
  {
    id: 'studio', name: 'Studio', m: 39, y: 390, line: 'For busy shops that book every day.', badge: 'Most room to grow',
    inc: ['Everything in Solo', 'Up to 600 reminder texts a month (300 bookings)', 'Your brand colour and logo on the booking page', 'Remove “Booking by Bookwell”', 'No-show report'],
  },
]

export function Pricing() {
  const [yearly, setYearly] = useState(false)
  const set = (y: boolean) => { if (y !== yearly) { setYearly(y); track('pricing_toggle', { interval: y ? 'year' : 'month' }) } }
  return (
    <section className="bw-sec bw-surface" id="pricing" aria-labelledby="bw-pricing-h">
      <div className="bw-wrap">
        <SectionHead center title={<span id="bw-pricing-h">Simple pricing. Cancel any time.</span>} sub="Every plan starts with a 7-day free trial." />
        <Reveal className="bw-toggle-row">
          <div className="bw-toggle" role="group" aria-label="Billing period">
            {[false, true].map((y) => (
              <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => set(y)}>
                {yearly === y && <motion.i layoutId="bw-toggle-pill" className="bw-toggle-pill" transition={{ duration: 0.22, ease: MORPH }} />}
                <span>{y ? <>Yearly <em>· 2 months free</em></> : 'Monthly'}</span>
              </button>
            ))}
          </div>
        </Reveal>
        <div className="bw-plans">
          {PLANS.map((p, i) => (
            <Reveal as="article" key={p.id} className={`bw-plan${p.badge ? ' bw-plan-hi' : ''}`} delay={i * 0.07}>
              <div className="bw-plan-top">
                <h3>{p.name}</h3>
                {p.badge && <span className="bw-badge"><i />{p.badge}</span>}
              </div>
              <p className="bw-plan-line">{p.line}</p>
              <div className="bw-price" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={yearly ? 'y' : 'm'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: EASE }}>
                    <b className="bw-num">${yearly ? p.y : p.m}</b><small>/{yearly ? 'year' : 'month'}</small>
                  </motion.span>
                </AnimatePresence>
              </div>
              <a href="/signup" className={`bw-btn ${p.badge ? 'bw-btn-primary' : 'bw-btn-soft'} bw-btn-lg bw-btn-block`} onClick={(e) => ctaClick(e, `pricing_${p.id}`)}>
                Start 7-day free trial
              </a>
              <ul className="bw-ticks">
                {p.inc.map((x) => <li key={x}><Check size={14} strokeWidth={2.6} aria-hidden="true" />{x}</li>)}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="bw-foot-note bw-center">Card fees on deposits are paid to Stripe from the deposit, at Stripe’s standard rate. Bookwell never takes a cut of your deposits.</p>
      </div>
    </section>
  )
}

/* ---------- 12. FAQ ---------- */
export const FAQ: [string, string][] = [
  ['Do my customers need to download an app or make an account?', 'No. They open your link, pick a time, enter their name and mobile, and pay the deposit. That is it.'],
  ['Where does the deposit money go?', 'Straight to your own Stripe account, then to your bank on Stripe’s normal payout schedule. Bookwell never holds your money.'],
  ['What if a customer cancels?', 'They tap the link in their text. If they cancel more than 24 hours before, you choose whether the deposit is refunded. The slot opens up again on your page straight away.'],
  ['Does it work with my Google Calendar?', 'Yes. Anything already in your Google Calendar blocks those times, and every booking is added to it with the customer’s name and number.'],
  ['I use Apple Calendar or Outlook. Will it work?', 'Not yet. Google Calendar is the only calendar we sync with today. You can still use Bookwell without a connected calendar.'],
  ['Do the text messages cost extra?', 'No. Solo includes up to 300 texts a month and Studio up to 600. That is two texts per booking: a confirmation and a reminder.'],
  ['Can I take the full payment up front?', 'Set the deposit to the full price of the service and customers pay it all when they book.'],
  ['How long does setup take?', 'About 10 minutes: add a service, set your hours, connect Google Calendar and Stripe, share your link.'],
  ['What happens after the 7-day trial?', 'You pick Solo or Studio at checkout. If you do not, your booking page pauses and shows your phone number instead. Your bookings and settings stay safe.'],
  ['Can I have more than one staff member?', 'Not yet. Bookwell is built for one person with one calendar. Team accounts are on the roadmap.'],
  ['Can I cancel any time?', 'Yes. Cancel from Settings → Billing in two clicks. You keep access until the end of the period you paid for.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const reduce = useReducedMotion()
  return (
    <section className="bw-sec bw-bg" id="faq" aria-labelledby="bw-faq-h">
      <div className="bw-wrap bw-faq">
        <SectionHead title={<span id="bw-faq-h">Questions shops ask us</span>} />
        <div className="bw-acc">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className={`bw-acc-item${isOpen ? ' open' : ''}`}>
                <h3>
                  <button type="button" id={`bw-q${i}`} aria-expanded={isOpen} aria-controls={`bw-a${i}`} onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('faq_open', { question_index: i }) }}>
                    <span>{q}</span>
                    <ChevronDown size={18} className="bw-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`bw-a${i}`}
                      role="region"
                      aria-labelledby={`bw-q${i}`}
                      className="bw-acc-panel"
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
  const reduce = useReducedMotion()
  const chips = [[CircleCheck, 'Deposit paid'], [BellRing, 'Reminder sent'], [CalendarCheck, 'Added to calendar']] as const
  return (
    <section className="bw-final" aria-labelledby="bw-final-h">
      <div className="bw-wrap bw-center">
        <ul className="bw-final-chips" aria-label="What happens after each booking">
          {chips.map(([Icon, t], i) => (
            <motion.li
              key={t}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: EASE }}
            >
              <span className="bw-bob" style={{ animationDelay: `${i * 1.2}s` }}><Icon size={14} aria-hidden="true" />{t}</span>
            </motion.li>
          ))}
        </ul>
        <Reveal>
          <h2 id="bw-final-h">Your next no-show is already booked. Stop it.</h2>
          <p className="bw-sub">Set up Bookwell in 10 minutes and send your link today.</p>
          <div className="bw-cta-row bw-center-row"><TrialButton location="final_cta" /></div>
          <p className="bw-micro">7 days free · Cancel any time</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 14. Footer ---------- */
const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Demo booking page', 'No-show calculator']],
  ['For', ['Barbers', 'Personal trainers', 'Tutors', 'Nail techs']],
  ['Company', ['About', 'Contact', 'Changelog']],
  ['Legal', ['Privacy', 'Terms']],
]
const HREF: Record<string, string> = { Features: '#features', Pricing: '#pricing', 'Demo booking page': '#demo', Contact: 'mailto:hello@bookwell.app' }

function useDesktop() {
  const q = '(min-width: 768px)'
  const [d, setD] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setD(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return d
}

export function Footer() {
  const desktop = useDesktop()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <footer className="bw-footer">
      <div className="bw-wrap">
        <div className="bw-foot-cols">
          {FOOT.map(([h, items]) => {
            const isOpen = desktop || open === h
            return (
              <div key={h} className="bw-foot-col">
                {desktop ? <h3>{h}</h3> : (
                  <h3>
                    <button type="button" aria-expanded={isOpen} aria-controls={`bw-foot-${h}`} onClick={() => setOpen(isOpen ? null : h)}>
                      {h}<ChevronDown size={16} className="bw-chev" aria-hidden="true" />
                    </button>
                  </h3>
                )}
                {isOpen && (
                  <ul id={`bw-foot-${h}`}>
                    {items.map((x) => (
                      <li key={x}>
                        <a href={HREF[x] ?? '#'} onClick={(e) => { if (!HREF[x]) e.preventDefault() }}>{x}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
        <div className="bw-foot-bottom">
          <Wordmark />
          <span>© 2026 Bookwell</span>
          <span className="bw-foot-tag">Made for shops that run on appointments.</span>
        </div>
      </div>
    </footer>
  )
}

/* ---------- Toast for the example CTAs ---------- */
export function Toast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let t = 0
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail)
      window.clearTimeout(t)
      t = window.setTimeout(() => setMsg(null), 2600)
    }
    window.addEventListener('bw-toast', on)
    return () => { window.removeEventListener('bw-toast', on); window.clearTimeout(t) }
  }, [])
  return (
    <div className="bw-toast-wrap" aria-live="polite">
      <AnimatePresence>
        {msg && (
          <motion.div className="bw-toast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.24, ease: EASE }}>
            <ArrowRight size={14} aria-hidden="true" />{msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
