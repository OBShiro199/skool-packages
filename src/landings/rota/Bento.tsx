import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { AlertTriangle, ArrowLeftRight, Check, Coffee, Dumbbell, Fingerprint, MapPin, Scissors, Sparkles, Stethoscope } from 'lucide-react'
import { Chip, DAYS, LOOP, Reveal, SectionHead, scrollToId, track, useCountUp, useLoopStep } from './shared'
import { RotaGrid, WEEK } from './Grid'

/* ------------------------------------------------------------------ 7. Features as a motion bento */

function Bullets({ items }: { items: string[] }) {
  return <ul className="rt-bullets">{items.map((b) => <li key={b}><Check size={12} strokeWidth={2} aria-hidden="true" />{b}</li>)}</ul>
}

function TileHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <span className="rt-tile-k">{eyebrow}</span>
      <h3 className="rt-h3">{title}</h3>
    </>
  )
}

/* 7.1 Draft: ghost chips fill the week, the draft panel counts up. */
function DraftViz() {
  const { ref, step, reduce } = useLoopStep(3, 2600)
  const inView = useInView(ref, { amount: 0.3 })
  const shifts = useCountUp(24, 900, inView && step > 0)
  const cost = useCountUp(3412, 900, inView && step > 0)
  return (
    <div ref={ref} className="rt-viz rt-viz-draft" aria-hidden="true">
      <div className="rt-viz-grid">
        <RotaGrid key={step === 0 ? 'a' : 'b'} phase={step === 0 ? 0 : 1} animate={!reduce} compact rows={WEEK.slice(0, 4)} />
      </div>
      <div className="rt-draft-panel">
        <span className="rt-draft-k"><Sparkles size={12} strokeWidth={1.5} />Draft with Claude</span>
        <span className="rt-draft-n"><b>{step === 0 ? 0 : shifts}</b> shifts</span>
        <span className="rt-draft-n"><b>{step === 0 ? 0 : 2}</b> left open</span>
        <span className="rt-draft-n"><b>${(step === 0 ? 0 : cost).toLocaleString('en-US')}</b></span>
        <span className={`rt-tag ${step === 2 ? 'is-pub' : ''}`}><i />{step === 2 ? 'Ready to review' : 'Drafting'}</span>
      </div>
    </div>
  )
}

/* 7.2 Clash: a chip is dragged onto Saturday, the cell turns coral and the popover explains why. */
function ClashViz() {
  const { ref, step } = useLoopStep(4, 1300)
  const dropped = step >= 1
  const warn = step >= 2
  return (
    <div ref={ref} className="rt-viz rt-viz-clash" aria-hidden="true">
      <div className="rt-clash-row">
        <span className="rt-grid-name"><i className="rt-dot is-barista" />Ama</span>
        <span className="rt-cell"><Chip role="barista">15-23</Chip><em>Fri</em></span>
        <span className={`rt-cell ${warn ? 'is-clash' : ''}`}>
          <motion.span initial={false} animate={{ x: dropped ? 0 : 60, y: dropped ? 0 : -28, opacity: dropped ? 1 : 0.6, scale: dropped ? 1 : 0.98 }} transition={{ duration: 0.5, ease: LOOP }} className={dropped ? '' : 'rt-lifted'}>
            <Chip role="barista" conflict={warn ? 'block' : undefined}>06-14{warn && <AlertTriangle size={10} strokeWidth={2} />}</Chip>
          </motion.span>
          <em>Sat</em>
        </span>
      </div>
      <motion.div className="rt-pop" initial={false} animate={{ opacity: warn ? 1 : 0, y: warn ? 0 : 4 }} transition={{ duration: 0.24, ease: LOOP }}>
        <b><AlertTriangle size={12} strokeWidth={1.5} />Not enough rest</b>
        <span>Ama finishes Friday at 23:00. Saturday starts at 06:00: 7 hours' rest, your minimum is 11.</span>
        <span className="rt-pop-actions"><i>Move shift</i><i>Keep and note</i></span>
      </motion.div>
    </div>
  )
}

