import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, Copy, FileText, Globe, Inbox, Mail, RefreshCw } from 'lucide-react'
import { EASE, Reveal, TypingDots, track, useCountUp, useLoopStep, useTyping } from './shared'

function TileCopy({ eyebrow, title, body, bullets }: { eyebrow: string; title: string; body: string; bullets: string[] }) {
  return (
    <div className="hd-tile-copy">
      <span className="hd-eyebrow">{eyebrow}</span>
      <h3 className="hd-h3">{title}</h3>
      <p>{body}</p>
      <ul className="hd-bullets">
        {bullets.map((b) => <li key={b}><Check size={14} aria-hidden="true" /> {b}</li>)}
      </ul>
    </div>
  )
}

function Tile({ className, children, delay = 0 }: { className: string; children: ReactNode; delay?: number }) {
  return <Reveal className={`hd-tile ${className}`} delay={delay}>{children}</Reveal>
}

/* 8.1 Sources page, count to 84 */
function SourcesVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const n = useCountUp(84, 1200, inView)
  const { ref: loopRef, step } = useLoopStep(4, 1400)
  const rows = ['/pricing', '/help/billing', '/docs/install', '/docs/webhooks']
  return (
    <div className="hd-vis hd-vis-sources" ref={ref} role="img" aria-label="Sources page showing a crawl of docs.acme.com with 84 pages read">
      <div className="hd-progress hd-progress-mini" ref={loopRef} aria-hidden="true">
        <div className="hd-progress-top">
          <span><Globe size={13} /> docs.acme.com</span>
          <strong>{n} pages read</strong>
        </div>
        <div className="hd-progress-bar"><i style={{ transform: `scaleX(${n / 84})` }} /></div>
        <ul className="hd-src-rows">
          {rows.map((r, i) => (
            <li key={r} className={i === step ? 'live' : ''}>
              <FileText size={12} /> {r}
              <span>{i === step ? <><RefreshCw size={11} className="hd-spin" /> learning</> : <><Check size={11} /> learned</>}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* 8.2 Live "AI answering with sources" */
const QA = [
  { q: 'Can I pay by bank transfer?', a: 'Yes. On annual plans you can pay by bank transfer. Pick "Invoice" at checkout and we email you the bank details.', s: ['Payment methods', 'Annual billing'] },
  { q: 'How do I add a teammate?', a: 'Open Settings → Team and click Invite. They get an email and join your workspace as soon as they accept.', s: ['Team settings', 'Roles and access'] },
]

function AnswerVisual() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState(0) // 0 q, 1 dots, 2 typing, 3 chips
  const item = QA[idx]
  const typing = useTyping(item.a, phase >= 2)
  useEffect(() => {
    if (reduce) { setPhase(3); return }
    if (!inView) return
    const t: number[] = []
    if (phase === 0) t.push(window.setTimeout(() => setPhase(1), 700))
    if (phase === 1) t.push(window.setTimeout(() => setPhase(2), 800))
    if (phase === 2 && typing.done) t.push(window.setTimeout(() => setPhase(3), 150))
    if (phase === 3) t.push(window.setTimeout(() => { setIdx((i) => (i + 1) % QA.length); setPhase(0) }, 3600))
    return () => t.forEach(window.clearTimeout)
  }, [phase, typing.done, inView, reduce])

  return (
    <div className="hd-vis hd-vis-answer" ref={ref} role="img" aria-label={`Helpdeck answering "${item.q}" with two source links: ${item.s.join(' and ')}`}>
      <div className="hd-answer-card" aria-hidden="true">
        <div className="hd-answer-head"><span className="hd-status-dot" /> Live answer <span className="hd-answer-meta">claude · 6 sections searched</span></div>
        <AnimatePresence mode="wait">
          <motion.div key={idx} className="hd-answer-thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <motion.div className="hd-bubble hd-bubble-user" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.24, ease: EASE }}>{item.q}</motion.div>
            {phase === 1 && <div className="hd-bubble hd-bubble-bot hd-bubble-dots"><TypingDots /></div>}
            {phase >= 2 && <div className="hd-bubble hd-bubble-bot">{reduce ? item.a : typing.shown}{phase === 2 && !typing.done && <span className="hd-caret" />}</div>}
            <div className="hd-chip-row">
              {phase >= 3 && item.s.map((s, i) => (
                <motion.span key={s} className="hd-source" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, duration: 0.3, ease: EASE }}>
                  <FileText size={12} /> {s} <span>· docs.acme.com</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* 8.3 Handoff card then inbox email */
function HandoffVisual() {
  const { ref, step } = useLoopStep(3, 1800)
  return (
    <div className="hd-vis hd-vis-handoff" ref={ref} role="img" aria-label="An amber handoff card in the chat, then the transcript email arriving in an inbox">
      <div aria-hidden="true" className="hd-handoff-stack">
        <div className="hd-handoff">
          <p>I'm not sure about this one. Want a human to email you?</p>
          <div className="hd-handoff-field"><Mail size={13} /> sam@northwind.io <span>Send</span></div>
        </div>
        <motion.div className="hd-mail" animate={{ opacity: step >= 1 ? 1 : 0, x: step >= 1 ? 0 : 24 }} transition={{ duration: 0.4, ease: EASE }}>
          <span className="hd-mail-icon"><Inbox size={13} /></span>
          <div>
            <strong>Handoff: "Do you offer a nonprofit discount?"</strong>
            <span>Full chat attached · Reply-to: sam@northwind.io</span>
          </div>
          <i className="hd-mail-new">New</i>
        </motion.div>
      </div>
    </div>
  )
}

/* 8.4 Install snippet that types in, and really copies */
const SNIPPET = '<script src="https://helpdeck.app/w.js" data-bot="YOUR_BOT_ID" async></script>'

function CodeVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const { shown, done } = useTyping(SNIPPET, inView)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(SNIPPET) } catch { /* clipboard blocked: still show feedback */ }
    track('snippet_copy')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="hd-vis hd-vis-code" ref={ref}>
      <div className="hd-code">
        <div className="hd-code-bar">
          <span className="hd-lights" aria-hidden="true"><i /><i /><i /></span>
          <span className="hd-code-file">footer.html</span>
          <button type="button" className="hd-copy" onClick={copy} aria-label="Copy install snippet">
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
        <pre aria-label={SNIPPET}><code aria-hidden="true"><span className="c-dim">&lt;!-- Helpdeck --&gt;</span>{'\n'}{colorize(shown)}{!done && <span className="hd-caret" />}</code></pre>
        <div className="hd-code-foot" aria-hidden="true">
          {['Webflow', 'WordPress', 'Shopify', 'Framer'].map((p) => <span key={p}>{p}</span>)}
          <span className="hd-code-size">w.js · 38kb</span>
        </div>
      </div>
    </div>
  )
}

function colorize(s: string) {
  // light syntax colouring that works on partially typed text
  const parts = s.split(/(".*?"|"[^"]*$)/g)
  return parts.map((p, i) => p.startsWith('"') ? <span key={i} className="c-str">{p}</span> : <span key={i} className="c-tag">{p}</span>)
}

/* 8.5 Conversations list with amber badges */
const CONVOS = [
  { q: 'Do you integrate with Xero?', t: '2m', tag: 'low' },
  { q: 'How do I export all my invoices?', t: '9m', tag: '' },
  { q: 'Is there a nonprofit discount?', t: '14m', tag: 'handoff' },
  { q: 'Can I change the invoice currency?', t: '31m', tag: 'low' },
  { q: 'Where do I find my API key?', t: '1h', tag: '' },
]

function InboxVisual() {
  const { ref, step, reduce } = useLoopStep(6, 900)
  return (
    <div className="hd-vis hd-vis-inbox" ref={ref} role="img" aria-label="Conversations inbox with Low confidence badges on questions the bot could not answer">
      <div className="hd-inbox" aria-hidden="true">
        <div className="hd-inbox-head">
          <strong>Conversations</strong>
          <span className="hd-tabs"><i className="on">All</i><i>Low confidence</i><i>Handoffs</i></span>
        </div>
        <ul>
          {CONVOS.map((c, i) => (
            <li key={c.q}>
              <span className="hd-inbox-av">{c.q[0]}</span>
              <span className="hd-inbox-q">{c.q}</span>
              {c.tag && (
                <motion.span
                  className={`hd-badge ${c.tag}`}
                  animate={{ opacity: reduce || step > i ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {c.tag === 'low' ? 'Low confidence' : 'Handoff'}
                </motion.span>
              )}
              <span className="hd-inbox-t">{c.t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section className="hd-section hd-features" id="product" aria-labelledby="product-h">
      <div className="hd-container">
        <h2 id="product-h" className="hd-sr">What Helpdeck does</h2>
        <div className="hd-cells hd-bento hd-bleed">
          <Tile className="hd-tile-lg hd-tile-answer">
            <AnswerVisual />
            <TileCopy eyebrow="Trust" title="Every answer shows where it came from."
              body="Customers see a link to the exact page behind each answer. You can check any answer in seconds."
              bullets={['Source links on every answer', 'Never invents prices or policies', "Answers in the customer's language"]} />
          </Tile>
          <Tile className="hd-tile-sm" delay={0.08}>
            <SourcesVisual />
            <TileCopy eyebrow="Training" title="Paste a URL. It reads everything."
              body="Helpdeck crawls your docs, help centre and pricing pages, cleans out menus and footers, and learns every section. Re-crawl in one click when your docs change."
              bullets={['Up to 1,000 pages', 'Only changed pages are re-learned', 'Delete any page you do not want used']} />
          </Tile>
          <Tile className="hd-tile-sm">
            <HandoffVisual />
            <TileCopy eyebrow="Handoff" title={'"I\'m not sure" beats a wrong answer.'}
              body="When your docs do not cover a question, Helpdeck says so and offers to pass it to a human. You get an email with the whole chat, and replying goes straight to the customer."
              bullets={['Confidence check on every answer', 'Transcript emailed to you', 'Reply-to set to the customer']} />
          </Tile>
          <Tile className="hd-tile-lg hd-tile-code" delay={0.08}>
            <CodeVisual />
            <TileCopy eyebrow="Install" title="One script tag. Any website."
              body="Copy one line into your site's footer. The widget picks up your brand colour and only works on the domains you allow."
              bullets={['Webflow, WordPress, Shopify, Framer', 'Under 40kb', 'Locked to your domains']} />
          </Tile>
          <Tile className="hd-tile-wide">
            <TileCopy eyebrow="Insights" title={'Your "I don\'t know" list is your docs to-do list.'}
              body="The Conversations inbox flags every question the bot could not answer, so you know exactly which page to write next."
              bullets={['Every chat saved', 'Low-confidence answers flagged', 'Handoffs marked']} />
            <InboxVisual />
          </Tile>
        </div>
      </div>
    </section>
  )
}
