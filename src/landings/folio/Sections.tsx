import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'motion/react'
import {
  Briefcase, Download, FileText, GraduationCap, Megaphone, PenLine, Play, Rocket, Sparkles, Users, Wand2,
} from 'lucide-react'
import { EASE, KITS, MORPH, Reveal, Slide, TrialButton, track } from './shared'

/* ---------------- 4. Logo strip (role badges until there are customers) ---------------- */
const ROLES = [
  { icon: Rocket, label: 'SaaS founders' }, { icon: Briefcase, label: 'Business coaches' },
  { icon: GraduationCap, label: 'Career coaches' }, { icon: PenLine, label: 'Ghostwriters' },
  { icon: Megaphone, label: 'Social media agencies' }, { icon: Users, label: 'Consultants' },
]
export function LogoStrip() {
  const [paused, setPaused] = useState(false)
  const badges = (hidden: boolean) => ROLES.map(({ icon: Icon, label }, i) => (
    <Reveal as="li" key={label + hidden} delay={i * 0.04} className="fo-role">
      <span aria-hidden={hidden || undefined}><Icon size={16} strokeWidth={1.5} aria-hidden="true" />{label}</span>
    </Reveal>
  ))
  return (
    <section className="fo-strip" aria-labelledby="fo-strip-h">
      <p id="fo-strip-h" className="fo-small fo-muted fo-center">Made for people who post every week</p>
      <div
        className={`fo-marquee ${paused ? 'paused' : ''}`}
        onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)} onTouchCancel={() => setPaused(false)}
      >
        <ul className="fo-roles">{badges(false)}</ul>
        <ul className="fo-roles fo-roles-dup" aria-hidden="true">{badges(true)}</ul>
      </div>
    </section>
  )
}

/* ---------------- 5. Problem ---------------- */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? to : 0)
  useEffect(() => {
    if (reduce) { setV(to); return }
    if (!inView) return
    const c = animate(0, to, { duration: 0.9, ease: EASE, onUpdate: (x) => setV(Math.round(x)) })
    return () => c.stop()
  }, [inView, reduce, to])
  return <span ref={ref} className="fo-tab">{v}</span>
}

const PAINS = [
  { n: '01', title: '90 minutes per carousel.', body: 'Write the hook, cut the post into slides, fix the spacing, export, convert, upload.' },
  { n: '02', title: 'Generic templates.', body: 'AI tools give you the same slides everyone else posts. Your brand disappears.' },
  { n: '03', title: 'No idea what worked.', body: 'Posts go out from three different tools and nobody checks which ones performed.' },
]

function Calculator() {
  const [perWeek, setPerWeek] = useState(3)
  const [mins, setMins] = useState(90)
  const [rate, setRate] = useState(100)
  const hours = Math.floor((perWeek * mins * 52) / 12 / 60)
  const cost = Math.round(((perWeek * mins * 52) / 12 / 60) * rate)
  const num = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Number(v) || 0))
  return (
    <div className="fo-calc">
      <label>
        <span>Carousels per week</span>
        <input type="number" inputMode="numeric" min={1} max={21} value={perWeek}
          onChange={(e) => { const n = num(e.target.value, 0, 21); setPerWeek(n); track('calculator_used', { carousels_per_week: n }) }} />
      </label>
      <label>
        <span>Minutes each</span>
        <input type="number" inputMode="numeric" min={5} max={300} value={mins} onChange={(e) => setMins(num(e.target.value, 0, 300))} />
      </label>
      <label>
        <span>Your hourly rate ($)</span>
        <input type="number" inputMode="numeric" min={0} max={2000} value={rate} onChange={(e) => setRate(num(e.target.value, 0, 2000))} />
      </label>
      <p className="fo-calc-out" aria-live="polite">
        <span><b className="fo-tab">{hours}</b> hours a month</span>
        <span><b className="fo-tab">${cost.toLocaleString('en-US')}</b> of your time</span>
      </p>
    </div>
  )
}

