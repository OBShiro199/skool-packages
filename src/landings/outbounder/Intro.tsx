import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Clock, Layers, MailWarning, Pause, Play, Sparkles } from 'lucide-react'
import { EASE, MORPH, Pill, Reveal, SectionHead, track } from './shared'

export function LogoStrip() {
  const logos = ['Prospeo', 'MillionVerifier', 'Firecrawl', 'Claude', 'AgentMail', 'Stripe']
  return (
    <section className="ob-section ob-logos" aria-labelledby="logos-h">
      <Reveal className="ob-rail ob-logos-inner">
        <p id="logos-h" className="ob-logos-h">Built on tools you already trust</p>
        <ul className="ob-logos-row">
          {logos.map((l) => <li key={l} className={`ob-logo ob-logo-${l.toLowerCase()}`}>{l}</li>)}
        </ul>
      </Reveal>
    </section>
  )
}

const PROBLEMS = [
  { Icon: Layers, title: 'Four tools, one campaign', text: 'A lead database, a verifier, a sequencer and ChatGPT. $150 to $300 a month and an afternoon of copy and paste.' },
  { Icon: Clock, title: '3 to 5 minutes per first line', text: 'Real personalisation means opening every website. At 100 leads a week that is a full working day.' },
  { Icon: MailWarning, title: 'One bad week burns a domain', text: 'Too many emails, too fast, from the wrong domain. Then even your invoices land in spam.' },
]

export function Problem() {
  return (
    <section className="ob-section" aria-labelledby="problem-h">
      <div className="ob-rail ob-pad">
        <SectionHead id="problem-h" title="Cold email works. The setup is the part that does not." />
        <div className="ob-problem-grid">
          {PROBLEMS.map(({ Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.08} className="ob-card ob-problem">
              <span className="ob-danger-icon"><Icon size={18} strokeWidth={1.6} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="ob-problem-line">Outbounder does all four jobs, with the safety rules built in.</p></Reveal>
      </div>
    </section>
  )
}

/* ---------- Product demo: a code-built player that steps through the script beats ---------- */

const BEATS = [
  { t: '0:00', label: 'Describe', cap: 'Type who you sell to: founders of UK design studios, 5 to 50 people.' },
  { t: '0:20', label: 'Leads', cap: 'Verified leads stream in while you wait.' },
  { t: '0:40', label: 'First line', cap: 'Open a lead: the website quote and the first line it inspired.' },
  { t: '1:00', label: 'Approve', cap: 'Approve five with the A key.' },
  { t: '1:15', label: 'Domain', cap: 'Your outreach domain: every DNS record checked.' },
  { t: '1:30', label: 'Inbox', cap: 'A reply lands, already labelled Interested.' },
  { t: '1:50', label: 'Start', cap: 'Start your trial.' },
]
const BEAT_MS = 4200

function Scene({ beat }: { beat: number }) {
  switch (beat) {
    case 0:
      return (
        <div className="ob-scene ob-scene-icp">
          <span className="ob-faint">Who do you sell to?</span>
          <div className="ob-scene-input">Founders of UK design studios, 5 to 50 people<i className="ob-caret" /></div>
          <div className="ob-scene-chips"><Pill tone="accent">Founder</Pill><Pill tone="accent">United Kingdom</Pill><Pill tone="accent">5 to 50</Pill><Pill tone="accent">Design</Pill></div>
        </div>
      )
    case 1:
      return (
        <div className="ob-scene ob-scene-list">
          {['Sarah Lee · Northpeak Studio', 'Jo Marsh · Lowtide Design', 'Amir Khan · Blocklight', 'Priya Shah · Fold & Co', 'Dan Ortiz · Lantern'].map((r, i) => (
            <motion.div key={r} className="ob-scene-row" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.25, duration: 0.3, ease: EASE }}>
              <span>{r}</span><Pill tone="accent" dot>Verified</Pill>
            </motion.div>
          ))}
        </div>
      )
    case 2:
      return (
        <div className="ob-scene ob-scene-why">
          <div className="ob-why-quote"><span className="ob-faint">From northpeak.studio/work</span>"Case studies: Alpine Supply, Trailhead Co, Fernway. Shopify Plus partner."</div>
          <div className="ob-why-line"><Sparkles size={13} aria-hidden="true" /> Northpeak's case studies are all outdoor brands on Shopify, which is a sharp niche for a 12-person studio.</div>
        </div>
      )
    case 3:
      return (
        <div className="ob-scene ob-scene-approve">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div key={i} className="ob-scene-row" initial={{ x: 0, opacity: 1 }} animate={{ x: -24, opacity: 0.45 }} transition={{ delay: 0.3 + i * 0.5, duration: 0.3, ease: MORPH }}>
              <span>Email {i + 1} of 25</span><span className="ob-kbd">A</span>
            </motion.div>
          ))}
        </div>
      )
    case 4:
      return (
        <div className="ob-scene ob-scene-list">
          {['TXT  @  v=spf1', 'TXT  _dmarc', 'CNAME  dkim._domainkey', 'MX  @  10'].map((r, i) => (
            <div key={r} className="ob-scene-row"><span className="ob-mono">{r}</span>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.4, duration: 0.15 }}><Pill tone="accent"><Check size={11} /> Valid</Pill></motion.span>
            </div>
          ))}
        </div>
      )
    case 5:
      return (
        <div className="ob-scene ob-scene-list">
          <motion.div className="ob-scene-row ob-scene-row-new" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3, ease: EASE }}>
            <span><b>Sarah Lee</b> "Sounds interesting, what does it cost?"</span><Pill tone="accent">Interested</Pill>
          </motion.div>
          <div className="ob-scene-row"><span><b>Jo Marsh</b> "Not this quarter, try me in January."</span><Pill tone="amber">Not now</Pill></div>
          <div className="ob-scene-row"><span><b>Amir Khan</b> "Out until the 14th."</span><Pill tone="grey">Out of office</Pill></div>
        </div>
      )
    default:
      return (
        <div className="ob-scene ob-scene-end">
          <span className="ob-wordmark-lg">outbounder</span>
          <span className="ob-muted">Start your trial. 7 days free.</span>
        </div>
      )
  }
}

