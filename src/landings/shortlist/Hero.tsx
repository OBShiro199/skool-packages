import { useEffect, useState } from 'react'
import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { CircleDashed, Quote, X } from 'lucide-react'
import { CareersButton, EASE, MORPH, StagePill, TrialButton, VerdictPill, type Stage, type Verdict } from './shared'

/* ------------------------------------------------------------------ 3. Hero */

type Card = { id: string; name: string; role: string; meta: string; who?: string; unread?: boolean }
const BOARD: Record<Stage, Card[]> = {
  Applied: [
    { id: 'c1', name: 'Tom Okafor', role: 'Product designer', meta: '2h ago', unread: true },
    { id: 'c2', name: 'Lena Fischer', role: 'Product designer', meta: '5h ago', unread: true },
    { id: 'c3', name: 'Sam Patel', role: 'Product designer', meta: 'Yesterday' },
    { id: 'c4', name: 'Grace Lin', role: 'Product designer', meta: 'Yesterday' },
    { id: 'c13', name: 'Nina Kowalski', role: 'Product designer', meta: '2 days ago' },
  ],
  Screen: [
    { id: 'c5', name: 'Ana Ruiz', role: 'Product designer', meta: 'Opened', who: 'MK' },
    { id: 'c6', name: 'Joel Mensah', role: 'Product designer', meta: 'Note from JB', who: 'JB' },
  ],
  Interview: [
    { id: 'c7', name: 'Priya Nair', role: 'Product designer', meta: 'Thu 14:00', who: 'MK' },
    { id: 'c8', name: 'Owen Hughes', role: 'Product designer', meta: 'Booking sent' },
  ],
  Offer: [{ id: 'c9', name: 'Marta Silva', role: 'Product designer', meta: 'Sent Mon', who: 'JB' }],
  Hired: [{ id: 'c10', name: 'Ben Carter', role: 'Ops lead', meta: 'Starts 3 Nov' }],
  Rejected: [
    { id: 'c11', name: 'Kai Müller', role: 'Product designer', meta: 'Replied' },
    { id: 'c12', name: 'Ivy Chen', role: 'Product designer', meta: 'Replied' },
  ],
}
/* 13 static cards + the one that slides from Applied to Screen = 14 cards on the board. */
const MOVER: Card = { id: 'mover', name: 'Rosa Dimitrova', role: 'Product designer', meta: '1h ago', unread: true }
const ORDER: Stage[] = ['Applied', 'Screen', 'Interview', 'Offer', 'Hired', 'Rejected']

const SUMMARY: { c: string; v: Verdict; q?: string }[] = [
  { c: 'Shipped a B2B product end to end', v: 'Meets', q: 'Led design for the invoicing app from first sketch to public launch.' },
  { c: 'Works from a design system', v: 'Meets', q: 'Built and looked after our Figma component library across three products.' },
  { c: 'Writes clear interface copy', v: 'Partly', q: 'Worked with the content team on onboarding emails.' },
  { c: 'Has user research experience', v: 'Not shown' },
]

function CardView({ c, layoutId }: { c: Card; layoutId?: string }) {
  return (
    <motion.div
      layout={!!layoutId}
      layoutId={layoutId}
      className={`sl-card ${c.id === 'c5' ? 'is-selected' : ''}`}
      transition={{ layout: { duration: 0.6, ease: MORPH } }}
    >
      <span className="sl-card-name">{c.unread && <i className="sl-unread" aria-hidden="true" />}{c.name}</span>
      <span className="sl-card-role">{c.role}</span>
      <span className="sl-card-meta">{c.meta}{c.who && <span className="sl-avatar" aria-hidden="true">{c.who}</span>}</span>
    </motion.div>
  )
}

