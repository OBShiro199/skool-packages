import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, ChevronDown, Minus, Plus } from 'lucide-react'
import { EASE, KITS, MORPH, Reveal, Slide, TrialButton, Wordmark, track } from './shared'

/* ---------------- 9. Comparison ---------------- */
const COLS = ['Folio', 'Taplio', 'Contentdrips', 'PostNitro', 'aiCarousels', 'Canva']
const ROWS: [string, string[]][] = [
  ['Blog URL to carousel', ['Yes', '[verify]', 'Yes [verify]', 'Yes [verify]', 'Yes [verify]', 'No']],
  ['YouTube video to carousel', ['Yes', '[verify]', '[verify]', '[verify]', '[verify]', 'No']],
  ['Voice note to carousel', ['Yes', 'No [verify]', 'No [verify]', 'No [verify]', 'No [verify]', 'No']],
  ['Brand kit on every slide', ['Yes', 'Limited [verify]', 'Yes', 'Yes', 'Yes', 'Yes']],
  ['AI rewrite per slide', ['Yes', '[verify]', '[verify]', 'Yes [verify]', '[verify]', 'Limited']],
  ['Schedules to LinkedIn', ['Yes', 'Yes', '[verify]', 'Yes [verify]', 'No [verify]', 'Yes [verify]']],
  ['Instagram carousels', ['Yes', 'No [verify]', 'Yes [verify]', 'Yes [verify]', 'Yes [verify]', 'Yes']],
  ['Analytics per carousel', ['Pro', 'Yes [verify]', 'No [verify]', '[verify]', 'No [verify]', 'Limited']],
  ['Starting price', ['$39/month', 'about $39 to $65 [verify]', 'about $15 [verify]', 'about $15 [verify]', '[verify]', 'about $15 [verify]']],
]

function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace('[verify]', '').trim()
  return (
    <>
      {text === 'Yes' ? <span className="fo-yes"><Check size={14} strokeWidth={2} aria-hidden="true" />Yes</span> : text && <span>{text}</span>}
      {verify && <span className="fo-verify" title="Check on their live site before publishing">verify</span>}
    </>
  )
}

