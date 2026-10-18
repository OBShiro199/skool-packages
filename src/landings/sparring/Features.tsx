import { useMemo, useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Mail } from 'lucide-react'
import { Avatar, BandTag, EASE, band, Eyebrow, MORPH, RUBRIC, Reveal, Ticks, mss, useCount, useLoop, waveform, type Hue } from './shared'

function Tile({ span, id, eyebrow, title, body, bullets, children, label }: {
  span: 2 | 3 | 4; id?: string; eyebrow: string; title: string; body: string; bullets: string[]; children: ReactNode; label: string
}) {
  return (
    <Reveal className={`sp-tile sp-span-${span}`} id={id}>
      <div className="sp-tile-vis" role="img" aria-label={label}>{children}</div>
      <div className="sp-tile-text">
        <span className="sp-kicker">{eyebrow}</span>
        <h3 className="sp-h3">{title}</h3>
        <p className="sp-body">{body}</p>
        <Ticks items={bullets} />
      </div>
    </Reveal>
  )
}

/* 7.1 Three PersonaCards with the difficulty pills; selection moves between them. */
const PERSONAS: { i: string; n: string; r: string; hue: Hue; line: string }[] = [
  { i: 'MO', n: 'Margaret Okafor', r: 'CFO', hue: 'violet', line: 'Dry, sceptical, guards her month-end pain.' },
  { i: 'DM', n: 'Dev', r: 'Founder', hue: 'green', line: 'Fast, friendly, busy. Interrupts a long pitch.' },
  { i: 'PS', n: 'Priya', r: 'EA', hue: 'rose', line: 'Warm and precise. Has heard every opener.' },
]
const LEVELS = ['Easy', 'Normal', 'Hard']
function PersonasVis() {
  const { ref, step, reduce } = useLoop(3, 1800, 0)
  return (
    <div ref={ref} className="sp-pv-wrap">
      <div className="sp-pv">
        {PERSONAS.map((p, i) => (
          <motion.div
            key={p.i}
            className={`sp-pcard ${step === i ? 'is-sel' : ''}`}
            initial={reduce ? false : { y: 0, opacity: 0 }}
            whileInView={{ y: i === 1 ? -4 : 0, x: (i - 1) * 4, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
          >
            <Avatar initials={p.i} hue={p.hue} size={36} />
            <b>{p.n}</b>
            <span className="sp-pcard-r">{p.r}</span>
            <p>{p.line}</p>
          </motion.div>
        ))}
      </div>
      <div className="sp-diff" aria-hidden="true">
        {LEVELS.map((l, j) => <span key={l} className={`sp-pill ${j === (step + 1) % 3 ? 'is-on' : ''}`}>{l}</span>)}
        <span className="sp-diff-hint">{['Friendly, 2 objections.', 'Busy and neutral. 3 objections.', 'Hangs up on a weak opener.'][(step + 1) % 3]}</span>
      </div>
    </div>
  )
}

/* 7.2 Rubric rows with reasons; the scores tick up again each loop. */
function RubricVis() {
  const { ref, step, inView, reduce } = useLoop(2, 4200, 1)
  const run = inView && (reduce || step >= 0)
  return (
    <div ref={ref} className="sp-rv">
      <RubricTotal key={`t${reduce ? 'r' : step}`} run={run} />
      <ul className="sp-rubric sp-rubric-reasons">
        {RUBRIC.map((r, i) => <ReasonRow key={`${r.label}${reduce ? 'r' : step}`} {...r} run={run} delay={120 + i * 90} />)}
      </ul>
    </div>
  )
}
function RubricTotal({ run }: { run: boolean }) {
  const n = useCount(72, 1100, run, 100)
  return (
    <div className="sp-rv-top">
      <span className="sp-score-total sp-big"><span className="sp-num sp-score-n sp-score-n-sm">{n}</span><span className="sp-score-of">/ 100</span></span>
      <BandTag b={band(n)} />
      <span className="sp-rv-time">Scored 58s after hang-up</span>
    </div>
  )
}
function ReasonRow({ label, score, reason, run, delay }: { label: string; score: number; reason: string; run: boolean; delay: number }) {
  const reduce = useReducedMotion()
  const n = useCount(score, 600, run, delay)
  return (
    <li className="sp-reason">
      <div className="sp-rrow">
        <span className="sp-rrow-l">{label}</span>
        <span className="sp-bar"><motion.span className="sp-bar-fill" initial={{ scaleX: reduce ? score / 20 : 0 }} animate={{ scaleX: run ? score / 20 : 0 }} transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : delay / 1000, ease: MORPH }} /></span>
        <span className="sp-num sp-rrow-n">{n}<span className="sp-rrow-max">/20</span></span>
      </div>
      <p>{reason}</p>
    </li>
  )
}