export function Problem() {
  const [open, setOpen] = useState(false)
  return (
    <section className="fo-sec" aria-labelledby="fo-problem-h">
      <div className="fo-sec-head">
        <h2 id="fo-problem-h" className="fo-h2">Carousels work. Making them takes your whole morning.</h2>
        <p className="fo-body fo-intro">
          You already have the ideas: blog posts, videos, voice memos. Turning one into 9 good-looking slides means a
          blank Canva file, a lot of copy and paste, and a PDF export that breaks your fonts.
        </p>
      </div>
      <div className="fo-problem">
        <ul className="fo-pains">
          {PAINS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.04} className="fo-pain">
              <span className="fo-pain-n" aria-hidden="true"><b className="fo-tab">{p.n}</b></span>
              <h3 className="fo-h3">{p.title}</h3>
              <p className="fo-body">{p.body}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="fo-statbox" delay={0.12}>
          <p className="fo-statbox-big"><CountUp to={19} /> hours</p>
          <p className="fo-statbox-line">3 carousels a week at 90 minutes each is 19 hours a month.</p>
          <button type="button" className="fo-link" aria-expanded={open} aria-controls="fo-calc" onClick={() => setOpen((o) => !o)}>
            Work out yours
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id="fo-calc" className="fo-calc-wrap"
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: MORPH }}
              >
                <Calculator />
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- 6. Product demo (a coded recording) ---------------- */
const CAPTIONS = ['Paste a link', 'Slides written in your brand', 'Rewrite any slide', 'Drag to reorder', 'Export PDF + PNGs', 'Schedule to LinkedIn']
const STEP_MS = 2600

