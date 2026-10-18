import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ChevronDown, Minus, ArrowRight, MoveHorizontal } from 'lucide-react'
import { Btn, MORPH, OUT, Pill, Reveal, SectionHead, Wordmark, scrollToId, track } from './shared'

/* 8. How it works, with the one ASCII piece: how a price is worked out. */
const STEPS = [
  { t: 'Pick your trade and set your prices', b: 'Start from a template. Change the rates, add your postcodes.' },
  { t: 'Paste the snippet on your website', b: 'Or share your quote page link and QR code.' },
  { t: 'Get booked jobs, not phone tag', b: 'Prices go out instantly. You get a text when someone books.' },
]
const ASCII = `  how a price is worked out
  ─────────────────────────────────────
  call-out base               £40
  bedrooms     3 × £30      + £90
                            ───────
                              £130
  deep clean   × 1.4          £182
  SW15         zone A       + £0
  minimum      £70            ok
  ─────────────────────────────────
  range        -0% / +25%
  rounded      to £5   →  £180 to £230
  ─────────────────────────────────
  photos       checked, flag only
  price        unchanged ✓`

export function HowItWorks() {
  const reduce = useReducedMotion()
  return (
    <section className="qt-section" id="how">
      <div className="qt-rail">
        <SectionHead eyebrow="How it works" title="Live in an afternoon" />
        <div className="qt-how">
          <div className="qt-steps">
            <motion.span className="qt-steps-line" aria-hidden="true"
              initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.4, delay: 0.2, ease: MORPH }} />
            {STEPS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.08} className="qt-step">
                <span className="qt-step-n qt-num">{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.16} className="qt-ascii-wrap">
            <pre className="qt-ascii" aria-label="Worked example: a call-out base of £40 plus 3 bedrooms at £30 makes £130; a deep clean multiplies by 1.4 to £182; SW15 is zone A with no surcharge; the range runs from the price to 25% above, rounded to £5, giving £180 to £230. Photos are checked but only add a flag; the price stays the same.">{ASCII}</pre>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* 9. Comparison table. */
const COLS = ['Quotient', 'Jobber', 'Housecall Pro', 'BookingKoala', 'Tradify']
const ROWS: string[][] = [
  ['Starting price', '$39/month', '$49 Core; online booking from Connect, $129 to $139 [verify]', '$59 to $79 Basic [verify]', '$27 Starter [verify]', '$47 per user Lite [verify]'],
  ['Instant price range on your website', 'Yes', 'No (booking requests) [verify]', 'Limited [verify]', 'Yes (cleaning-style forms) [verify]', 'No [verify]'],
  ['Per room, per m2, per hour and postcode zones', 'Yes', 'No [verify]', 'No [verify]', 'Partly [verify]', 'No [verify]'],
  ['AI photo check for site visits', 'Yes', 'No', 'No', 'No', 'No'],
  ['Book survey or job with a deposit', 'Yes', 'Yes [verify]', 'Yes [verify]', 'Yes [verify]', 'No [verify]'],
  ['Automatic text and email follow-ups', 'Yes', 'Yes, on higher plans [verify]', 'Yes [verify]', 'Yes [verify]', 'Reminders [verify]'],
  ['Works on any website with one snippet', 'Yes', 'Yes [verify]', 'Yes [verify]', 'Booking page [verify]', 'No [verify]'],
  ['Job management, invoicing, payroll', 'No (hands off at booked)', 'Yes', 'Yes', 'Partly', 'Yes'],
]
function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace(' [verify]', '')
  const icon = text === 'Yes' ? <Check size={14} className="qt-yes" aria-hidden="true" /> : text === 'No' ? <Minus size={14} className="qt-no" aria-hidden="true" /> : null
  return <>{icon}<span>{text}</span>{verify && <sup className="qt-verify" title="To verify on the vendor's pricing page">verify</sup>}</>
}
export function Compare() {
  const reduce = useReducedMotion()
  return (
    <section className="qt-section qt-band" id="compare">
      <div className="qt-rail">
        <SectionHead eyebrow="Compare" title="Quotes first. Not another job management system." sub="Entry prices per month checked Oct 2026 from review and comparison sites. Confirm on each vendor's pricing page." />
        <p className="qt-swipe"><MoveHorizontal size={14} aria-hidden="true" /> Swipe to compare</p>
        <div className="qt-table-wrap" tabIndex={0} role="region" aria-label="Comparison of Quotient with Jobber, Housecall Pro, BookingKoala and Tradify">
          <table className="qt-table">
            <thead>
              <tr><th scope="col"><span className="qt-sr">Feature</span></th>{COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'is-us' : ''}>{i === 0 ? <Pill tone="accent">Quotient</Pill> : c}</th>)}</tr>
            </thead>
            <tbody>
              {ROWS.map(([label, ...vals], r) => (
                <motion.tr key={label} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: r * 0.04 }}>
                  <th scope="row">{label}</th>
                  {vals.map((v, i) => <td key={i} className={i === 0 ? 'is-us' : ''}><span className="qt-cell"><Cell v={v} /></span></td>)}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="qt-compare-note">Already use Jobber or Tradify for the work itself? Keep it. Quotient wins the job; your job software runs it.</p>
      </div>
    </section>
  )
}

