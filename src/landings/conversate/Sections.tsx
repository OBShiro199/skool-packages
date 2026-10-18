import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { BookOpen, Bot, ChevronDown, MessageSquareWarning, Receipt } from 'lucide-react'
import { EASE, MORPH, Eyebrow, Reveal, TrialButton, UrlForm, Wordmark, track } from './shared'

/* 4. Logo strip: platforms you install on, not customers. */
export function LogoStrip() {
  const names = ['Shopify', 'Webflow', 'WordPress', 'Framer', 'Next.js', 'Squarespace']
  return (
    <section className="cv-logos cv-band" aria-label="Platforms">
      <div className="cv-wrap cv-logos-inner">
        <p className="cv-logos-label">Built for teams on</p>
        <ul className="cv-logos-list">
          {names.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </div>
    </section>
  )
}

/* 5. Problem */
export function Problem() {
  const items = [
    { icon: BookOpen, t: 'The answers are already on your site.', b: 'Buried in your pricing page, your FAQ and three blog posts. Customers will not dig. They email you.' },
    { icon: MessageSquareWarning, t: 'Chatbots make things up.', b: 'A bot that invents a refund policy costs you more than it saves. Most tools do not show where an answer came from.' },
    { icon: Receipt, t: 'AI help desks charge per answer.', b: "Intercom's AI agent is about $0.99 per resolution on top of seats. 1,000 resolutions is a $1,000 surprise. *" },
  ]
  return (
    <section className="cv-section" aria-labelledby="cv-problem-h">
      <div className="cv-wrap">
        <Reveal className="cv-head">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="cv-h2" id="cv-problem-h">You answer the same 40 questions every week.</h2>
        </Reveal>
        <ul className="cv-problems">
          {items.map(({ icon: Icon, t, b }, i) => (
            <Reveal as="li" key={t} delay={i * 0.08} className="cv-box">
              <span className="cv-icon-box" aria-hidden="true"><Icon size={16} strokeWidth={1.5} /></span>
              <h3 className="cv-h4">{t}</h3>
              <p className="cv-body">{b}</p>
            </Reveal>
          ))}
        </ul>
        <p className="cv-foot">* Intercom Fin pricing as listed in Oct 2026. Check intercom.com/pricing.</p>
      </div>
    </section>
  )
}

/* 8. How it works, with the page's one ASCII element: how an answer is routed. */
const ASCII_WIDE = `  visitor asks ──▶ search your knowledge ──▶ draft answer + sources
                                                     │
                                              confidence score
                                   ┌─────────────────┴─────────────────┐
                           at or over 0.55                        under 0.55
                          (your threshold)                             │
                                   │                                   ▼
                                   ▼                         "I am not sure" card
                        answer shown with                    + "Talk to a human"
                        2 source pills                                 │
                                                                       ▼
                                                        your inbox + an email alert`
const ASCII_NARROW = `visitor asks
   │
   ▼
search your knowledge
   │
   ▼
draft answer + sources
   │
confidence score
   ├─ 0.55 or more ─▶ answer shown
   │                  with sources
   │
   └─ under 0.55 ──▶ "Talk to a human"
                      │
                      ▼
               your inbox + email`

export function HowItWorks() {
  const steps = [
    ['Paste your website.', 'We read your public pages. About 3 minutes for 100 pages.'],
    ['Review your help centre.', 'Edit the drafts you want, then publish them all.'],
    ['Add one script tag.', 'The widget answers visitors and hands off to your team.'],
  ]
  const lineRef = useRef<HTMLDivElement>(null)
  const inView = useInView(lineRef, { once: true, amount: 0.5 })
  const reduce = useReducedMotion()
  return (
    <section className="cv-section" id="how" aria-labelledby="cv-how-h">
      <div className="cv-wrap">
        <Reveal className="cv-head cv-head-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="cv-h2" id="cv-how-h">Live before lunch.</h2>
        </Reveal>
        <div className="cv-steps-wrap" ref={lineRef}>
          <motion.span
            className="cv-steps-line"
            aria-hidden="true"
            initial={reduce ? false : { scaleX: 0 }}
            animate={inView || reduce ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.5, ease: MORPH, delay: 0.2 }}
          />
          <ol className="cv-steps">
            {steps.map(([t, b], i) => (
              <Reveal as="li" key={t} delay={i * 0.08} className="cv-step">
                <span className="cv-step-num cv-tab-num" aria-hidden="true">{i + 1}</span>
                <h3 className="cv-h4">{t}</h3>
                <p className="cv-body">{b}</p>
              </Reveal>
            ))}
          </ol>
        </div>
        <Reveal className="cv-ascii-box">
          <div className="cv-ascii-h"><Bot size={14} aria-hidden="true" /> What happens when a visitor asks</div>
          <pre className="cv-ascii cv-ascii-wide" role="img" aria-label="Flow: the visitor asks, Conversate searches your knowledge and drafts an answer with sources, then scores its confidence. At or over your threshold of 0.55 the answer is shown with source pills. Under it, the visitor sees an 'I am not sure' card and 'Talk to a human', and the chat goes to your inbox with an email alert.">{ASCII_WIDE}</pre>
          <pre className="cv-ascii cv-ascii-narrow" aria-hidden="true">{ASCII_NARROW}</pre>
        </Reveal>
        <div className="cv-center"><TrialButton location="how" size="lg" /></div>
      </div>
    </section>
  )
}