function DemoFrame({ step }: { step: number }) {
  const rail = step >= 3
    ? ['Hook', 'Stat', 'Bullets', 'Step', 'Quote', 'Step', 'Bullets', 'Step', 'CTA']
    : ['Hook', 'Bullets', 'Step', 'Quote', 'Stat', 'Step', 'Bullets', 'Step', 'CTA']
  const written = step >= 1
  const headline = step >= 2 ? '4 in 10 trials never open your product' : undefined
  return (
    <div className="fo-demo-app">
      <div className="fo-demo-bar">
        <span className="fo-demo-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="fo-demo-title">Why your onboarding loses 40% of trials</span>
        <span className={`fo-demo-btn ${step === 4 ? 'on' : ''}`}><Download size={13} strokeWidth={1.5} />Export</span>
      </div>
      <div className="fo-demo-body">
        <ol className="fo-demo-rail">
          {rail.map((r, i) => (
            <motion.li
              key={r + (r === 'Stat' ? '' : i)}
              layout
              transition={{ duration: 0.6, ease: MORPH }}
              className={`${i === 0 ? 'sel' : ''} ${step === 3 && r === 'Stat' ? 'drag' : ''}`}
              style={{ opacity: written ? 1 : 0.35 }}
            >
              <span className="fo-tab">{i + 1}</span><span className="thumb" />{r}
            </motion.li>
          ))}
        </ol>
        <div className="fo-demo-canvas">
          <div className={`fo-demo-slide ${written ? '' : 'ghost'}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={headline ?? 'a'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
                <Slide kind="hook" kit={KITS.violet} n={1} headline={headline} className={step === 2 ? 'fo-editing' : ''} />
              </motion.div>
            </AnimatePresence>
          </div>
          {step === 2 && (
            <motion.div className="fo-demo-pop" initial={{ opacity: 0, y: 4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.16, ease: EASE }}>
              <span><Wand2 size={13} strokeWidth={1.5} />Punchier</span><span>Shorter</span><span>Add an example</span>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {step === 0 && (
          <motion.div key="paste" className="fo-demo-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="fo-demo-dialog">
              <span className="fo-demo-dlabel">New carousel</span>
              <span className="fo-demo-input"><span className="fo-typing">https://blog.yoursite.com/onboarding</span></span>
              <span className="fo-demo-steps">
                <span><i className="fo-live" />Reading the page</span><span>Writing slides</span><span>Designing</span>
              </span>
            </div>
          </motion.div>
        )}
        {step === 4 && (
          <motion.div key="export" className="fo-demo-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="fo-demo-dialog">
              <span className="fo-demo-dlabel"><FileText size={14} strokeWidth={1.5} />Export</span>
              <span className="fo-demo-meter"><motion.i initial={{ scaleX: 0.1 }} animate={{ scaleX: 1 }} transition={{ duration: 2, ease: MORPH }} /></span>
              <span className="fo-small fo-muted">LinkedIn PDF + 9 PNGs (4:5)</span>
            </div>
          </motion.div>
        )}
        {step === 5 && (
          <motion.div key="sched" className="fo-demo-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="fo-demo-dialog">
              <span className="fo-demo-dlabel">Schedule</span>
              <span className="fo-chip fo-chip-blue">Tue 08:30 · LinkedIn · Scheduled</span>
              <span className="fo-small fo-muted">Profile: Maya Lin</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Demo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  const [userPlay, setUserPlay] = useState(false)
  const [step, setStep] = useState(reduce ? 2 : 0)
  const playing = inView && (!reduce || userPlay)
  const firstPlay = useRef(false)

  useEffect(() => {
    if (!playing) return
    if (!firstPlay.current) { firstPlay.current = true; track('demo_video_play', { autoplay: !userPlay }) }
    const id = window.setInterval(() => setStep((s) => (s + 1) % CAPTIONS.length), STEP_MS)
    return () => window.clearInterval(id)
  }, [playing, userPlay])

  return (
    <section className="fo-sec" id="demo" aria-labelledby="fo-demo-h">
      <div className="fo-sec-head fo-center">
        <h2 id="fo-demo-h" className="fo-h2">From link to scheduled post in under 3 minutes.</h2>
        <p className="fo-body fo-intro">One carousel from a blog link to a scheduled post, start to finish.</p>
      </div>
      <Reveal>
        <div ref={ref} className="fo-demo" role="img" aria-label={`Folio making a carousel. Now showing: ${CAPTIONS[step]}`}>
          <DemoFrame step={step} />
          <div className="fo-demo-cap" aria-hidden="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: EASE }}>
                {CAPTIONS[step]}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="fo-demo-progress" aria-hidden="true">
            {CAPTIONS.map((c, i) => <i key={c} className={i <= step ? 'on' : ''} />)}
          </span>
          {reduce && !userPlay && (
            <button type="button" className="fo-demo-play" onClick={() => setUserPlay(true)} aria-label="Play the demo">
              <Play size={20} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </Reveal>
      <div className="fo-center fo-after"><TrialButton location="demo" /></div>
    </section>
  )
}

/* ---------------- 8. How it works ---------------- */
const STEPS = [
  { title: 'Set up your brand kit.', body: 'Logo, colours, fonts, headshot, handle.' },
  { title: 'Paste a source.', body: 'A blog URL, a YouTube link, an idea, or a voice note.' },
  { title: 'Edit, export, schedule.', body: 'Tweak any slide, download the PDF or schedule it to LinkedIn.' },
]

const PIPE_WIDE = String.raw`Blog URL ─┐
YouTube  ─┤
Idea     ─┼──▶ Read ──────────▶ Write ─────────▶ Design ────────▶ Export ────────▶ Schedule
Voice    ─┘    article or       hook, 6 to 9     your kit on      LinkedIn PDF     Tue 08:30,
               transcript       slides, CTA      every slide      + PNGs           LinkedIn`

const PIPE = String.raw`Blog URL  ─┐
YouTube   ─┤
Idea      ─┼─▶ Read      article or transcript
Voice     ─┘    │
                ▼
               Write     hook, 6 to 9 slides, CTA
                │
                ▼
               Design    your kit on every slide
                │
                ▼
               Export    LinkedIn PDF + PNGs
                │
                ▼
               Schedule  Tue 08:30, LinkedIn`

export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const drawn = reduce || inView
  return (
    <section className="fo-sec" id="how" aria-labelledby="fo-how-h">
      <div className="fo-sec-head">
        <h2 id="fo-how-h" className="fo-h2">Three steps. Five minutes the first time, two after that.</h2>
      </div>
      <ol ref={ref} className="fo-steps">
        <motion.span
          className="fo-steps-line" aria-hidden="true"
          initial={false}
          animate={{ scale: drawn ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: MORPH }}
        />
        {STEPS.map((s, i) => (
          <li key={s.title} className="fo-step">
            <motion.span
              className="fo-step-n fo-tab"
              initial={false}
              animate={{ scale: drawn ? 1 : 0.6, opacity: drawn ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.36, delay: reduce ? 0 : 0.15 + i * 0.3, ease: EASE }}
            >{String(i + 1).padStart(2, '0')}</motion.span>
            <h3 className="fo-h3">{s.title}</h3>
            <p className="fo-body">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="fo-how-foot">
        <Reveal className="fo-ascii">
          <p className="fo-ascii-cap"><Sparkles size={14} strokeWidth={1.5} aria-hidden="true" />What happens after you paste a source</p>
          <pre className="fo-pipe-wide" role="img" aria-label="Pipeline: a blog URL, YouTube video, idea or voice note is read, then Claude writes the hook, 6 to 9 slides and a CTA, Folio designs them in your kit, exports a LinkedIn PDF and PNGs, and schedules the post for Tuesday 08:30 on LinkedIn.">{PIPE_WIDE}</pre>
          <pre className="fo-pipe-tall" role="img" aria-label="Pipeline: a blog URL, YouTube video, idea or voice note is read, then Claude writes the hook, 6 to 9 slides and a CTA, Folio designs them in your kit, exports a LinkedIn PDF and PNGs, and schedules the post for Tuesday 08:30 on LinkedIn.">{PIPE}</pre>
        </Reveal>
        <div className="fo-how-cta">
          <TrialButton location="how_it_works" />
        </div>
      </div>
    </section>
  )
}
