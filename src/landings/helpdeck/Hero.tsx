import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowDown, FileText, Mail, MessageSquare, RotateCcw, Search, X } from 'lucide-react'
import { EASE, Reveal, TrialButton, TypingDots, scrollToId, useTyping } from './shared'

const Q1 = 'How do I export all my invoices?'
const A1 = 'Go to Invoices → Export, pick a date range and choose CSV or PDF. Large exports are emailed to you within a few minutes.'
const Q2 = 'Can I get a refund for last month?'
const HANDOFF = "I'm not sure about this one. Want a human to email you?"

const FULL_SCRIPT = `Visitor: ${Q1} Helpdeck: ${A1} Source: Exporting invoices, docs.acme.com. Visitor: ${Q2} Helpdeck: ${HANDOFF}`

/** Scripted hero conversation. Steps: 1 q1, 2 dots, 3 typing, 4 chip, 5 q2, 6 dots, 7 handoff. */
// Delay before moving on from each step; step 3 waits for the typing to finish first.
const NEXT_MS: Record<number, number> = { 0: 900, 1: 600, 2: 700, 3: 250, 4: 1250, 5: 600, 6: 700 }

function useScript(run: number) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const typing = useTyping(A1, step >= 3)
  useEffect(() => { setStep(0) }, [run])
  useEffect(() => {
    if (reduce || step >= 7) return
    if (step === 3 && !typing.done) return
    const t = window.setTimeout(() => setStep((s) => s + 1), NEXT_MS[step])
    return () => window.clearTimeout(t)
  }, [step, typing.done, reduce])
  return { step: reduce ? 7 : step, typed: reduce ? A1 : typing.shown }
}

const msgIn = { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.24, ease: EASE } }
const botIn = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.24, ease: EASE } }

function HeroChat() {
  const [run, setRun] = useState(0)
  const { step, typed } = useScript(run)
  return (
    <div className="hd-chat" role="img" aria-label={`Helpdeck chat widget answering a question about exporting invoices with a source link. ${FULL_SCRIPT}`}>
      <div className="hd-chat-head" aria-hidden="true">
        <span className="hd-chat-avatar"><MessageSquare size={14} /></span>
        <div>
          <strong>Acme support</strong>
          <span><i className="hd-status-dot" /> Answers from Acme docs</span>
        </div>
        <X size={16} className="hd-chat-x" />
      </div>
      <div className="hd-chat-body" aria-hidden="true">
        <div className="hd-bubble hd-bubble-bot hd-bubble-static">Hi! Ask me anything about Acme Invoicing.</div>
        <AnimatePresence initial={false}>
          {step >= 1 && <motion.div key="q1" className="hd-bubble hd-bubble-user" {...msgIn}>{Q1}</motion.div>}
          {step === 2 && <motion.div key="d1" className="hd-bubble hd-bubble-bot hd-bubble-dots" {...botIn} exit={{ opacity: 0 }}><TypingDots /></motion.div>}
          {step >= 3 && (
            <motion.div key="a1" className="hd-bubble hd-bubble-bot" {...botIn}>
              {typed}{step === 3 && typed.length < A1.length && <span className="hd-caret" />}
            </motion.div>
          )}
          {step >= 4 && (
            <motion.div key="s1" className="hd-source" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, ease: EASE }}>
              <FileText size={12} /> Exporting invoices <span>· docs.acme.com</span>
            </motion.div>
          )}
          {step >= 5 && <motion.div key="q2" className="hd-bubble hd-bubble-user" {...msgIn}>{Q2}</motion.div>}
          {step === 6 && <motion.div key="d2" className="hd-bubble hd-bubble-bot hd-bubble-dots" {...botIn} exit={{ opacity: 0 }}><TypingDots /></motion.div>}
          {step >= 7 && (
            <motion.div key="h" className="hd-handoff" {...botIn}>
              <p>{HANDOFF}</p>
              <div className="hd-handoff-field"><Mail size={13} /> you@company.com <span>Send</span></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="hd-chat-input" aria-hidden="true">Ask a question… <span>Powered by Helpdeck</span></div>
      {step >= 7 && (
        <button type="button" className="hd-replay" onClick={() => setRun((r) => r + 1)} aria-label="Replay the conversation">
          <RotateCcw size={12} /> Replay
        </button>
      )}
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  return (
    <header className="hd-hero" id="top">
      <div className="hd-hero-grid" aria-hidden="true" />
      <div className="hd-container hd-hero-inner">
        <div className="hd-hero-copy">
          <Reveal><span className="hd-pill"><i className="hd-status-dot" /> AI support for small teams</span></Reveal>
          <Reveal delay={0.08}><h1 className="hd-h1">Support answers from your own docs. <span className="hd-h1-soft">Live before lunch.</span></h1></Reveal>
          <Reveal delay={0.16}>
            <p className="hd-lead">Paste your website. Helpdeck learns every page and answers customers in a chat bubble, with a link to the page it used. When it is not sure, it hands the chat to your inbox.</p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="hd-cta-row">
              <TrialButton location="hero" />
              <a href="#try" className="hd-btn hd-btn-ghost hd-btn-md" onClick={(e) => { e.preventDefault(); scrollToId('try') }}>
                Try it on your site <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
            <p className="hd-micro">7 days free · One script tag · From $49/month</p>
          </Reveal>
        </div>

        <motion.div
          className="hd-hero-visual"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
        >
          <div className="hd-glow" aria-hidden="true" />
          <div className="hd-browser">
            <div className="hd-browser-bar" aria-hidden="true">
              <span className="hd-lights"><i /><i /><i /></span>
              <span className="hd-url">docs.acme.com/invoices</span>
            </div>
            <div className="hd-browser-page" aria-hidden="true">
              <aside className="hd-docs-nav">
                <strong>Acme Invoicing Docs</strong>
                <span className="hd-docs-search"><Search size={11} /> Search docs</span>
                <ul>
                  <li>Getting started</li>
                  <li className="on">Invoices</li>
                  <li>Exporting</li>
                  <li>Payments</li>
                  <li>Refunds</li>
                  <li>API</li>
                </ul>
              </aside>
              <div className="hd-docs-main">
                <span className="hd-docs-crumb">Docs / Invoices</span>
                <b className="hd-docs-h">Exporting invoices</b>
                <i className="hd-line w90" /><i className="hd-line w75" /><i className="hd-line w82" />
                <i className="hd-line w60" />
                <div className="hd-docs-code"><i className="hd-line w45" /><i className="hd-line w30" /></div>
                <i className="hd-line w80" /><i className="hd-line w55" />
              </div>
            </div>
          </div>
          <div className="hd-chat-dock"><HeroChat /></div>
        </motion.div>
      </div>
    </header>
  )
}
