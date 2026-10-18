import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import {
  Ban, CalendarX, Check, ChevronDown, Clock, EyeOff, Inbox, Minus, MousePointer2, Pause, Play, Quote, ScanSearch,
  ShieldCheck, SpellCheck, UserRound, Users, Video,
} from 'lucide-react'
import {
  Button, CareersButton, EASE, LOOP, MORPH, Mark, Reveal, SectionHead, TrialButton, VerdictPill, track, type Verdict,
} from './shared'

/* ------------------------------------------------------------------ 5. Problem */

const PROBLEMS: [typeof Inbox, string, string][] = [
  [Inbox, 'CVs everywhere.', 'Email, LinkedIn, a Drive folder and a spreadsheet nobody updates.'],
  [Clock, 'Slow and unfair screening.', 'The first 20 CVs get read properly. The other 120 get four seconds each.'],
  [CalendarX, 'Six emails per interview.', 'And the good candidate takes another offer while you find a time.'],
]

export function Problem() {
  return (
    <section className="sl-section sl-tint" aria-labelledby="sl-problem-h">
      <div className="sl-container">
        <SectionHead id="sl-problem-h" eyebrow="Hiring without a system" title="140 applications in a Gmail label is not a process" />
        <ul className="sl-problems">
          {PROBLEMS.map(([Icon, t, d], i) => (
            <Reveal as="li" key={t} delay={i * 0.025} className="sl-problem">
              <span className="sl-icon"><Icon size={16} strokeWidth={1.5} aria-hidden="true" /></span>
              <h3 className="sl-h3">{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="sl-statline"><p>Shortlist sends every applicant a reply, automatically, in your words.</p></Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 6. Product demo (coded stand-in for the 90 second recording) */

const CHAPTERS = ['Create a job', 'Apply on a phone', 'Review with the AI summary', 'Candidate books a slot']
const CAPTIONS = [
  'Write the role, add three to six criteria. Shortlist flags wording that often hides bias.',
  'The candidate applies from a phone in under three minutes. The CV goes to private storage.',
  'Each criterion gets Meets, Partly, Not shown or Unclear, with a quote from the CV.',
  'The candidate picks a slot that suits every interviewer. The Meet link is created for you.',
]
const SCENE_MS = 6000

function SceneJob() {
  const title = 'Founding product designer'
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? title.length : 0)
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setN((v) => (v >= title.length ? v : v + 1)), 45)
    return () => window.clearInterval(id)
  }, [reduce])
  const crit = ['3+ years in B2B product', 'Owns work end to end', 'Young and energetic']
  return (
    <div className="sl-sc sl-sc-job">
      <span className="sl-viz-k">New job</span>
      <span className="sl-input"><span>{title.slice(0, n)}</span><i className="sl-caret" /></span>
      <span className="sl-viz-k">Criteria</span>
      <div className="sl-crit">
        {crit.map((c, i) => (
          <motion.span key={c} className={`sl-crit-chip ${i === 2 ? 'is-flag' : ''}`} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: 1.4 + i * 0.4, ease: EASE }}>{c}</motion.span>
        ))}
      </div>
      <motion.p className="sl-lint" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 3 }}>
        <SpellCheck size={13} strokeWidth={1.5} aria-hidden="true" />“Young” often reads as an age preference. Try “Enjoys a fast pace”.
      </motion.p>
    </div>
  )
}

function ScenePhone() {
  const reduce = useReducedMotion()
  const fields = ['Full name', 'Email', 'Portfolio link', 'CV · ana-ruiz-cv.pdf']
  return (
    <div className="sl-sc sl-sc-phone">
      <div className="sl-phone is-big">
        <span className="sl-phone-notch" />
        <span className="sl-phone-brand"><i />Juniper Labs</span>
        <b>Founding product designer</b>
        {fields.map((f, i) => (
          <motion.span key={f} className="sl-filled" initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.36, delay: 0.4 + i * 0.6, ease: EASE }}>{f}</motion.span>
        ))}
        <label className="sl-optout"><span className="sl-box" />Do not use AI on my application</label>
        <motion.span className="sl-phone-cta is-sent" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 3.4 }}>Application sent</motion.span>
      </div>
    </div>
  )
}

