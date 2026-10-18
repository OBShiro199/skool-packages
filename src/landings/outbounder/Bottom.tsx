import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, ChevronDown, Inbox, Mail, Sparkles, Users } from 'lucide-react'
import { Btn, EASE, Pill, Reveal, SectionHead, Wordmark, track } from './shared'

/* ---------- 8. Comparison ---------- */
const COLS = [
  { name: 'Instantly Growth', slug: 'instantly' },
  { name: 'Smartlead Basic', slug: 'smartlead' },
  { name: 'Apollo Basic', slug: 'apollo' },
  { name: 'lemlist', slug: 'lemlist' },
]
const ROWS: string[][] = [
  ['Price per month', '$79', '$47 ($37.60 annual)', '$39', '$49 to $69 per user', 'from about $69 per user'],
  ['Leads included', '350 verified a month', 'Separate lead credits', 'No', 'Yes, credit based', 'Separate credits'],
  ['Second email verification', 'Yes, every lead', 'Extra', 'Extra', 'Built in', 'Built in'],
  ["First line from the lead's own website", 'Yes, with the source shown', 'AI writer, prompt based', 'AI add-ons', 'AI assistant', 'AI writer'],
  ['Sending inboxes included', 'Yes, 3 on your own domain', 'Bring your own', 'Bring your own', 'Bring your own mailbox', 'Bring your own'],
  ['Warm-up network', 'No: ramped caps instead', 'Yes', 'Yes', 'No', 'Yes'],
  ['Unified inbox with AI labels', 'Yes', 'Yes', 'Yes', 'Partial', 'Yes'],
  ['Setup time to first send', 'About 20 minutes', '1 to 3 hours', '1 to 3 hours', '1 hour', '1 to 2 hours'],
]

