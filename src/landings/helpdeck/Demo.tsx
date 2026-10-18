import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, Code2, FileText, Globe, Mail, MessageSquare, Pause, Play, Send } from 'lucide-react'
import { EASE, MORPH, Reveal, TypingDots, track } from './shared'

/* ---------------- Section 6: Live demo ---------------- */

const STEPS = ['Reading your pages', 'Splitting into sections', 'Learning them', 'Ready']
const DEMO_LIMIT = 3

type Phase = 'idle' | 'loading' | 'ready' | 'error' | 'limit'
type Msg = { from: 'user' | 'bot'; text: string; source?: string; unsure?: boolean }

function parseDomain(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    if (!u.hostname.includes('.') || u.hostname.endsWith('.')) return null
    return u.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function CheckDraw({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={`hd-check ${on ? 'on' : ''}`}>
      <circle cx="8" cy="8" r="7.25" />
      <path d="M4.8 8.3l2.1 2.1 4.3-4.6" pathLength={1} />
    </svg>
  )
}

export function LiveDemo() {
  const reduce = useReducedMotion()
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [domain, setDomain] = useState('')
  const [stepDone, setStepDone] = useState(0)
  const [pages, setPages] = useState(0)
  const [runs, setRuns] = useState(0)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [thinking, setThinking] = useState(false)
  const [draft, setDraft] = useState('')
  const timers = useRef<number[]>([])
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, thinking])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, reduce ? 0 : ms)) }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    const d = parseDomain(url)
    if (!d) { setPhase('error'); return }
    if (runs >= DEMO_LIMIT) { setPhase('limit'); return }
    track('demo_submit', { domain: d })
    setRuns((r) => r + 1)
    setDomain(d)
    setMsgs([])
    setStepDone(0)
    setPages(0)
    setPhase('loading')
    const total = 12
    for (let i = 1; i <= total; i++) later(() => setPages(i), 180 * i)
    later(() => setStepDone(1), 900)
    later(() => setStepDone(2), 1700)
    later(() => setStepDone(3), 2500)
    later(() => { setStepDone(4); track('demo_ready', { pages: total, seconds: 3 }) }, 3000)
    later(() => setPhase('ready'), 3500)
  }

  const suggestions = [
    { q: 'How do I get started?', page: 'Getting started' },
    { q: 'What do the plans include?', page: 'Pricing' },
    { q: 'How do I reset my password?', page: 'Account and login' },
  ]

  const ask = (q: string, page?: string) => {
    if (!q.trim() || thinking) return
    track('demo_question', { confident: !!page })
    setMsgs((m) => [...m, { from: 'user', text: q }])
    setDraft('')
    setThinking(true)
    later(() => {
      setThinking(false)
      setMsgs((m) => [...m, page
        ? { from: 'bot', text: `Here is what your ${page} page says. In the full demo this answer is written from that page, word for word where it matters.`, source: `${page} · ${domain}` }
        : { from: 'bot', text: "I'm not sure about this one. Want a human to email you?", unsure: true }])
    }, 900)
  }

  return (
    <section className="hd-section" id="try" aria-labelledby="try-h">
      <div className="hd-container">
        <Reveal className="hd-section-head">
          <span className="hd-eyebrow">Live demo</span>
          <h2 id="try-h" className="hd-h2">Try it on your own website. Right now.</h2>
          <p className="hd-sub">Paste your docs or help centre URL. We read up to 15 pages and you can ask it anything. No signup needed.</p>
        </Reveal>

        <Reveal delay={0.08} className="hd-demo-card">
          <div className="hd-demo-top">
          <form className="hd-demo-form" onSubmit={submit} noValidate>
            <label className="hd-field">
              <span className="hd-sr">Docs or help centre URL</span>
              <Globe size={16} aria-hidden="true" />
              <input type="url" inputMode="url" placeholder="https://docs.yourcompany.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <label className="hd-field">
              <span className="hd-sr">Email (we email you the demo link)</span>
              <Mail size={16} aria-hidden="true" />
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" className="hd-btn hd-btn-primary hd-btn-md" disabled={phase === 'loading'}>
              Train my demo bot <ArrowRight size={16} className="hd-btn-arrow" aria-hidden="true" />
            </button>
          </form>
          <p className="hd-demo-note">We email the demo link so you can come back to it.</p>
          </div>

          <div className="hd-demo-stage" aria-live="polite">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div key="idle" className="hd-demo-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="hd-demo-ghost" aria-hidden="true">
                    <div className="hd-ghost-head"><i /><span><b className="hd-line w45" /><b className="hd-line w30" /></span></div>
                    <div className="hd-ghost-body">
                      <b className="hd-ghost-bubble l" /><b className="hd-ghost-bubble r" /><b className="hd-ghost-bubble l w" />
                    </div>
                    <div className="hd-ghost-input" />
                  </div>
                  <p>Your bot appears here, trained on your pages.</p>
                </motion.div>
              )}
              {(phase === 'error' || phase === 'limit') && (
                <motion.div key={phase} className="hd-demo-alert" role="alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {phase === 'error'
                    ? 'We could not read that site. Try your docs or help centre URL instead of your homepage.'
                    : 'Demo limit reached for today. Start a free trial to train it on your whole site.'}
                </motion.div>
              )}
              {phase === 'loading' && (
                <motion.div key="loading" className="hd-progress" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <div className="hd-progress-top">
                    <span><Globe size={14} aria-hidden="true" /> {domain}</span>
                    <strong>{pages} pages read</strong>
                  </div>
                  <div className="hd-progress-bar"><motion.i animate={{ scaleX: stepDone / 4 }} transition={{ duration: 0.4, ease: MORPH }} /></div>
                  <ul>
                    {STEPS.map((s, i) => (
                      <li key={s} className={i < stepDone ? 'done' : i === stepDone ? 'now' : ''}>
                        <CheckDraw on={i < stepDone} /> {s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {phase === 'ready' && (
                <motion.div key="ready" className="hd-demo-ready" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}>
                  <div className="hd-chat hd-chat-demo">
                    <div className="hd-chat-head">
                      <span className="hd-chat-avatar"><MessageSquare size={14} aria-hidden="true" /></span>
                      <div>
                        <strong>{domain}</strong>
                        <span><i className="hd-status-dot" /> Trained on 12 pages</span>
                      </div>
                    </div>
                    <div className="hd-chat-body hd-chat-body-demo" ref={bodyRef}>
                      <div className="hd-bubble hd-bubble-bot">Hi! I have read 12 pages of {domain}. What would you like to know?</div>
                      {msgs.map((m, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE }} className="hd-msg-wrap">
                          {m.unsure
                            ? <div className="hd-handoff"><p>{m.text}</p><div className="hd-handoff-field"><Mail size={13} aria-hidden="true" /> {email || 'you@company.com'} <span>Send</span></div></div>
                            : <div className={`hd-bubble hd-bubble-${m.from}`}>{m.text}</div>}
                          {m.source && <div className="hd-source"><FileText size={12} aria-hidden="true" /> {m.source}</div>}
                        </motion.div>
                      ))}
                      {thinking && <div className="hd-bubble hd-bubble-bot hd-bubble-dots"><TypingDots /></div>}
                    </div>
                    <div className="hd-suggest">
                      {suggestions.map((s) => (
                        <button key={s.q} type="button" className="hd-chip-btn" onClick={() => ask(s.q, s.page)}>{s.q}</button>
                      ))}
                    </div>
                    <form className="hd-chat-form" onSubmit={(e) => { e.preventDefault(); ask(draft) }}>
                      <label className="hd-sr" htmlFor="hd-demo-q">Ask your demo bot</label>
                      <input id="hd-demo-q" placeholder="Ask anything…" value={draft} onChange={(e) => setDraft(e.target.value)} />
                      <button type="submit" aria-label="Send question"><Send size={14} /></button>
                    </form>
                  </div>
                  <a href="#pricing" className="hd-btn hd-btn-primary hd-btn-md hd-keep" onClick={() => track('demo_keep_click')}>
                    Keep this bot: start free trial <ArrowRight size={16} className="hd-btn-arrow" aria-hidden="true" />
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Section 7: Product demo video (built in code) ---------------- */

const CHAPTERS = ['Paste your URL', 'Helpdeck reads every page', 'Test a question', 'Copy one line', 'Live on your site', 'Unsure? It emails you']
const CH_MS = 7500 // 6 chapters x 7.5s = 45s

function Scene({ i }: { i: number }) {
  switch (i) {
    case 0:
      return (
        <div className="hd-scene hd-scene-center">
          <div className="hd-scene-input"><Globe size={14} /> <span className="hd-scene-type">https://docs.acme.com</span></div>
          <span className="hd-scene-btn">Train my bot</span>
        </div>
      )
    case 1:
      return (
        <div className="hd-scene hd-scene-list">
          {['/getting-started', '/invoices', '/invoices/export', '/payments', '/refunds', '/api'].map((p, k) => (
            <motion.div key={p} className="hd-scene-row" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + k * 0.35, duration: 0.3, ease: EASE }}>
              <FileText size={12} /> docs.acme.com{p} <Check size={12} className="ok" />
            </motion.div>
          ))}
        </div>
      )
    case 2:
      return (
        <div className="hd-scene hd-scene-chat">
          <div className="hd-bubble hd-bubble-user">Do you have an API?</div>
          <motion.div className="hd-bubble hd-bubble-bot" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.3 }}>
            Yes. Create a key in Settings → API and send it as a Bearer token.
          </motion.div>
          <motion.div className="hd-source" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2, duration: 0.2 }}>
            <FileText size={12} /> API reference <span>· docs.acme.com</span>
          </motion.div>
        </div>
      )
    case 3:
      return (
        <div className="hd-scene hd-scene-center">
          <div className="hd-scene-code"><Code2 size={14} /> &lt;script src="https://helpdeck.app/w.js" async&gt;</div>
          <motion.span className="hd-scene-copied" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.3 }}><Check size={12} /> Copied</motion.span>
        </div>
      )
    case 4:
      return (
        <div className="hd-scene hd-scene-site">
          <i className="hd-line w45" /><i className="hd-line w80" /><i className="hd-line w60" />
          <motion.span className="hd-launcher" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 18 }}>
            <MessageSquare size={16} />
          </motion.span>
        </div>
      )
    default:
      return (
        <div className="hd-scene hd-scene-center">
          <motion.div className="hd-scene-mail" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.4, ease: EASE }}>
            <Mail size={14} />
            <div><strong>New handoff from your bot</strong><span>"Can I get a refund for last month?" · Reply goes to the customer</span></div>
          </motion.div>
        </div>
      )
  }
}

