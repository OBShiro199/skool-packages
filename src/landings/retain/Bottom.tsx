import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Minus, Plus, ArrowRight, MoveHorizontal } from 'lucide-react'
import { Btn, MORPH, OUT, Pill, Reveal, SectionHead, Wordmark, scrollToId, track } from './shared'

/* 8. How it works. */
const STEPS = [
  { t: 'Install on Stripe.', b: 'Two clicks. You see every permission Retain asks for. Uninstall any time.' },
  { t: 'Add the cancel button.', b: 'One script tag and five lines on your server. Copy them from the app.' },
  { t: 'Turn on recovery and win-back.', b: 'Edit the emails, pick your offers, done. Scores arrive overnight.' },
]
export function HowItWorks() {
  return (
    <section className="rt-section rt-band" id="how">
      <div className="rt-rail">
        <SectionHead title="Live in 15 minutes" />
        <div className="rt-steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.025} className="rt-step">
              <span className="rt-step-n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.t}</h3>
              <p>{s.b}</p>
            </Reveal>
          ))}
        </div>
        <p className="rt-note">Optional: paste the usage snippet so drops in usage count towards the score.</p>
      </div>
    </section>
  )
}

/* 9. Comparison table (tables do not animate). */
const COLS = ['Retain', 'Churnkey', 'Baremetrics (with Recover + Cancellation Insights)', 'Churn Buster', 'Stripe on its own']
const ROWS: string[][] = [
  ['Starting price', '$49/mo', 'from $250/mo billed yearly [verify]', 'from $49/mo plus $129/mo per add-on [verify]', 'from $249/mo [verify]', 'Free'],
  ['Churn risk score per customer', 'Yes, explained in plain words', 'No [verify]', 'No', 'No', 'No'],
  ['Uses product usage data', 'Yes (snippet or webhook)', 'Partly [verify]', 'No', 'No', 'No'],
  ['Failed-payment emails', 'Yes, your brand', 'Yes', 'Yes (Recover)', 'Yes', 'Basic'],
  ['Update-card page', 'Yes', 'Yes', 'Yes', 'Yes', 'Hosted invoice page'],
  ['Cancel flow with offers', 'Pause, discount, downgrade', 'Yes', 'Yes (Cancellation Insights)', 'Yes [verify]', 'Basic reasons in the portal [verify]'],
  ['AI-written win-back emails', 'Yes, from usage history', 'No [verify]', 'No', 'No', 'No'],
  ['Priced by MRR band', 'Yes', 'By churn volume [verify]', 'By MRR', 'Custom [verify]', 'n/a'],
  ['Setup', 'Stripe App, 2 clicks', 'Stripe connect', 'Stripe connect', 'Stripe connect', 'Built in'],
]
function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace(' [verify]', '')
  const yes = text === 'Yes' || text.startsWith('Yes')
  const icon = yes ? <Check size={13} className="rt-can" aria-hidden="true" /> : text === 'No' ? <Minus size={13} className="rt-no" aria-hidden="true" /> : null
  return <span className="rt-cell">{icon}<span>{text}</span>{verify && <sup className="rt-verify">verify</sup>}</span>
}
export function Compare() {
  return (
    <section className="rt-section" id="compare">
      <div className="rt-rail">
        <SectionHead title="Retain vs the usual options" sub="Prices as listed publicly in Oct 2026. Check each vendor for current pricing." />
        <p className="rt-swipe"><MoveHorizontal size={14} aria-hidden="true" /> Swipe to compare</p>
        <div className="rt-table-wrap" tabIndex={0} role="region" aria-label="Comparison of Retain with Churnkey, Baremetrics, Churn Buster and Stripe on its own" onFocus={() => track('compare_viewed')}>
          <table className="rt-cmp">
            <thead><tr><th scope="col"><span className="rt-sr">Feature</span></th>{COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'is-us' : ''}>{c}</th>)}</tr></thead>
            <tbody>
              {ROWS.map(([label, ...vals]) => (
                <tr key={label}><th scope="row">{label}</th>{vals.map((v, i) => <td key={i} className={i === 0 ? 'is-us' : ''}>{i === 0 ? <b><Cell v={v} /></b> : <Cell v={v} />}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rt-footnote">Competitor features and prices from their public pages in Oct 2026. Some are marked to verify. Tell us if anything is out of date and we'll fix it within a day.</p>
      </div>
    </section>
  )
}

/* 10. Testimonials: hidden behind a flag until real quotes exist. Never ship placeholder quotes. */
const SHOW_TESTIMONIALS = false
export function Testimonials() {
  if (!SHOW_TESTIMONIALS) return null
  return <section className="rt-section" id="testimonials"><div className="rt-rail"><SectionHead title="Founders who stopped losing MRR quietly" /></div></section>
}

/* 11. Pricing. */
type Plan = { name: string; m: string; y: string; best: string; rows: [string, string][]; extra: string; popular?: boolean }
const PLANS: Plan[] = [
  { name: 'Starter', m: '$49', y: '$490', best: 'Up to $10k MRR', extra: '',
    rows: [['Tracked customers', '500'], ['AI risk summaries / mo', '500'], ['Win-back drafts / mo', '50'], ['Exit-interview tags / mo', '100'], ['Emails / mo', '500'], ['Usage events / mo', '250k'], ['Seats', '2']] },
  { name: 'Growth', m: '$129', y: '$1,290', best: 'Up to $40k MRR', extra: 'A/B test offers', popular: true,
    rows: [['Tracked customers', '2,000'], ['AI risk summaries / mo', '2,000'], ['Win-back drafts / mo', '200'], ['Exit-interview tags / mo', '400'], ['Emails / mo', '2,000'], ['Usage events / mo', '1M'], ['Seats', '5']] },
  { name: 'Scale', m: '$349', y: '$3,490', best: 'Up to $100k MRR', extra: 'Remove Retain badge',
    rows: [['Tracked customers', '6,000'], ['AI risk summaries / mo', '6,000'], ['Win-back drafts / mo', '400'], ['Exit-interview tags / mo', '800'], ['Emails / mo', '6,000'], ['Usage events / mo', '3M'], ['Seats', '10']] },
]
export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const set = (a: boolean) => { setAnnual(a); track('pricing_toggle', { interval: a ? 'annual' : 'monthly' }) }
  return (
    <section className="rt-section rt-band" id="pricing">
      <div className="rt-grid-bg is-soft" aria-hidden="true" />
      <div className="rt-rail">
        <SectionHead title="Pick your plan by MRR" sub="Every plan includes the risk score, recovery emails, cancel flow and win-back. Bigger plans track more customers." center />
        <div className="rt-seg-wrap">
          <div className="rt-segctl" role="group" aria-label="Billing interval">
            <motion.i className="rt-segctl-thumb" initial={false} animate={{ x: annual ? '100%' : '0%' }} transition={{ duration: 0.24, ease: MORPH }} aria-hidden="true" />
            <button type="button" aria-pressed={!annual} className={!annual ? 'is-on' : ''} onClick={() => set(false)}>Monthly</button>
            <button type="button" aria-pressed={annual} className={annual ? 'is-on' : ''} onClick={() => set(true)}>Annual (2 months free)</button>
          </div>
        </div>
        <div className="rt-plans">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.025} className={`rt-plan${p.popular ? ' is-pop' : ''}`}>
              <div className="rt-plan-top"><h3>{p.name}</h3>{p.popular && <Pill tone="accent">Most popular</Pill>}</div>
              <p className="rt-plan-best rt-mono">{p.best}</p>
              <div className="rt-price" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={annual ? 'y' : 'm'} className="rt-price-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: OUT }}>
                    <b>{annual ? p.y : p.m}</b><span>{annual ? '/yr' : '/mo'}</span>
                  </motion.span>
                </AnimatePresence>
              </div>
              <Btn full variant={p.popular ? 'primary' : 'secondary'} href={`/signup?plan=${p.name.toLowerCase()}&interval=${annual ? 'year' : 'month'}`}
                onClick={() => track('pricing_cta_clicked', { plan: p.name, interval: annual ? 'annual' : 'monthly' })}>Start free trial</Btn>
              <dl className="rt-plan-rows">
                {p.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="rt-mono">{v}</dd></div>)}
                <div className={p.extra ? '' : 'is-off'}><dt>Extras</dt><dd>{p.extra || <Minus size={13} aria-label="None" />}</dd></div>
              </dl>
            </Reveal>
          ))}
        </div>
        <p className="rt-note rt-center">7 day free trial on every plan. Over $100k MRR? Email us.</p>
      </div>
    </section>
  )
}