/* 9. Comparison */
const V = '[verify]'
const COLS = ['Conversate Starter', 'Ferndesk Startup', 'Intercom (Essential + Fin)', 'Help Scout (Standard + AI Answers)', 'Crisp (Essentials)']
const ROWS: [string, string[]][] = [
  ['Starting price', ['$49 / month', `$49 / month ${V}`, `$29 / seat / month annual, $39 monthly ${V}`, `$25 / user / month ${V}`, `$95 / workspace / month ${V}`]],
  ['AI answers included', ['1,500 / month', `250 / month ${V}`, `none, $0.99 per resolution ${V}`, `none, $0.75 per resolution ${V}`, `$25 of AI credits ${V}`]],
  ['Help centre drafted from your website', ['Yes, in about 5 minutes', `Drafts from code, tickets and changelogs ${V}`, 'Write it yourself', 'Write it yourself', 'Write it yourself']],
  ['Answers show sources + confidence', ['Yes, both', `Sources ${V}`, 'Sources', `Sources ${V}`, V]],
  ['Shared inbox with live chat', ['Yes', `No (help centre + widget) ${V}`, 'Yes', 'Yes', 'Yes']],
  ['Content gaps to one-click article', ['Yes', `Yes ${V}`, `Partly (reports) ${V}`, `No ${V}`, `No ${V}`]],
  ['Seats included', ['3', `5 editors ${V}`, 'per seat', 'per user', '10']],
  ['Example: 3 people, 1,000 AI resolutions', ['$49', `about $144 (Scale $119 + 500 answers $25) ${V}`, `about $1,077 (3 x $29 + 1,000 x $0.99) ${V}`, `about $825 (3 x $25 + 1,000 x $0.75) ${V}`, `depends on credits ${V}`]],
]
function Cell({ text }: { text: string }) {
  const has = text.includes(V)
  const rest = text.replace(V, '').trim()
  return <>{rest}{has && <> <span className="cv-verify">[verify]</span></>}</>
}
export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.3 })
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => { if (seen) track('compare_view') }, [seen])
  return (
    <section className="cv-section cv-band" id="compare" aria-labelledby="cv-compare-h">
      <div className="cv-wrap" ref={ref}>
        <Reveal className="cv-head">
          <Eyebrow>Compare</Eyebrow>
          <h2 className="cv-h2" id="cv-compare-h">Everything in one tool, priced per month, not per answer.</h2>
        </Reveal>
        <span className={`cv-scroll-hint ${scrolled ? 'is-off' : ''}`} aria-hidden="true">Scroll sideways →</span>
        <Reveal className="cv-frame cv-table-frame">
          <div className="cv-table-scroll" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways" onScroll={() => setScrolled(true)}>
            <table className="cv-table">
              <caption className="cv-sr">Conversate Starter compared with Ferndesk, Intercom, Help Scout and Crisp</caption>
              <thead>
                <tr>
                  <td />
                  {COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'is-us' : ''}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((c, i) => <td key={i} className={i === 0 ? 'is-us' : ''}><Cell text={c} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <p className="cv-foot">
          Competitor prices from their public pages and third-party summaries, checked October 2026. Prices change:
          confirm on each vendor's pricing page. [verify] marks figures we could not confirm on the vendor's own page.
        </p>
        <p className="cv-choose">
          Choose Intercom if you need phone, WhatsApp and a large team today. Choose Ferndesk if your docs live in a
          codebase. Choose Conversate if you want a help centre, an AI agent and an inbox running this afternoon.
        </p>
      </div>
    </section>
  )
}

