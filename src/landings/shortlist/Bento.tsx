import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, FileText, MousePointer2, Quote, Undo2, Video } from 'lucide-react'
import { LOOP, SectionHead, StagePill, VerdictPill, scrollToId, useLoopStep, type Stage, type Verdict } from './shared'

/* ------------------------------------------------------------------ 7. Features as a motion bento */

function Bullets({ items }: { items: string[] }) {
  return <ul className="sl-bullets">{items.map((b) => <li key={b}><Check size={12} strokeWidth={2} aria-hidden="true" />{b}</li>)}</ul>
}

/* 7.1 Careers page: questions slide into the builder while the phone form fills. */
const QUESTIONS = ['Why this role?', 'Portfolio link', 'Notice period', 'Right to work in the UK']
function CareersViz() {
  const { ref, step } = useLoopStep(QUESTIONS.length + 2, 1100)
  const shown = Math.max(1, Math.min(step + 1, QUESTIONS.length))
  return (
    <div ref={ref} className="sl-viz sl-viz-careers" aria-hidden="true">
      <div className="sl-builder">
        <span className="sl-viz-k">Form builder</span>
        <div className="sl-builder-row is-fixed"><FileText size={12} strokeWidth={1.5} />CV upload · PDF or Word</div>
        {QUESTIONS.map((q, i) => (
          <motion.div
            key={q}
            className="sl-builder-row"
            initial={false}
            animate={{ opacity: i < shown ? 1 : 0, y: i < shown ? 0 : 6 }}
            transition={{ duration: 0.36, ease: LOOP }}
          >
            <span className="sl-builder-n">{i + 1}</span>{q}
          </motion.div>
        ))}
        <span className="sl-g4j"><i />Google for Jobs ready</span>
      </div>
      <div className="sl-phone">
        <span className="sl-phone-notch" />
        <span className="sl-phone-brand"><i />Juniper Labs</span>
        <b>Founding product designer</b>
        <span className="sl-phone-meta">London or remote · Full time</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="sl-field">
            <motion.i initial={false} animate={{ scaleX: step > i ? 1 : 0 }} transition={{ duration: 0.5, ease: LOOP }} />
          </span>
        ))}
        <span className={`sl-phone-cta ${step >= QUESTIONS.length + 1 ? 'is-sent' : ''}`}>{step >= QUESTIONS.length + 1 ? 'Application sent' : 'Apply'}</span>
      </div>
    </div>
  )
}

