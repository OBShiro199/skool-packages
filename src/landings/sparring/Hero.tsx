import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Mic, PhoneOff, Play } from 'lucide-react'
import { Avatar, BandTag, EASE, Eyebrow, LiveDot, MORPH, RUBRIC, TrialButton, mss, scrollToId, track, useCount } from './shared'

const BARS = 36

/** The live call screen: persona card, orb, timer and a waveform of whoever is talking. */
function LiveCall() {
  const reduce = useReducedMotion()
  const [s, setS] = useState(134)
  const [speaker, setSpeaker] = useState<'them' | 'you'>('them')
  useEffect(() => {
    if (reduce) return
    const t = window.setInterval(() => setS((x) => (x >= 179 ? 134 : x + 1)), 1000)
    const sp = window.setInterval(() => setSpeaker((p) => (p === 'them' ? 'you' : 'them')), 3200)
    return () => { window.clearInterval(t); window.clearInterval(sp) }
  }, [reduce])
  const you = speaker === 'you' ? 48 : 44
  return (
    <div className="sp-call" role="img" aria-label="Live practice call with Margaret Okafor, CFO at Northfield Logistics, at 2 minutes 14 of 5 minutes">
      <div className="sp-call-bar">
        <span className="sp-call-title">Call with Margaret Okafor</span>
        <span className="sp-chip-live"><LiveDot /> Live</span>
      </div>
      <div className="sp-call-body">
        <div className="sp-persona-card">
          <Avatar initials="MO" hue="violet" size={40} />
          <div className="sp-persona-meta">
            <b>Margaret Okafor</b>
            <span>CFO, Northfield Logistics</span>
          </div>
          <div className="sp-persona-pills">
            <span className="sp-pill">Cold call</span>
            <span className="sp-pill">Normal</span>
          </div>
          <p className="sp-persona-brief">Sceptical, dry, short on time. Hides month-end pain until asked well.</p>
        </div>
        <div className="sp-call-stage">
          <div className={`sp-orb ${speaker === 'them' ? 'is-speaking' : ''}`}>
            <span className="sp-orb-ring" />
            <span className="sp-orb-core"><Avatar initials="MO" hue="violet" size={44} /></span>
          </div>
          <div className="sp-speaking" aria-hidden="true">{speaker === 'them' ? 'Margaret is speaking' : 'You are speaking'}</div>
          <div className="sp-timer"><span className="sp-num">{mss(s)}</span><span className="sp-timer-of"> / 5:00</span></div>
          <div className={`sp-wave sp-wave-${speaker}`} aria-hidden="true">
            {Array.from({ length: BARS }, (_, i) => (
              <span key={i} style={{ animationDelay: `${(i * 97) % 900}ms`, animationDuration: `${700 + ((i * 53) % 500)}ms` }} />
            ))}
          </div>
          <div className="sp-talk" aria-hidden="true">
            <span className="sp-num">You {you}%</span>
            <span className="sp-talk-bar"><motion.span className="sp-talk-you" animate={{ scaleX: you / 100 }} transition={{ duration: 0.3, ease: MORPH }} /></span>
            <span className="sp-num">Margaret {100 - you}%</span>
          </div>
          <div className="sp-call-actions">
            <span className="sp-btn sp-btn-md sp-btn-ghost"><Mic size={14} aria-hidden="true" /> Mute</span>
            <span className="sp-btn sp-btn-md sp-btn-primary"><PhoneOff size={14} aria-hidden="true" /> End call</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Scorecard total with the five rubric bars filling once at 900ms. */
export function ScoreCard({ start = true, delay = 900, compact = false }: { start?: boolean; delay?: number; compact?: boolean }) {
  const reduce = useReducedMotion()
  const total = useCount(72, 900, start, reduce ? 0 : delay)
  return (
    <div className={`sp-score ${compact ? 'is-compact' : ''}`} role="img" aria-label="Scorecard showing 72 out of 100, Solid, with five rubric scores">
      <div className="sp-score-top">
        <span className="sp-score-total sp-big"><span className="sp-num sp-score-n">{total}</span><span className="sp-score-of">/ 100</span></span>
        <BandTag b="solid" />
      </div>
      <p className="sp-score-out">Booked Thursday 10am</p>
      <ul className="sp-rubric">
        {RUBRIC.map((r, i) => (
          <RubricBar key={r.label} label={r.label} score={r.score} start={start} delay={(reduce ? 0 : delay) + i * 60} />
        ))}
      </ul>
    </div>
  )
}

function RubricBar({ label, score, start, delay }: { label: string; score: number; start: boolean; delay: number }) {
  const reduce = useReducedMotion()
  const n = useCount(score, 400, start, delay)
  return (
    <li className="sp-rrow">
      <span className="sp-rrow-l">{label}</span>
      <span className="sp-bar"><motion.span className="sp-bar-fill" initial={{ scaleX: reduce ? score / 20 : 0 }} animate={{ scaleX: start ? score / 20 : 0 }} transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : delay / 1000, ease: MORPH }} /></span>
      <span className="sp-num sp-rrow-n">{n}</span>
    </li>
  )
}

