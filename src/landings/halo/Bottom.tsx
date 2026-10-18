import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { Btn, EASE, MORPH, Mark, Pill, Reveal, SectionHead, track } from './shared'

/* 8. How it works, plus the page's one ASCII element: how one request flows, and why it is not gating. */
const HOW: [string, string][] = [
  ['Add your review link', 'Paste the link from your Google Business Profile, or connect Google.'],
  ['Connect your visits', 'Zapier, a webhook, a CSV, or send by hand. Register your texting number in the same form.'],
  ['Watch reviews arrive', 'Customers rate, post on Google or tell you privately. You approve the replies.'],
]

const ASCII = `  visit done ──► wait 2h ──► one text ──► link opened
                                           │
               ┌───────────────────────────┴───────────────────────────┐
               ▼                           ▼                           ▼
            5 stars                     3 stars                    no rating
               │                           │                           │
   Post a review on Google     Post a review on Google     Post a review on Google
   └──────────────────────┘    └──────────────────────┘    └──────────────────────┘
       note: collapsed                note: open               note: collapsed
                               alert to owner, < 1 min

  Never opened? One reminder at 48 hours, then not asked again for 90 days.
  The rating only changes the thank-you line and the owner alert.
  It never changes who sees the Google button, or where.`

export function HowItWorks() {
  const reduce = useReducedMotion()
  return (
    <section className="hl-section" id="how">
      <div className="hl-rail">
        <SectionHead eyebrow="Three steps" title="Live in an afternoon" />
        <div className="hl-how">
          <motion.span
            className="hl-how-line" aria-hidden="true"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, ease: MORPH }}
          />
          {HOW.map(([t, b], i) => (
            <Reveal key={t} delay={0.2 + i * 0.3} className="hl-frame hl-how-card">
              <span className="hl-how-n hl-num">{i + 1}</span>
              <h3>{t}</h3>
              <p>{b}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="hl-ascii-wrap">
          <div className="hl-ascii-head"><span>What happens to one request</span><span className="hl-faint">Same page for every rating</span></div>
          <pre
            className="hl-ascii"
            aria-label="After a visit Halo waits two hours and sends one text. When the link is opened, the rating page shows the same Post a review on Google button for 5 stars, 3 stars or no rating. If it is never opened, one reminder goes at 48 hours and the person is not asked again for 90 days. Low ratings open the private note and alert the owner in under a minute. The rating only changes the thank-you line and the alert, never who sees the Google button."
          >{ASCII}</pre>
        </Reveal>
      </div>
    </section>
  )
}

/* 9. Comparison table. */
const COLS = ['Halo', 'Birdeye', 'Podium', 'NiceJob', 'GatherUp']
const ROWS: [string, string[]][] = [
  ['Starting price', ['$49/month', 'from $299/location/month [verify]', 'from $399/month, 12 month contract [verify]', 'from $75/month [verify]', 'from $99/month [verify]']],
  ['Monthly, cancel any time', ['Yes', 'Quote, annual [verify]', 'Annual contract [verify]', 'Yes [verify]', 'Yes [verify]']],
  ['Review requests by SMS and email', ['Yes', 'Yes', 'Yes', 'Yes', 'Yes']],
  ['Same Google button for every rating (no gating)', ['Yes, by design', '[verify]', '[verify]', '[verify]', '[verify]']],
  ['Private feedback with instant owner alert', ['Yes', 'Yes', 'Yes [verify]', '[verify]', 'Yes']],
  ['AI reply drafts in your tone, you approve', ['Yes', 'Yes [verify]', 'Yes [verify]', 'Pro plan [verify]', '[verify]']],
  ['Zapier and webhook intake', ['Yes', 'Integrations [verify]', 'Integrations [verify]', 'Integrations [verify]', 'Yes [verify]']],
  ['Multi-location dashboard', ['Yes, up to 10', 'Yes', 'Yes', '[verify]', 'Yes']],
  ['Agency white-label emails', ['Agency plan', 'Agency programme [verify]', '[verify]', '[verify]', 'Agency plan [verify]']],
]
function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace(' [verify]', '').replace('[verify]', '')
  return <>{text && <span>{text}</span>}{verify && <span className="hl-verify">verify</span>}</>
}
export function Compare() {
  const reduce = useReducedMotion()
  return (
    <section className="hl-section hl-band" id="compare">
      <div className="hl-rail">
        <SectionHead eyebrow="Compare" title="Everything a local business needs for reviews, without the suite price" />
        <Reveal className="hl-frame hl-table-frame">
          <div className="hl-table-scroll" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways" onScroll={() => track('lp_compare_scroll')}>
            <table className="hl-compare">
              <thead>
                <tr>
                  <td />
                  {COLS.map((c, i) => (
                    <th key={c} scope="col" className={i === 0 ? 'hl-us' : ''}>
                      {i === 0 ? <Pill tone="accent">Halo</Pill> : <a href={`/compare/${c.toLowerCase()}`}>{c}</a>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, vals], r) => (
                  <motion.tr
                    key={label}
                    initial={reduce ? false : { opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.3, delay: r * 0.04, ease: EASE }}
                  >
                    <th scope="row">{label}</th>
                    {vals.map((v, i) => <td key={i} className={i === 0 ? 'hl-us' : ''}><Cell v={v} /></td>)}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <p className="hl-footnote">Prices are entry list prices from comparison sites, checked Oct 2026. They change often and some vendors only quote: confirm on each vendor's page.</p>
        <p className="hl-compare-note">Halo does one job well: more Google reviews and faster replies. If you also need chat, payments and listings management, a suite may suit you better.</p>
      </div>
    </section>
  )
}

/* 10. Testimonials: hidden until lib/testimonials.ts holds 3 real quotes. Never invent quotes. */
const TESTIMONIALS: { quote: string; name: string }[] = []
export function Testimonials() {
  if (TESTIMONIALS.length < 3) return null
  return (
    <section className="hl-section" id="testimonials">
      <div className="hl-rail"><SectionHead eyebrow="Early users" title="What owners are saying" /></div>
    </section>
  )
}

/* 11. Pricing. */
type Plan = { name: string; monthly: string; yearly: string; yearlyPer: string; for: string; rows: [string, string][]; includes: string; popular?: boolean }
const PLANS: Plan[] = [
  { name: 'Solo', monthly: '$49', yearly: '$490', yearlyPer: '$40.83', for: 'One location',
    rows: [['Review requests a month', '200'], ['AI reply drafts a month', '30'], ['Team seats', '2']],
    includes: 'SMS from your own verified number, email, private feedback alerts, Zapier and webhook intake, CSV import, dashboard' },
  { name: 'Growth', monthly: '$99', yearly: '$990', yearlyPer: '$82.50', for: 'Up to 3 locations', popular: true,
    rows: [['Review requests a month', '500'], ['AI reply drafts a month', '120'], ['Team seats', '5']],
    includes: 'Everything in Solo, location comparison, daily digest' },
  { name: 'Agency', monthly: '$299', yearly: '$2,990', yearlyPer: '$249.17', for: 'Up to 10 client locations',
    rows: [['Review requests a month', '1,000'], ['AI reply drafts a month', '300'], ['Team seats', '10']],
    includes: 'Everything in Growth, one number per client business, weekly client reports, no Halo branding on emails' },
]

export function Pricing() {
  const [yearly, setYearly] = useState(false)
  const reduce = useReducedMotion()
  const set = (y: boolean) => { setYearly(y); track('lp_pricing_toggle', { interval: y ? 'yearly' : 'monthly' }) }
  return (
    <section className="hl-section" id="pricing">
      <div className="hl-rail">
        <SectionHead eyebrow="Pricing" title="Simple plans. Cancel any time." center />
        <div className="hl-toggle-row">
          <div className="hl-toggle" role="radiogroup" aria-label="Billing interval">
            <button type="button" role="radio" aria-checked={!yearly} className={!yearly ? 'on' : ''} onClick={() => set(false)}>Monthly</button>
            <button type="button" role="radio" aria-checked={yearly} className={yearly ? 'on' : ''} onClick={() => set(true)}>Yearly</button>
          </div>
          <Pill tone="accent">2 months free</Pill>
        </div>
        <div className="hl-plans" aria-live="polite">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08} className={`hl-frame hl-plan${p.popular ? ' popular' : ''}`}>
              <div className="hl-plan-top"><h3>{p.name}</h3>{p.popular && <Pill tone="accent">Most popular</Pill>}</div>
              <p className="hl-muted hl-plan-for">{p.for}</p>
              <div className="hl-price">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={yearly ? 'y' : 'm'} className="hl-price-n"
                    initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}
                  >{yearly ? p.yearly : p.monthly}</motion.span>
                </AnimatePresence>
              </div>
              <p className="hl-billed">{yearly ? `a year (${p.yearlyPer}/month)` : 'a month, billed monthly'}</p>
              <Btn full variant="primary" href="/signup" onClick={() => track('lp_plan_click', { plan: p.name })}>Start free trial</Btn>
              <ul className="hl-plan-rows">
                {p.rows.map(([k, v]) => <li key={k}><span>{k}</span><span className="hl-num hl-ink">{v}</span></li>)}
              </ul>
              <p className="hl-plan-inc"><span className="hl-faint">Includes</span>{p.includes}</p>
            </Reveal>
          ))}
        </div>
        <p className="hl-plan-note">7 day free trial with 50 requests and 10 AI drafts. Texting starts once your number is approved by the carriers (usually 5 to 15 business days); email works from day one. US texting only for now.</p>
        <p className="hl-footnote hl-center-text">A request is one customer asked once, plus one reminder if they never opened it.</p>
      </div>
    </section>
  )
}