/* 7.3 Cost: day totals ease in against the budget, Saturday crosses into amber. */
const COST: [number, number][] = [[38, 612], [34, 548], [36, 580], [40, 644], [44, 706], [58, 934], [42, 676]]
function CostViz() {
  const { ref, step } = useLoopStep(2, 2400)
  const budget = 860
  return (
    <div ref={ref} className="rt-viz rt-viz-cost" aria-hidden="true">
      <div className="rt-cost">
        {COST.map(([h, c], i) => {
          const pct = Math.min(1, c / budget)
          const over = c > budget
          return (
            <div key={DAYS[i]} className={`rt-cost-day ${over && step ? 'is-over' : ''}`}>
              <span className="rt-cost-bar"><motion.i initial={false} animate={{ scaleY: step ? pct : 0.12 }} transition={{ duration: 0.5, delay: i * 0.05, ease: LOOP }} /></span>
              <span className="rt-cost-d">{DAYS[i]}</span>
              <span className="rt-cost-h">{h} h</span>
              <span className="rt-cost-c">${c}</span>
            </div>
          )
        })}
        <span className="rt-budget"><em>Budget $860 a day</em></span>
      </div>
    </div>
  )
}

/* 7.4 Texts: three lock-screen notifications arrive in turn. */
const TEXTS: [string, string][] = [
  ['Published', 'Cafe Luna rota w/c 20 Oct: Mon 06:00-14:00, Wed 09:00-17:00, Fri 06:00-14:00'],
  ['Changed', 'Your Wed shift moved to 10:00-18:00. Everything else is the same.'],
  ['Reminder', 'Early start tomorrow: 06:00 at Cafe Luna.'],
]
function SmsViz() {
  const { ref, step: s0 } = useLoopStep(TEXTS.length + 1, 1300)
  const step = Math.max(1, s0)
  return (
    <div ref={ref} className="rt-viz rt-viz-sms" aria-hidden="true">
      <div className="rt-phone is-lock">
        <span className="rt-phone-notch" />
        <span className="rt-lock-time">21:00</span>
        <span className="rt-lock-date">Sunday 19 October</span>
        <div className="rt-lock-list">
          {TEXTS.map(([k, t], i) => (
            <motion.div key={k} className="rt-note" initial={false} animate={{ opacity: step > i ? 1 : 0, y: step > i ? 0 : -8 }} transition={{ duration: 0.36, ease: LOOP }}>
              <span className="rt-note-k"><Glyphlet />Rota · {k}</span>
              <span>{t}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
function Glyphlet() { return <i className="rt-glyphlet" /> }

/* 7.5 Swaps: the request lands in the manager's inbox and gets one tap. */
function SwapViz() {
  const { ref, step } = useLoopStep(4, 1200)
  return (
    <div ref={ref} className="rt-viz rt-viz-swap" aria-hidden="true">
      <div className="rt-swapsheet">
        <span className="rt-tile-k">Staff app · swap</span>
        <span className="rt-swap-line"><Chip role="floor">Sat 09-17</Chip><ArrowLeftRight size={12} strokeWidth={1.5} /><span>Mia → Sam</span></span>
        <span className="rt-checked"><Check size={11} strokeWidth={2} />Rules checked: rest, hours, role</span>
      </div>
      <div className="rt-inbox">
        <span className="rt-tile-k">Requests</span>
        <AnimatePresence initial={false}>
          {step >= 1 && (
            <motion.div key="req" className="rt-req" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: LOOP }}>
              <span><b>Swap</b> · Sat 09-17, Mia to Sam</span>
              <span className={`rt-approve ${step >= 3 ? 'is-done' : step === 2 ? 'is-press' : ''}`}>{step >= 3 ? 'Approved' : 'Approve'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* 7.6 Clock-in: the button is pressed, a row lands in the timesheet, one is flagged for distance. */
const SHEET: [string, string, string, boolean][] = [
  ['Ama', '05:58', '14:02', false], ['Leo', '07:56', '16:01', false], ['Sam', '13:49', '22:00', true], ['Mia', '10:59', '19:03', false],
]
function ClockViz() {
  const { ref, step } = useLoopStep(SHEET.length + 1, 1100)
  return (
    <div ref={ref} className="rt-viz rt-viz-clock" aria-hidden="true">
      <div className="rt-phone is-clock">
        <span className="rt-phone-notch" />
        <span className="rt-tile-k">Mon 20 Oct</span>
        <motion.span className={`rt-clock-btn ${step % 2 ? 'is-in' : ''}`} animate={{ scale: step % 2 ? 0.97 : 1 }} transition={{ duration: 0.16 }}>
          <Fingerprint size={22} strokeWidth={1.5} />
          {step % 2 ? 'Clocked in' : 'Clock in'}
        </motion.span>
        <span className="rt-clock-loc"><MapPin size={11} strokeWidth={1.5} />Location shared once</span>
      </div>
      <div className="rt-ts" role="presentation">
        <div className="rt-ts-row is-head"><span>Name</span><span>In</span><span>Out</span><span>Check</span></div>
        {SHEET.map(([n, a, b, flag], i) => (
          <motion.div key={n} className={`rt-ts-row ${flag ? 'is-flag' : ''}`} initial={false} animate={{ opacity: step > i ? 1 : 0.25 }} transition={{ duration: 0.3, ease: LOOP }}>
            <span>{n}</span><span>{a}</span><span>{b}</span>
            <span>{flag ? <em><AlertTriangle size={10} strokeWidth={2} />Too far · review</em> : <i><Check size={10} strokeWidth={2} />At venue</i>}</span>
          </motion.div>
        ))}
        <span className="rt-csv">Approve week · Download CSV</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ ASCII: how the rest check works */

const START = 12 // the track starts Friday 12:00, one character per hour
const TRACK = 30
function bar(from: number, to: number, fill: number) {
  let s = ''
  for (let h = 0; h < TRACK; h++) {
    const abs = START + h
    s += abs >= from && abs < to && h < fill ? '█' : abs >= from && abs < to ? '░' : '·'
  }
  return s
}
function RestCheck() {
  const ref = useRef<HTMLPreElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const [fill, setFill] = useState(reduce ? TRACK : 0)
  useEffect(() => {
    if (!seen || reduce) { if (reduce) setFill(TRACK); return }
    const id = window.setInterval(() => setFill((f) => (f >= TRACK ? f : f + 1)), 40)
    return () => window.clearInterval(id)
  }, [seen, reduce])
  const axis = (() => {
    const chars = Array(TRACK).fill(' ')
    ;[[0, '12'], [6, '18'], [12, '00'], [18, '06'], [24, '12']].forEach(([i, l]) => { chars[i as number] = (l as string)[0]; chars[(i as number) + 1] = (l as string)[1] })
    return chars.join('')
  })()
  const ticks = Array.from({ length: TRACK }, (_, i) => (i % 6 === 0 ? '┊' : ' ')).join('')
  const gapStart = 23 - START, gapLen = 30 - 23
  const gap = ' '.repeat(gapStart) + '└' + '─'.repeat(1) + '7h' + '─'.repeat(gapLen - 5) + '┘'
  const done = fill >= TRACK
  const lines: [string, string?][] = [
    [' Rest check · Ama, barista', 'is-title'],
    [''],
    [`       ${axis}`, 'is-axis'],
    [`       ${ticks}`, 'is-axis'],
    [` Fri   ${bar(15, 23, fill)}  15:00-23:00`, 'is-track'],
    [` Sat   ${bar(30, 38, fill)}  06:00-14:00`, 'is-track'],
    [`       ${gap}`, done ? 'is-warn' : 'is-hide'],
    [''],
    [' gap   7 hours between shifts', done ? '' : 'is-hide'],
    [' rule  11 hours minimum rest', done ? '' : 'is-hide'],
    [' ▲     flagged on the chip;', done ? 'is-warn' : 'is-hide'],
    ['       nothing sends until you publish', done ? '' : 'is-hide'],
  ]
  return (
    <figure className="rt-ascii-fig">
      <pre
        ref={ref}
        className="rt-ascii"
        role="img"
        aria-label="Rest check for Ama: her Friday shift runs 15:00 to 23:00 and her Saturday shift starts at 06:00, leaving 7 hours between shifts. Your minimum rest is 11 hours, so the Saturday chip is flagged, and nothing is sent to staff until you press Publish."
      >
        {lines.map(([t, c], i) => <span key={i} className={c}>{t || ' '}{'\n'}</span>)}
      </pre>
      <figcaption>How a clash is caught: one character is one hour, from Friday noon.</figcaption>
    </figure>
  )
}

/* ------------------------------------------------------------------ 7.7 Industries */

const INDUSTRIES: [typeof Coffee, string, string, string][] = [
  [Coffee, 'Cafes and kitchens', 'Openers, closers and the Saturday rush, with rest rules built in.', 'cafes'],
  [Dumbbell, 'Gyms and studios', 'Front desk, coaches and cleaners on one rota across your sites.', 'gyms'],
  [Scissors, 'Salons', "Stylists' days and assistants' hours, with time off approved in one tap.", 'salons'],
  [Stethoscope, 'Clinics', 'Reception and assistants covered, and a clean timesheet for payroll.', 'clinics'],
]

export function Features() {
  return (
    <section className="rt-section" id="features" aria-labelledby="rt-feat-h">
      <div className="rt-container">
        <SectionHead id="rt-feat-h" eyebrow="Features" title="Everything between a blank week and a paid timesheet." />
        <div className="rt-bento">
          <Reveal as="article" className="rt-tile rt-t-draft">
            <div className="rt-tile-copy">
              <TileHead eyebrow="Draft with Claude" title="Start from a sensible week, not a blank grid." />
              <p>Rota reads everyone's availability, holidays, roles and the last four weeks, then drafts the whole week. You see every change and every warning before anything is saved. Nothing goes out until you press Publish.</p>
              <Bullets items={['Keeps the patterns that work', 'Leaves a shift open rather than breaking a rule', 'Stays inside your labour budget']} />
            </div>
            <DraftViz />
          </Reveal>

          <Reveal as="article" className="rt-tile rt-t-clash" delay={0.06}>
            <div className="rt-tile-copy">
              <TileHead eyebrow="Conflict warnings" title="Double bookings can't be published. Everything else gets flagged." />
              <p>Drag a shift and Rota checks it on the spot: holidays, availability, 11 hours' rest, weekly hours and whether they're trained for the role. Staff who work at two of your sites can't be booked in both at once.</p>
            </div>
            <ClashViz />
          </Reveal>

          <Reveal as="article" className="rt-tile rt-t-cost">
            <div className="rt-tile-copy">
              <TileHead eyebrow="Cost per day" title="Hours and cost for every day, against your budget." />
              <p>Each person's rate, or the role's default, adds up live along the bottom of the rota. Go over budget and the day turns amber before it turns into a payroll surprise.</p>
            </div>
            <CostViz />
          </Reveal>

          <Reveal as="article" className="rt-tile rt-t-sms" delay={0.06}>
            <div className="rt-tile-copy">
              <TileHead eyebrow="SMS and email" title="Everyone gets their own shifts. Not a screenshot." />
              <p>Publish sends each person one text and one email with only their shifts. Change something and only the people affected hear about it. A reminder lands two hours before every shift, or the evening before an early start.</p>
            </div>
            <SmsViz />
          </Reveal>

          <Reveal as="article" className="rt-tile rt-t-swap" delay={0.12}>
            <div className="rt-tile-copy">
              <TileHead eyebrow="Staff app" title="They sort it out. You tap approve." />
              <p>Staff ask a colleague to swap, ask anyone eligible for cover, or claim an open shift from their phone. Rota checks the swap against the rules before it reaches you.</p>
            </div>
            <SwapViz />
          </Reveal>

          <Reveal as="article" className="rt-tile rt-t-clock">
            <div className="rt-tile-copy">
              <TileHead eyebrow="Timesheets" title="Clock in from their phone. Export a clean timesheet." />
              <p>Staff clock in when they arrive. Turn on the location check and Rota flags anyone clocking in from the bus. Approve the week and download a CSV your payroll tool can import.</p>
            </div>
            <ClockViz />
          </Reveal>
        </div>
        <p className="rt-fine">* Location check on Team and Pro.</p>

        <Reveal className="rt-ascii-wrap"><RestCheck /></Reveal>

        <ul className="rt-kinds">
          {INDUSTRIES.map(([Icon, t, d, slug], i) => (
            <Reveal as="li" key={t} delay={i * 0.06}>
              <a href="#pricing" className="rt-kind" onClick={(e) => { e.preventDefault(); track('lp_industry_click', { industry: slug }); scrollToId('pricing') }}>
                <span className="rt-icon"><Icon size={16} strokeWidth={1.5} aria-hidden="true" /></span>
                <b>{t}</b>
                <span>{d}</span>
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