/* 10. Testimonials: hidden until there are 3 real quotes. Never invent quotes. */
const TESTIMONIALS: { quote: string; name: string; trade: string; town: string }[] = []
export function Testimonials() {
  if (TESTIMONIALS.length < 3) return null
  return (
    <section className="qt-section" id="testimonials">
      <div className="qt-rail"><SectionHead eyebrow="Early users" title="From people who'd rather be on the tools" /></div>
    </section>
  )
}

/* 11. Pricing. */
type Plan = { name: string; m: number; y: string; ym: string; for: string; rows: [string, string][]; popular?: boolean }
const PLANS: Plan[] = [
  { name: 'Solo', m: 39, y: '$390', ym: '$32.50', for: 'One-person businesses',
    rows: [['Businesses', '1'], ['Seats', '1'], ['Instant quotes a month', '120'], ['SMS credits a month', '240'], ['AI photo checks a month', '240'], ['Calculators', '1'], ['Calendars', '1'], ['Deposits to your Stripe', 'Yes'], ['Remove "Quotes by Quotient"', '']] },
  { name: 'Crew', m: 79, y: '$790', ym: '$65.83', for: 'Small teams', popular: true,
    rows: [['Businesses', '1'], ['Seats', '3'], ['Instant quotes a month', '350'], ['SMS credits a month', '700'], ['AI photo checks a month', '700'], ['Calculators', '5'], ['Calendars', '3'], ['Deposits to your Stripe', 'Yes'], ['Remove "Quotes by Quotient"', 'Yes']] },
  { name: 'Agency', m: 299, y: '$2,990', ym: '$249.17', for: 'Web agencies with trades clients',
    rows: [['Businesses', 'Up to 10'], ['Seats', '10'], ['Instant quotes a month', '1,000 shared'], ['SMS credits a month', '2,000 shared'], ['AI photo checks a month', '2,000 shared'], ['Calculators', '30'], ['Calendars', '20'], ['Deposits to your Stripe', 'Yes'], ['Remove "Quotes by Quotient"', 'Yes']] },
]
export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const set = (a: boolean) => { setAnnual(a); track('lp_pricing_toggle', { interval: a ? 'year' : 'month' }) }
  return (
    <section className="qt-section" id="pricing">
      <div className="qt-rail">
        <SectionHead eyebrow="Pricing" title="Pay for quotes, not seats" sub="Every plan starts with a 7 day free trial. Cancel any time from Billing." center />
        <div className="qt-toggle-row">
          <div className="qt-toggle" role="group" aria-label="Billing interval">
            <button type="button" aria-pressed={!annual} className={!annual ? 'is-on' : ''} onClick={() => set(false)}>Monthly</button>
            <button type="button" aria-pressed={annual} className={annual ? 'is-on' : ''} onClick={() => set(true)}>Annual</button>
            <motion.i className="qt-toggle-thumb" initial={false} animate={{ x: annual ? '100%' : '0%' }} transition={{ duration: 0.24, ease: MORPH }} aria-hidden="true" />
          </div>
          <Pill tone="green">2 months free</Pill>
        </div>
        <div className="qt-plans">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08} className={`qt-plan${p.popular ? ' is-pop' : ''}`}>
              <div className="qt-plan-top">
                <h3>{p.name}</h3>
                {p.popular && <Pill tone="accent">Most popular</Pill>}
              </div>
              <p className="qt-plan-for">{p.for}</p>
              <div className="qt-price" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={annual ? 'y' : 'm'} className="qt-price-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: OUT }}>
                    <b className="qt-num">{annual ? p.y : `$${p.m}`}</b><span>{annual ? '/year' : '/month'}</span>
                  </motion.span>
                </AnimatePresence>
                <small className="qt-price-sub" style={{ visibility: annual ? 'visible' : 'hidden' }}>{p.ym}/mo billed yearly</small>
              </div>
              <Btn full href={`/signup?plan=${p.name.toLowerCase()}&interval=${annual ? 'year' : 'month'}`} variant={p.popular ? 'primary' : 'secondary'}
                onClick={() => track('lp_cta_clicked', { location: `pricing_${p.name.toLowerCase()}` })}>Start free trial</Btn>
              <dl className="qt-plan-rows">
                {p.rows.map(([k, v]) => (
                  <div key={k} className={v ? '' : 'is-off'}><dt>{k}</dt><dd className="qt-num">{v === 'Yes' ? <Check size={14} aria-label="Yes" /> : v || <Minus size={14} aria-label="Not included" />}</dd></div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>
        <p className="qt-small-print">1 SMS credit = 1 text to a US or Canadian mobile. UK texts use 5 credits. When you reach your quote limit, customers still get through; they get their price from you instead of instantly.</p>
        <p className="qt-roi">Book one extra $300 job a month and Crew pays for itself almost four times over.</p>
        <p className="qt-risk">No setup fee. No contract. Deposits go straight to your own Stripe.</p>
      </div>
    </section>
  )
}

/* 12. FAQ. */
export const FAQ: [string, string][] = [
  ['Do I need a website?', 'No. You get a hosted quote page (quotient.app/q/your-name) and a QR code. Share the link on Google, Facebook, Nextdoor and your van.'],
  ['Will it work on my Wix / Squarespace / WordPress site?', 'Yes. Paste one snippet into an embed or HTML block. If your builder blocks scripts, use the plain iframe snippet we give you.'],
  ['What if a job is more complicated than the questions?', 'Customers can add photos and notes. The photo check flags jobs that look bigger or trickier, and you can choose to offer a survey instead of booking the job.'],
  ['Does the AI change my prices?', 'Never. Prices come only from your rules. The AI can only add a note and a "survey suggested" flag, and you decide what that flag does.'],
  ['Can I show a range instead of an exact price?', "Yes. That's the default. You choose how wide the range is and how it's rounded, for example £180 to £230."],
  ['How do deposits work?', 'You connect your own Stripe account. Customers pay the deposit on a Stripe page in your business name and the money goes to you. Quotient takes no cut.'],
  ['Who do the texts come from?', 'In the US and Canada, from a toll-free number registered in your business name (carrier review takes a few days; emails go out in the meantime). In the UK, from your business name, like "SparkleCln".'],
  ['What happens when I run out of quotes or texts?', "Customers still reach you. They get \"we'll send your price shortly\" and you get an alert. Texts switch to email. You can upgrade any time."],
  ['Can customers book straight into my calendar?', 'They book into the hours you set in Quotient. Bookings show up in Google or Apple Calendar through a calendar link.'],
  ['Does it replace Jobber or my job software?', 'No. Quotient wins the job and stops at "booked". Keep your job software for scheduling crews, invoicing and payments after that.'],
  ['I build websites for trades businesses. Can I use this for clients?', 'Yes. The Agency plan covers up to 10 client businesses under one login, each with its own calculator, number and Stripe.'],
  ['Can I cancel?', 'Yes, any time from Billing. Your leads stay exportable as CSV.'],
]
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const base = useId()
  return (
    <section className="qt-section qt-band" id="faq">
      <div className="qt-rail qt-faq-grid">
        <SectionHead eyebrow="FAQ" title="Frequently asked questions" />
        <div className="qt-faq">
          {FAQ.map(([q, a], i) => {
            const on = open === i
            return (
              <div key={q} className={`qt-faq-item${on ? ' is-open' : ''}`}>
                <h3>
                  <button type="button" aria-expanded={on} aria-controls={`${base}-${i}`} id={`${base}-b${i}`}
                    onClick={() => { setOpen(on ? null : i); if (!on) track('lp_faq_opened', { index: i }) }}>
                    <span>{q}</span>
                    <motion.span className="qt-chev" animate={{ rotate: on ? 180 : 0 }} transition={{ duration: 0.2, ease: MORPH }}><ChevronDown size={16} aria-hidden="true" /></motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div id={`${base}-${i}`} role="region" aria-labelledby={`${base}-b${i}`} className="qt-faq-a"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: MORPH }}>
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

/* 13. Final CTA. */
export function FinalCta() {
  return (
    <section className="qt-section qt-hero-tint qt-final">
      <div className="qt-rail">
        <Reveal className="qt-final-inner">
          <h2>Your next customer is looking for a price tonight</h2>
          <p className="qt-sub">Set up your calculator in 20 minutes. Free for 7 days.</p>
        </Reveal>
        <Reveal delay={0.08} className="qt-cta-row qt-cta-center">
          <Btn size="lg" href="/signup" onClick={() => track('lp_cta_clicked', { location: 'final' })}>Start free trial <ArrowRight size={16} /></Btn>
          <Btn size="lg" variant="secondary" href="#pricing" onClick={() => scrollToId('pricing')}>See pricing</Btn>
        </Reveal>
      </div>
    </section>
  )
}

/* 14. Footer. */
const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Compare', 'Agencies', 'Changelog']],
  ['Resources', ['Documentation', 'Pricing guides for cleaners', 'Pricing guides for painters', 'Quote calculator templates']],
  ['Company', ['About', 'Contact']],
  ['Legal', ['Privacy', 'Terms']],
]
export function Footer() {
  return (
    <footer className="qt-footer">
      <div className="qt-rail">
        <div className="qt-foot-cols">
          {FOOT.map(([h, links]) => (
            <div key={h}><h3>{h}</h3><ul>{links.map((l) => <li key={l}><a href="#top" onClick={(e) => { e.preventDefault(); const id = ({ Features: 'features', Pricing: 'pricing', Compare: 'compare' } as Record<string, string>)[l]; if (id) scrollToId(id) }}>{l}</a></li>)}</ul></div>
          ))}
        </div>
        <div className="qt-foot-bottom">
          <Wordmark />
          <span>Made for people who work with their hands.</span>
          <span>© {new Date().getFullYear()} Quotient</span>
        </div>
      </div>
    </footer>
  )
}
