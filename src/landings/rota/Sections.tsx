import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { AlertTriangle, Check, Eye, Minus, Pause, Play, Plus, Receipt, Sheet, Sparkles, X } from 'lucide-react'
import { Button, EASE, Glyph, MORPH, Reveal, SectionHead, TrialButton, track, useCountUp } from './shared'
import { RotaGrid } from './Grid'

/* ------------------------------------------------------------------ 5. Problem */

const PROBLEMS: [typeof Sheet, string, string][] = [
  [Sheet, 'Three hours in a spreadsheet.', "Copy last week, remember who can't do Thursdays, recount the hours, screenshot it into the group chat."],
  [Eye, 'Swaps you hear about too late.', "Two people trade a Saturday in WhatsApp and you find out when the opener doesn't show."],
  [Receipt, 'No idea what the week costs.', "You see the wage bill when payroll runs, not while you're building the rota."],
]

export function Problem() {
  return (
    <section className="rt-section" aria-labelledby="rt-problem-h">
      <div className="rt-container">
        <SectionHead id="rt-problem-h" eyebrow="Sunday night, every week" title="The rota is the job nobody gets paid for." />
        <ul className="rt-problems">
          {PROBLEMS.map(([Icon, t, d], i) => (
            <Reveal as="li" key={t} delay={i * 0.06} className="rt-problem">
              <span className="rt-icon"><Icon size={16} strokeWidth={1.5} aria-hidden="true" /></span>
              <h3 className="rt-h3">{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="rt-sum">
          <p className="rt-h3">If the rota takes 3 hours every Sunday, that is about 13 manager hours a month.*</p>
          <p className="rt-fine">* Worked example, not a measurement: 3 hours a week × 52 weeks ÷ 12 months.</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 6. Demo: a coded stand-in for the 60 second video */

const LENGTH = 60
const CHAPTERS: [number, string][] = [[5, 'Draft with Claude'], [24, 'Fix a clash'], [41, 'Publish and texts']]
const CAPTIONS: [number, string][] = [
  [0, 'A blank week at Cafe Luna, w/c 27 Oct.'],
  [5, 'Claude drafts the week from availability, holidays and the last four weeks.'],
  [24, "One warning: Ama's Saturday open leaves 7 hours' rest. Drag it to Sam."],
  [41, 'Publish. Each person gets one text and one email with only their shifts.'],
]
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

function DemoScene({ t }: { t: number }) {
  const phase: 0 | 1 | 2 = t < 5 ? 0 : t < 41 ? 1 : 2
  const clash = t >= 24 && t < 33
  const shifts = useCountUp(24, 1200, t >= 5)
  return (
    <div className="rt-demo-scene">
      <div className="rt-builder rt-frame">
        <div className="rt-builder-bar">
          <span className="rt-builder-title">Cafe Luna · w/c 27 Oct</span>
          <span className="rt-draftinfo">{t >= 5 ? <>{shifts} shifts · 2 open · <b>$3,412</b></> : 'No shifts yet'}</span>
          <span className={`rt-tag ${phase === 2 ? 'is-pub' : ''}`}><i />{phase === 2 ? 'Published' : 'Draft'}</span>
        </div>
        <RotaGrid key={phase === 0 ? 'blank' : 'filled'} phase={phase} clash={clash ? [0, 5] : undefined} />
      </div>
      <AnimatePresence>
        {clash && (
          <motion.div className="rt-pop is-demo" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: EASE }}>
            <b><AlertTriangle size={12} strokeWidth={1.5} />Not enough rest</b>
            <span>Ama finishes Friday at 23:00. 7 hours' rest before Saturday 06:00; your minimum is 11.</span>
          </motion.div>
        )}
        {t >= 5 && t < 24 && (
          <motion.span className="rt-demo-badge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Sparkles size={12} strokeWidth={1.5} />Drafting with Claude</motion.span>
        )}
        {t >= 43 && (
          <motion.div className="rt-demo-texts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.36, ease: EASE }}>
            {['Ama · Mon 06:00-14:00, Tue 06:00-14:00 ...', 'Leo · Mon 08:00-16:00, Wed 08:00-16:00 ...', 'Mia · Tue 11:00-19:00, Wed 11:00-19:00 ...'].map((s, i) => (
              <motion.span key={s} className="rt-sms is-mini" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 + i * 0.4, ease: EASE }}>{s}</motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DemoPlayer({ autoStart = false }: { autoStart?: boolean }) {
  const reduce = useReducedMotion()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(autoStart && !reduce)
  const [started, setStarted] = useState(autoStart)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const sent = useRef(false)
  useEffect(() => {
    if (!playing || !inView) return
    const id = window.setInterval(() => setT((v) => {
      const n = v + 0.1
      if (n >= LENGTH * 0.9 && !sent.current) { sent.current = true; track('lp_demo_completed') }
      if (n >= LENGTH) { setPlaying(false); return LENGTH }
      return n
    }), 100)
    return () => window.clearInterval(id)
  }, [playing, inView])
  const start = () => { if (t >= LENGTH) setT(0); setStarted(true); setPlaying(true); track('lp_demo_played') }
  const jump = (to: number, label: string) => { setT(to); setStarted(true); setPlaying(!reduce); track('lp_demo_chapter', { chapter: label }) }
  const caption = CAPTIONS.reduce((acc, [at, c]) => (t >= at ? c : acc), CAPTIONS[0][1])
  return (
    <div className="rt-player-wrap">
      <div ref={ref} className="rt-player rt-frame">
        <div className="rt-player-stage" role="img" aria-label={`Demo at ${fmt(t)}: ${caption}`}>
          <DemoScene t={started ? t : 0} />
          {!started && (
            <button type="button" className="rt-bigplay" onClick={start} aria-label="Play the 60 second demo">
              <Play size={22} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="rt-player-bar">
          <button type="button" className="rt-mini-play" onClick={() => (playing ? setPlaying(false) : start())} aria-label={playing ? 'Pause demo' : 'Play demo'}>
            {playing ? <Pause size={13} strokeWidth={1.5} aria-hidden="true" /> : <Play size={13} strokeWidth={1.5} aria-hidden="true" />}
          </button>
          <span className="rt-time">{fmt(t)} / 1:00</span>
          <span className="rt-scrub" aria-hidden="true"><i style={{ transform: `scaleX(${t / LENGTH})` }} />{CHAPTERS.map(([at]) => <b key={at} style={{ left: `${(at / LENGTH) * 100}%` }} />)}</span>
        </div>
        <p className="rt-caption" aria-live="polite">{started ? caption : 'Captions on. Press play to watch a week go from blank to published.'}</p>
      </div>
      <div className="rt-chapters" role="group" aria-label="Jump to a moment">
        {CHAPTERS.map(([at, l]) => (
          <button key={at} type="button" className={`rt-chapter ${started && t >= at && (CHAPTERS.find(([n]) => n > at)?.[0] ?? 99) > t ? 'is-on' : ''}`} onClick={() => jump(at, l)}>
            <span className="rt-mono">{fmt(at)}</span>{l}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Demo() {
  return (
    <section className="rt-section rt-band" id="demo" aria-labelledby="rt-demo-h">
      <div className="rt-container">
        <SectionHead id="rt-demo-h" title="Watch a week go from blank to published in 60 seconds." center />
        <Reveal><DemoPlayer /></Reveal>
      </div>
    </section>
  )
}

export function DemoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const ov = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ov; prev?.focus() }
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="lp-rota rt-portal">
          <motion.div className="rt-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
          <motion.div
            className="rt-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Rota 60 second demo"
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className="rt-dialog-top">
              <span>Watch the 60 second demo</span>
              <button ref={closeRef} type="button" className="rt-x" onClick={onClose} aria-label="Close demo"><X size={16} strokeWidth={1.5} /></button>
            </div>
            <DemoPlayer autoStart />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ------------------------------------------------------------------ 8. How it works */

const STEPS: [string, string][] = [
  ['Add your team.', 'Paste names and numbers. Everyone gets a text with a join link.'],
  ['Draft the week.', 'Copy last week, use a template, or let Claude draft it. Fix the warnings.'],
  ['Publish.', 'Everyone gets their shifts by text and email. Swaps and reminders run themselves.'],
]

function StepNumber({ n }: { n: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.6 })
  const v = useCountUp(n, 300, seen)
  return <span ref={ref} className="rt-step-n">{String(v).padStart(2, '0')}</span>
}

export function HowItWorks() {
  return (
    <section className="rt-section rt-band" id="how" aria-labelledby="rt-how-h">
      <div className="rt-container">
        <SectionHead id="rt-how-h" eyebrow="How it works" title="Set up in an afternoon. Publish this week." />
        <ol className="rt-steps">
          {STEPS.map(([t, d], i) => (
            <Reveal as="li" key={t} delay={i * 0.06} className="rt-step">
              <StepNumber n={i + 1} />
              <h3 className="rt-h3">{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ol>
        <div className="rt-center"><TrialButton location="how" /></div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 9. Comparison */

const COLS = ['Rota Team', 'Deputy', '7shifts', 'Homebase', 'When I Work', 'RotaCloud']
const ROWS: [string, ...string[]][] = [
  ['How you pay', 'Per location', 'Per user', 'Per location', 'Per location', 'Per user', 'Per employee'],
  ['20 staff, 1 site, per month', '$69', '$100 to $180 ($5 to $9 a user) [verify]', '$44.99 to $89.99 (30 to 60 staff tiers) [verify]', '$30 to $70 [verify]', '$50 to $160 ($2.50 to $8 a user) [verify]', 'about £20 to £46 plus add-ons [verify]'],
  ['AI draft of the week', 'Yes, every plan', 'Auto-scheduling on higher plans [verify]', 'Auto-scheduling on higher plans [verify]', 'Not listed [verify]', 'Not listed [verify]', 'Not listed [verify]'],
  ['Shift texts included', '180 a month per site', 'Add-on or app [verify]', 'App and SMS [verify]', 'App [verify]', 'App and SMS [verify]', 'SMS add-on £0.40 per employee [verify]'],
  ['Swaps and cover with approval', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
  ['Clock-in from phone with location check', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Add-on [verify]'],
  ['CSV timesheet export', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
  ['Free for staff', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
  ['Setup', 'An afternoon', 'Days [verify]', 'Days [verify]', 'Hours [verify]', 'Hours [verify]', 'Hours [verify]'],
]

function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace('[verify]', '').trim()
  return (
    <>
      {text.startsWith('Yes') && <Check size={13} strokeWidth={2} aria-hidden="true" className="rt-yes" />}
      {text.startsWith('Not listed') && <Minus size={13} strokeWidth={2} aria-hidden="true" className="rt-no" />}
      {text}{verify && <span className="rt-verify"> to verify</span>}
    </>
  )
}

export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.5 })
  useEffect(() => { if (seen) track('lp_compare_viewed', { page: '/' }) }, [seen])
  return (
    <section className="rt-section rt-band" id="compare" aria-labelledby="rt-compare-h">
      <div className="rt-container">
        <SectionHead
          id="rt-compare-h"
          eyebrow="Compare"
          title="Priced per location, not per person."
          sub="A 20 person team, one site, monthly prices checked Oct 2026. Check each vendor's site for current prices."
        />
        <Reveal>
          <div ref={ref} className="rt-table-frame rt-frame">
            <div className="rt-table-scroll" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
              <table className="rt-table">
                <caption className="rt-sr">Rota Team compared with Deputy, 7shifts, Homebase, When I Work and RotaCloud for a 20 person team at one site.</caption>
                <thead>
                  <tr>
                    <th scope="col"><span className="rt-sr">Feature</span></th>
                    {COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'is-us' : ''}>{i === 0 ? <span className="rt-us"><Glyph size={13} />{c}</span> : c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([label, ...vals]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {vals.map((v, i) => <td key={i} className={i === 0 ? 'is-us' : ''}>{i === 0 && label.startsWith('20 staff') ? <b>{v}</b> : <Cell v={v} />}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
        <p className="rt-fine">Prices from each vendor's public pricing page or listings, October 2026. Plans change often; we update this table monthly. Cells marked “to verify” still need checking on each vendor's own site.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 10. Testimonials: shipped hidden until real quotes exist (PRD 10). Never invented. */

/* ------------------------------------------------------------------ 11. Pricing */

type Plan = { id: string; name: string; m: number; y: number; line: string; staff: string; texts: string; drafts: number; clock: string; sender: string; popular?: boolean }
const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', m: 39, y: 390, line: 'For one small team', staff: 'Up to 15', texts: '100 (400 in the US and Canada)', drafts: 6, clock: 'Clock-in only', sender: 'No' },
  { id: 'team', name: 'Team', m: 69, y: 690, line: 'For busy sites and small groups', staff: 'Up to 40', texts: '180 (720 in the US and Canada)', drafts: 10, clock: 'Yes', sender: 'No', popular: true },
  { id: 'pro', name: 'Pro', m: 149, y: 1490, line: 'For big teams and multi-site groups', staff: 'Up to 100', texts: '400 (1,600 in the US and Canada)', drafts: 12, clock: 'Yes', sender: 'Yes*' },
]
const EVERYTHING = 'Rota builder, templates, conflicts, cost per day, swaps, cover, open shifts, time off, email and app notifications, CSV export'

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const set = (a: boolean) => { setAnnual(a); track('lp_pricing_toggle', { interval: a ? 'year' : 'month' }) }
  return (
    <section className="rt-section" id="pricing" aria-labelledby="rt-pricing-h">
      <div className="rt-container">
        <SectionHead id="rt-pricing-h" eyebrow="Pricing" title="One price per location. Your staff are free." center />
        <div className="rt-toggle-sticky">
          <div className="rt-toggle" role="radiogroup" aria-label="Billing interval">
            <button type="button" role="radio" aria-checked={!annual} className={!annual ? 'is-on' : ''} onClick={() => set(false)}>Monthly</button>
            <button type="button" role="radio" aria-checked={annual} className={annual ? 'is-on' : ''} onClick={() => set(true)}>Annual (2 months free)</button>
          </div>
        </div>
        <ul className="rt-plans">
          {PLANS.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 0.06} className={`rt-plan ${p.popular ? 'is-popular' : ''}`}>
              <div className="rt-plan-top">
                <h3 className="rt-h3">{p.name}</h3>
                {p.popular && <span className="rt-popular"><i aria-hidden="true" />Most popular</span>}
              </div>
              <p className="rt-plan-line">{p.line}</p>
              <div className="rt-price" aria-live="polite" aria-label={`$${(annual ? p.y : p.m).toLocaleString('en-US')} per location a ${annual ? 'year' : 'month'}, ${p.name}`}>
                <span className="rt-price-box">
                  {[false, true].map((a) => <b key={String(a)} className={a === annual ? 'is-on' : ''} aria-hidden="true">${(a ? p.y : p.m).toLocaleString('en-US')}</b>)}
                </span>
                <span className="rt-per">per location / {annual ? 'year' : 'month'}</span>
              </div>
              <p className="rt-billed">{annual ? `billed $${p.y.toLocaleString('en-US')} a year` : 'billed monthly'}</p>
              <dl className="rt-plan-dl">
                <div><dt>Staff per location</dt><dd>{p.staff}</dd></div>
                <div><dt>Texts per location a month</dt><dd>{p.texts}</dd></div>
                <div><dt>Claude drafts a month</dt><dd>{p.drafts}</dd></div>
                <div><dt>Clock-in with location check</dt><dd>{p.clock}</dd></div>
                <div><dt>Texts from your business name</dt><dd>{p.sender}</dd></div>
              </dl>
              <p className="rt-extras"><Check size={13} strokeWidth={2} aria-hidden="true" />{i === 0 ? EVERYTHING : 'Everything else: same as Starter'}</p>
              <Button
                href={`/signup?plan=${p.id}&interval=${annual ? 'year' : 'month'}`}
                onClick={() => track('lp_cta_clicked', { location: 'pricing', plan: p.id, interval: annual ? 'year' : 'month' })}
              >
                Start free trial
              </Button>
            </Reveal>
          ))}
        </ul>
        <p className="rt-fine rt-fine-center">7 day free trial on every plan. Cancel in two clicks from Billing. * Where the country allows sender names (UK, Ireland and most of Europe).</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 12. FAQ */

export const FAQ: [string, string][] = [
  ['Do my staff have to pay or download an app?', "No. Staff are free and use Rota in their phone's browser. They can add it to their home screen like an app. No app store, no password reset emails for a forgotten app login: they can always sign in with a link."],
  ['How do texts work?', 'When you publish, each person gets one text with their shifts and one email. They get a reminder 2 hours before each shift, or at 9pm the evening before an early start. Staff choose whether they want texts.'],
  ['What happens if we run out of texts?', 'Rota warns you at 80%. After the limit, reminders and updates go by email and in the app until the month resets. Nothing breaks, nobody misses a shift change in the app.'],
  ['Is the AI going to publish a rota without me?', 'Never. Claude drafts, you review every shift and warning, and nothing goes to staff until you press Publish. It never puts someone on approved holiday or in two places at once.'],
  ['Can I run more than one site?', "Yes. You pay per location. Managers only see the sites they run, and staff who work at two sites can't be booked in both at the same time."],
  ['How does the location check on clock-in work?', 'You set where the venue is and a radius. When someone clocks in, their phone shares its location once. You choose whether being too far away is flagged for you to review or blocks the clock-in.'],
  ['Can I export to my payroll?', 'Yes. Approve the period and download a CSV with hours, rates and pay per shift. Every payroll tool we know of imports CSV. Direct payroll connections are on the roadmap.'],
  ['How long does setup take?', 'Most teams publish their first week the same afternoon: add locations and roles, paste in your team, copy your current week in, publish.'],
  ['Does it work in the US?', 'Yes. Texts come from a verified US number and staff can reply STOP. US plans get four times the texts because US texts cost less to send.'],
  ['What about overtime and rest rules?', "You set the weekly hours line and minimum rest for your business (UK defaults are 48 hours and 11 hours' rest). Rota warns you when a rota crosses them."],
  ['Can I cancel any time?', "Yes, from Billing in two clicks. You keep access until the end of the period you've paid for, and you can export your timesheets first."],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const base = useId()
  return (
    <section className="rt-section" id="faq" aria-labelledby="rt-faq-h">
      <div className="rt-container rt-faq-wrap">
        <SectionHead id="rt-faq-h" eyebrow="Help" title="Questions, answered in under 70 words." />
        <ul className="rt-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            const pid = `${base}-p${i}`, bid = `${base}-b${i}`
            return (
              <li key={q} className={isOpen ? 'is-open' : ''}>
                <h3>
                  <button type="button" id={bid} aria-expanded={isOpen} aria-controls={pid} onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('lp_faq_opened', { question: q }) }}>
                    <span className="rt-mono rt-faq-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="rt-faq-q">{q}</span>
                    <motion.span className="rt-plus" animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: reduce ? 0 : 0.16, ease: MORPH }}><Plus size={16} strokeWidth={1.5} aria-hidden="true" /></motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={pid}
                      role="region"
                      aria-labelledby={bid}
                      className="rt-faq-a"
                      initial={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.16, ease: MORPH }}
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

/* ------------------------------------------------------------------ 13. Final CTA */

export function FinalCta() {
  return (
    <section className="rt-section rt-final" aria-labelledby="rt-final-h">
      <div className="rt-container">
        <Reveal className="rt-final-inner">
          <h2 className="rt-h2 rt-h2-xl" id="rt-final-h">Get your Sundays back.</h2>
          <p className="rt-sub">Draft, publish and text next week's rota in ten minutes. Free for 7 days.</p>
          <TrialButton location="final" size="lg" />
          <p className="rt-faint">From $39 a location a month.</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 14. Footer */

const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Compare', 'Changelog']],
  ['Compare', ['Rota vs Deputy', 'Rota vs 7shifts', 'Rota vs Homebase', 'Rota vs When I Work']],
  ['Help', ['Documentation', 'Contact', 'Status']],
  ['Company', ['About', 'Privacy', 'Terms']],
]

export function Footer() {
  return (
    <footer className="rt-footer">
      <div className="rt-container">
        <nav className="rt-foot-cols" aria-label="Footer">
          {FOOT.map(([h, items]) => (
            <div key={h}>
              <h2>{h}</h2>
              <ul>{items.map((it) => <li key={it}><a href="#top">{it}</a></li>)}</ul>
            </div>
          ))}
        </nav>
        <div className="rt-foot-bottom">
          <span>© 2026 Rota</span>
          <span>Made for people who run shifts.</span>
        </div>
      </div>
    </footer>
  )
}