function DemoPlayer() {
  const reduce = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const [started, setStarted] = useState(false)
  const sent = useRef(new Set<number>())

  useEffect(() => {
    if (!playing) return
    const id = window.setTimeout(() => {
      if (beat >= BEATS.length - 1) { setPlaying(false); return }
      setBeat((b) => b + 1)
    }, BEAT_MS)
    return () => window.clearTimeout(id)
  }, [playing, beat])

  useEffect(() => {
    if (!started) return
    const pct = Math.round(((beat + 1) / BEATS.length) * 100)
    for (const mark of [25, 50, 75, 100]) {
      if (pct >= mark && !sent.current.has(mark)) { sent.current.add(mark); track('landing_video_played', { percent: mark }) }
    }
  }, [beat, started])

  const toggle = () => {
    if (!started) { setStarted(true); setBeat(0); setPlaying(true); return }
    if (!playing && beat >= BEATS.length - 1) { setBeat(0); setPlaying(true); return }
    setPlaying((p) => !p)
  }

  return (
    <div className="ob-player">
      <div className="ob-player-frame">
        <div className="ob-player-chrome" aria-hidden="true"><i /><i /><i /><span className="ob-mono">app.outbounder.io/campaigns/new</span></div>
        <div className="ob-player-stage" aria-hidden="true">
          {!started ? (
            <div className="ob-poster">
              <div className="ob-poster-side">
                {['Dashboard', 'Campaigns', 'Inbox', 'Domains', 'Analytics'].map((n, i) => <span key={n} className={i === 1 ? 'on' : ''}>{n}</span>)}
              </div>
              <div className="ob-poster-main">
                <div className="ob-poster-top"><b>Review queue</b><span className="ob-mono ob-faint">3 of 25 approved</span></div>
                {['Sarah Lee', 'Jo Marsh', 'Amir Khan', 'Priya Shah', 'Dan Ortiz', 'Mia Chen', 'Leo Grant', 'Ava Brooks', 'Sam Patel'].map((n, i) => (
                  <div className="ob-poster-row" key={n}><span>{n}</span><span className="ob-skel" /><Pill tone={i < 3 ? 'accent' : 'grey'}>{i < 3 ? 'Approved' : 'Needs review'}</Pill></div>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={beat} className="ob-scene-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.22 }}>
                <Scene beat={beat} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        <div className="ob-player-caption" aria-live="polite">{started ? BEATS[beat].cap : ''}</div>
        <button type="button" className={`ob-player-play${started ? ' small' : ''}`} onClick={toggle} aria-label={playing ? 'Pause demo' : started ? 'Play demo' : 'Play the 2 minute product demo, sound off, captions on'}>
          {playing ? <Pause size={16} /> : <Play size={started ? 16 : 20} />}
          {!started && <span>Watch the demo</span>}
        </button>
      </div>
      <ol className="ob-chapters" aria-label="Demo chapters">
        {BEATS.map((b, i) => (
          <li key={b.t}>
            <button type="button" className={started && i === beat ? 'on' : ''} onClick={() => { setStarted(true); setBeat(i); setPlaying(true) }}>
              <span className="ob-chapter-bar"><motion.i animate={{ scaleX: !started ? 0 : i < beat ? 1 : i === beat ? 1 : 0 }} transition={{ duration: i === beat && playing ? BEAT_MS / 1000 : 0.2, ease: 'linear' }} /></span>
              <span className="ob-mono">{b.t}</span> {b.label}
            </button>
          </li>
        ))}
      </ol>
      <a className="ob-link ob-transcript" href="#demo-transcript" onClick={(e) => { e.preventDefault(); document.getElementById('demo-transcript')?.toggleAttribute('open') }}>Read the transcript</a>
      <details id="demo-transcript" className="ob-transcript-body">
        <summary className="ob-sr">Transcript</summary>
        <ol>{BEATS.map((b) => <li key={b.t}><span className="ob-mono">{b.t}</span> {b.cap}</li>)}</ol>
      </details>
    </div>
  )
}

export function Demo() {
  return (
    <section className="ob-section" aria-labelledby="demo-h">
      <div className="ob-rail ob-pad">
        <SectionHead id="demo-h" title="See a campaign go from buyer to inbox in 2 minutes" />
        <Reveal scale><DemoPlayer /></Reveal>
        <ul className="ob-stats">
          <li><span className="ob-stat-n">About 2 minutes</span><span>to write 25 first lines</span></li>
          <li><span className="ob-stat-n">20 a day</span><span>per new inbox</span></li>
          <li><span className="ob-stat-n">0 links</span><span>in your first email</span></li>
        </ul>
      </div>
    </section>
  )
}