/* 10. Testimonials slot: hidden until there are three real quotes. Stats row stands in. */
export const SHOW_TESTIMONIALS = false
export function Stats() {
  return (
    <section className="cv-stats" aria-label="This page's assistant">
      <div className="cv-wrap">
        <p className="cv-stats-line">
          <i className="cv-dot cv-dot-ok cv-dot-pulse" aria-hidden="true" />
          <span>This page's assistant answered <b className="cv-tab-num">214</b> questions this month, <b className="cv-tab-num">81%</b> without a human.</span>
        </p>
      </div>
    </section>
  )
}

/* 11. Pricing */
type Plan = { id: string; name: string; m: string; y: string; yTotal: string; rows: string[]; branding: boolean; popular?: boolean }
const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', m: '49', y: '40.83', yTotal: '$490', rows: ['1,500 / month', '300', '3', '500 / month', '40 / month'], branding: false },
  { id: 'growth', name: 'Growth', m: '129', y: '107.50', yTotal: '$1,290', rows: ['5,000 / month', '1,500', '10', '2,000 / month', '150 / month'], branding: true, popular: true },
  { id: 'scale', name: 'Scale', m: '299', y: '249.17', yTotal: '$2,990', rows: ['15,000 / month', '5,000', '25', '6,000 / month', '500 / month'], branding: true },
]
const LABELS = ['AI answers', 'Pages learned', 'Seats', 'Suggested replies', 'AI-drafted articles']
export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const interval = annual ? 'year' : 'month'
  const set = (a: boolean) => { setAnnual(a); track('pricing_toggle', { interval: a ? 'year' : 'month' }) }
  return (
    <section className="cv-section" id="pricing" aria-labelledby="cv-pricing-h">
      <div className="cv-wrap">
        <Reveal className="cv-head cv-head-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="cv-h2" id="cv-pricing-h">Simple plans. Every plan includes the help centre, widget and inbox.</h2>
        </Reveal>
        <div className="cv-center">
          <div className="cv-seg cv-seg-inline" role="radiogroup" aria-label="Billing interval">
            <button type="button" role="radio" aria-checked={!annual} className={!annual ? 'is-on' : ''} onClick={() => set(false)}>Monthly</button>
            <button type="button" role="radio" aria-checked={annual} className={annual ? 'is-on' : ''} onClick={() => set(true)}>Annual · 2 months free</button>
          </div>
        </div>
        <ul className="cv-plans">
          {PLANS.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 0.08} className={`cv-plan ${p.popular ? 'is-popular' : ''}`}>
              <div className="cv-plan-top">
                <h3 className="cv-h4">{p.name}</h3>
                {p.popular && <span className="cv-chip">Most popular</span>}
              </div>
              <div className="cv-price" aria-live="polite">
                <span className="cv-price-num cv-tab-num">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={interval} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}>
                      ${annual ? p.y : p.m}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
              <p className="cv-price-sub cv-tab-num">{annual ? `per month, ${p.yTotal} billed yearly` : 'per month, billed monthly'}</p>
              <a
                href={`/signup?plan=${p.id}&interval=${interval}`}
                className="cv-btn cv-btn-primary cv-btn-block"
                onClick={(e) => { e.preventDefault(); track('pricing_cta_click', { plan: p.id, interval }) }}
              >
                Start free trial
              </a>
              <dl className="cv-plan-rows">
                {LABELS.map((l, j) => (
                  <div key={l}><dt>{l}</dt><dd className="cv-tab-num">{p.rows[j]}</dd></div>
                ))}
                <div><dt>Remove "Powered by Conversate"</dt><dd>{p.branding ? 'Yes' : <span className="cv-faint" aria-label="Not included">–</span>}</dd></div>
              </dl>
            </Reveal>
          ))}
        </ul>
        <p className="cv-plans-note">
          7-day free trial on every plan. Cancel in two clicks. Over your AI answer limit? The assistant pauses and
          visitors can still message you. No surprise bills.
        </p>
      </div>
    </section>
  )
}