/* 7.3 Mini player: the playhead walks along; notes light up as it passes them. */
function NotesVis() {
  const bars = useMemo(() => waveform(48, 3), [])
  const { ref, step, reduce } = useLoop(40, 160, 18)
  const p = step / 40
  const notes = [{ at: 0.2, t: '0:41', crit: 'Opener', kind: 'Keep', q: '"Is now a bad time?" Honest and short.' }, { at: 0.55, t: '1:52', crit: 'Pain discovery', kind: 'Fix', q: 'Try: "What does that cost you each month-end?"' }]
  return (
    <div ref={ref} className="sp-nv">
      <div className="sp-nv-wave">
        {bars.map((h, i) => <span key={i} className={i / 48 < p ? 'is-played' : ''} style={{ transform: `scaleY(${h})` }} />)}
        {notes.map((n) => <i key={n.t} className="sp-nv-mark" style={{ left: `${n.at * 100}%` }} />)}
        <span className="sp-playhead-track" style={{ transform: `translateX(${p * 100}%)`, transition: reduce ? 'none' : 'transform 160ms linear' }}><span className="sp-playhead" /></span>
      </div>
      <div className="sp-nv-time sp-num">{mss(Math.round(p * 252))} / 4:12</div>
      <ul className="sp-nv-notes">
        {notes.map((n) => (
          <li key={n.t} className={p >= n.at && p < n.at + 0.3 ? 'is-active' : ''}>
            <span className="sp-note-t sp-num">{n.t}</span>
            <span className="sp-pill">{n.crit}</span>
            <span className={`sp-tag ${n.kind === 'Fix' ? 'sp-tag-weak' : 'sp-tag-strong'}`}>{n.kind}</span>
            <p>{n.q}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* 7.4 Builder form left, drafted persona right; the draft fields fill top to bottom. */
const DRAFT = [
  ['Name', 'Helen Fraser, Head of Finance'],
  ['Hidden pain', 'Close takes 9 days; the board noticed.'],
  ['Objection', '"We just renewed with our current tool."'],
  ['Wins the call', 'Ask about close time before any pitch.'],
]
function BuilderVis() {
  const { ref, step } = useLoop(DRAFT.length + 3, 900, DRAFT.length + 2)
  return (
    <div ref={ref} className="sp-bv">
      <div className="sp-bv-form">
        <label>Who you sell to</label>
        <div className="sp-field">Finance leads at 50 to 300 person logistics firms</div>
        <label>Objections your team hears</label>
        <div className="sp-field sp-field-tall">"Send me an email." · "We just renewed." · "Not my area."</div>
        <span className="sp-btn sp-btn-sm sp-btn-primary">Draft persona</span>
      </div>
      <div className="sp-bv-out">
        <div className="sp-bv-head"><Avatar initials="HF" hue="amber" size={28} /><span>Draft</span><span className="sp-pill">Custom</span></div>
        {DRAFT.map(([k, v], i) => (
          <div className="sp-bv-row" key={k}>
            <span>{k}</span>
            <motion.b initial={false} animate={{ opacity: step > i ? 1 : 0, y: step > i ? 0 : 4 }} transition={{ duration: 0.3, ease: EASE }}>{v}</motion.b>
          </div>
        ))}
      </div>
    </div>
  )
}

/* 7.5 Team leaderboard with streaks and a small trend line drawing. */
const BOARD: { n: string; i: string; hue: Hue; calls: number; avg: number; streak: number; d: number }[] = [
  { n: 'Ama Boateng', i: 'AB', hue: 'green', calls: 14, avg: 81, streak: 9, d: 6 },
  { n: 'Sam Reid', i: 'SR', hue: 'blue', calls: 11, avg: 74, streak: 6, d: 4 },
  { n: 'Lena Novak', i: 'LN', hue: 'rose', calls: 9, avg: 69, streak: 3, d: -3 },
  { n: 'Tom Hale', i: 'TH', hue: 'amber', calls: 7, avg: 63, streak: 2, d: 2 },
]
function BoardVis() {
  const { ref, step, reduce } = useLoop(6, 1400, 0)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const live = step % 3 === 1
  return (
    <div ref={ref} className="sp-lb">
      <div className="sp-lb-table">
        <div className="sp-lb-head"><span>#</span><span>Rep</span><span>Calls</span><span>Best 5</span><span>Streak</span><span>Week</span></div>
        {BOARD.map((r, i) => (
          <motion.div
            key={r.n}
            className={`sp-lb-row ${i === 1 ? 'is-me' : ''}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.36, delay: i * 0.06, ease: EASE }}
          >
            <span className="sp-num">{i + 1}</span>
            <span className="sp-lb-rep"><Avatar initials={r.i} hue={r.hue} size={22} /><span>{r.n}</span></span>
            <span className="sp-num">{r.calls + (i === 1 && live ? 1 : 0)}</span>
            <span className="sp-num sp-lb-avg">{r.avg + (i === 1 && live ? 1 : 0)}</span>
            <span><span className="sp-streak">{r.streak} day</span></span>
            <span className={`sp-num ${r.d > 0 ? 'sp-up' : 'sp-down'}`}>{r.d > 0 ? `+${r.d}` : r.d}</span>
          </motion.div>
        ))}
      </div>
      <div className="sp-trend">
        <span className="sp-trend-l">Team average, 12 weeks</span>
        <svg viewBox="0 0 220 64" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="63.5" x2="220" y2="63.5" stroke="var(--hairline)" />
          <motion.path
            d="M0 52 L20 50 L40 46 L60 48 L80 40 L100 37 L120 38 L140 30 L160 27 L180 22 L200 20 L220 14"
            fill="none" stroke="var(--accent)" strokeWidth="1.6"
            initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: inView ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.9, delay: 0.3, ease: MORPH }}
          />
        </svg>
        <span className="sp-trend-n"><span className="sp-num sp-big">71</span> <span className="sp-up sp-num">+9 since week 1</span></span>
      </div>
    </div>
  )
}

/* 7.6 Sidebar meter easing from full to 59%, then the 80% email. */
function MeterVis() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const used = useCount(148, 900, inView, 200)
  return (
    <div ref={ref} className="sp-mv">
      <div className="sp-mv-side">
        <span className="sp-mv-l">Practice minutes</span>
        <span className="sp-bar sp-bar-meter"><motion.span className="sp-bar-fill" initial={{ scaleX: reduce ? 212 / 360 : 1 }} animate={{ scaleX: inView ? 212 / 360 : 1 }} transition={{ duration: reduce ? 0 : 0.9, delay: 0.2, ease: MORPH }} /></span>
        <span className="sp-mv-n sp-num">{360 - used} of 360 min left</span>
      </div>
      <motion.div className="sp-mail" initial={reduce ? false : { opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.36, delay: reduce ? 0 : 1.3, ease: EASE }}>
        <span className="sp-mail-i"><Mail size={14} aria-hidden="true" /></span>
        <div>
          <b>Your team has used 80% of its minutes</b>
          <p>72 minutes left until your renewal on 3 Nov. Calls stop at the cap; nothing extra is charged.</p>
        </div>
      </motion.div>
    </div>
  )
}

export function Features() {
  return (
    <section className="sp-section" id="features" aria-labelledby="sp-feat-h">
      <div className="sp-wrap">
        <Reveal className="sp-head">
          <Eyebrow>Features</Eyebrow>
          <h2 id="sp-feat-h" className="sp-h2">Prospects that push back, scored on what wins meetings.</h2>
        </Reveal>
        <div className="sp-bento">
          <Tile span={3} eyebrow="Realistic personas" title="A sceptical CFO, a busy founder and a gatekeeper who has heard it all."
            body="Each persona has a personality, a way of talking, pains they will not volunteer and objections they will use. They interrupt. They go quiet. On Hard they hang up on a weak opener."
            bullets={['Replies in about a second, in a natural voice', 'Cold call, discovery and objection drill scenarios', 'Easy, Normal and Hard for every persona']}
            label="Three persona cards: Margaret the CFO, Dev the founder and Priya the EA, with Easy, Normal and Hard pills"
          ><PersonasVis /></Tile>
          <Tile span={3} eyebrow="The rubric" title="Opener, permission, pain discovery, objection handling, next step."
            body="Every call is scored out of 100 against the five things that decide a cold call. Each score has a reason you can argue with, and one top fix for next time."
            bullets={['Scored in about a minute after you hang up', 'Same rubric for every rep, every time', 'See the talk-listen ratio for each call']}
            label="Scorecard with five rubric rows and reasons, totalling 72 out of 100"
          ><RubricVis /></Tile>
          <Tile span={2} eyebrow="Coaching notes" title="Click the note, hear the moment, read the better line."
            body="Three to eight notes pinned to the recording: what to keep doing and what to fix, with your exact words and a line you could have said instead."
            bullets={['Recording and transcript for every call', 'Notes jump the audio to that second', 'Run the same drill again in one click']}
            label="Audio player with note markers and two coaching notes"
          ><NotesVis /></Tile>
          <Tile span={4} eyebrow="Custom personas" title="Your buyer, your objections, ready in a minute."
            body="Paste who you sell to and the objections your team hears every day. Sparring drafts a prospect with hidden pains and the conditions that win the meeting. Edit anything, pick a voice, save."
            bullets={["Uses your team's real objections word for word", 'Hidden pains reps have to dig out', 'Managers control what wins the call']}
            label="Persona builder form on the left and the drafted persona on the right"
          ><BuilderVis /></Tile>
          <Tile span={4} id="teams" eyebrow="For teams" title="Assign the drill on Monday. See who did it by Friday."
            body="Managers assign drills with a pass score and a due date. Reps get an email, practise, and the leaderboard updates. Streaks reward the daily 15 minutes that actually builds the skill."
            bullets={['Assignments with pass scores and due dates', 'Weekly leaderboard and per-rep trends', 'Monday 8am team report by email']}
            label="Team leaderboard with calls, best five average, streaks and weekly change, plus a 12 week trend line"
          ><BoardVis /></Tile>
          <Tile span={2} eyebrow="No surprise bills" title="Pooled practice minutes with a hard cap."
            body="Every plan includes a set number of voice minutes for the whole team. The meter is always on screen, and calls stop at the cap. No overage, ever."
            bullets={['Meter in the sidebar for every rep', 'Email at 80% used', 'Upgrade any time from Billing']}
            label="Minutes meter at 212 of 360 minutes left and the 80% used email"
          ><MeterVis /></Tile>
        </div>
      </div>
    </section>
  )
}
