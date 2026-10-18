import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { AuditButton, Button, Eyebrow, MORPH, Reveal, SectionHead, TrialButton, Wordmark, track, useCountUp } from './shared'

/* ------------------------------------------------------------------ How it works + ASCII rank chart */

const STEPS: [string, string][] = [
  ['Paste your website', 'Factorie reads your homepage and key pages and writes your brand summary and competitor list.'],
  ['Approve your prompts', 'Get 20 buyer-style questions to track. Edit, delete or add your own.'],
  ['Get your score every week', 'Factorie checks every prompt on every engine, scores the answers and emails you what changed.'],
]

/** Position weights from the scoring spec: 1 = 100, then 15 less per place, 7+ = 20; prose 60; not named 0. */
const RANKS: [string, string, number][] = [
  ['#1 ', 'listed first   ', 100],
  ['#2 ', '               ', 85],
  ['#3 ', '               ', 70],
  ['#4 ', '               ', 55],
  ['#5 ', '               ', 40],
  ['#6 ', '               ', 25],
  ['#7+', '               ', 20],
  ['~~ ', 'named in prose ', 60],
  ['-- ', 'not mentioned  ', 0],
]

function AsciiRank() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const p = useCountUp(100, 900, inView) / 100
  const score = useCountUp(30.4, 900, inView, 1)
  const rows = RANKS.map(([r, l, v]) => {
    const blocks = Math.round((v / 5) * p)
    return { lead: `${r.padEnd(5, ' ')}${l} `, bar: v === 0 ? '' : '#'.repeat(blocks), rest: '.'.repeat(20 - blocks), pts: ` ${String(Math.round(v * p)).padStart(3, ' ')}` }
  })
  return (
    <div className="fc-ascii" ref={ref}>
      <div className="fc-ascii-head">
        <span className="fc-kicker fc-mono">How one answer is scored</span>
        <span className="fc-mono fc-label">Same rule on every engine</span>
      </div>
      <pre className="fc-pre" role="img" aria-label="ASCII chart: an answer scores 100 if you are listed first, 85 second, 70 third, 55 fourth, 40 fifth, 25 sixth, 20 seventh or lower, 60 if named outside a list, and 0 if not mentioned.">
        <span className="fc-pre-dim">{'rank answer          weight (# = 5 pts)    pts'}</span>{'\n'}
        <span className="fc-pre-dim">{'─'.repeat(46)}</span>{'\n'}
        {rows.map((r, i) => (
          <span key={i}>{r.lead}<span className="fc-pre-bar">{r.bar}</span><span className="fc-pre-dim">{r.rest}</span><span className="fc-pre-pts">{r.pts}</span>{'\n'}</span>
        ))}
      </pre>
      <div className="fc-ascii-ex">
        <span className="fc-mono fc-label">Worked example · 25 prompts on ChatGPT</span>
        <p className="fc-mono fc-ex-line">3 x #1 + 4 x #3 + 3 in prose</p>
        <p className="fc-mono fc-ex-line">= 3 x 100 + 4 x 70 + 3 x 60 = 760</p>
        <p className="fc-mono fc-ex-line">760 / 25 = <b className="fc-slot-4">{score.toFixed(1)}</b> visibility</p>
      </div>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section className="fc-section" id="how" aria-labelledby="fc-how-h">
      <div className="fc-container">
        <Reveal className="fc-head">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="fc-h2" id="fc-how-h">Three steps. Then it runs itself.</h2>
        </Reveal>
        <ol className="fc-grid3">
          {STEPS.map(([t, d], i) => (
            <Reveal as="li" key={t} delay={i * 0.04} className="fc-cell">
              <span className="fc-step fc-mono">{i + 1}</span>
              <h3 className="fc-h3">{t}</h3>
              <p className="fc-small">{d}</p>
            </Reveal>
          ))}
        </ol>
        <Reveal><AsciiRank /></Reveal>
        <div className="fc-under"><TrialButton location="how" /></div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Comparison */

const VENDORS = ['Factorie', 'Searchable', 'Profound', 'Otterly.ai', 'Peec AI']
type Cell = string | true
const ROWS: [string, Cell[]][] = [
  ['Entry price', ['$99/mo', 'Ask vendor', 'Ask vendor', '$29/mo (Lite)', 'Ask vendor']],
  ['Prompts on entry plan', ['25', 'Ask vendor', 'Ask vendor', '15', '50']],
  ['Engines included on entry plan', ['5 (ChatGPT, Perplexity, Gemini, Claude, DeepSeek)', 'Ask vendor', 'Ask vendor', 'Core engines; others are add-ons', 'Ask vendor']],
  ['All engines with no add-ons', ['Growth, $199/mo (6 engines)', 'No', 'Ask vendor', 'No', 'No']],
  ['Raw answers with highlights', [true, true, true, true, true]],
  ['Every cited source counted', [true, true, true, true, true]],
  ['Page recommendations with outlines', ['Yes, weekly', true, true, 'Limited', 'Limited']],
  ['Daily email digest', [true, 'Ask vendor', 'Ask vendor', true, 'Ask vendor']],
  ['Free AI visibility audit', ['Yes, no signup', 'Ask vendor', 'No', 'Ask vendor', 'Ask vendor']],
  ['Free trial', ['7 days', 'Ask vendor', 'Ask vendor', true, true]],
]
const VS: [string, string][] = [['searchable', 'Searchable'], ['profound', 'Profound'], ['otterly', 'Otterly'], ['peec', 'Peec']]

export function Compare() {
  return (
    <section className="fc-section" id="compare" aria-labelledby="fc-compare-h">
      <div className="fc-container">
        <Reveal className="fc-head">
          <Eyebrow>Compare</Eyebrow>
          <h2 className="fc-h2" id="fc-compare-h">Everything you need, without the enterprise price tag</h2>
          <p className="fc-sub">Prices from each vendor's public pages and reviews, checked October 2026. They change often; check before you buy.</p>
        </Reveal>
        <Reveal y={0}>
          <div className="fc-table-box" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
            <table className="fc-table">
              <thead>
                <tr>
                  <td />
                  {VENDORS.map((v, i) => <th key={v} scope="col" className={i === 0 ? 'is-us' : ''}>{v}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((c, i) => (
                      <td key={i} className={i === 0 ? 'is-us' : ''}>
                        {c === true ? <><Check size={14} strokeWidth={2} className="fc-ok" aria-hidden="true" /><span className="fc-sr">Yes</span></> : c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <ul className="fc-vs">
          {VS.map(([slug, name]) => (
            <li key={slug}><a href={`/vs/${slug}`} onClick={(e) => { e.preventDefault(); track('lp_compare_link', { competitor: slug }) }}>Factorie vs {name}</a></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Pricing */

type Plan = { id: 'starter' | 'growth'; name: string; blurb: string; month: string; year: string; perMo: string; features: string[]; picked?: boolean }
const PLANS: Plan[] = [
  {
    id: 'starter', name: 'Starter', blurb: 'For one brand getting started with AI search.', month: '$99', year: '$990', perMo: '$82.50/mo billed yearly',
    features: ['1 brand', '25 tracked prompts', '5 engines: ChatGPT, Perplexity, Gemini, Claude, DeepSeek', 'Weekly checks', '5 competitors', '5 rechecks a day', 'Weekly recommendations', 'Daily digest email', 'CSV export'],
  },
  {
    id: 'growth', name: 'Growth', blurb: 'For teams and agencies tracking more.', month: '$199', year: '$1,990', perMo: '$165.83/mo billed yearly', picked: true,
    features: ['3 brands', '60 tracked prompts', 'All 6 engines, including Grok', 'Weekly checks plus daily checks on 10 pinned prompts', '50 competitors per brand', '10 rechecks a day', 'On-demand recommendations', 'Digest to 5 recipients', 'CSV export'],
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const set = (a: boolean) => { setAnnual(a); track('lp_pricing_toggle', { interval: a ? 'year' : 'month' }) }
  const interval = annual ? 'year' : 'month'
  return (
    <section className="fc-section" id="pricing" aria-labelledby="fc-pricing-h">
      <div className="fc-container">
        <Reveal className="fc-head fc-head-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="fc-h2" id="fc-pricing-h">Simple pricing. Start free for 7 days.</h2>
        </Reveal>
        <div className="fc-toggle-row">
          <div className="fc-toggle" role="radiogroup" aria-label="Billing interval">
            {[false, true].map((a) => (
              <button key={String(a)} type="button" role="radio" aria-checked={annual === a} className={annual === a ? 'is-on' : ''} onClick={() => set(a)}>
                {a ? 'Annual' : 'Monthly'}
              </button>
            ))}
          </div>
          <span className="fc-tag fc-tag-green">2 months free</span>
        </div>
        <div className="fc-plans">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.04} className={`fc-plan ${p.picked ? 'is-picked' : ''}`}>
              <div className="fc-plan-top">
                <h3 className="fc-plan-name">{p.name}</h3>
                {p.picked && <span className="fc-tag fc-tag-violet">Most picked</span>}
              </div>
              <p className="fc-small">{p.blurb}</p>
              <div className="fc-price" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={interval} className="fc-price-in" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.12, ease: MORPH }}>
                    <span className="fc-price-v fc-num">{annual ? p.year : p.month}</span>
                    <span className="fc-price-u">/{interval}</span>
                    <span className="fc-price-note fc-mono">{annual ? p.perMo : 'Billed monthly'}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
              <Button full href={`/signup?plan=${p.id}&interval=${interval}`} onClick={() => { track('lp_plan_click', { plan: p.id, interval }); track('lp_cta_click', { location: 'pricing', cta: 'trial' }) }}>
                Start free trial
              </Button>
              <ul className="fc-features">
                {p.features.map((f) => <li key={f}><Check size={14} strokeWidth={2} className="fc-ok" aria-hidden="true" />{f}</li>)}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="fc-note">Prices in USD. Need more brands or prompts? Email <a href="mailto:hello@yourdomain.com">hello@yourdomain.com</a>.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ FAQ */

export const FAQ: [string, string][] = [
  ['What is AEO?', 'Answer engine optimisation means getting AI assistants like ChatGPT and Perplexity to mention and recommend your brand when buyers ask for advice. It is the AI version of SEO.'],
  ['How does Factorie check the engines?', 'We send your tracked questions to each engine through their APIs on a schedule, save the full answer, and read it for your brand, competitors, positions and sources. Engines with web search look things up live; others answer from what they learned in training. We label which is which.'],
  ['Will the answers match what I see in ChatGPT?', "Closely, not exactly. AI answers vary by account, location and wording, even for the same person. That's why we track the same questions every week and look at the trend, not one answer."],
  ['Which engines do you track?', 'ChatGPT, Perplexity, Gemini, Claude and DeepSeek on Starter. Growth adds Grok. Every engine is included in the price, with no add-ons.'],
  ['How are the questions chosen?', 'Factorie reads your website and writes 20 buyer-style questions like "best X for Y" and "X alternatives". You edit, delete and add your own before anything is tracked.'],
  ['How is the visibility score worked out?', "Each answer scores 0 to 100: 100 if you're listed first, less the lower you appear, 60 if you're mentioned outside a list, 0 if you're not mentioned. Your score is the average across your prompts."],
  ['Can I track my competitors?', 'Yes. Up to 5 per brand on Starter and 50 on Growth. You see their share of voice, positions and the prompts they win.'],
  ['How fast will my score change?', 'Engines with web search can change within days of new pages or mentions going live. Memory-only engines change when the model is updated, which can take months.'],
  ['Is this for agencies?', 'Yes. Growth includes 3 brands. Many agencies use Factorie to run a free AI visibility audit for prospects and a monthly report for clients.'],
  ['Do you need access to my website or analytics?', 'No. We only read your public pages. No code, no tracking script.'],
  ['What happens after the trial?', 'Your plan starts on day 8 unless you cancel. We email you 3 days before. Cancel in two clicks in billing.'],
  ['Can I change plans?', 'Any time from billing. Upgrades apply straight away; downgrades apply at the next renewal.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const base = useId()
  return (
    <section className="fc-section" id="faq" aria-labelledby="fc-faq-h">
      <div className="fc-container fc-faq-grid">
        <SectionHead eyebrow="FAQ" title="Questions, answered" />
        <ul className="fc-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <li key={q} className={isOpen ? 'is-open' : ''}>
                <h3>
                  <button type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`}
                    onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('lp_faq_open', { index: i }) }}>
                    <span>{q}</span>
                    <ChevronDown size={16} strokeWidth={1.5} className="fc-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className="fc-faq-a"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: MORPH }}>
                      <p>{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Final CTA + footer */

export function FinalCta() {
  return (
    <section className="fc-section fc-final-wrap" aria-labelledby="fc-final-h">
      <div className="fc-container">
        <Reveal className="fc-final">
          <div className="fc-dots fc-dots-soft" aria-hidden="true" />
          <h2 className="fc-h2" id="fc-final-h">Find out what AI says about you this week.</h2>
          <p className="fc-sub">Start your 7-day free trial. Your first visibility score is ready in about 10 minutes.</p>
          <div className="fc-ctas fc-ctas-center">
            <TrialButton location="final" />
            <AuditButton location="final" label="Get a free audit" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Changelog', 'Free audit']],
  ['Compare', ['vs Searchable', 'vs Profound', 'vs Otterly', 'vs Peec']],
  ['Resources', ['AEO guide', 'Blog', 'llms.txt']],
  ['Company', ['About', 'Contact', 'Privacy', 'Terms']],
]

export function Footer() {
  return (
    <footer className="fc-footer">
      <div className="fc-container">
        <div className="fc-foot-cols">
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <h2 className="fc-foot-h fc-mono">{h}</h2>
              <ul>{links.map((l) => <li key={l}><a href="#top">{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="fc-foot-bottom">
          <Wordmark />
          <span className="fc-mono">© 2026 Factorie</span>
          <span>Made for teams who want to be the answer.</span>
        </div>
      </div>
    </footer>
  )
}

