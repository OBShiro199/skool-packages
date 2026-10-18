import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUp, BookOpen, Check, FileText, Pause, Play } from 'lucide-react'
import { EASE, MORPH, Conf, Eyebrow, Reveal, TrialButton, track } from './shared'

type Line = { label: string; count: string }
type Status = 'wait' | 'live' | 'done'

export function BuildList({ lines, statuses, progress, sub }: { lines: Line[]; statuses: Status[]; progress: number; sub: string }) {
  return (
    <div className="cv-build">
      <ul className="cv-build-list">
        {lines.map((l, i) => (
          <li key={l.label} className={`cv-build-row is-${statuses[i]}`}>
            <span className="cv-build-icon" aria-hidden="true">
              {statuses[i] === 'done' ? <Check size={12} strokeWidth={2.2} /> : statuses[i] === 'live' ? <i className="cv-dot cv-dot-accent cv-dot-pulse" /> : null}
            </span>
            <span className="cv-build-label">{l.label}</span>
            <span className="cv-build-count cv-tab-num">{statuses[i] === 'wait' ? '' : l.count}</span>
            <span className="cv-sr">{statuses[i] === 'done' ? 'done' : statuses[i] === 'live' ? 'in progress' : 'waiting'}</span>
          </li>
        ))}
      </ul>
      <div className="cv-meter" role="progressbar" aria-label="Build progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <p className="cv-build-sub">{sub}</p>
    </div>
  )
}