/* 12. FAQ */
export const FAQ: [string, string][] = [
  ['How long does setup take?', 'About 5 minutes for a 100-page site: paste your URL, review the drafted articles, publish, then paste one script tag.'],
  ['What if the AI does not know the answer?', 'It says so. Below your confidence threshold the visitor sees "I am not sure" and a "Talk to a human" button, and your team gets an email.'],
  ['Will it make up prices or policies?', 'It is told to answer only from your published knowledge and to cite its sources. Answers without sources get a low score and are not shown.'],
  ['Which websites does the widget work on?', 'Any site where you can add a script tag to the head: plain HTML, Webflow, WordPress, Shopify, Framer, Squarespace, Next.js and more. It only runs on domains you allow.'],
  ['Can my team reply live?', 'Yes. Replies appear in the visitor\'s chat instantly. If they have left, the reply goes by email and their answer comes back into the same conversation.'],
  ['What happens when I hit my AI answer limit?', 'The assistant pauses until your next month or until you upgrade. Visitors can still leave a message and your inbox keeps working. We email you at 80%.'],
  ['Which AI do you use?', 'Claude by Anthropic for answers and drafting, and Voyage AI to find the right parts of your knowledge. Your data is not used to train models.'],
  ['Can I edit the articles?', 'Yes. Every article is yours: edit, unpublish, write new ones by hand or draft one from a content gap.'],
  ['Do you support languages other than English?', 'The assistant answers in the visitor\'s language. Your articles stay in the language you write them in.'],
  ['Can I cancel any time?', 'Yes, from Billing in two clicks. Your help centre and data stay until you delete your workspace.'],
  ['Do you offer agency pricing?', 'Agencies manage each client as its own workspace. Email us for a partner code with 30% recurring commission.'],
]
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const reduce = useReducedMotion()
  // One open at a time: when an answer above collapses, hold the clicked question where it was so the page never jumps.
  const hold = (el: HTMLElement) => {
    const top0 = el.getBoundingClientRect().top
    const t0 = performance.now()
    const tick = () => {
      const d = el.getBoundingClientRect().top - top0
      if (Math.abs(d) > 0.5) window.scrollBy(0, d)
      if (performance.now() - t0 < 360) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  return (
    <section className="cv-section cv-band" id="faq" aria-labelledby="cv-faq-h">
      <div className="cv-wrap cv-faq-wrap">
        <Reveal className="cv-head cv-head-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="cv-h2" id="cv-faq-h">Frequently asked questions</h2>
        </Reveal>
        <ul className="cv-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <li key={q} className={isOpen ? 'is-open' : ''}>
                <h3>
                  <button
                    type="button"
                    id={`cv-faq-q${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`cv-faq-a${i}`}
                    onClick={(e) => { if (open !== null && open < i) hold(e.currentTarget); setOpen(isOpen ? null : i); if (!isOpen) track('faq_open', { index: i }) }}
                  >
                    <span>{q}</span>
                    <ChevronDown size={16} aria-hidden="true" className="cv-faq-chev" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`cv-faq-a${i}`}
                      role="region"
                      aria-labelledby={`cv-faq-q${i}`}
                      className="cv-faq-a"
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={reduce ? { height: 0, transition: { duration: 0 } } : { height: 0 }}
                      transition={{ duration: 0.3, ease: MORPH }}
                    >
                      <motion.p
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.24, delay: reduce ? 0 : 0.06, ease: EASE }}
                      >
                        {a}
                      </motion.p>
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

/* 13. Final CTA */
export function FinalCta() {
  return (
    <section className="cv-final cv-wash" aria-labelledby="cv-final-h">
      <div className="cv-wrap cv-final-inner">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.2 }} className="cv-final-copy">
          <h2 className="cv-h2" id="cv-final-h">Stop answering the same question twice.</h2>
          <p className="cv-lead">Paste your website and see your help centre in five minutes.</p>
          <UrlForm event="final_cta_submit" id="cv-final-url" />
          <p className="cv-micro">7-day free trial · From $49 a month</p>
        </motion.div>
      </div>
    </section>
  )
}

/* 14. Footer */
export function Footer() {
  const cols: [string, string[]][] = [
    ['Product', ['Features', 'Pricing', 'Compare', 'Docs', 'Changelog']],
    ['Install guides', ['Webflow', 'WordPress', 'Shopify', 'Framer', 'Next.js']],
    ['Compare', ['vs Intercom', 'vs Ferndesk', 'vs Crisp', 'vs Help Scout']],
    ['Company', ['Contact', 'Privacy', 'Terms', 'Status']],
  ]
  return (
    <footer className="cv-footer">
      <div className="cv-wrap">
        <div className="cv-footer-top">
          <div className="cv-footer-brand"><Wordmark /></div>
          <nav className="cv-footer-cols" aria-label="Footer">
            {cols.map(([h, links]) => (
              <div key={h}>
                <h3>{h}</h3>
                <ul>
                  {links.map((l) => (
                    <li key={l}><a href={l.startsWith('vs ') ? `#compare` : '#top'} onClick={(e) => e.preventDefault()}>{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="cv-footer-bottom">
          <span>© 2026 Conversate</span>
          <span>Made for small support teams</span>
        </div>
      </div>
    </footer>
  )
}