export function ProductVideo() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const [userPaused, setUserPaused] = useState(!!reduce)
  const [ch, setCh] = useState(0)
  const [tick, setTick] = useState(0)
  const playing = inView && !userPaused
  const started = useRef(false)

  useEffect(() => {
    if (!playing) return
    if (!started.current) { started.current = true; track('video_play', { autoplay: !reduce }) }
    const id = window.setTimeout(() => setCh((c) => (c + 1) % CHAPTERS.length), CH_MS)
    return () => window.clearTimeout(id)
  }, [playing, ch, tick, reduce])

  const seek = (i: number) => { setCh(i); setTick((t) => t + 1); setUserPaused(false) }

  return (
    <section className="hd-section hd-section-tight" id="video" aria-labelledby="video-h">
      <div className="hd-container">
        <Reveal className="hd-section-head">
          <span className="hd-eyebrow">Product tour · 45 seconds</span>
          <h2 id="video-h" className="hd-h2">From URL to live widget in 3 minutes.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="hd-player" ref={ref} role="region" aria-label={`Product tour, chapter ${ch + 1} of 6: ${CHAPTERS[ch]}`}>
            <div className="hd-player-screen">
              <div className="hd-player-app">
                <aside aria-hidden="true">
                  <span className="hd-wordmark-icon sm"><MessageSquare size={11} /></span>
                  {['Sources', 'Test', 'Install', 'Inbox'].map((n, k) => (
                    <i key={n} className={(ch === 0 || ch === 1 ? 0 : ch === 2 ? 1 : ch === 3 ? 2 : 3) === k ? 'on' : ''}>{n}</i>
                  ))}
                </aside>
                <div className="hd-player-main" aria-hidden="true">
                  <AnimatePresence mode="wait">
                    <motion.div key={`${ch}-${tick}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="hd-scene-wrap">
                      <Scene i={ch} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <div className="hd-caption" aria-hidden="true">{CHAPTERS[ch]}</div>
              {userPaused && (
                <button type="button" className="hd-play-big" onClick={() => setUserPaused(false)} aria-label="Play product tour">
                  <Play size={22} />
                </button>
              )}
            </div>
            <div className="hd-player-bar">
              <button type="button" className="hd-icon-btn" onClick={() => setUserPaused((p) => !p)} aria-label={userPaused ? 'Play' : 'Pause'}>
                {userPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <div className="hd-player-track" aria-hidden="true">
                {CHAPTERS.map((c, i) => (
                  <span key={c}>
                    <motion.i
                      key={`${i}-${ch}-${tick}-${playing}`}
                      initial={{ scaleX: i < ch ? 1 : 0 }}
                      animate={{ scaleX: i < ch ? 1 : i === ch && playing ? 1 : i === ch ? 0.08 : 0 }}
                      transition={{ duration: i === ch && playing ? CH_MS / 1000 : 0, ease: 'linear' }}
                    />
                  </span>
                ))}
              </div>
              <span className="hd-player-time">0:{String(Math.round(ch * 7.5)).padStart(2, '0')} / 0:45</span>
            </div>
          </div>
        </Reveal>
        <div className="hd-chapters" role="group" aria-label="Chapters">
          {CHAPTERS.map((c, i) => (
            <button key={c} type="button" className={`hd-chip-btn ${i === ch ? 'on' : ''}`} aria-pressed={i === ch} onClick={() => seek(i)}>
              <span className="hd-chip-time">0:{String(Math.round(i * 7.5)).padStart(2, '0')}</span> {c}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