export function NoteCard({ t = '1:52', kind = 'Fix', crit = 'Pain discovery', quote = "So you'd want to...", tryLine = "What does that cost you each month-end?" }: { t?: string; kind?: 'Fix' | 'Keep'; crit?: string; quote?: string; tryLine?: string }) {
  return (
    <div className="sp-note">
      <div className="sp-note-top">
        <span className="sp-note-t sp-num">{t}</span>
        <span className="sp-pill">{crit}</span>
        <span className={`sp-tag ${kind === 'Fix' ? 'sp-tag-weak' : 'sp-tag-strong'}`}>{kind}</span>
      </div>
      <p className="sp-note-q">&ldquo;{quote}&rdquo;</p>
      <p className="sp-note-try"><b>Try:</b> &lsquo;{tryLine}&rsquo;</p>
    </div>
  )
}

export function Hero({ onSample }: { onSample: () => void }) {
  const reduce = useReducedMotion()
  const rise = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : 0.08 * i, ease: EASE },
  })
  const layer = (ms: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.5, delay: reduce ? 0 : ms / 1000, ease: EASE },
  })
  return (
    <section className="sp-hero" id="top" aria-labelledby="sp-h1">
      <div className="sp-wrap sp-hero-grid">
        <div className="sp-hero-copy">
          <motion.div {...rise(0)}><Eyebrow>AI cold call practice for SDR teams and founders</Eyebrow></motion.div>
          <motion.h1 id="sp-h1" className="sp-display" {...rise(1)}>Practise the cold call before you make the real one.</motion.h1>
          <motion.p className="sp-lead" {...rise(2)}>
            Pick a prospect, press Call, and a sceptical CFO picks up and pushes back. Hang up and get your score out of 100,
            the exact second you lost them, and the line you should have said.
          </motion.p>
          <motion.div className="sp-hero-ctas" {...rise(3)}>
            <TrialButton location="hero" />
            <button type="button" className="sp-btn sp-btn-lg sp-btn-ghost" onClick={() => { track('lp_sample_played', { trigger: 'hero_button' }); scrollToId('hear'); onSample() }}>
              <Play size={15} aria-hidden="true" /> Hear a 60 second sample call
            </button>
          </motion.div>
          <motion.p className="sp-trust" {...rise(4)}>7 days free with 20 practice minutes. No dialler, no real prospects burned.</motion.p>
        </div>

        <div className="sp-hero-visual">
          <motion.div className="sp-layer sp-layer-back sp-frame" {...layer(0)}><LiveCall /></motion.div>
          <motion.div className="sp-layer sp-layer-score sp-frame" {...layer(140)}><ScoreCard compact /></motion.div>
          <motion.div
            className="sp-layer sp-layer-note sp-frame"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: [0.97, 1.03, 1] }}
            transition={{ duration: reduce ? 0 : 0.56, delay: reduce ? 0 : 1.6, ease: EASE }}
          >
            <NoteCard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