function SummaryPanel() {
  return (
    <div className="sl-panel">
      <div className="sl-panel-top">
        <div>
          <b>Ana Ruiz</b>
          <span>Founding product designer · applied 3 days ago</span>
        </div>
        <span className="sl-panel-x" aria-hidden="true"><X size={14} strokeWidth={1.5} /></span>
      </div>
      <div className="sl-panel-tabs" aria-hidden="true"><span className="is-on">Summary</span><span>CV</span><span>Answers</span><span>Notes</span></div>
      <p className="sl-panel-note">Against your four criteria. Quotes are checked word for word against the CV.</p>
      <ul className="sl-summary">
        {SUMMARY.map((s, i) => (
          <motion.li
            key={s.c}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.7 + i * 0.08, ease: EASE }}
          >
            <span className="sl-summary-row"><span className="sl-summary-c">{s.c}</span><VerdictPill v={s.v} /></span>
            {s.q
              ? <span className="sl-quote"><Quote size={12} strokeWidth={1.5} aria-hidden="true" /><mark>{s.q}</mark></span>
              : <span className="sl-quote is-none"><CircleDashed size={12} strokeWidth={1.5} aria-hidden="true" />Nothing in the CV mentions this.</span>}
          </motion.li>
        ))}
      </ul>
      <div className="sl-panel-actions" aria-hidden="true">
        <span className="sl-mini-btn is-firm">Move to interview</span>
        <span className="sl-mini-btn">Reject</span>
      </div>
    </div>
  )
}

function Board() {
  const reduce = useReducedMotion()
  const [moved, setMoved] = useState(false)
  useEffect(() => {
    if (reduce) { setMoved(true); return }
    const id = window.setTimeout(() => setMoved(true), 2000)
    return () => window.clearTimeout(id)
  }, [reduce])
  return (
    <LayoutGroup>
      <div className="sl-board">
        {ORDER.map((stage) => {
          const cards = BOARD[stage]
          const extra = (stage === 'Applied' && !moved) || (stage === 'Screen' && moved)
          return (
            <div className={`sl-col ${stage === 'Screen' && moved ? 'is-landed' : ''}`} key={stage}>
              <div className="sl-col-head"><StagePill stage={stage} /><span className="sl-col-n">{cards.length + (extra ? 1 : 0)}</span></div>
              {stage === 'Screen' && moved && <CardView c={MOVER} layoutId="sl-mover" />}
              {cards.map((c) => <CardView key={c.id} c={c} />)}
              {stage === 'Applied' && !moved && <CardView c={MOVER} layoutId="sl-mover" />}
            </div>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const rise = (d: number, y = 6, dur = 0.36) => ({
    initial: reduce ? false : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: dur, delay: d, ease: EASE },
  })
  return (
    <header className="sl-hero" id="top">
      <div className="sl-container">
        <div className="sl-hero-copy">
          <motion.p className="sl-hero-eyebrow" {...rise(0)}><i aria-hidden="true" />Applicant tracking for teams hiring their first 10 people</motion.p>
          <motion.h1 className="sl-h1" {...rise(0)}>
            Every applicant on one board. <span className="sl-hl">Every candidate gets a reply.</span>
          </motion.h1>
          <motion.p className="sl-lead" {...rise(0.03)}>
            Post a job in five minutes, share one link, and review every CV with a quoted summary against your own
            criteria. Candidates book their own interview slot. Their data deletes itself on time.
          </motion.p>
          <motion.div className="sl-hero-ctas" {...rise(0.06)}>
            <TrialButton location="hero" size="lg" />
            <CareersButton location="hero" size="lg" />
          </motion.div>
          <motion.p className="sl-trust" {...rise(0.06)}>7 day free trial · From $29 a month · Cancel any time</motion.p>
        </div>
        <motion.figure
          className="sl-shot sl-frame"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.12, ease: EASE }}
          aria-label="The Shortlist pipeline board for a founding product designer role: six stage columns with candidate cards, and Ana Ruiz's AI summary open on the right with two Meets, one Partly and one Not shown, each with a quote from her CV."
        >
          <div className="sl-shot-bar" aria-hidden="true">
            <span className="sl-shot-dots"><i /><i /><i /></span>
            <span className="sl-shot-title">Jobs / Founding product designer</span>
            <span className="sl-live"><i />Live</span>
          </div>
          <div className="sl-shot-body" aria-hidden="true">
            <Board />
            <SummaryPanel />
          </div>
        </motion.figure>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ 4. Logo strip */

const SOURCES = ['LinkedIn', 'Wellfound', 'Indeed', 'Otta', 'Google for Jobs']

export function LogoStrip() {
  return (
    <section className="sl-logos" aria-label="Where applicants come from">
      <div className="sl-container">
        <p>Share one link wherever you post jobs</p>
        <ul>
          {SOURCES.map((s, i) => <li key={s} className={`sl-logo sl-logo-${i}`}>{s}</li>)}
        </ul>
      </div>
    </section>
  )
}