/* 12. FAQ. */
export const FAQ: [string, string][] = [
  ['Is this review gating?', 'No. Review gating means only sending happy customers to Google, or hiding the Google option from unhappy ones. Every Halo customer sees the same "Post a review on Google" button in the same place, whatever they rate, and can skip the rating altogether. The private note is offered to everyone too.'],
  ['Why offer a private note at all?', 'Because an unhappy customer who is heard and helped is worth more than one who is ignored. They can still post on Google if they want to. Halo never asks them not to.'],
  ['Do I need to connect my Google Business Profile?', 'No. Paste your review link and Halo works straight away. Connect Google when you want new reviews in Halo and replies posted from Halo.'],
  ['How do my visits get into Halo?', "Three ways: Zapier (any booking or job tool Zapier supports, using Webhooks by Zapier, which needs a paid Zapier plan), your tool's own webhook pointed at Halo, or a CSV upload. You can also send one by hand from your phone."],
  ['Why does texting need approval?', 'US carriers require every business that texts customers to be verified. Halo registers a toll-free number in your business name for you. It usually takes 5 to 15 business days. Email works while you wait.'],
  ['Can I text customers outside the US?', 'Not yet. Halo sends email to everyone else.'],
  ['Will customers get spammed?', 'No. One text after a visit, one reminder only if they never opened it, never more than once in 90 days, and STOP works instantly.'],
  ['Does the AI post replies by itself?', 'Never. It drafts, you approve. Drafts never mention private details like treatment, which matters for clinics and dentists.'],
  ['Can I offer a discount for reviews?', 'No, and Halo blocks it. Google and the FTC do not allow incentives for reviews. Halo templates reject words like "discount", "free" or "prize".'],
  ['What happens when I hit my monthly limit?', 'Halo emails you at 80%. At 100%, new requests wait as "limit reached" and you can upgrade any time. Nothing is charged automatically.'],
  ['I run an agency. Can my clients see their own numbers?', 'Yes, by a weekly email report per client location. Client logins are on the roadmap.'],
  ['Can I cancel any time?', 'Yes, from Billing in two clicks. You keep your data for 30 days.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const reduce = useReducedMotion()
  const base = useId()
  return (
    <section className="hl-section hl-band" id="faq">
      <div className="hl-rail hl-faq-grid">
        <SectionHead eyebrow="FAQ" title="Questions owners ask first" />
        <div className="hl-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className={`hl-faq-item${isOpen ? ' open' : ''}`}>
                <h3>
                  <button type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`}
                    onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('lp_faq_open', { q: i }) }}>
                    <span>{q}</span><ChevronDown size={16} className="hl-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className="hl-faq-a"
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: MORPH }}
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

export function FinalCta() {
  return (
    <section className="hl-section hl-tint" id="start">
      <div className="hl-rail">
        <div className="hl-final">
          <Reveal><h2>Your next happy customer is leaving right now.</h2></Reveal>
          <Reveal delay={0.08} className="hl-final-rest">
            <p className="hl-sub">Start the trial, paste your review link, and send the first request to yourself in five minutes.</p>
            <div className="hl-cta-row hl-cta-center">
              <Btn size="lg" href="/signup" onClick={() => track('lp_cta_click', { location: 'final' })}>Start free trial</Btn>
              <Btn size="lg" variant="secondary" href="/google-review-policy" onClick={() => track('lp_policy_guide_click')}>Read the Google policy guide</Btn>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Compare', 'Google review policy']],
  ['Trades', ['Dental', 'Clinics', 'Salons', 'Home services', 'Agencies']],
  ['Company', ['About', 'Contact', 'Changelog']],
  ['Legal', ['Privacy', 'Terms', 'SMS terms']],
]
export function Footer() {
  return (
    <footer className="hl-footer">
      <div className="hl-rail">
        <div className="hl-foot-grid">
          <div className="hl-foot-brand"><span className="hl-wordmark"><Mark />Halo</span><p className="hl-faint">More Google reviews, inside Google's rules.</p></div>
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <p className="hl-foot-h">{h}</p>
              <ul>{links.map((l) => <li key={l}><a href="#top">{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="hl-foot-bottom"><span>Halo is not affiliated with Google. Google is a trademark of Google LLC.</span><span>© 2026 Halo</span></div>
      </div>
    </footer>
  )
}
