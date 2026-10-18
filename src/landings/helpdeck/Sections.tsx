import { useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowRight, Check, ChevronDown, Minus } from 'lucide-react'
import { EASE, Reveal, TrialButton, Wordmark, scrollToId, track, useCountUp } from './shared'

/* ---------------- 4. Logo strip ---------------- */
const PLATFORMS = ['Webflow', 'WordPress', 'Shopify', 'Framer', 'Squarespace', 'Ghost', 'Next.js', 'Plain HTML']

export function LogoStrip() {
  return (
    <section className="hd-logos" aria-label="Supported platforms">
      <div className="hd-container">
        <p className="hd-logos-cap">Works on any site you can paste a script tag into</p>
        <div className="hd-logos-mask">
          <ul className="hd-logos-row">
            {PLATFORMS.map((p, i) => (
              <Reveal as="li" key={p} delay={i * 0.05}>{p}</Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 5. Problem ---------------- */
const PROBLEMS = [
  { t: 'Your inbox is a FAQ.', b: '"How do I reset my password?" for the 40th time this month.', vis: 'inbox' },
  { t: 'Big support tools are big.', b: 'Weeks of setup, per-seat pricing, and AI add-ons billed per resolution.', vis: 'seats' },
  { t: 'Basic chatbots make things up.', b: 'A wrong answer about pricing or refunds costs more than no answer.', vis: 'wrong' },
]

function ProblemVis({ kind }: { kind: string }) {
  if (kind === 'inbox') {
    return (
      <div className="hd-pvis hd-pvis-inbox" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="hd-pvis-mail" style={{ animationDelay: `${i * 0.9}s` }}>
            <i /> How do I reset my password? <b>#{38 + i}</b>
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'seats') {
    return (
      <div className="hd-pvis hd-pvis-seats" aria-hidden="true">
        <span>Seat × 5</span><span>+ AI add-on</span><span>+ per resolution</span>
      </div>
    )
  }
  return (
    <div className="hd-pvis hd-pvis-wrong" aria-hidden="true">
      <span className="hd-bubble hd-bubble-bot">Refunds are available for 90 days!</span>
      <span className="hd-wrong-tag">Not in your docs</span>
    </div>
  )
}

export function Problem() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const hours = useCountUp(30, 900, inView)
  return (
    <section className="hd-section hd-problem" id="problem" aria-labelledby="problem-h">
      <div className="hd-container">
        <Reveal className="hd-section-head">
          <h2 id="problem-h" className="hd-h2">You answer the same 30 questions every week.</h2>
          <p className="hd-sub">The answers are already in your docs. Customers do not read them, and your inbox fills up anyway.</p>
        </Reveal>
        <div className="hd-cells hd-problem-grid hd-bleed">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.t} className="hd-tile hd-problem-card" delay={i * 0.08}>
              <ProblemVis kind={p.vis} />
              <h3 className="hd-h3">{p.t}</h3>
              <p>{p.b}</p>
            </Reveal>
          ))}
          <Reveal className="hd-tile hd-stat" delay={0.1}>
            <div ref={ref} className="hd-stat-inner">
              <div className="hd-stat-num" aria-hidden="true">{hours}<span>h</span></div>
              <div>
                <p className="hd-stat-line">If a ticket takes 6 minutes and you get 300 a month, that is <strong>{hours} hours</strong> of copy and paste.</p>
                <a href="#video" className="hd-link" onClick={(e) => { e.preventDefault(); scrollToId('video') }}>
                  See how Helpdeck handles it <ArrowDown size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 9. How it works ---------------- */
const ASCII_WIDE = String.raw`
  your-site.com ──▶ [ read ] ──▶ [ split ] ───▶ [ learn ]
                    84 pages    612 sections   embeddings
                                                    │
  customer asks ───────────────────▶ [ find the closest sections ]
                                                    │
                                              sure enough?
                                         ┌──────────┴──────────┐
                                        yes                   no
                                         ▼                     ▼
                               answer + source link     "I'm not sure"
                                                        → email to you
`

const ASCII_NARROW = String.raw`
 your-site.com
     │
 [ read ]    84 pages
     │
 [ split ]   612 sections
     │
 [ learn ]   embeddings
     │
 customer asks
     │
 [ find closest sections ]
     │
 sure enough?
  ├─ yes ▶ answer + source
  └─ no  ▶ "I'm not sure"
           → email to you
`

export function HowItWorks() {
  const reduce = useReducedMotion()
  const steps = [
    { t: 'Paste your URL.', b: 'Helpdeck reads your docs and help pages.' },
    { t: 'Test it.', b: 'Ask your hardest customer questions in the test panel.' },
    { t: 'Add one line to your site.', b: 'The bubble goes live. Unsure questions land in your inbox.' },
  ]
  return (
    <section className="hd-section hd-band" id="how" aria-labelledby="how-h">
      <div className="hd-container">
        <Reveal className="hd-section-head">
          <span className="hd-eyebrow">How it works</span>
          <h2 id="how-h" className="hd-h2">Three steps. About ten minutes.</h2>
        </Reveal>
        <div className="hd-steps">
          <ol>
            {steps.map((s, i) => (
              <Reveal as="li" key={s.t} delay={0.1 + i * 0.12} className="hd-step">
                <span className="hd-step-num" aria-hidden="true">{i + 1}</span>
                {i < steps.length - 1 && (
                  <motion.span
                    className="hd-step-link"
                    aria-hidden="true"
                    initial={{ scaleX: reduce ? 1 : 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.3 + i * 0.35 }}
                  />
                )}
                <h3 className="hd-h3"><span className="hd-sr">Step {i + 1}: </span>{s.t}</h3>
                <p>{s.b}</p>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.1} className="hd-ascii-card">
          <div className="hd-ascii-head">
            <span className="hd-status-dot" /> What happens to a question
            <span className="hd-ascii-file">pipeline.txt</span>
          </div>
          <pre className="hd-ascii hd-ascii-wide" role="img" aria-label="Diagram: your site is read, split into sections and learned. When a customer asks, Helpdeck finds the closest sections. If it is sure enough it answers with a source link, otherwise it says it is not sure and emails you.">{ASCII_WIDE.slice(1)}</pre>
          <pre className="hd-ascii hd-ascii-narrow" role="img" aria-label="Diagram: your site is read, split into sections and learned. When a customer asks, Helpdeck finds the closest sections. If it is sure enough it answers with a source link, otherwise it says it is not sure and emails you.">{ASCII_NARROW.slice(1)}</pre>
        </Reveal>

        <div className="hd-center"><TrialButton location="how_it_works" /></div>
      </div>
    </section>
  )
}

/* ---------------- 10. Comparison ---------------- */
const COLS = ['Helpdeck', 'Intercom (Fin)', 'Zendesk AI', 'Chatbase', 'Crisp']
const ROWS: [string, string[]][] = [
  ['Live from a URL in minutes', ['Yes', 'No, needs workspace setup', 'No, needs help centre setup', 'Yes', 'Partly']],
  ['Source link on every answer', ['Yes', 'Yes', 'Yes', 'Optional', 'Varies']],
  ['Says "not sure" and hands off by email', ['Yes', 'Yes, to agents in Intercom', 'Yes, to agents in Zendesk', 'Varies', 'Yes']],
  ['Needs a full helpdesk to work', ['No', 'Yes', 'Yes', 'No', 'No']],
  ['Pricing', ['$49/month flat', 'Seat price + per resolution', 'Seat price + AI add-on', 'Varies', 'Varies']],
]

function Cell({ v, first, good }: { v: string; first: boolean; good: boolean }) {
  // `good` marks a row where "No" is the good answer (needs a full helpdesk)
  const positive = good ? v === 'No' : v === 'Yes'
  const negative = good ? v.startsWith('Yes') : v.startsWith('No')
  const icon = positive
    ? <Check size={14} aria-hidden="true" className="hd-yes" />
    : negative ? <Minus size={14} aria-hidden="true" className="hd-no" /> : null
  return <td className={first ? 'hd-col-us' : ''}>{icon}<span>{v}</span></td>
}

export function Compare() {
  return (
    <section className="hd-section" id="compare" aria-labelledby="compare-h">
      <div className="hd-container">
        <Reveal className="hd-section-head">
          <span className="hd-eyebrow">Compare</span>
          <h2 id="compare-h" className="hd-h2">Built for small teams, not support departments.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="hd-table-wrap" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways on small screens">
            <table className="hd-table">
              <thead>
                <tr>
                  <th scope="col"><span className="hd-sr">Feature</span></th>
                  {COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'hd-col-us' : ''}>{i === 0 ? <Wordmark /> : c}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, vals], r) => (
                  <motion.tr key={label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: r * 0.05, duration: 0.4 }}>
                    <th scope="row">{label}</th>
                    {vals.map((v, i) => <Cell key={i} v={v} first={i === 0} good={label.startsWith('Needs')} />)}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hd-foot">Competitor details from public pages. Check each one before you publish.</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- 11. Testimonials (hidden until real ones exist) ---------------- */
const SHOW_TESTIMONIALS = false
type Testimonial = { quote: string; name: string; role: string; company: string; result: string }
const TESTIMONIALS: Testimonial[] = []

export function Testimonials() {
  if (!SHOW_TESTIMONIALS || TESTIMONIALS.length === 0) return null
  return (
    <section className="hd-section" aria-labelledby="t-h">
      <div className="hd-container">
        <h2 id="t-h" className="hd-h2">Teams that got their inbox back</h2>
        <div className="hd-problem-grid">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="hd-tile"><strong>{t.result}</strong><blockquote>{t.quote}</blockquote><figcaption>{t.name}, {t.role}, {t.company}</figcaption></figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- 12. Pricing ---------------- */
const PLANS = [
  {
    id: 'starter', name: 'Starter', monthly: 49, yearly: 490, line: 'For one product and one website.',
    includes: ['1 bot', 'Up to 200 pages', '2,000 answers a month', 'Email handoff', 'Conversations inbox', 'Brand colour'],
  },
  {
    id: 'growth', name: 'Growth', monthly: 129, yearly: 1290, badge: 'For busy support inboxes', line: '',
    includes: ['Everything in Starter', '3 bots', 'Up to 1,000 pages per bot', '10,000 answers a month', 'Remove "Powered by Helpdeck"', 'Weekly "what your docs are missing" email'],
  },
]

export function Pricing() {
  const [yearly, setYearly] = useState(false)
  const set = (y: boolean) => { setYearly(y); track('pricing_toggle', { interval: y ? 'year' : 'month' }) }
  return (
    <section className="hd-section hd-pricing" id="pricing" aria-labelledby="pricing-h">
      <div className="hd-container">
        <Reveal className="hd-section-head">
          <span className="hd-eyebrow">Pricing</span>
          <h2 id="pricing-h" className="hd-h2">One price. No <span className="hd-nowrap">per-resolution</span> fees.</h2>
          <p className="hd-sub">Every plan starts with a 7-day free trial.</p>
        </Reveal>
        <div className="hd-toggle" role="group" aria-label="Billing period">
          {[false, true].map((y) => (
            <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => set(y)} className={yearly === y ? 'on' : ''}>
              {yearly === y && <motion.span layoutId="hd-toggle-pill" className="hd-toggle-pill" transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} />}
              <span className="hd-toggle-label">{y ? <>Yearly <em>· 2 months free</em></> : 'Monthly'}</span>
            </button>
          ))}
        </div>
        <div className="hd-plans">
          {PLANS.map((p, i) => {
            const price = yearly ? p.yearly : p.monthly
            const card = (
              <div className="hd-plan">
                <div className="hd-plan-top">
                  <h3 className="hd-h3">{p.name}</h3>
                  {p.badge && <span className="hd-pill hd-pill-accent"><i className="hd-status-dot" /> {p.badge}</span>}
                </div>
                {p.line ? <p className="hd-plan-line">{p.line}</p> : <p className="hd-plan-line" aria-hidden="true">&nbsp;</p>}
                <div className="hd-price" aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={`${p.id}-${yearly}`} className="hd-price-num" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                      ${price.toLocaleString('en-US')}
                    </motion.span>
                  </AnimatePresence>
                  <span className="hd-price-per">/{yearly ? 'year' : 'month'}</span>
                </div>
                <TrialButton location={`pricing_${p.id}`} label="Start 7-day free trial" />
                <ul className="hd-bullets">
                  {p.includes.map((x) => <li key={x}><Check size={14} aria-hidden="true" /> {x}</li>)}
                </ul>
              </div>
            )
            return (
              <Reveal key={p.id} delay={i * 0.1} className={p.badge ? 'hd-plan-glow' : 'hd-plan-wrap'}>
                {card}
              </Reveal>
            )
          })}
        </div>
        <p className="hd-plans-note">Need more answers? We will never cut your bot off mid-month. If you pass your limit, we email you and switch the bot to "email us" mode until you upgrade or the month resets.</p>
      </div>
    </section>
  )
}

/* ---------------- 13. FAQ ---------------- */
export const FAQ: [string, string][] = [
  ['What can Helpdeck learn from?', 'Any public web pages: docs, help centre, pricing, FAQ, blog. Paste one URL and it follows the links on that site. PDF and Notion uploads are coming later.'],
  ['Will it make things up?', 'It is told to answer only from your pages and to say when it is not sure. Every answer links to its source, and questions your pages do not cover are handed to you instead of guessed.'],
  ['Which AI model does it use?', 'Answers are written by Claude from Anthropic. Your pages are searched with Voyage AI embeddings stored in our database.'],
  ['Is my data used to train AI models?', 'No. Your pages and chats are used only to answer your customers. Anthropic does not train on API data by default.'],
  ['How long until it is live?', 'Most sites are read in under five minutes. Add one line to your site and the bubble appears.'],
  ['Does it work on Webflow, WordPress and Shopify?', 'Yes, and on anything else that lets you add a script tag. The install page has step-by-step instructions for each.'],
  ['What happens when my docs change?', 'Click Re-crawl. Helpdeck only re-learns pages that changed, so it takes seconds.'],
  ['Can someone put my widget on their site?', 'No. The bot only answers on the domains you list in Settings.'],
  ['What counts as an answer?', 'One reply from the bot. A chat with three questions uses three answers. Handoffs are free.'],
  ['What languages does it speak?', 'It replies in the language the customer writes in, even if your docs are in English.'],
  ['What happens after the trial?', 'Pick a plan at checkout. If you do not, the bubble switches to "email us" mode and your pages and chats stay safe.'],
  ['Can I cancel any time?', 'Yes, from Settings → Billing. You keep access until the end of the period you paid for.'],
]

export function Faq() {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="hd-section" id="faq" aria-labelledby="faq-h">
      <div className="hd-container hd-faq-layout">
        <Reveal className="hd-section-head hd-faq-head">
          <span className="hd-eyebrow">FAQ</span>
          <h2 id="faq-h" className="hd-h2">Questions founders ask us</h2>
        </Reveal>
        <div className="hd-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className={`hd-faq-item ${isOpen ? 'open' : ''}`}>
                <h3>
                  <button
                    type="button"
                    id={`hd-faq-b${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`hd-faq-p${i}`}
                    onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('faq_open', { question_index: i }) }}
                  >
                    {q}
                    <ChevronDown size={18} aria-hidden="true" className="hd-chev" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`hd-faq-p${i}`}
                      role="region"
                      aria-labelledby={`hd-faq-b${i}`}
                      className="hd-faq-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}
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

/* ---------------- 14. Final CTA ---------------- */
export function FinalCta() {
  const qs = ['Where is my invoice?', 'Can I change my plan?', 'Do you have an API?']
  return (
    <section className="hd-section hd-final-wrap" aria-labelledby="final-h">
      <div className="hd-container">
        <div className="hd-final">
          <div className="hd-final-dots" aria-hidden="true" />
          <div className="hd-final-bubbles" aria-hidden="true">
            {qs.map((q, i) => <span key={q} className={`hd-float hd-float-${i}`}>{q}</span>)}
          </div>
          <Reveal className="hd-final-copy">
            <h2 id="final-h" className="hd-h2">Your docs already have the answers. Let them talk.</h2>
            <p className="hd-sub">Start a 7-day free trial and have a bot live on your site today.</p>
            <div className="hd-cta-row hd-cta-center">
              <TrialButton location="final_cta" />
              <a href="#try" className="hd-btn hd-btn-ghost hd-btn-md" onClick={(e) => { e.preventDefault(); scrollToId('try') }}>
                Try it on your site <ArrowRight size={15} aria-hidden="true" className="hd-btn-arrow" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 15. Footer ---------------- */
const FOOT: [string, [string, string][]][] = [
  ['Product', [['Features', '#product'], ['Pricing', '#pricing'], ['Live demo', '#try'], ['Changelog', '#top']]],
  ['Install guides', [['Webflow', '#top'], ['WordPress', '#top'], ['Shopify', '#top'], ['Framer', '#top'], ['HTML', '#top']]],
  ['Resources', [['Docs', '#top'], ['Status', '#top'], ['Contact', '#top']]],
  ['Legal', [['Privacy', '#top'], ['Terms', '#top'], ['Data processing', '#top']]],
]

export function Footer() {
  return (
    <footer className="hd-footer">
      <div className="hd-container">
        <div className="hd-foot-cols">
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <h3>{h}</h3>
              <ul>
                {links.map(([l, href]) => (
                  <li key={l}><a href={href} onClick={(e) => { e.preventDefault(); scrollToId(href.slice(1)) }}>{l}</a></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="hd-foot-bottom">
          <Wordmark />
          <span>© 2026 Helpdeck</span>
          <span className="hd-foot-line">Support answers from your own docs.</span>
        </div>
      </div>
    </footer>
  )
}