function SceneReview() {
  const reduce = useReducedMotion()
  const rows: { c: string; v: Verdict; q?: string }[] = [
    { c: '3+ years in B2B product', v: 'Meets', q: 'Four years designing billing tools for small firms.' },
    { c: 'Owns work end to end', v: 'Meets', q: 'Led design from first sketch to public launch.' },
    { c: 'Writes clear UX copy', v: 'Partly', q: 'Worked with the content team on onboarding emails.' },
    { c: 'User research', v: 'Not shown' },
  ]
  return (
    <div className="sl-sc sl-sc-review">
      <span className="sl-viz-k">Ana Ruiz · summary against your criteria</span>
      <ul className="sl-summary">
        {rows.map((r, i) => (
          <motion.li key={r.c} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: 0.3 + i * 0.5, ease: EASE }}>
            <span className="sl-summary-row"><span className="sl-summary-c">{r.c}</span><VerdictPill v={r.v} /></span>
            {r.q && <span className="sl-quote"><Quote size={12} strokeWidth={1.5} aria-hidden="true" /><mark>{r.q}</mark></span>}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function SceneBook() {
  const reduce = useReducedMotion()
  const slots = ['Wed 10:00', 'Wed 15:30', 'Thu 09:30', 'Thu 14:30', 'Fri 11:00', 'Fri 16:00']
  return (
    <div className="sl-sc sl-sc-book">
      <div className="sl-sc-slots">
        <span className="sl-viz-k">Pick a time · 45 minutes · Europe/Madrid</span>
        <div className="sl-slots is-wide">
          {slots.map((s, i) => (
            <motion.span key={s} className="sl-slot" initial={false} animate={i === 3 ? { backgroundColor: ['#ffffff', '#ffffff', '#f2f3fd'], borderColor: ['#dcdde0', '#dcdde0', '#cdd2f6'] } : {}} transition={{ duration: reduce ? 0 : 1.6, times: [0, 0.8, 1] }}>{s}</motion.span>
          ))}
        </div>
      </div>
      <motion.div className="sl-invite sl-frame" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: 2, ease: EASE }}>
        <span className="sl-viz-k">Calendar invite</span>
        <b>Interview: Ana Ruiz · Founding product designer</b>
        <span>Thu 23 Oct · 14:30 to 15:15</span>
        <span className="sl-meet"><Video size={12} strokeWidth={1.5} aria-hidden="true" />Google Meet link added</span>
      </motion.div>
      {!reduce && (
        <motion.span className="sl-cursor is-demo" initial={{ x: 20, y: 150, opacity: 0 }} animate={{ x: 300, y: 92, opacity: [0, 1, 1, 0] }} transition={{ duration: 1.4, ease: LOOP, opacity: { duration: 2, times: [0, 0.1, 0.8, 1] } }} aria-hidden="true">
          <MousePointer2 size={16} strokeWidth={1.5} />
        </motion.span>
      )}
    </div>
  )
}

const SCENES = [SceneJob, ScenePhone, SceneReview, SceneBook]

export function Demo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  const [scene, setScene] = useState(0)
  const [paused, setPaused] = useState(!!reduce)
  const [epoch, setEpoch] = useState(0)
  const playing = inView && !paused
  useEffect(() => {
    if (!playing) return
    const id = window.setTimeout(() => { setScene((s) => (s + 1) % SCENES.length); setEpoch((e) => e + 1) }, SCENE_MS)
    return () => window.clearTimeout(id)
  }, [playing, scene, epoch])
  const Scene = SCENES[scene]
  const seek = (i: number) => { setScene(i); setEpoch((e) => e + 1); track('demo_video_played', { chapter: CHAPTERS[i] }) }
  return (
    <section className="sl-section" id="demo" aria-labelledby="sl-demo-h">
      <div className="sl-container">
        <SectionHead id="sl-demo-h" eyebrow="See it work" title="From job post to booked interview in one afternoon" center />
        <Reveal>
          <div ref={ref} className="sl-player sl-frame">
            <div className="sl-player-bar">
              <span className="sl-shot-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="sl-shot-title">{CHAPTERS[scene]}</span>
              <button type="button" className="sl-play" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play demo' : 'Pause demo'}>
                {paused ? <Play size={13} strokeWidth={1.5} aria-hidden="true" /> : <Pause size={13} strokeWidth={1.5} aria-hidden="true" />}
              </button>
            </div>
            <div className="sl-stage-area" role="img" aria-label={`Demo, chapter ${scene + 1} of 4: ${CHAPTERS[scene]}. ${CAPTIONS[scene]}`}>
              <AnimatePresence mode="wait">
                <motion.div key={`${scene}-${epoch}`} className="sl-stage-inner" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Scene />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="sl-caption" aria-live="polite">{CAPTIONS[scene]}</div>
            <div className="sl-progress" aria-hidden="true">
              {CHAPTERS.map((c, i) => (
                <span key={c}>
                  <motion.i
                    key={`${i}-${scene}-${epoch}-${playing}`}
                    initial={{ scaleX: i < scene ? 1 : 0 }}
                    animate={{ scaleX: i < scene ? 1 : i === scene && playing ? 1 : i === scene ? 0.5 : 0 }}
                    transition={{ duration: i === scene && playing ? SCENE_MS / 1000 : 0, ease: 'linear' }}
                  />
                </span>
              ))}
            </div>
          </div>
        </Reveal>
        <div className="sl-chapters" role="group" aria-label="Demo chapters">
          {CHAPTERS.map((c, i) => (
            <button key={c} type="button" className={`sl-chapter ${i === scene ? 'is-on' : ''}`} aria-pressed={i === scene} onClick={() => seek(i)}>
              <span className="sl-num">{i + 1}</span>{c}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 8. How it works */

const STEPS: [string, string][] = [
  ['Create the job.', 'Description, questions and 3 to 6 criteria. Shortlist flags wording that hides bias.'],
  ['Share one link.', 'Post it on LinkedIn, job boards or your site. Every applicant lands on the board.'],
  ['Review, interview, hire.', 'Read the quoted summaries, move the right people forward, and let them book a slot.'],
]

export function HowItWorks() {
  const reduce = useReducedMotion()
  return (
    <section className="sl-section sl-tint" id="how" aria-labelledby="sl-how-h">
      <div className="sl-container">
        <SectionHead id="sl-how-h" eyebrow="How it works" title="Three steps to your next hire" />
        <div className="sl-steps-wrap">
          <motion.span
            className="sl-connector"
            aria-hidden="true"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: 0.2, ease: MORPH }}
          />
          <ol className="sl-steps">
            {STEPS.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 0.06} className="sl-step">
                <span className="sl-step-n">{i + 1}</span>
                <h3 className="sl-h3">{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
        <div className="sl-center"><TrialButton location="how" /></div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 9. Fair hiring, with the ASCII pipeline */

const ASCII = [
  ' cv.pdf, as uploaded',
  ' ┌────────────────────────────┐',
  ' │ Ana Ruiz · ana@mail.com    │',
  ' │ 07700 900123 · /in/anaruiz │',
  ' │ "Led design from first     │',
  ' │  sketch to public launch." │',
  ' └─────────────┬──────────────┘',
  '               │ 1  redact',
  ' ┌─────────────▼──────────────┐',
  ' │ ████ · ███████████████     │',
  ' │ ███████████ · ████████████ │',
  ' │ "Led design from first     │',
  ' │  sketch to public launch." │',
  ' └─────────────┬──────────────┘',
  '               │ 2  read against',
  '               │    your criteria',
  ' ┌─────────────▼──────────────┐',
  ' │ Owns work end to end       │',
  ' │ Meets   "Led design from…" │',
  ' │ Quote found in CV ✓        │',
  ' └─────────────┬──────────────┘',
  '               │ 3  no score,',
  '               │    no rank',
  ' ┌─────────────▼──────────────┐',
  ' │ A person on your team      │',
  ' │ opens it and decides       │',
  ' └────────────────────────────┘',
]

function AsciiPipeline() {
  const ref = useRef<HTMLPreElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.3 })
  const reduce = useReducedMotion()
  return (
    <figure className="sl-ascii-fig">
      <pre ref={ref} className="sl-ascii" role="img" aria-label="What the AI sees. Step 1: the CV has names, emails, phone numbers and links redacted. Step 2: the redacted text is read against your criteria and every label must quote the CV, which code checks. Step 3: there is no score or rank; a person on your team opens the application and decides.">
        {ASCII.map((line, i) => (
          <motion.span
            key={i}
            className={/│ [123] /.test(line) ? 'is-step' : line.includes('████') ? 'is-redact' : ''}
            initial={reduce ? false : { opacity: 0 }}
            animate={seen || reduce ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.2, delay: reduce ? 0 : i * 0.045 }}
          >
            {line}{'\n'}
          </motion.span>
        ))}
      </pre>
      <figcaption>What the AI sees, and what it never does</figcaption>
    </figure>
  )
}

const FAIR: [typeof Ban, string][] = [
  [Ban, 'No scores, rankings or auto-reject. Ever.'],
  [Quote, 'Every claim backed by a quote from the CV, checked by code.'],
  [EyeOff, 'Names, contacts and personal details removed before the AI reads a CV.'],
  [SpellCheck, 'Criteria checked for wording that often hides bias.'],
  [ScanSearch, 'Nobody can reject an application nobody has opened.'],
  [UserRound, 'Candidates can choose a human-only review.'],
  [Users, 'Blind scorecards, so the loudest voice does not set the tone.'],
]

export function Fair() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.5 })
  useEffect(() => { if (seen) track('fair_section_viewed') }, [seen])
  return (
    <section className="sl-section" id="fair" aria-labelledby="sl-fair-h">
      <div className="sl-container" ref={ref}>
        <SectionHead id="sl-fair-h" eyebrow="Fair by design" title="Built so a person makes every decision" />
        <div className="sl-fair">
          <div className="sl-fair-left">
            <Reveal><p className="sl-fair-lede">AI is good at reading. People are responsible for deciding. Shortlist keeps it that way.</p></Reveal>
            <AsciiPipeline />
          </div>
          <div className="sl-fair-right">
            <ul className="sl-fair-list">
              {FAIR.map(([Icon, t], i) => (
                <Reveal as="li" key={t} delay={i * 0.025}>
                  <span className="sl-icon"><Icon size={16} strokeWidth={1.5} aria-hidden="true" /></span>{t}
                </Reveal>
              ))}
            </ul>
            <p className="sl-fine">Shortlist is designed to support human decisions under UK and EU GDPR Article 22. You can switch AI off for your whole workspace at any time.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 10. Comparison */

const COLS = ['Shortlist', 'Workable', 'Breezy HR', 'JazzHR', 'Manatal']
const ROWS: [string, ...string[]][] = [
  ['Starting price', '$29 / month', 'about $299 / month for new customers [verify]', 'Free (1 job), paid from $157 / month billed annually [verify]', 'from about $75 / month [verify]', 'about $15 / user / month [verify]'],
  ['Monthly, cancel any time', 'Yes', 'Annual focus [verify]', 'Yes', 'Yes [verify]', 'Annual billing [verify]'],
  ['Careers page and form', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
  ['AI CV summaries with quotes', 'Yes, assistive only', 'AI features on higher plans [verify]', 'Limited [verify]', 'Limited [verify]', 'AI scoring [verify]'],
  ['Never scores or auto-rejects', 'Yes', 'No [verify]', 'No [verify]', 'No [verify]', 'No [verify]'],
  ['Candidate self-booking with Google Calendar', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes [verify]'],
  ['Blind scorecards', 'Yes', 'Yes [verify]', 'Yes [verify]', 'Yes [verify]', 'No [verify]'],
  ['Automatic GDPR retention and deletion log', 'Yes', 'Yes [verify]', 'Partial [verify]', 'Partial [verify]', 'Yes [verify]'],
  ['Setup time', '5 minutes', 'Hours', 'Under an hour', 'Under an hour', 'Under an hour'],
]

function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace('[verify]', '').trim()
  return (
    <>
      {text.startsWith('Yes') && <Check size={13} strokeWidth={2} aria-hidden="true" className="sl-yes" />}
      {text === 'No' && <Minus size={13} strokeWidth={2} aria-hidden="true" className="sl-no" />}
      {text}{verify && <span className="sl-verify"> to verify</span>}
    </>
  )
}

export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.5 })
  useEffect(() => { if (seen) track('comparison_viewed') }, [seen])
  return (
    <section className="sl-section sl-tint" id="compare" aria-labelledby="sl-compare-h">
      <div className="sl-container">
        <SectionHead id="sl-compare-h" eyebrow="Compare" title="The hiring tool priced for your first 10 hires" />
        <Reveal>
          <div ref={ref} className="sl-table-frame sl-frame">
            <div className="sl-table-scroll" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
              <table className="sl-table">
                <caption className="sl-sr">Shortlist compared with Workable, Breezy HR, JazzHR and Manatal, checked October 2026.</caption>
                <thead>
                  <tr>
                    <th scope="col"><span className="sl-sr">Feature</span></th>
                    {COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'is-us' : ''}>{i === 0 ? <span className="sl-us"><Mark size={16} />{c}</span> : c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([label, ...vals]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {vals.map((v, i) => <td key={i} className={i === 0 ? 'is-us' : ''}><Cell v={v} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
        <p className="sl-fine">Competitor prices from public pricing pages and third-party reviews, checked October 2026. Prices change; check each vendor before deciding. Cells marked “to verify” still need checking on each vendor's own site.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 11. Testimonials: hidden until real quotes exist (PRD 11). Never invented. */

/* ------------------------------------------------------------------ 12. Pricing */

type Plan = { id: string; name: string; m: number; y: number; line: string; seats: number; jobs: number; ai: string; apps: string; extras: string; popular?: boolean }
const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', m: 29, y: 290, line: 'For a founder making the first hires', seats: 3, jobs: 2, ai: '150', apps: '450', extras: 'Careers page, scorecards, scheduling, GDPR tools' },
  { id: 'team', name: 'Team', m: 69, y: 690, line: 'For a team hiring every quarter', seats: 10, jobs: 8, ai: '500', apps: '1,500', extras: 'Everything in Starter, remove Shortlist branding, pass-through report', popular: true },
  { id: 'growth', name: 'Growth', m: 149, y: 1490, line: 'For growing teams with several roles open', seats: 25, jobs: 25, ai: '1,500', apps: '4,500', extras: 'Everything in Team, more seats and jobs' },
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const set = (a: boolean) => { setAnnual(a); track('pricing_toggled', { interval: a ? 'year' : 'month' }) }
  return (
    <section className="sl-section" id="pricing" aria-labelledby="sl-pricing-h">
      <div className="sl-container">
        <SectionHead id="sl-pricing-h" eyebrow="Pricing" title="Simple plans. Cancel any time." center />
        <div className="sl-toggle" role="radiogroup" aria-label="Billing interval">
          <button type="button" role="radio" aria-checked={!annual} className={!annual ? 'is-on' : ''} onClick={() => set(false)}>Monthly</button>
          <button type="button" role="radio" aria-checked={annual} className={annual ? 'is-on' : ''} onClick={() => set(true)}>Annual · 2 months free</button>
        </div>
        <ul className="sl-plans">
          {PLANS.map((p, i) => {
            const price = annual ? p.y : p.m
            return (
              <Reveal as="li" key={p.id} delay={i * 0.025} className={`sl-plan ${p.popular ? 'is-popular' : ''}`}>
                <div className="sl-plan-top">
                  <h3 className="sl-h3">{p.name}</h3>
                  {p.popular && <span className="sl-popular"><i aria-hidden="true" />Most popular</span>}
                </div>
                <p className="sl-plan-line">{p.line}</p>
                <div className="sl-price" aria-live="polite" aria-label={`$${price.toLocaleString('en-US')} a ${annual ? 'year' : 'month'}, ${p.name}`}>
                  <span className="sl-price-box">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.b key={`${p.id}-${annual}`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                        ${price.toLocaleString('en-US')}
                      </motion.b>
                    </AnimatePresence>
                  </span>
                  <span className="sl-per">/ {annual ? 'year' : 'month'}</span>
                </div>
                <dl className="sl-plan-dl">
                  <div><dt>Seats</dt><dd>{p.seats}</dd></div>
                  <div><dt>Open jobs</dt><dd>{p.jobs}</dd></div>
                  <div><dt>AI summaries / month</dt><dd>{p.ai}</dd></div>
                  <div><dt>Applications / month</dt><dd>{p.apps}</dd></div>
                </dl>
                <p className="sl-extras"><Check size={13} strokeWidth={2} aria-hidden="true" />{p.extras}</p>
                <Button
                  href={`/signup?plan=${p.id}&interval=${annual ? 'year' : 'month'}`}
                  onClick={() => track('cta_clicked', { location: 'pricing', plan: p.id, interval: annual ? 'year' : 'month' })}
                >
                  Start free trial
                </Button>
              </Reveal>
            )
          })}
        </ul>
        <p className="sl-every">Every plan: 7 day free trial · Unlimited candidates in your pipeline · Email templates · Google Calendar booking · Candidate data deletion on time.</p>
        <p className="sl-fine sl-fine-center">Over your AI summary limit? Applications still arrive and get a reply; summaries pause until next month or until you upgrade.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 13. FAQ */

export const FAQ: [string, string][] = [
  ['Does the AI reject candidates?', 'No. Shortlist never rejects, ranks or scores anyone. The AI writes a summary against your criteria with quotes from the CV, and a person on your team makes every decision. Nobody can reject an application nobody has opened.'],
  ['What does the AI see?', "The CV text with names, emails, phone numbers, addresses, links and personal-detail lines removed, the answers to your questions and your criteria. It never sees other candidates or your team's notes."],
  ['Can candidates opt out of AI?', 'Yes. The application form has a "Do not use AI on my application" box. Those applications are never sent to the AI and are marked so your team reads them in full.'],
  ['Is it GDPR compliant?', 'Shortlist is built for UK and EU GDPR: a clear notice on the form, a retention period you choose, automatic deletion with a log, and two-click handling of access and deletion requests. You stay in control as the employer.'],
  ['Which calendars work?', 'Google Calendar today. Shortlist reads only free/busy times and creates the interview event with a Google Meet link. Outlook is on the roadmap.'],
  ['Where do applicants come from?', 'Anywhere you share your job link: LinkedIn, job boards, your website or a newsletter. Jobs are also marked up for Google for Jobs.'],
  ['What happens when I reach my monthly limit?', 'Applications keep arriving and candidates still get their emails. AI summaries pause until the 1st of the month or until you upgrade.'],
  ['Can my interviewers use it for free?', 'Interviewers take a seat on your plan: 3 on Starter, 10 on Team, 25 on Growth. They see only the jobs you add them to.'],
  ['Can I import candidates from another tool?', 'Not in the first version. Start fresh with your next role; most small teams hire one or two roles at a time.'],
  ['What if we pause hiring?', 'Cancel any time from Billing. Your careers page goes offline and data keeps deleting on schedule. Come back when the next role opens.'],
  ['Do you have a free plan?', 'No, but every plan starts with a 7 day free trial so you can publish a job and see real applicants first.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const reduce = useReducedMotion()
  const base = useId()
  return (
    <section className="sl-section sl-tint" id="faq" aria-labelledby="sl-faq-h">
      <div className="sl-container sl-faq-wrap">
        <SectionHead id="sl-faq-h" title="Questions" />
        <ul className="sl-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            const pid = `${base}-p${i}`, bid = `${base}-b${i}`
            return (
              <li key={q}>
                <h3>
                  <button type="button" id={bid} aria-expanded={isOpen} aria-controls={pid} onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('faq_opened', { index: i }) }}>
                    <span>{q}</span>
                    <motion.span className="sl-chev" animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.2, ease: MORPH }}><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={pid}
                      role="region"
                      aria-labelledby={bid}
                      className="sl-faq-a"
                      initial={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.2, ease: MORPH }}
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

/* ------------------------------------------------------------------ 14. Final CTA */

export function FinalCta() {
  return (
    <section className="sl-section sl-final" aria-labelledby="sl-final-h">
      <div className="sl-container">
        <Reveal className="sl-final-inner">
          <span className="sl-final-mark" aria-hidden="true"><ShieldCheck size={16} strokeWidth={1.5} />A person decides. Every candidate hears back.</span>
          <h2 className="sl-h2 sl-h2-xl" id="sl-final-h">Your next hire is <span className="sl-hl">one link away</span></h2>
          <p className="sl-sub">Publish a job today. See your first applicants on the board tonight.</p>
          <div className="sl-hero-ctas is-center">
            <TrialButton location="final" size="lg" />
            <CareersButton location="final" size="lg" />
          </div>
          <p className="sl-trust">7 day free trial · From $29 a month</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 15. Footer */

const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Fair hiring', 'Changelog']],
  ['Resources', ['Documentation', 'Hiring guides', 'Job description templates', 'Workable alternative']],
  ['Company', ['About', 'Contact', 'Status']],
  ['Legal', ['Privacy', 'Terms', 'Sub-processors']],
]

export function Footer() {
  return (
    <footer className="sl-footer">
      <div className="sl-container">
        <nav className="sl-foot-cols" aria-label="Footer">
          {FOOT.map(([h, items]) => (
            <div key={h}>
              <h2>{h}</h2>
              <ul>{items.map((it) => <li key={it}><a href="#top">{it}</a></li>)}</ul>
            </div>
          ))}
        </nav>
        <div className="sl-foot-bottom">
          <span className="sl-foot-brand"><Mark size={18} />© 2026 Shortlist</span>
          <span>Made for teams hiring their first 10 people</span>
        </div>
      </div>
    </footer>
  )
}