/* 12. FAQ. */
export const FAQ: [string, string][] = [
  ['How does Retain connect to Stripe?', 'You install the Retain app from Stripe. Stripe shows the exact permissions (read customers, subscriptions and invoices; change subscriptions to apply offers). We never see your secret key, and you can uninstall from Stripe at any time.'],
  ['Can Retain charge my customers or move money?', 'No. Retain can pause a subscription, add a discount you created, change the price to a cheaper one you chose, or schedule a cancel. It cannot create charges or payouts.'],
  ['How is the risk score worked out?', "It's the sum of fixed points for warning signs like a failed payment (35), a scheduled cancel (60) or a 50% drop in usage (25). Every point is listed in plain words on the customer page. AI only writes the one-line summary on top."],
  ['Do I need to add tracking code?', 'No. Stripe signals work on their own. Adding the usage snippet or server webhook makes the score better for customers who go quiet.'],
  ['Will customers feel trapped in the cancel flow?', "No. They see one question, one offer and a clear cancel button. Two clicks after the reason and they're done. We think that's the only fair way to do it."],
  ['Who sends the failed-payment emails?', "Retain sends them with your product name and logo, and replies go to your support email. Turn off Stripe's own failed-payment emails so customers don't get two."],
  ["Does Claude read my customers' data?", 'Only the signals and usage summary needed for one sentence or one draft, with names inside a data block. Nothing is used to train models.'],
  ['What happens if I go over my plan?', "Nothing breaks. Extra customers are still synced but aren't scored or emailed until you upgrade or the month resets. You see the meter long before that."],
  ['Do I need Stripe Billing?', "Yes. Retain works with Stripe subscriptions (Checkout, Billing, Customer Portal). It doesn't support Paddle, Chargebee or app stores yet."],
  ['Can I try it on test data first?', 'Yes. Install in test mode first. You can add your live account later in the same workspace.'],
]
export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const base = useId()
  return (
    <section className="rt-section" id="faq">
      <div className="rt-rail rt-faq-grid">
        <SectionHead title="Frequently asked questions" />
        <div className="rt-faq">
          {FAQ.map(([q, a], i) => {
            const on = open === i
            return (
              <div key={q} className={`rt-faq-item${on ? ' is-open' : ''}`}>
                <h3>
                  <button type="button" aria-expanded={on} aria-controls={`${base}-${i}`} id={`${base}-b${i}`} onClick={() => { setOpen(on ? null : i); if (!on) track('faq_opened', { n: i + 1 }) }}>
                    <span className="rt-faq-n rt-mono">{String(i + 1).padStart(2, '0')}</span>
                    <span className="rt-faq-q">{q}</span>
                    <motion.span className="rt-plus" animate={{ rotate: on ? 45 : 0 }} transition={{ duration: 0.3, ease: MORPH }}><Plus size={16} aria-hidden="true" /></motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div id={`${base}-${i}`} role="region" aria-labelledby={`${base}-b${i}`} className="rt-faq-a"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: MORPH }}>
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
    <section className="rt-section rt-final">
      <div className="rt-grid-bg" aria-hidden="true" />
      <div className="rt-rail">
        <Reveal className="rt-final-inner">
          <h2>Your next cancel is already in Stripe. Find it today.</h2>
          <p className="rt-sub">Install in two clicks. First scores by tomorrow morning.</p>
          <div className="rt-cta-row rt-cta-center">
            <Btn size="lg" href="/signup" onClick={() => track('final_cta_clicked')}>Start free trial <ArrowRight size={16} /></Btn>
            <Btn size="lg" variant="secondary" href="/docs">Read the docs</Btn>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* 14. Footer. */
const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Compare', 'Changelog']],
  ['Resources', ['Docs', 'How the score works', 'Churn calculator', 'Blog']],
  ['Company', ['About', 'Contact', 'Status']],
  ['Legal', ['Privacy', 'Terms', 'Data processing']],
]
const ANCHORS: Record<string, string> = { Features: 'features', Pricing: 'pricing', Compare: 'compare', 'How the score works': 'demo' }
export function Footer() {
  return (
    <footer className="rt-footer">
      <div className="rt-rail">
        <div className="rt-foot-top">
          <Wordmark />
          <div className="rt-foot-cols">
            {FOOT.map(([h, links]) => (
              <div key={h}><h3>{h}</h3><ul>{links.map((l) => <li key={l}><a href={ANCHORS[l] ? `#${ANCHORS[l]}` : '#top'} onClick={(e) => { e.preventDefault(); scrollToId(ANCHORS[l] ?? 'top') }}>{l}</a></li>)}</ul></div>
            ))}
          </div>
        </div>
        <div className="rt-foot-bottom"><span>(c) 2026 Retain</span><span>Made for founders on Stripe</span></div>
      </div>
    </footer>
  )
}