export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  return (
    <section className="fo-sec" id="compare" aria-labelledby="fo-compare-h">
      <div className="fo-sec-head">
        <h2 id="fo-compare-h" className="fo-h2">The carousel tool that does the whole job.</h2>
        <p className="fo-body fo-intro">Most tools design slides or schedule posts. Folio writes, designs, exports and schedules in one place.</p>
      </div>
      <Reveal>
        <p className={`fo-swipe-hint ${scrolled ? 'gone' : ''}`} aria-hidden="true">Swipe to compare →</p>
        <div
          ref={ref} className="fo-table-wrap" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways on small screens"
          onScroll={() => { if (!scrolled) { setScrolled(true); track('compare_scroll') } }}
        >
          <table className="fo-table">
            <thead>
              <tr>
                <th scope="col"><span className="fo-sr">Feature</span></th>
                {COLS.map((c, i) => (
                  <th key={c} scope="col" className={i === 0 ? 'fo-col-us' : ''}>
                    {i === 0 && (
                      <motion.span
                        className="fo-glow" aria-hidden="true"
                        initial={false}
                        animate={reduce ? { opacity: 0 } : inView ? { opacity: [0, 1, 0] } : { opacity: 0 }}
                        transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }}
                      />
                    )}
                    <span className="fo-th-label">{i === 0 ? <Wordmark /> : c}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, vals]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {vals.map((v, i) => <td key={i} className={i === 0 ? 'fo-col-us' : ''}><Cell v={v} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fo-small fo-faint fo-foot-note">Prices and features checked [Month Year]. Tell us if something changed.</p>
      </Reveal>
    </section>
  )
}

/* ---------------- 10. Testimonials (hidden until real quotes exist) ---------------- */
const SHOW_TESTIMONIALS = false
export function Testimonials() {
  if (!SHOW_TESTIMONIALS) return null
  return <section className="fo-sec"><h2 className="fo-h2">People who post more since Folio</h2></section>
}

/* ---------------- 11. Pricing ---------------- */
type Plan = { name: string; monthly: number; yearly: number; line: string; includes: string[]; popular?: boolean; loc: string }
const PLANS: Plan[] = [
  {
    name: 'Creator', monthly: 39, yearly: 390, loc: 'pricing_creator', line: 'For one person posting a few times a week.',
    includes: ['15 carousels a month', '100 AI slide rewrites', '60 exports (PDF + PNGs)', '30 voice minutes', '1 brand kit', '1 connected account', 'Remove the Folio mark'],
  },
  {
    name: 'Pro', monthly: 79, yearly: 790, loc: 'pricing_pro', popular: true, line: 'For creators who post every day and want to know what works.',
    includes: ['Everything in Creator', '50 carousels a month', '400 rewrites', '200 exports', '120 voice minutes', '3 brand kits', '3 connected accounts', '2 seats', 'Analytics per carousel', 'Upload your own fonts'],
  },
  {
    name: 'Agency', monthly: 249, yearly: 2490, loc: 'pricing_agency', line: 'For agencies running carousels for clients.',
    includes: ['Everything in Pro', '150 carousels a month', '1,000 rewrites', '1,000 exports', '400 voice minutes', '10 brand kits', '10 connected accounts', '5 seats', 'All-brand calendar'],
  },
]

export function Pricing() {
  const [yearly, setYearly] = useState(false)
  const set = (y: boolean) => { if (y !== yearly) { setYearly(y); track('pricing_toggle', { interval: y ? 'year' : 'month' }) } }
  return (
    <section className="fo-sec" id="pricing" aria-labelledby="fo-pricing-h">
      <div className="fo-sec-head fo-center">
        <h2 id="fo-pricing-h" className="fo-h2">Simple plans. Cancel any time.</h2>
        <p className="fo-body fo-intro">Every plan starts with a 7-day free trial.</p>
        <div className="fo-toggle" role="group" aria-label="Billing interval">
          <motion.span className="fo-toggle-pill" aria-hidden="true" initial={false} animate={{ x: yearly ? '100%' : '0%' }} transition={{ duration: 0.22, ease: MORPH }} />
          <button type="button" aria-pressed={!yearly} onClick={() => set(false)}>Monthly</button>
          <button type="button" aria-pressed={yearly} onClick={() => set(true)}>Yearly · 2 months free</button>
        </div>
      </div>
      <div className="fo-plans">
        {PLANS.map((p, i) => {
          const price = yearly ? p.yearly : p.monthly
          return (
            <Reveal key={p.name} delay={i * 0.04} className={`fo-plan ${p.popular ? 'pop' : ''}`}>
              <div className="fo-plan-top">
                <h3 className="fo-plan-name">{p.name}</h3>
                {p.popular && <span className="fo-badge">Most popular</span>}
              </div>
              <p className="fo-price" aria-live="polite">
                <span className="fo-price-num">
                  {[p.monthly, p.yearly].map((v) => (
                    <motion.span key={v} initial={false} animate={{ opacity: v === price ? 1 : 0 }} transition={{ duration: 0.18 }} aria-hidden={v !== price}>
                      ${v.toLocaleString('en-US')}
                    </motion.span>
                  ))}
                </span>
                <span className="fo-price-per">/{yearly ? 'year' : 'month'}</span>
              </p>
              <p className="fo-plan-line">{p.line}</p>
              <TrialButton location={p.loc} className={p.popular ? '' : 'fo-btn-soft-edge'} />
              <ul className="fo-plan-list">
                {p.includes.map((x) => <li key={x}><Check size={14} strokeWidth={2} aria-hidden="true" />{x}</li>)}
              </ul>
            </Reveal>
          )
        })}
      </div>
      <p className="fo-small fo-muted fo-center fo-plans-note">
        Trial includes 5 carousels so you can try every feature. Limits reset on the 1st of each month. You always see
        what you have left before you press a button.
      </p>
    </section>
  )
}

/* ---------------- 12. FAQ ---------------- */
export const FAQ: [string, string][] = [
  ['What sources can I use?', 'A blog or article URL, a YouTube video or Short, a typed idea, or a voice note up to 10 minutes.'],
  ['Will the slides look like my brand?', 'Yes. You set your logo, colours, fonts, headshot and handle once, and every slide uses them. Agencies can keep one brand kit per client.'],
  ['Who writes the slides?', 'Claude, Anthropic’s AI model, writes a hook, 6 to 9 body slides and a call to action from your source, and a LinkedIn caption. You can edit every word.'],
  ['Does it make things up?', 'It is told to use only numbers, names and claims from your source. Always read your carousel before you post it, as you would with any writer.'],
  ['Can it post to LinkedIn for me?', 'Yes. Connect your LinkedIn profile or company page and schedule the PDF document post. You can also download the PDF and post it yourself.'],
  ['Does it work for Instagram?', 'Yes. Export PNG slides in 4:5 or square, or schedule them as an Instagram carousel on a professional account.'],
  ['What counts as a carousel, a rewrite and an export?', 'A carousel is one generation from a source. A rewrite is one AI change to one slide. An export is one render of the PNGs and the PDF. Exporting again with no changes is free.'],
  ['What happens when I hit my limit?', 'Buttons show what is left. At the limit you can still edit and download existing exports. Upgrade any time and the new limit applies straight away.'],
  ['Can my team use it?', 'Pro includes 2 seats and Agency 5. Team members can edit and schedule. Only the owner sees billing.'],
  ['What happens after the trial?', 'You choose a plan at checkout and are billed when the 7 days end. Cancel before then and you pay nothing. Your carousels stay saved either way.'],
  ['Can I cancel any time?', 'Yes, from Billing in two clicks. You keep access to the end of the period you paid for.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="fo-sec" id="faq" aria-labelledby="fo-faq-h">
      <div className="fo-faq">
        <div className="fo-sec-head">
          <h2 id="fo-faq-h" className="fo-h2">Questions people ask before they start</h2>
        </div>
        <ul className="fo-acc">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <li key={q} className={isOpen ? 'open' : ''}>
                <h3>
                  <button
                    type="button" id={`fo-q-${i}`} aria-expanded={isOpen} aria-controls={`fo-a-${i}`}
                    onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('faq_open', { index: i }) }}
                  >
                    <span>{q}</span>
                    <span className="fo-acc-icon" aria-hidden="true">{isOpen ? <Minus size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}</span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`fo-a-${i}`} role="region" aria-labelledby={`fo-q-${i}`} className="fo-acc-panel"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: MORPH }}
                    >
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

