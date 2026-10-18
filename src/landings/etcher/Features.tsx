import { useEffect, useState, type JSX } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, CalendarCheck, GripVertical, Phone, PhoneOff, Play, Upload } from 'lucide-react'
import { EASE, LiveDot, MORPH, Reveal, Ticks, mmss, useCount, useLoop } from './shared'

type Copy = { eyebrow: string; title: string; body: string; ticks: string[] }

function TileCopy({ c }: { c: Copy }) {
  return (
    <div className="et-tile-copy">
      <span className="et-kicker">{c.eyebrow}</span>
      <h3 className="et-h3">{c.title}</h3>
      <p className="et-body">{c.body}</p>
      <Ticks items={c.ticks} />
    </div>
  )
}

/* ---------- 7.1 Calling: person record + dock idle -> dialling -> in call ---------- */
export function CallingVisual() {
  // 0 idle, 1 hover phone, 2 dialling, 3-5 in call (timer runs)
  const { ref, step, reduce } = useLoop(7, 1300, 2)
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (step < 3) { setSecs(0); return }
    setSecs((step - 3) * 1 + 1)
  }, [step])
  const inCall = step >= 3
  const dialling = step === 2
  const hover = step >= 1 && step <= 2
  const h = inCall ? 128 : dialling ? 128 : 40
  return (
    <div className="et-vis et-vis-call" ref={ref} role="img" aria-label="A person record where clicking the phone number opens the softphone dock and starts dialling">
      <div className="et-record">
        <div className="et-record-head"><i className="et-ava et-ava-lg">DP</i><span><strong>Dana Price</strong><em>Head of Talent · Marlow Recruit</em></span></div>
        <dl className="et-fields">
          <div><dt>Email</dt><dd>dana@marlowrecruit.com</dd></div>
          <div className={hover ? 'et-field-hover' : ''}><dt>Phone</dt><dd><span className="et-num">+1 (415) 555 0142</span><span className="et-call-ico" aria-hidden="true"><Phone size={12} /></span></dd></div>
          <div><dt>Owner</dt><dd>Sarah Jones</dd></div>
          <div><dt>Last contacted</dt><dd>3 days ago</dd></div>
        </dl>
      </div>
      <div className="et-dock-slot">
        <motion.div
          className="et-dock et-dock-morph"
          animate={{ height: reduce ? 128 : h }}
          transition={{ duration: reduce ? 0 : 0.3, ease: MORPH }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {step < 2 ? (
              <motion.div key="idle" className="et-dock-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                <Phone size={14} aria-hidden="true" /> <span>Ready</span> <LiveDot />
                <span className="et-num et-faint">+1 415 555 0100</span>
                <span className="et-mini-meter" aria-hidden="true"><i style={{ width: '61%' }} /></span>
              </motion.div>
            ) : (
              <motion.div key="active" className="et-dock-active" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, delay: 0.06, ease: EASE }}>
                <div className="et-dock-who">
                  <i className="et-ava et-ava-lg">DP</i>
                  <span><strong>Dana Price</strong><em className="et-num">+1 (415) 555 0142</em></span>
                  <span className={`et-timer et-num ${inCall ? '' : 'et-ghost'}`}>{mmss(inCall ? secs : 0)}</span>
                </div>
                <div className="et-dock-status">
                  {inCall ? <><LiveDot /> Connected</> : <><LiveDot tone="ghost" /> Calling…</>}
                  <span className="et-dock-btn et-danger et-dock-hang"><PhoneOff size={13} aria-hidden="true" /> Hang up</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

/* ---------- 7.2 Wrap-up: chip selects, timeline item rises ---------- */
const OUTCOMES = ['Connected', 'Meeting booked', 'Left voicemail', 'No answer', 'Not interested', 'Wrong number']
export function WrapVisual() {
  const { ref, step, reduce } = useLoop(4, 1400, 3)
  const selected = step >= 1
  const logged = step >= 2
  return (
    <div className="et-vis et-vis-wrap" ref={ref} role="img" aria-label="Wrap-up panel with Meeting booked selected, then the call appears on the timeline">
      <div className="et-panel">
        <span className="et-panel-label">Outcome</span>
        <div className="et-chips">
          {OUTCOMES.map((o) => (
            <span key={o} className={`et-chip ${selected && o === 'Meeting booked' ? 'on' : ''}`}>{o}</span>
          ))}
        </div>
        <span className="et-panel-label">Note</span>
        <div className="et-note">Wants a proposal by Friday.</div>
        <div className="et-follow"><CalendarCheck size={13} aria-hidden="true" /> Follow-up · <b>Tomorrow</b></div>
      </div>
      <div className="et-timeline-slot">
        <AnimatePresence>
          {logged && (
            <motion.div
              className="et-tl-item"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.36, ease: EASE }}
            >
              <span className="et-play" aria-hidden="true"><Play size={10} fill="currentColor" /></span>
              <span className="et-tl-text"><b>Call · 4:12</b> <span className="et-pill et-pill-green">Meeting booked</span></span>
              <span className="et-faint">Just now</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------- 7.3 Pipelines: stage editor row moves up, mini board moves a deal, value counter ---------- */
const STAGE_ROWS = [
  { id: 'q', name: 'Qualified', p: 20, hue: 'blue' },
  { id: 'd', name: 'Discovery call', p: 30, hue: 'teal' },
  { id: 'p', name: 'Proposal', p: 40, hue: 'amber' },
  { id: 'n', name: 'Negotiation', p: 60, hue: 'violet' },
]
function PipelineVisual() {
  const { ref, step, reduce } = useLoop(2, 2600, 1)
  const order = step === 1 ? ['d', 'q', 'p', 'n'] : ['q', 'd', 'p', 'n']
  const rows = order.map((id) => STAGE_ROWS.find((r) => r.id === id)!)
  const movedDeal = step === 1
  const weighted = useCount(movedDeal ? 43120 : 41200, 400, true, 41200)
  return (
    <div className="et-vis et-vis-pipe" ref={ref} role="img" aria-label="Stage editor with drag handles, and a forecast that updates when a deal moves to Negotiation">
      <div className="et-stage-editor">
        <span className="et-panel-label">Stages · Agency pipeline</span>
        <ul>
          {rows.map((r) => (
            <motion.li key={r.id} layout={!reduce} transition={{ duration: 0.3, ease: MORPH }} className={r.id === 'd' ? 'et-row-drag' : ''}>
              <GripVertical size={13} className="et-faint" aria-hidden="true" />
              <span className={`et-swatch et-hue-${r.hue}`} />
              <span className="et-stage-name">{r.name}</span>
              <span className="et-num et-faint">{r.p}%</span>
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="et-pipe-right">
        <div className="et-bignum-row">
          <span><em>Weighted forecast</em><b className="et-bignum">${weighted.toLocaleString('en-US')}</b></span>
          <span className="et-delta"><ArrowUp size={12} aria-hidden="true" /> <span className="et-num">{movedDeal ? '+$1,920' : '+$0'}</span></span>
        </div>
        <div className="et-mini-board">
          {(['Proposal', 'Negotiation'] as const).map((col) => (
            <div key={col} className={`et-mini-col ${movedDeal && col === 'Negotiation' ? 'et-target' : ''}`}>
              <span className={`et-stage et-hue-${col === 'Proposal' ? 'amber' : 'violet'}`}>{col}</span>
              {col === 'Proposal' && <div className="et-mini-card"><b>Annual licence</b><span className="et-num">$18,000</span></div>}
              {((col === 'Proposal' && !movedDeal) || (col === 'Negotiation' && movedDeal)) && (
                <motion.div layoutId="kestrel-mini" layout={!reduce} transition={{ duration: 0.3, ease: MORPH }} className="et-mini-card et-mini-moving"><b>Paid search retainer</b><span className="et-num">$9,600</span></motion.div>
              )}
              {col === 'Negotiation' && <div className="et-mini-card"><b>Sales playbook</b><span className="et-num">$22,000</span></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- 7.4 Import: bar eases to 100%, counters in place ---------- */
export function ImportVisual() {
  const { ref, step, reduce } = useLoop(5, 1100, 4)
  const target = [2000, 3100, 4100, 4812, 4812][step]
  const done = useCount(target, 500, true, 2000)
  const pct = (done / 4812) * 100
  const skipped = Math.round(done * 0.032)
  const errors = done >= 4812 ? 3 : done > 3500 ? 2 : 1
  const updated = Math.round(done * 0.11)
  const inserted = done - skipped - errors - updated
  const finished = done >= 4812
  return (
    <div className="et-vis et-vis-import" ref={ref} role="img" aria-label="Import progress card counting up to 4,812 people">
      <div className="et-panel">
        <div className="et-import-file"><Upload size={13} aria-hidden="true" /> <span>hubspot-contacts.csv</span> <span className="et-faint et-num">2.4 MB</span></div>
        <div className="et-import-line">
          <span className="et-num">{finished ? 'Imported 4,812 of 4,812' : `Importing ${done.toLocaleString('en-US')} of 4,812`}</span>
          <span className="et-live">{finished ? <><LiveDot tone="ghost" /> Done</> : <><LiveDot /> Running</>}</span>
        </div>
        <div className="et-bar" role="progressbar" aria-valuemin={0} aria-valuemax={4812} aria-valuenow={done}>
          <motion.i animate={{ scaleX: pct / 100 }} initial={false} transition={{ duration: reduce ? 0 : 0.4, ease: MORPH }} />
        </div>
        <dl className="et-counters">
          <div><dt>Inserted</dt><dd className="et-num">{inserted.toLocaleString('en-US')}</dd></div>
          <div><dt>Updated</dt><dd className="et-num">{updated.toLocaleString('en-US')}</dd></div>
          <div><dt>Skipped</dt><dd className="et-num">{skipped.toLocaleString('en-US')}</dd></div>
          <div><dt>Errors</dt><dd className="et-num">{errors}</dd></div>
        </dl>
      </div>
    </div>
  )
}

/* ---------- 7.5 Reports: calls per rep + revenue bars ---------- */
const REPS = [
  { n: 'Sarah Jones', d: 412, c: 168, t: '14h 20m', m: 23 },
  { n: 'Olly Rose', d: 356, c: 141, t: '11h 05m', m: 17 },
  { n: 'Maya Khan', d: 298, c: 126, t: '9h 48m', m: 15 },
  { n: 'Tom Ellis', d: 241, c: 88, t: '7h 12m', m: 9 },
]
const REV = [18, 22, 19, 26, 24, 31, 28, 35, 33, 41, 38, 46]
const MONTHS = ['N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O']
export function ReportsVisual() {
  const { ref, step, reduce } = useLoop(2, 4200, 1)
  const drawn = reduce || step === 1 || step === 0
  return (
    <div className="et-vis et-vis-reports" ref={ref}>
      <div className="et-panel et-reps">
        <span className="et-panel-label">Calls per rep · Last 30 days</span>
        <table>
          <thead><tr><th scope="col">Rep</th><th scope="col">Dials</th><th scope="col">Connects</th><th scope="col" className="et-hide-sm">Rate</th><th scope="col" className="et-hide-sm">Talk time</th><th scope="col">Meetings</th></tr></thead>
          <tbody>
            {REPS.map((r) => (
              <tr key={r.n}>
                <th scope="row">{r.n}</th>
                <td><span className="et-cellbar"><motion.i initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: r.d / 412 }} viewport={{ once: true }} transition={{ duration: 0.4, ease: MORPH }} /></span><span className="et-num">{r.d}</span></td>
                <td className="et-num">{r.c}</td>
                <td className="et-num et-hide-sm">{Math.round((r.c / r.d) * 100)}%</td>
                <td className="et-num et-hide-sm">{r.t}</td>
                <td className="et-num">{r.m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="et-panel et-rev" role="img" aria-label="Revenue closed by month, rising from $18k to $46k over twelve months">
        <div className="et-rev-head"><span className="et-panel-label">Revenue closed by month</span><b className="et-bignum et-bignum-sm">$46k</b></div>
        <div className="et-bars">
          {REV.map((v, i) => (
            <span key={i} className="et-bar-col">
              <motion.i
                className={i === REV.length - 1 ? 'now' : ''}
                style={{ height: `${(v / 46) * 100}%` }}
                initial={reduce ? false : { scaleY: 0 }}
                whileInView={{ scaleY: drawn ? 1 : 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: i * 0.03, ease: MORPH }}
              />
              <em>{MONTHS[i]}</em>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const FEATURES: (Copy & { id: string; size: 'wide' | 'small' | 'full'; Visual: () => JSX.Element })[] = [
  {
    id: 'calling', size: 'wide', Visual: CallingVisual, eyebrow: 'Calling', title: 'Click a number. You are on the phone.',
    body: "Etcher rings from the browser with your team's own local number. Buy US or UK numbers in two clicks, or bring your own Twilio account or SIP carrier. Inbound calls ring the right rep, with the caller's name on screen.",
    ticks: ['Browser calling, no hardware', 'Local US and UK numbers', 'Inbound routed to the owner'],
  },
  {
    id: 'wrapup', size: 'small', Visual: WrapVisual, eyebrow: 'Every call logged', title: 'The call writes its own note.',
    body: 'When the call ends, pick an outcome, add a line and a follow-up task in three clicks. Recordings are saved to the timeline with an optional consent announcement.',
    ticks: ['Outcomes and talk time', 'Recordings with consent message', 'Follow-up tasks'],
  },
  {
    id: 'pipelines', size: 'wide', Visual: PipelineVisual, eyebrow: 'Pipelines', title: 'A board for every way you sell.',
    body: 'Start from an agency, recruiting or B2B sales template. Rename stages, recolour them, set win probabilities and drag deals across. Close as won or lost with a reason.',
    ticks: ['Multiple pipelines', 'Weighted forecast', 'Won and lost reasons'],
  },
  {
    id: 'import', size: 'small', Visual: ImportVisual, eyebrow: 'Your data, clean', title: 'Bring 5,000 leads over before lunch.',
    body: 'Drop in a CSV, match the columns and Etcher skips duplicates by email and company domain. Custom fields fit how you work: notice period, retainer size, tech stack.',
    ticks: ['Column mapping', 'Dedupe by email and domain', 'Custom fields'],
  },
  {
    id: 'reports', size: 'full', Visual: ReportsVisual, eyebrow: 'Reports', title: 'Know who called, and what it made.',
    body: "Pipeline by stage, win rate, cycle time, revenue by month and calls per rep. A Monday email sends the week's numbers to every manager.",
    ticks: ['Calls per rep', 'Win rate and cycle time', 'Weekly digest email'],
  },
]

export function Features() {
  return (
    <section className="et-section" id="product" aria-label="Features">
      <div className="et-wrap">
        <div className="et-bento">
          {FEATURES.map((f, i) => (
            <Reveal key={f.id} delay={(i % 2) * 0.04} className={`et-tile et-tile-${f.size}`}>
              <article id={f.id === 'calling' ? 'calling' : undefined} className="et-tile-inner">
                <TileCopy c={f} />
                <div className="et-tile-vis"><f.Visual /></div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