const VIDEO_LINES: Line[] = [
  { label: 'Reading your pages', count: '142 pages' },
  { label: 'Finding topics', count: '6 categories' },
  { label: 'Writing articles', count: '11 / 18' },
  { label: 'Checking sources', count: '' },
  { label: 'Preparing the assistant', count: '' },
]
const CHAPTERS: [number, string][] = [[0, 'Paste the URL'], [20, 'Articles appear'], [45, 'Install the widget'], [65, 'A visitor asks'], [80, 'Hand to a human']]
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Stand-in for the 90 second screen recording: poster is the build list at "Writing 18 articles". */
export function VideoPlayer() {
  const reduce = useReducedMotion()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setT((s) => { if (s >= 90) { setPlaying(false); return 90 } return s + 1 }), 1000)
    return () => window.clearInterval(id)
  }, [playing])
  const chapter = [...CHAPTERS].reverse().find(([s]) => t >= s) ?? CHAPTERS[0]
  return (
    <div className="cv-video">
      <div className="cv-video-screen">
        <div className="cv-video-poster" aria-hidden="true">
          <BuildList lines={VIDEO_LINES} statuses={['done', 'done', 'live', 'wait', 'wait']} progress={0.52} sub="Writing 18 articles" />
        </div>
      </div>
      <div className="cv-video-bar">
          <button type="button" className="cv-play" aria-label={playing ? 'Pause the demo video' : 'Play the demo video'} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <span className="cv-tab-num cv-video-time">{fmt(t)} / 1:30</span>
          <span className="cv-video-track"><span style={{ transform: `scaleX(${t / 90})`, transition: reduce ? 'none' : undefined }} /></span>
          <span className="cv-video-chapter">{chapter[1]}</span>
      </div>
      <ol className="cv-chapters" aria-label="Chapters">
        {CHAPTERS.map(([s, label]) => (
          <li key={label}>
            <button type="button" className={chapter[0] === s ? 'is-on' : ''} onClick={() => setT(s)}>
              <span className="cv-tab-num">{fmt(s)}</span> {label}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

const DEMO_LINES: Line[] = [
  { label: 'Reading your pages', count: '10 pages' },
  { label: 'Finding topics', count: '3 categories' },
  { label: 'Writing articles', count: '3 articles' },
  { label: 'Checking sources', count: '3 / 3' },
  { label: 'Preparing the assistant', count: 'Ready' },
]

function hostOf(raw: string) {
  try { return new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./, '') } catch { return 'yourwebsite.com' }
}

function PasteDemo() {
  const reduce = useReducedMotion()
  const [url, setUrl] = useState('')
  const [host, setHost] = useState('yourwebsite.com')
  const [step, setStep] = useState(-1) // -1 idle, 0..4 building, 5 ready
  const t0 = useRef(0)
  const [asked, setAsked] = useState(false)

  useEffect(() => {
    if (step < 0 || step >= 5) return
    const id = window.setTimeout(() => setStep((s) => s + 1), reduce ? 0 : 900)
    return () => window.clearTimeout(id)
  }, [step, reduce])
  useEffect(() => { if (step === 5) track('demo_ready', { seconds: Math.round((performance.now() - t0.current) / 1000) }) }, [step])

  const start = (e: FormEvent) => {
    e.preventDefault()
    setHost(hostOf(url.trim() || 'yourwebsite.com'))
    setAsked(false)
    t0.current = performance.now()
    track('demo_start', { mode: 'paste' })
    setStep(0)
  }
  const statuses: Status[] = DEMO_LINES.map((_, i) => (step < 0 || i > step ? 'wait' : i < step || step >= 5 ? 'done' : 'live'))
  const progress = step < 0 ? 0 : Math.min(1, step / 5)
  const sub = step < 0 ? 'Paste a link to start' : step >= 5 ? `Your preview is ready for ${host}` : `${DEMO_LINES[step].label} on ${host}`
  const ready = step >= 5

  return (
    <div className="cv-demo-paste">
      <div className="cv-demo-left">
        <form className="cv-demo-form" onSubmit={start}>
          <label htmlFor="cv-demo-url" className="cv-sr">Your website address</label>
          <input id="cv-demo-url" className="cv-input" type="text" inputMode="url" placeholder="https://yourwebsite.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit" className="cv-btn cv-btn-primary">Build a preview</button>
        </form>
        <BuildList lines={DEMO_LINES} statuses={statuses} progress={progress} sub={sub} />
      </div>
      <div className="cv-demo-right" aria-live="polite">
        <div className={`cv-demo-preview ${ready ? 'is-ready' : ''}`}>
          <div className="cv-mini-hc">
            <div className="cv-mini-hc-head"><BookOpen size={14} aria-hidden="true" /> <b>{host}</b> <span className="cv-faint">Help centre</span></div>
            <div className="cv-mini-cards">
              {[['Shipping and delivery', 'Shipping', '412 words'], ['Returns and refunds', 'Orders', '356 words'], ['Changing your plan', 'Billing', '298 words']].map(([t, c, w], i) => (
                <motion.div
                  key={t}
                  className="cv-mini-card"
                  initial={false}
                  animate={ready ? { opacity: 1, y: 0 } : { opacity: 0.35, y: 0 }}
                  transition={{ duration: 0.36, delay: ready && !reduce ? i * 0.08 : 0, ease: EASE }}
                >
                  <FileText size={14} aria-hidden="true" />
                  <b>{ready ? t : 'Drafting article'}</b>
                  <span className="cv-faint">{ready ? `${c} · ${w}` : 'Waiting'}</span>
                  <span className="cv-tag cv-tag-accent">AI</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="cv-mini-chat">
            <div className="cv-mini-chat-thread">
              {asked ? (
                <>
                  <div className="cv-msg cv-msg-visitor">How long does delivery take?</div>
                  <div className="cv-msg cv-msg-ai">Most orders arrive in 3 to 5 working days. You get a tracking link by email when it ships.</div>
                  <div className="cv-sources is-on"><span className="cv-src">Shipping and delivery</span><Conf v={0.81} /></div>
                </>
              ) : (
                <p className="cv-faint cv-mini-chat-empty">{ready ? 'Ask your new assistant something.' : 'The chat answers from your 10 pages once the preview is ready.'}</p>
              )}
            </div>
            <div className="cv-composer cv-composer-inline">
              <span className="cv-composer-field">{asked ? 'Ask a question' : 'How long does delivery take?'}</span>
              <button type="button" className="cv-send" aria-label="Send message" disabled={!ready || asked} onClick={() => setAsked(true)}>
                <ArrowUp size={15} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
        <div className={`cv-demo-keep ${ready ? 'is-on' : ''}`}>
          <TrialButton location="demo" event="demo_to_signup" label="Keep this help centre: start your trial" />
        </div>
      </div>
    </div>
  )
}

export function LiveDemo() {
  const [mode, setMode] = useState<'paste' | 'video'>('paste')
  return (
    <section className="cv-section" id="demo" aria-labelledby="cv-demo-h">
      <div className="cv-wrap">
        <Reveal className="cv-head cv-head-center">
          <Eyebrow>Try it on your own site</Eyebrow>
          <h2 className="cv-h2" id="cv-demo-h">Watch your help centre write itself.</h2>
        </Reveal>
        <Reveal delay={0.12} className="cv-frame cv-demo">
          <div className="cv-seg" role="tablist" aria-label="Demo mode">
            {([['paste', 'Paste your site'], ['video', 'Watch the video']] as const).map(([m, l]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => { setMode(m); if (m === 'video') track('demo_start', { mode: 'video' }) }}>
                {l}
              </button>
            ))}
          </div>
          <div className="cv-demo-body" role="tabpanel">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: MORPH }}>
                {mode === 'paste' ? <PasteDemo /> : <VideoPlayer />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
        <p className="cv-foot">Previews read up to 10 public pages and are deleted after 48 hours.</p>
      </div>
    </section>
  )
}
