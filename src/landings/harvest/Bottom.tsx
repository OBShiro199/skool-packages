import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ChevronDown, Minus } from 'lucide-react'
import { Btn, EASE, MORPH, Mark, Pill, Reveal, SectionHead, scrollToId, track } from './shared'

/* 8. How it works, with the one ASCII element: the nightly run. */
const HOW = [
  ['Add sources.', 'Paste the posts and creators you want to mine. Mine, competitor or influencer.'],
  ['Describe your buyer.', 'One sentence becomes a scoring profile you can tune.'],
  ['Open your digest.', 'At 7am: the 20 warmest people, why they fit, an opener, and a push button.'],
]

const ASCII = `  03:00  Collect   posts due at 24h, 3d, 7d .......... 1,204 engagers
    │
    ▼
  03:20  Filter    headline vs your ICP .............. 318 filtered
    │              students, job seekers, vendors ──► out
    ▼
  04:10  Enrich    role, company, size, email ......... 61 looked up
    │              provider ──► verifier ──► verified
    ▼
  05:30  Score     role 40 + company 35 + intent 25 .. 9 hot, 14 warm
    │              hot 80+   warm 60-79   cold < 60
    ▼
  07:00  Digest    20 warmest, with openers ─────────► your inbox`

export function HowItWorks() {
  const reduce = useReducedMotion()
  return (
    <section className="hv-section" id="how">
      <div className="hv-rail">
        <SectionHead eyebrow="How it works" title="Three steps, then it runs every night." />
        <div className="hv-how">
          <motion.span
            className="hv-how-line"
            aria-hidden="true"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: MORPH }}
          />
          {HOW.map(([t, b], i) => (
            <Reveal key={t} delay={i * 0.06} className="hv-how-step">
              <span className="hv-how-n hv-data">{i + 1}</span>
              <h3>{t}</h3>
              <p>{b}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="hv-ascii-wrap">
          <div className="hv-ascii-head"><span>What happens while you sleep</span><span className="hv-faint">One night, one founder's posts</span></div>
          <pre className="hv-ascii" aria-label="Nightly run: at 03:00 Harvest collects 1,204 engagers, at 03:20 filters 318 on headline, at 04:10 enriches 61 with a verified email, at 05:30 scores them on role 40, company 35 and intent 25 into 9 hot and 14 warm, and at 07:00 sends the digest.">{ASCII}</pre>
        </Reveal>
        <div className="hv-center"><Btn variant="secondary" href="#pricing" onClick={() => { track('signup_started', { from: 'how' }); scrollToId('pricing') }}>Start free trial</Btn></div>
      </div>
    </section>
  )
}

/* 9. Comparison. */
const COLS = ['Harvest', 'PhantomBuster', 'Trigify', 'Teamfluence', 'Doing it by hand']
const ROWS: [string, string[]][] = [
  ['Starting price', ['$59/mo', '$69/mo [verify]', '$149/mo [verify]', '$99/mo [verify]', 'Free']],
  ['Uses your LinkedIn login or cookie', ['No', 'Yes, session cookie', '[verify]', 'Browser extension [verify]', 'Yes']],
  ['Competitor and creator posts', ['Yes', 'Yes (one phantom per job)', 'Yes', "Mainly your own and your team's [verify]", 'Yes']],
  ['ICP filtering before enrichment', ['Yes', 'No', 'Yes', 'Basic', 'No']],
  ['Verified work email included', ['Yes', 'Extra credits [verify]', 'Credits [verify]', 'Not on the entry plan [verify]', 'No']],
  ['Opener that mentions the post', ['Yes', 'No', 'No [verify]', 'No [verify]', 'You write it']],
  ['Morning digest email', ['Yes', 'No', 'Alerts [verify]', 'Slack updates [verify]', 'No']],
  ['HubSpot / Pipedrive push', ['Growth and up', 'Via integrations', 'Yes', 'HubSpot [verify]', 'Copy and paste']],
]
function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace(' [verify]', '').replace('[verify]', '')
  return <>{text && <span>{text}</span>}{verify && <span className="hv-verify">verify</span>}</>
}
export function Compare() {
  return (
    <section className="hv-section hv-band" id="compare">
      <div className="hv-rail">
        <SectionHead eyebrow="Compare" title="Built for one job: turning post engagement into leads you can email." />
        <Reveal className="hv-frame hv-table-frame">
          <div className="hv-table-scroll" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
            <table className="hv-compare">
              <thead>
                <tr>
                  <td />
                  {COLS.map((c, i) => (
                    <th key={c} scope="col" className={i === 0 ? 'hv-us' : ''}>
                      {i === 0 || i === 4 ? c : <a href={`/compare/${c.toLowerCase()}`} onClick={() => track('compare_link_clicked', { competitor: c })}>{c}</a>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, vals]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {vals.map((v, i) => <td key={i} className={i === 0 ? 'hv-us' : ''}><Cell v={v} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <p className="hv-footnote">Competitor prices and features checked Oct 2026 from public pages and listings. They change; check their sites.</p>
      </div>
    </section>
  )
}

/* 10. Testimonials: hidden until real quotes exist (never invent quotes). */
const SHOW_TESTIMONIALS = false
export function Testimonials() {
  if (!SHOW_TESTIMONIALS) return null
  return (
    <section className="hv-section" id="testimonials">
      <div className="hv-rail"><SectionHead eyebrow="Early users" title="What happens when the reactions become a list." /></div>
    </section>
  )
}

/* 11. Pricing. */
type Plan = {
  name: string; monthly: number; annual: string; perMonth: string; billed: string; for: string; popular?: boolean
  rows: [string, string][]
}
const PLANS: Plan[] = [
  { name: 'Solo', monthly: 59, annual: '$590', perMonth: '$49.17', billed: 'billed $590 a year', for: 'One founder or recruiter',
    rows: [['Sources tracked', '15'], ['Engagers gathered a month', '1,500'], ['Leads enriched a month', '300'], ['Seats', '1'], ['ICPs', '1'], ['HubSpot and Pipedrive', ''], ['CSV and signed webhooks', 'Yes']] },
  { name: 'Growth', monthly: 129, annual: '$1,290', perMonth: '$107.50', billed: 'billed $1,290 a year', for: 'Small teams and busy posters', popular: true,
    rows: [['Sources tracked', '50'], ['Engagers gathered a month', '4,000'], ['Leads enriched a month', '600'], ['Seats', '3'], ['ICPs', '3'], ['HubSpot and Pipedrive', 'Yes'], ['CSV and signed webhooks', 'Yes']] },
  { name: 'Agency', monthly: 249, annual: '$2,490', perMonth: '$207.50', billed: 'billed $2,490 a year', for: 'Agencies running clients',
    rows: [['Sources tracked', '150'], ['Engagers gathered a month', '10,000'], ['Leads enriched a month', '950'], ['Seats', '10'], ['ICPs', '10'], ['HubSpot and Pipedrive', 'Yes'], ['CSV and signed webhooks', 'Yes']] },
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const set = (a: boolean) => { setAnnual(a); track('pricing_toggle', { interval: a ? 'annual' : 'monthly' }) }
  return (
    <section className="hv-section hv-band" id="pricing">
      <div className="hv-rail">
        <SectionHead eyebrow="Pricing" title="Priced by how many people we gather, not by seats." center />
        <div className="hv-toggle" role="radiogroup" aria-label="Billing interval">
          <button type="button" role="radio" aria-checked={!annual} className={!annual ? 'on' : ''} onClick={() => set(false)}>Monthly</button>
          <button type="button" role="radio" aria-checked={annual} className={annual ? 'on' : ''} onClick={() => set(true)}>Annual (2 months free)</button>
        </div>
        <div className="hv-plans" aria-live="polite">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06} className={`hv-frame hv-plan${p.popular ? ' popular' : ''}`}>
              <div className="hv-plan-top">
                <h3>{p.name}</h3>
                {p.popular && <Pill tone="accent">Most popular</Pill>}
              </div>
              <p className="hv-muted hv-plan-for">{p.for}</p>
              <div className="hv-price">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={annual ? 'a' : 'm'}
                    className="hv-price-n"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}
                  >
                    {annual ? p.perMonth : `$${p.monthly}`}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="hv-billed">a month{annual ? `, ${p.billed}` : ', billed monthly'}</p>
              <Btn full variant={p.popular ? 'primary' : 'secondary'} href="/signup" onClick={() => track('pricing_cta_clicked', { plan: p.name, interval: annual ? 'annual' : 'monthly' })}>Start 7-day trial</Btn>
              <ul className="hv-plan-rows">
                {p.rows.map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    {v === 'Yes' ? <Check size={14} className="hv-accent-ink" aria-label="Included" />
                      : v === '' ? <Minus size={14} className="hv-ghost" aria-label="Not included" />
                      : <span className="hv-data">{v}</span>}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="hv-plan-note">Trials include 5 sources, 300 engagers and 40 enriched leads. Engagers are reactions and comments we collect. Enriched leads are the ones we look up for role, company and email.</p>
      </div>
    </section>
  )
}

/* 12. FAQ. */
export const FAQ: [string, string][] = [
  ['Will this get my LinkedIn account restricted?', 'Harvest never logs in to LinkedIn as you, never asks for your password or cookies and never sends connection requests or messages. Collection runs on third-party data providers that read public engagement.'],
  ['Where does the data come from?', 'Public reactions and comments on the posts you choose, collected through Apify actors, and work details and emails from a commercial enrichment provider, checked by an email verifier.'],
  ["Can I track competitors' posts?", "Yes. Paste any public post link or creator profile and tag it Competitor. People engaging with a competitor's post about the problem you solve are often the warmest leads you will find."],
  ['How many leads will I get?', 'It depends on how many people engage and how narrow your buyer is. A founder whose posts get 300 reactions a week typically sees 5 to 20 leads that fit each morning. The Today page shows how many were filtered and why.'],
  ['Does Harvest send emails to my leads?', 'No. Harvest gives you the list, the opener and the push button. You send from your own inbox or sequencer.'],
  ['What counts as an engager?', 'Every reaction or comment we collect counts once against your monthly number, even if the same person engages again. Duplicates never become duplicate leads.'],
  ['What happens when I hit my limit?', 'We email you at 80%. At 100% collection or enrichment pauses until your next billing date, or you upgrade. We never charge overage.'],
  ['How do you keep existing customers out?', 'Upload a CSV of customer emails or domains, or click Mark customer on any lead. Suppressed people never appear again.'],
  ['Can someone ask to be removed?', 'Yes. Forget this person deletes their data from your workspace and blocks them from being collected again.'],
  ['Which CRMs do you support?', 'HubSpot and Pipedrive on Growth and Agency, plus CSV export and signed webhooks (Zapier, Make, n8n, Clay) on every plan.'],
  ['Is the 7-day trial free?', 'Yes. A card is needed to start, you are not charged if you cancel before day 7, and cancelling takes two clicks in Billing.'],
  ['Can agencies run this for clients?', 'Yes. Agency includes 10 ICPs and 150 sources, so you can keep a separate buyer profile per client.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const reduce = useReducedMotion()
  const base = useId()
  return (
    <section className="hv-section" id="faq">
      <div className="hv-rail hv-faq-grid">
        <SectionHead title="Questions" />
        <div className="hv-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className={`hv-faq-item${isOpen ? ' open' : ''}`}>
                <h3>
                  <button
                    type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`}
                    onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('faq_opened', { question_index: i }) }}
                  >
                    <span>{q}</span>
                    <ChevronDown size={16} className="hv-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`}
                      className="hv-faq-a"
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: MORPH }}
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

/* 13. Final CTA. */
export function FinalCta() {
  return (
    <section className="hv-section hv-tint" id="start">
      <div className="hv-rail">
        <Reveal className="hv-final">
          <h2>Tomorrow at 7am, your first harvest.</h2>
          <p className="hv-sub">Add one post tonight. Wake up to the people who engaged with it, sorted.</p>
          <div className="hv-cta-row hv-cta-center">
            <Btn size="lg" href="/signup" onClick={() => track('signup_started', { from: 'final' })}>Start free trial</Btn>
            <Btn size="lg" variant="secondary" href="/book">Talk to the founder</Btn>
          </div>
          <p className="hv-trust">7-day trial · Cancel in two clicks</p>
        </Reveal>
      </div>
    </section>
  )
}

/* 14. Footer. */
const FOOT: [string, string[]][] = [
  ['Product', ['How it works', 'Pricing', 'Docs', 'Changelog']],
  ['Compare', ['vs PhantomBuster', 'vs Trigify', 'vs Teamfluence']],
  ['Free tools', ['Post lead estimator']],
  ['Company', ['About', 'Contact', 'Privacy', 'Terms']],
]
export function Footer() {
  return (
    <footer className="hv-footer">
      <div className="hv-rail">
        <div className="hv-foot-grid">
          <div className="hv-foot-brand"><span className="hv-wordmark"><Mark />Harvest</span><p className="hv-muted">Warm leads from LinkedIn posts, every morning.</p></div>
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <p className="hv-foot-h">{h}</p>
              <ul>{links.map((l) => <li key={l}><a href="#top">{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="hv-foot-bottom"><span>© 2026 Harvest</span><span>Harvest is not affiliated with LinkedIn.</span></div>
      </div>
    </footer>
  )
}
