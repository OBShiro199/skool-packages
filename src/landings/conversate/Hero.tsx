import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowUp, Bot, Flag, MessageCircle, PlayCircle, ShoppingBag, Sparkles, TriangleAlert, User, X } from 'lucide-react'
import { EASE, Conf, Eyebrow, TypingDots, UrlForm, track, useTyping } from './shared'
import { VideoPlayer } from './Demo'

const ANSWER = 'Yes. We ship to Canada in 4 to 7 working days. Orders over $80 ship free.'

/** The big widget mockup: launcher, typing indicator, AI answer with sources and "Talk to a human". */
export function WidgetPanel({ start }: { start: boolean }) {
  const reduce = useReducedMotion()
  // 0 visitor only, 1 typing dots, 2 answer typing, 3 sources and handoff row
  const [phase, setPhase] = useState(reduce ? 3 : 0)
  useEffect(() => {
    if (!start) return
    if (reduce) { setPhase(3); return }
    const t1 = window.setTimeout(() => setPhase(1), 700)
    const t2 = window.setTimeout(() => setPhase(2), 2000)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [start, reduce])
  const { shown, done } = useTyping(ANSWER, phase >= 2, 900)
  useEffect(() => { if (done && phase === 2) setPhase(3) }, [done, phase])

  return (
    <div className="cv-widget" role="img" aria-label="Conversate widget: a visitor asks 'Do you ship to Canada?' and the assistant answers with two sources, Shipping and Delivery times, and offers Talk to a human.">
      <div className="cv-widget-head" aria-hidden="true">
        <span className="cv-avatar"><Bot size={15} strokeWidth={1.6} /></span>
        <span className="cv-widget-who">
          <b>Northwind assistant</b>
          <small><i className="cv-dot cv-dot-ok" /> Usually replies in a few minutes</small>
        </span>
        <span className="cv-icon-btn"><X size={14} /></span>
      </div>
      <div className="cv-widget-body" aria-hidden="true">
        <div className="cv-msg cv-msg-ai cv-msg-greet">Hi there. Ask me anything about orders, shipping or returns.</div>
        <div className="cv-msg cv-msg-visitor">Do you ship to Canada?</div>
        <div className="cv-ai-slot">
          <AnimatePresence initial={false}>
            {phase === 1 && (
              <motion.div key="dots" className="cv-msg cv-msg-ai cv-msg-dots" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
                <TypingDots />
              </motion.div>
            )}
          </AnimatePresence>
          <div className={`cv-msg cv-msg-ai cv-msg-answer ${phase >= 2 ? 'is-on' : ''}`}>
            <span className="cv-type-ghost">{ANSWER}</span>
            <span className="cv-type-live">{shown}</span>
          </div>
          <div className={`cv-sources ${phase >= 3 ? 'is-on' : ''}`}>
            <span className="cv-src">Shipping</span>
            <span className="cv-src">Delivery times</span>
          </div>
          <div className={`cv-handoff ${phase >= 3 ? 'is-on' : ''}`}>
            <span className="cv-faint">Not what you needed?</span>
            <span className="cv-wbtn"><User size={13} /> Talk to a human</span>
          </div>
        </div>
      </div>
      <div className="cv-composer" aria-hidden="true">
        <span className="cv-composer-field">Ask a question</span>
        <span className="cv-send" title="Send message"><ArrowUp size={15} strokeWidth={1.8} /></span>
      </div>
      <div className="cv-powered" aria-hidden="true">Powered by Conversate</div>
    </div>
  )
}

function StorePage() {
  return (
    <div className="cv-store" aria-hidden="true">
      <div className="cv-store-bar"><ShoppingBag size={13} /> <b>Northwind Coffee</b><span>Shop</span><span>Subscriptions</span><span>Shipping</span></div>
      <div className="cv-store-hero">
        <span className="cv-sk cv-sk-h" />
        <span className="cv-sk cv-sk-l" />
        <span className="cv-sk cv-sk-m" />
      </div>
      <div className="cv-store-grid">
        {[0, 1, 2].map((i) => <span key={i} className="cv-store-card"><i /><em /><em /></span>)}
      </div>
    </div>
  )
}

function InboxSlice() {
  const rows: [string, string, string, boolean][] = [
    ['maria@hollow.co', 'Do you ship to Canada?', '1m', true],
    ['Visitor 4821', 'Can I pause my subscription?', '6m', false],
    ['ben@crate.io', 'Refund for a damaged bag', '12m', false],
  ]
  return (
    <div className="cv-inbox-slice" aria-hidden="true">
      <div className="cv-slice-head"><b>Unassigned</b><span className="cv-tab-num">12</span></div>
      {rows.map(([who, msg, t, sel], i) => (
        <div key={who} className={`cv-slice-row ${sel ? 'is-sel' : ''}`}>
          <span className="cv-slice-l1">{i === 0 && <i className="cv-dot cv-dot-accent" />}<b>{who}</b><span className="cv-tab-num">{t}</span></span>
          <span className="cv-slice-l2">{msg}</span>
          <span className="cv-slice-icons">{i === 2 ? <Flag size={12} /> : <span />}{i === 1 ? <TriangleAlert size={12} /> : <span />}</span>
        </div>
      ))}
    </div>
  )
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduce = useReducedMotion()
  const [landed, setLanded] = useState(false)
  const [video, setVideo] = useState(false)

  return (
    <header className="cv-hero cv-wash" id="top">
      <div className="cv-wrap cv-hero-grid">
        <motion.div
          className="cv-hero-copy"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.36, ease: EASE }}
        >
          <Eyebrow><Sparkles size={13} aria-hidden="true" /> AI help desk for small teams</Eyebrow>
          <h1 className="cv-display">Your website, turned into a help centre and an AI agent in 5 minutes.</h1>
          <p className="cv-lead">
            Paste your URL. Conversate reads your site, writes your help articles, and answers your customers
            with sources. When it is not sure, it hands the chat to your team.
          </p>
          <UrlForm event="hero_url_submit" id="cv-hero-url" />
          <p className="cv-micro">7-day free trial · No card to start · Plans from $49 a month</p>
          <button type="button" className="cv-link-btn" onClick={() => { setVideo(true); track('hero_demo_open') }}>
            <PlayCircle size={16} aria-hidden="true" /> Watch the 90 second demo
          </button>
        </motion.div>

        <motion.div
          ref={ref}
          className="cv-hero-visual"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : 0.12, ease: EASE }}
          onAnimationComplete={() => setLanded(true)}
        >
          <InboxSlice />
          <div className="cv-frame cv-hero-frame">
            <StorePage />
            <div className="cv-hero-widget">
              <WidgetPanel start={landed && inView} />
              <span className="cv-launcher" aria-hidden="true"><X size={15} /> Close</span>
            </div>
            <div className="cv-agent-tip" aria-hidden="true">
              <span className="cv-faint">Agent view</span>
              <Conf v={0.86} />
              <span className="cv-faint">2 sources</span>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {video && <VideoDialog onClose={() => setVideo(false)} />}
      </AnimatePresence>
    </header>
  )
}

function VideoDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus() }
  }, [onClose])
  return (
    <motion.div className="cv-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose}>
      <motion.div
        className="cv-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Conversate 90 second demo"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cv-dialog-head">
          <b><MessageCircle size={15} aria-hidden="true" /> The 90 second demo</b>
          <button ref={closeRef} type="button" className="cv-icon-btn" aria-label="Close the demo" onClick={onClose}><X size={16} /></button>
        </div>
        <VideoPlayer />
      </motion.div>
    </motion.div>
  )
}