/* ---------------- 13. Final CTA ---------------- */
export function FinalCta() {
  const reduce = useReducedMotion()
  const slides = [
    { kind: 'hook' as const, kit: KITS.violet, n: 1, r: -5 },
    { kind: 'stat' as const, kit: KITS.ember, n: 5, r: 0 },
    { kind: 'cta' as const, kit: KITS.white, n: 9, r: 5 },
  ]
  return (
    <section className="fo-final" aria-labelledby="fo-final-h">
      <div className="fo-final-slides" role="img" aria-label="Three Folio slides: a hook, a stat and a call to action">
        {slides.map((s, i) => (
          <motion.div
            key={s.n}
            className="fo-final-slide"
            initial={reduce ? false : { opacity: 0, x: 80, rotate: s.r }}
            whileInView={{ opacity: 1, x: 0, rotate: s.r }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.09, ease: EASE }}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 + i * 0.8 }}
            >
              <Slide kind={s.kind} kit={s.kit} n={s.n} className="fo-slide-float" />
            </motion.div>
          </motion.div>
        ))}
      </div>
      <h2 id="fo-final-h" className="fo-h2">Your next 10 posts are already written. They are in your blog.</h2>
      <p className="fo-body fo-intro">Turn one into a carousel in the next 5 minutes.</p>
      <TrialButton location="final_cta" />
      <p className="fo-micro">7 days free · Cancel any time</p>
    </section>
  )
}

/* ---------------- 14. Footer ---------------- */
const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Templates', 'Pricing', 'Changelog']],
  ['Use cases', ['For founders', 'For coaches', 'For agencies', 'Blog to carousel', 'YouTube to carousel']],
  ['Resources', ['Documentation', 'Free hook generator', 'Taplio alternative', 'Contentdrips alternative', 'PostNitro alternative']],
  ['Company', ['About', 'Contact', 'Privacy', 'Terms']],
]

function useNarrow() {
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setN(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return n
}

export function Footer() {
  const narrow = useNarrow()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <footer className="fo-footer">
      <div className="fo-foot-cols">
        {FOOT.map(([h, links]) => {
          const isOpen = !narrow || open === h
          return (
            <div key={h} className="fo-foot-col">
              {narrow ? (
                <button type="button" className="fo-foot-h" aria-expanded={isOpen} aria-controls={`fo-f-${h}`} onClick={() => setOpen(isOpen ? null : h)}>
                  {h}<ChevronDown size={16} strokeWidth={1.5} className={isOpen ? 'up' : ''} aria-hidden="true" />
                </button>
              ) : <p className="fo-foot-h">{h}</p>}
              {isOpen && (
                <ul id={`fo-f-${h}`}>
                  {links.map((l) => <li key={l}><a href="#top" onClick={(e) => e.preventDefault()}>{l}</a></li>)}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      <div className="fo-foot-bottom">
        <Wordmark />
        <span>© 2026 Folio</span>
        <span>Made for people who post every week.</span>
      </div>
    </footer>
  )
}