/* 7.2 AI summary: labels land one by one and the quote gets highlighted as proof. */
const CRITERIA: { c: string; v: Verdict; q?: string }[] = [
  { c: '3+ years in B2B product', v: 'Meets', q: '"Four years designing billing tools for small firms."' },
  { c: 'Owns work end to end', v: 'Meets', q: '"Led design from first sketch to public launch."' },
  { c: 'Writes clear UX copy', v: 'Partly', q: '"Worked with the content team on onboarding."' },
  { c: 'User research', v: 'Not shown' },
  { c: 'Comfortable with ambiguity', v: 'Unclear' },
]
function AiViz() {
  const { ref, step } = useLoopStep(CRITERIA.length + 3, 900)
  return (
    <div ref={ref} className="sl-viz sl-viz-ai" aria-hidden="true">
      <div className="sl-redact"><span>Name</span><i /><span>Email</span><i /><span>Phone</span><i /></div>
      <ul>
        {CRITERIA.map((r, i) => {
          const on = step > i
          return (
            <li key={r.c} className={on ? 'is-on' : ''}>
              <span className="sl-ai-row">
                <span>{r.c}</span>
                <motion.span initial={false} animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.96 }} transition={{ duration: 0.24, ease: LOOP }}>
                  <VerdictPill v={r.v} />
                </motion.span>
              </span>
              {r.q && (
                <span className="sl-ai-q">
                  <Quote size={11} strokeWidth={1.5} />
                  <span className={`sl-sweep ${on ? 'is-on' : ''}`}>{r.q}</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <span className="sl-no-score">No score · no rank · no auto-reject</span>
    </div>
  )
}

/* 7.3 Board: a card walks along the stages, an interviewer's scorecard stays sealed until submitted. */
const MINI: Stage[] = ['Applied', 'Screen', 'Interview', 'Offer']
function BoardViz() {
  const { ref, step } = useLoopStep(MINI.length, 1300)
  return (
    <div ref={ref} className="sl-viz sl-viz-board" aria-hidden="true">
      <div className="sl-mini-board">
        {MINI.map((s, i) => (
          <div key={s} className="sl-mini-col">
            <StagePill stage={s} />
            {i === 0 && <span className="sl-mini-card is-ghost" />}
            {i === 1 && <span className="sl-mini-card"><span className="sl-avatar">MK</span></span>}
            <AnimatePresence initial={false}>
              {step === i && (
                <motion.span
                  key={s}
                  className="sl-mini-card is-moving"
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 18 }}
                  transition={{ duration: 0.42, ease: LOOP }}
                >
                  <b>Priya</b><span className="sl-avatar">JB</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <div className="sl-scorecard">
        <span className="sl-viz-k">Your scorecard · Priya Nair</span>
        {['Owns work end to end', 'Writes clear UX copy'].map((c, i) => (
          <span key={c} className="sl-score-row">
            <span>{c}</span>
            <span className="sl-seg">{['No', 'Mixed', 'Yes'].map((o, k) => <i key={o} className={(step + i) % 3 === k ? 'is-on' : ''}>{o}</i>)}</span>
          </span>
        ))}
        <span className="sl-sealed">Others' scorecards hidden until you submit</span>
      </div>
    </div>
  )
}

/* 7.4 Booking: the cursor travels to a free slot, clicks, and a Meet link is created. */
const SLOTS = ['09:30', '10:00', '11:30', '13:00', '14:30', '16:00']
function BookingViz() {
  const { ref, step } = useLoopStep(4, 1100)
  const target = 4
  return (
    <div ref={ref} className="sl-viz sl-viz-book" aria-hidden="true">
      <span className="sl-viz-k">Thu 23 Oct · your time zone</span>
      <div className="sl-slots">
        {SLOTS.map((t, i) => <span key={t} className={`sl-slot ${i === target && step >= 2 ? 'is-on' : ''} ${i === 1 ? 'is-busy' : ''}`}>{t}</span>)}
        <motion.span
          className="sl-cursor"
          initial={false}
          animate={{ x: step === 0 ? 8 : 100, y: step === 0 ? 8 : 44, scale: step === 2 ? 0.86 : 1 }}
          transition={{ duration: 0.6, ease: LOOP }}
        >
          <MousePointer2 size={14} strokeWidth={1.5} />
        </motion.span>
      </div>
      <motion.span className="sl-booked" initial={false} animate={{ opacity: step === 3 ? 1 : 0, y: step === 3 ? 0 : 4 }} transition={{ duration: 0.3, ease: LOOP }}>
        <Video size={12} strokeWidth={1.5} />Booked · Meet link created
      </motion.span>
    </div>
  )
}

/* 7.5 Templates: placeholder chips, and a rejection waiting out its two hour undo window. */
function EmailViz() {
  const reduce = useReducedMotion()
  const [left, setLeft] = useState(2 * 3600 - 2)
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setLeft((s) => (s <= 2 * 3600 - 9 ? 2 * 3600 - 2 : s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [reduce])
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60
  return (
    <div className="sl-viz sl-viz-email" aria-hidden="true">
      <span className="sl-viz-k">Template · Rejection</span>
      <p>Hi <span className="sl-chip">first_name</span>, thank you for applying for <span className="sl-chip">job_title</span>. We have decided not to move forward this time.</p>
      <span className="sl-undo"><Undo2 size={12} strokeWidth={1.5} />Sends in <b>{h}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</b><span className="sl-undo-btn">Undo</span></span>
    </div>
  )
}

/* 7.6 GDPR: retention bars fill toward deletion; the deletion log gains a row. */
const LOG = ['Deleted 3 applications · retention 180 days', 'Access request answered · M. Silva', 'Deleted 1 application · candidate request']
function GdprViz() {
  const { ref, step } = useLoopStep(LOG.length + 1, 1400)
  return (
    <div ref={ref} className="sl-viz sl-viz-gdpr" aria-hidden="true">
      <div className="sl-req">
        <span><b>Deletion request</b> · K. Müller</span>
        <span className="sl-due">Due in 21 days</span>
      </div>
      <div className="sl-ret">
        {[['90', 0.34], ['180', 0.62], ['365', 0.88]].map(([d, w], i) => (
          <span key={d as string} className={`sl-ret-row ${i === 1 ? 'is-on' : ''}`}>
            <span>{d} days</span>
            <span className="sl-ret-bar"><motion.i initial={false} animate={{ scaleX: step === 0 ? 0.05 : (w as number) }} transition={{ duration: 0.5, ease: LOOP }} /></span>
          </span>
        ))}
      </div>
      <ul className="sl-log">
        {LOG.map((l, i) => (
          <motion.li key={l} initial={false} animate={{ opacity: step > i ? 1 : 0, y: step > i ? 0 : 6 }} transition={{ duration: 0.36, ease: LOOP }}>
            <Check size={11} strokeWidth={2} />{l}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export function Features() {
  return (
    <section className="sl-section" id="product" aria-labelledby="sl-feat-h">
      <div className="sl-container">
        <SectionHead id="sl-feat-h" eyebrow="Product" title="Everything a small team needs to hire well" />
        <div className="sl-bento">
          <article className="sl-tile sl-t-careers">
            <div className="sl-tile-copy">
              <h3 className="sl-h3">A careers page and form in five minutes</h3>
              <p>Write the job, add your own questions, and publish to a careers page with your logo. Candidates apply from their phone in under three minutes, with their CV going straight into private storage. Jobs show up in Google for Jobs automatically.</p>
              <Bullets items={['Custom questions', 'PDF and Word CVs up to 10 MB', 'Google for Jobs ready']} />
            </div>
            <CareersViz />
          </article>

          <article className="sl-tile sl-t-ai">
            <div className="sl-tile-copy">
              <h3 className="sl-h3">AI that explains, never decides</h3>
              <p>For every applicant, Shortlist reads the CV against the criteria you wrote and shows Meets, Partly, Not shown or Unclear for each one, with quotes from the CV as proof. No scores, no ranking, no auto-reject. Names and contact details are removed before the AI sees anything.</p>
              <Bullets items={['Quoted evidence for every claim', 'Names and contacts redacted', 'Candidates can opt out']} />
              <a href="#fair" className="sl-link" onClick={(e) => { e.preventDefault(); scrollToId('fair') }}>How we keep it fair <ArrowRight size={13} strokeWidth={1.5} aria-hidden="true" /></a>
            </div>
            <AiViz />
          </article>

          <article className="sl-tile sl-t-board">
            <div className="sl-tile-copy">
              <h3 className="sl-h3">A board your whole team can use</h3>
              <p>Drag candidates through Applied, Screen, Interview, Offer and Hired. Leave notes with @mentions. Interviewers see only the jobs they are on and fill in a scorecard against the same criteria, without seeing anyone else's until they submit.</p>
              <Bullets items={['Owner, admin and interviewer roles', 'Blind scorecards', 'Live updates']} />
            </div>
            <BoardViz />
          </article>

          <article className="sl-tile sl-t-book">
            <div className="sl-tile-copy">
              <h3 className="sl-h3">Candidates book their own interview</h3>
              <p>Connect Google Calendar once. Send a booking link and the candidate picks a slot that works for every interviewer, in their own time zone. A Google Meet link and calendar invites go out automatically. Reminders and rescheduling are handled for you.</p>
              <Bullets items={['Reads free/busy only', 'Buffers and daily limits', 'Meet link created for you']} />
            </div>
            <BookingViz />
          </article>

          <article className="sl-tile sl-t-email">
            <div className="sl-tile-copy">
              <h3 className="sl-h3">Every candidate hears back</h3>
              <p>Six email templates in your words: received, interview invite, confirmed, reminder, cancelled and rejection. Rejections wait two hours before sending, so a slip of the mouse can be undone.</p>
              <Bullets items={['Your reply-to address', 'Undo for rejections', 'Bounces handled']} />
            </div>
            <EmailViz />
          </article>

          <article className="sl-tile sl-t-gdpr">
            <div className="sl-tile-copy">
              <h3 className="sl-h3">GDPR on autopilot</h3>
              <p>Pick how long you keep candidate data. Shortlist deletes it on time, warns you a week before, and keeps a log that proves it. When a candidate asks what you hold, or asks you to delete it, it takes two clicks.</p>
              <Bullets items={['90, 180 or 365 day retention', 'Access and deletion requests', 'Deletion log']} />
            </div>
            <GdprViz />
          </article>
        </div>
      </div>
    </section>
  )
}