export function Compare() {
  return (
    <section className="ob-section" id="compare" aria-labelledby="compare-h">
      <div className="ob-rail ob-pad">
        <SectionHead
          id="compare-h" title="What it replaces"
          sub="Competitor prices from their public pricing pages; check them before you publish. Outbounder includes leads, verification, AI writing and inboxes in one price."
        />
        <Reveal>
          <div className="ob-table-scroll" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
            <table className="ob-compare">
              <thead>
                <tr>
                  <th scope="col"><span className="ob-sr">Feature</span></th>
                  <th scope="col" className="ob-us"><span className="ob-us-name"><Wordmark /></span><span className="ob-faint">Starter</span></th>
                  {COLS.map((c) => (
                    <th scope="col" key={c.slug}>
                      <a href={`/vs/${c.slug}`} onClick={() => track('compare_link_clicked', { competitor: c.slug })}>{c.name}</a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((c, i) => (
                      <td key={i} className={i === 0 ? 'ob-us' : undefined}>
                        {label === 'Price per month' ? <span className="ob-num">{c}</span> : c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ob-note">Honest note: if you already have warmed inboxes and a lead list, Instantly or Smartlead will send more volume for less. Outbounder is for people who want the whole job done in one place.</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 9. Testimonials slot (no quotes yet, so the single proof card) ---------- */
export function Testimonials() {
  return (
    <section className="ob-section" aria-labelledby="proof-h">
      <div className="ob-rail ob-pad">
        <SectionHead id="proof-h" title="From people sending with it" />
        <Reveal className="ob-proof">
          <div className="ob-proof-copy">
            <h3>We sell Outbounder with Outbounder.</h3>
            <p>Every trial so far started with a cold email written and sent by this tool. Want the numbers? See our public dashboard.</p>
            <a className="ob-link" href="/open">See the public dashboard <ArrowRight size={14} aria-hidden="true" /></a>
          </div>
          <div className="ob-proof-stats" aria-hidden="true">
            {['Cold emails sent this month', 'Reply rate', 'Interested replies', 'Trials from cold email'].map((l) => (
              <div key={l} className="ob-proof-stat"><span className="ob-faint">{l}</span><span className="ob-proof-live"><i className="ob-dot ob-dot-live" /> Live on /open</span></div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 10. Pricing ---------- */
type Interval = 'monthly' | 'annual'
const PLANS = [
  {
    id: 'starter', name: 'Starter', who: 'For founders sending their own outbound.',
    monthly: '$79', annual: '$790', perMo: '$66', leads: '350', ai: '525', sends: '1,000', inboxes: '3', domains: '2', campaigns: '3',
  },
  {
    id: 'growth', name: 'Growth', who: 'For agencies and teams running several offers.',
    monthly: '$179', annual: '$1,790', perMo: '$149', leads: '900', ai: '1,350', sends: '2,700', inboxes: '6', domains: '3', campaigns: '10',
  },
]
const SHARED = ['Verified emails', 'Website-based first lines', 'Unified inbox', 'AI reply labels', 'Analytics', 'Unsubscribe and suppression built in']

function Price({ value, unit, note }: { value: string; unit: string; note: string }) {
  const reduce = useReducedMotion()
  return (
    <div className="ob-price">
      <span className="ob-price-row">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={value} className="ob-price-n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.1 }}>
            {value}<span className="ob-price-unit">{unit}</span>
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="ob-price-note">{note}</span>
    </div>
  )
}

export function Pricing() {
  const [interval, setInterval] = useState<Interval>('monthly')
  const set = (v: Interval) => { setInterval(v); track('pricing_toggle', { interval: v }) }
  return (
    <section className="ob-section" id="pricing" aria-labelledby="pricing-h">
      <div className="ob-rail ob-pad">
        <SectionHead id="pricing-h" title="Simple pricing. Leads included." center />
        <div className="ob-toggle-wrap">
          <div className="ob-toggle" role="radiogroup" aria-label="Billing interval">
            {(['monthly', 'annual'] as const).map((v) => (
              <button
                key={v} type="button" role="radio" aria-checked={interval === v}
                className={interval === v ? 'on' : ''}
                onClick={() => set(v)}
                onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); set(v === 'monthly' ? 'annual' : 'monthly') } }}
                tabIndex={interval === v ? 0 : -1}
              >
                {v === 'monthly' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>
          <Pill tone="green" className="ob-free-pill">2 months free</Pill>
          <span className="ob-sr" aria-live="polite">{interval === 'monthly' ? 'Showing monthly prices' : 'Showing annual prices, 2 months free'}</span>
        </div>
        <div className="ob-plans">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06} className={`ob-plan${p.id === 'growth' ? ' ob-plan-pop' : ''}`}>
              {p.id === 'growth' && <span className="ob-pop-pill">Most popular</span>}
              <h3>{p.name}</h3>
              <p className="ob-plan-who">{p.who}</p>
              <Price
                value={interval === 'monthly' ? p.monthly : p.annual}
                unit={interval === 'monthly' ? '/mo' : '/yr'}
                note={interval === 'monthly' ? 'Billed monthly' : `= ${p.perMo}/mo, 2 months free`}
              />
              <div className="ob-plan-get">
                <span className="ob-faint">What you get each month</span>
                <ul>
                  <li><Users size={15} strokeWidth={1.6} aria-hidden="true" /><span>New verified leads</span><b className="ob-mono">{p.leads}</b></li>
                  <li><Sparkles size={15} strokeWidth={1.6} aria-hidden="true" /><span>AI-written emails</span><b className="ob-mono">{p.ai}</b></li>
                  <li><Mail size={15} strokeWidth={1.6} aria-hidden="true" /><span>Cold emails sent</span><b className="ob-mono">{p.sends}</b></li>
                  <li><Inbox size={15} strokeWidth={1.6} aria-hidden="true" /><span>Inboxes</span><b className="ob-mono">{p.inboxes}</b></li>
                </ul>
                <p className="ob-plan-more">
                  <span><span className="ob-mono">{p.domains}</span> sending domains</span>
                  <span><span className="ob-mono">{p.campaigns}</span> active campaigns</span>
                </p>
              </div>
              <ul className="ob-plan-shared">
                {SHARED.map((s) => <li key={s}><Check size={14} strokeWidth={2} aria-hidden="true" />{s}</li>)}
              </ul>
              <Btn
                full variant={p.id === 'growth' ? 'primary' : 'secondary'}
                href={`/signup?plan=${p.id}&interval=${interval}`}
                onClick={() => track('pricing_cta_clicked', { plan: p.id, interval })}
              >Start 7-day free trial</Btn>
            </Reveal>
          ))}
        </div>
        <p className="ob-note ob-center-text">Trial limits: 50 leads and 100 sends. Nothing is charged for 7 days. Domains are bought separately on Porkbun (about $11 a year each).</p>
      </div>
    </section>
  )
}

/* ---------- 11. FAQ ---------- */
export const FAQ: [string, string][] = [
  ['Do I need my own domain?', 'Yes, a separate one. Cold email should never come from the domain your website and invoices use. Buy a close variant like tryyourbrand.com on Porkbun for about $11 a year. Outbounder shows you every DNS record to add and checks them for you.'],
  ['Where do the leads come from?', "From Prospeo's B2B database. Outbounder only keeps people with a verified work email, then checks each address again with MillionVerifier before it can be emailed."],
  ['Will this land in spam?', 'Nothing can promise the inbox, but Outbounder does what good senders do: a separate authenticated domain, 20 emails a day per new inbox, plain text with no tracking, an unsubscribe link and header on every email, and automatic pauses when bounces or complaints appear.'],
  ['Can I edit every email?', 'Yes. Nothing sends until you approve it. You can edit, regenerate with a hint or reject any email.'],
  ['Does it write all three emails?', "Claude writes the first email for each lead from their website. Follow-ups use your templates with the lead's details, so they stay short and consistent."],
  ['Is there a warm-up network?', 'No. New inboxes start at 20 a day and ramp up as they stay healthy. Relevant emails that get replies build reputation better than fake warm-up traffic.'],
  ['What happens when someone replies?', 'The sequence stops for that person straight away. The reply is labelled and shows in your unified inbox. Interested replies also land in your own email within minutes.'],
  ['Can I bring my own leads?', 'Yes, upload a CSV. Imported leads count towards your monthly lead limit because they are verified, scraped and written the same way.'],
  ['What if I hit my limit?', 'You see your usage on every screen. At the limit, finding and sending pause until your next month, or you can upgrade to Growth in two clicks.'],
  ["Can I use it for my agency's clients?", 'Yes, one account per client brand works today. Team seats and client workspaces are on the roadmap.'],
  ['What happens after the trial?', 'Your card is charged for the plan you picked. Cancel in the billing page before day 7 and you pay nothing. Your data stays if you come back.'],
  ['Is cold email legal?', 'B2B cold email is allowed in most places when you identify yourself, include a real address and honour opt-outs. Outbounder adds all three to every email automatically.'],
]

export function Faq() {
  const [open, setOpen] = useState(0)
  const base = useId()
  const reduce = useReducedMotion()
  return (
    <section className="ob-section" id="faq" aria-labelledby="faq-h">
      <div className="ob-rail ob-pad ob-faq-grid">
        <SectionHead id="faq-h" title="Questions people ask before they start" />
        <div className="ob-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div className={`ob-faq-item${isOpen ? ' open' : ''}`} key={q}>
                <h3>
                  <button
                    type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`}
                    onClick={() => { setOpen(isOpen ? -1 : i); if (!isOpen) track('faq_opened', { question_index: i }) }}
                  >
                    <span>{q}</span>
                    <ChevronDown size={16} strokeWidth={1.6} className="ob-faq-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`}
                      className="ob-faq-a"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
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

/* ---------- 12. Final CTA ---------- */
export function FinalCta() {
  return (
    <section className="ob-section" id="final" aria-labelledby="final-h">
      <div className="ob-rail ob-pad">
        <Reveal className="ob-final">
          <h2 id="final-h">Your next 100 cold emails, written and sent this week.</h2>
          <p className="ob-sub">Describe your buyer. See a real first line in 4 minutes. 7 days free.</p>
          <div className="ob-hero-ctas ob-center">
            <Btn href="/signup?plan=starter" onClick={() => track('final_cta_clicked', { button: 'trial' })}>Start 7-day free trial</Btn>
            <Btn variant="ghost" href="/tools/first-line-generator" onClick={() => track('final_cta_clicked', { button: 'free_tool' })}>Try the free first-line generator</Btn>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 13. Footer ---------- */
const FOOT: [string, string[]][] = [
  ['Product', ['Pricing', 'Free first-line generator', 'Inbox capacity calculator', 'Docs']],
  ['Compare', ['vs Instantly', 'vs Smartlead', 'vs Apollo', 'vs lemlist']],
  ['Company', ['About', 'Contact', 'Open numbers']],
  ['Legal', ['Privacy', 'Terms', 'Acceptable use']],
]

export function Footer() {
  const [wide] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches)
  return (
    <footer className="ob-footer">
      <div className="ob-rail">
        <div className="ob-foot-grid">
          <div className="ob-foot-brand"><Wordmark /><p className="ob-muted">Leads, first lines and safe sending. From $79/mo.</p></div>
          {FOOT.map(([h, links]) => (
            <details key={h} className="ob-foot-col" open={wide}>
              <summary>{h}<ChevronDown size={14} aria-hidden="true" /></summary>
              <ul>{links.map((l) => <li key={l}><a href="#top">{l}</a></li>)}</ul>
            </details>
          ))}
        </div>
        <div className="ob-foot-bottom">
          <span>© 2026 Outbounder</span>
          <span className="ob-muted">We sell Outbounder with Outbounder.</span>
        </div>
      </div>
    </footer>
  )
}
