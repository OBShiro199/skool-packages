import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, EyeOff, Globe, Gauge, Link2Off, Sparkles } from 'lucide-react'
import { EASE, MORPH, Pill, Reveal, useLoopStep, useTyping } from './shared'

function Tile({ kicker, title, text, bullets, children, className = '', delay = 0 }: {
  kicker: string; title: string; text: string; bullets?: string[]; children?: ReactNode; className?: string; delay?: number
}) {
  return (
    <Reveal className={`ob-tile ${className}`} delay={delay} scale>
      <div className="ob-tile-copy">
        <span className="ob-kicker">{kicker}</span>
        <h3>{title}</h3>
        <p>{text}</p>
        {bullets && (
          <ul className="ob-bullets">
            {bullets.map((b) => <li key={b}><Check size={14} strokeWidth={2} aria-hidden="true" />{b}</li>)}
          </ul>
        )}
      </div>
      {children}
    </Reveal>
  )
}

/* 6.1 Find: leads table under a JobProgress row that counts up */
const FOUND = [
  ['Sarah Lee', 'Northpeak Studio', 'sarah@northpeak.studio'],
  ['Jo Marsh', 'Lowtide Design', 'jo@lowtide.design'],
  ['Amir Khan', 'Blocklight', 'amir@blocklight.co'],
  ['Priya Shah', 'Fold & Co', 'priya@foldand.co'],
  ['Dan Ortiz', 'Lantern', 'dan@lantern.studio'],
]
function FindVisual() {
  const { ref, step, reduce } = useLoopStep(FOUND.length + 3, 900)
  const shown = reduce ? FOUND.length : Math.min(step + 1, FOUND.length)
  const count = 59 + shown
  return (
    <div className="ob-vis ob-find" ref={ref} aria-hidden="true">
      <div className="ob-job">
        <i className="ob-dot ob-dot-live" />
        <span>Finding leads · <span className="ob-mono ob-fixed">{count} of 100</span></span>
        <span className="ob-faint ob-job-pages">Pages 3</span>
        <span className="ob-job-bar"><motion.i animate={{ scaleX: count / 100 }} transition={{ duration: 0.4, ease: MORPH }} /></span>
      </div>
      <div className="ob-table">
        {FOUND.map(([n, c, e], i) => (
          <motion.div
            key={n}
            className="ob-trow"
            animate={{ opacity: i < shown ? 1 : 0, y: i < shown ? 0 : 6 }}
            transition={{ duration: 0.36, ease: EASE }}
          >
            <span className="ob-trow-name"><b>{n}</b><span className="ob-muted">{c}</span></span>
            <span className="ob-mono ob-trow-mail">{e}</span>
            <Pill tone="accent" className="ob-pill-fixed"><Check size={11} strokeWidth={2.4} /> Verified x2</Pill>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* 6.2 Write: review card with the "Why this line" panel */
const LINE = "Northpeak's case studies are all outdoor brands on Shopify, which is a sharp niche for a 12-person studio."
function WriteVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduce = !!useReducedMotion()
  const [run, setRun] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setRun((r) => r + 1), LINE.length * 32 + 3200)
    return () => window.clearInterval(id)
  }, [inView, reduce])
  return (
    <div className="ob-vis ob-write" ref={ref} aria-hidden="true">
      <div className="ob-write-mail">
        <div className="ob-write-head"><span className="ob-faint">Subject</span> Outdoor brands on Shopify</div>
        <p className="ob-email-first">
          <span className="ob-email-ghost">{LINE}</span>
          <span className="ob-email-typed" key={run}><Typed text={LINE} start={inView} reduce={reduce} /></span>
        </p>
        <p className="ob-email-rest"><span /><span /><span className="ob-short" /></p>
        <div className="ob-write-foot"><span className="ob-mono ob-faint">68 words · 0 links</span><span className="ob-kbd-row"><span className="ob-kbd">R</span> Regenerate</span></div>
      </div>
      <div className="ob-why">
        <span className="ob-why-h"><Sparkles size={13} strokeWidth={2} /> Why this line</span>
        <p>"Selected work: <mark>Alpine Supply, Trailhead Co, Fernway</mark>. Shopify Plus partner. 12 people in Leeds."</p>
        <span className="ob-mono ob-faint">northpeak.studio/work</span>
      </div>
    </div>
  )
}
function Typed({ text, start, reduce }: { text: string; start: boolean; reduce: boolean }) {
  const t = useTyping(text, start, 32)
  return <>{reduce ? text : t.shown}{!t.done && start && <i className="ob-caret" />}</>
}

/* 6.3 Review: email cards slide left as they are approved */
function ReviewVisual() {
  const { ref, step } = useLoopStep(25, 1600)
  const approved = 7 + (step % 18)
  return (
    <div className="ob-vis ob-review" ref={ref} aria-hidden="true">
      <div className="ob-review-top"><span>Review queue</span><span className="ob-mono ob-fixed">{String(approved).padStart(2, '0')} of 25 approved</span></div>
      <div className="ob-review-stack">
        <AnimatePresence initial={false}>
          <motion.div
            key={approved}
            className="ob-review-card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, x: -48 }}
            transition={{ duration: 0.36, ease: EASE }}
          >
            <span className="ob-avatar ob-avatar-sm">{['SL', 'JM', 'AK', 'PS', 'DO'][approved % 5]}</span>
            <span className="ob-review-lines"><span /><span className="ob-short" /></span>
            <Pill tone="accent" className="ob-pill-fixed">Approved</Pill>
          </motion.div>
        </AnimatePresence>
        <div className="ob-review-under" />
      </div>
      <div className="ob-kbd-row ob-keys">
        {[['A', 'approve'], ['E', 'edit'], ['R', 'regenerate'], ['X', 'reject'], ['J/K', 'next']].map(([k, l]) => (
          <span key={k}><span className={`ob-kbd${k === 'A' ? ' ob-kbd-on' : ''}`}>{k}</span>{l}</span>
        ))}
      </div>
    </div>
  )
}

/* 6.5 Reply: unified inbox, new reply arrives and is classified */
const REPLIES: [string, string, string, 'accent' | 'amber' | 'coral' | 'grey'][] = [
  ['Sarah Lee', 'Sounds interesting, what does it cost?', 'Interested', 'accent'],
  ['Jo Marsh', 'Not this quarter, try me in January.', 'Not now', 'amber'],
  ['Amir Khan', 'Out of the office until the 14th.', 'Out of office', 'grey'],
  ['Dan Ortiz', 'Please take me off your list.', 'Unsubscribe', 'coral'],
  ['Priya Shah', 'Yes, happy to chat on Thursday.', 'Interested', 'accent'],
]
function ReplyVisual() {
  const { ref, step, reduce } = useLoopStep(REPLIES.length * 2, 1300)
  const head = Math.floor(step / 2)
  const classified = reduce || step % 2 === 1
  const rows = [0, 1, 2].map((k) => REPLIES[(head - k + REPLIES.length * 4) % REPLIES.length])
  return (
    <div className="ob-vis ob-reply" ref={ref} aria-hidden="true">
      <div className="ob-reply-top"><span>All inboxes</span><span className="ob-mono ob-faint">sequence stops on reply</span></div>
      <AnimatePresence initial={false} mode="popLayout">
        {rows.map((r, k) => (
          <motion.div
            key={`${r[0]}-${head - k}`}
            layout={!reduce}
            className="ob-reply-row"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36, ease: EASE }}
          >
            <span className={`ob-unread${k === 0 ? ' on' : ''}`} />
            <span className="ob-reply-who"><b>{r[0]}</b><span className="ob-muted">{r[1]}</span></span>
            <span className="ob-chip-slot">
              {k === 0 && !classified
                ? <Pill tone="grey" dot="live" className="ob-pill-class">Labelling</Pill>
                : <Pill tone={r[3]} className="ob-pill-class">{r[2]}</Pill>}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* 6.6 Guardrails: checklist with a live bounce meter */
const RULES = [
  'Bounces and unsubscribes are suppressed across every campaign',
  'Campaigns pause themselves if bounces pass 5%',
  'Any spam complaint pauses that inbox for 48 hours',
  'Caps ramp from 20 to 30 a day as an inbox earns trust',
  'Sends only Monday to Thursday mornings unless you change it',
  'Usage caps shown before you hit them, so no surprise bills',
]
function GuardMeter() {
  const { ref, step } = useLoopStep(6, 1500)
  const v = [1.2, 1.4, 1.1, 1.6, 1.3, 1.2][step]
  return (
    <div className="ob-guard-meter" ref={ref} aria-hidden="true">
      <span className="ob-guard-label"><i className="ob-dot ob-dot-live" /> Bounce rate <span className="ob-mono ob-fixed">{v.toFixed(1)}%</span></span>
      <span className="ob-guard-track">
        <motion.i animate={{ scaleX: v / 6 }} transition={{ duration: 0.5, ease: MORPH }} />
        <b style={{ left: `${(5 / 6) * 100}%` }} />
      </span>
      <span className="ob-mono ob-faint ob-guard-limit">pause at 5%</span>
    </div>
  )
}

/* 6.4 Send: DNS rows tick valid one by one */
const DNS = [
  ['TXT', '@', 'v=spf1 include:agentmail.to ~all'],
  ['CNAME', 'am1._domainkey', 'am1.dkim.agentmail.to'],
  ['TXT', '_dmarc', 'v=DMARC1; p=none; rua=mailto:dmarc@tryacme.com'],
  ['MX', '@', '10 inbound.agentmail.to'],
]
function DnsVisual() {
  const { ref, step, reduce } = useLoopStep(DNS.length + 6, 450, 0.4)
  const valid = reduce ? DNS.length : Math.max(0, step - 1)
  return (
    <div className="ob-vis ob-dns" ref={ref} aria-hidden="true">
      <div className="ob-dns-top"><span><Globe size={14} strokeWidth={1.6} /> tryacme.com <span className="ob-faint ob-hide-sm">· outreach domain</span></span><span className="ob-mono ob-faint ob-fixed">{Math.min(valid, 4)} of 4 valid</span></div>
      {DNS.map(([type, host, value], i) => {
        const ok = i < valid
        const checking = i === valid && !reduce
        return (
          <div className="ob-dns-row" key={host + type}>
            <span className="ob-dns-type">{type}</span>
            <span className="ob-mono ob-dns-host">{host}</span>
            <span className="ob-mono ob-dns-val">{value}</span>
            <span className="ob-chip-slot">
              {ok ? (
                <motion.span initial={reduce ? false : { scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.15, bounce: 0.3 }}>
                  <Pill tone="accent" className="ob-pill-dns"><Check size={11} strokeWidth={2.4} /> Valid</Pill>
                </motion.span>
              ) : checking ? <Pill tone="accent" dot="live" className="ob-pill-dns">Checking</Pill> : <Pill tone="grey" className="ob-pill-dns">Waiting</Pill>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function Features() {
  return (
    <section className="ob-section" id="features" aria-labelledby="features-h">
      <div className="ob-rail ob-pad">
        <Reveal className="ob-head">
          <h2 id="features-h">Leads, first lines and safe sending.</h2>
        </Reveal>
        <div className="ob-bento">
          <Tile
            className="ob-t-half" kicker="Find"
            title="Tell it who you sell to. Get verified people, not a spreadsheet."
            text="Pick job titles, countries, company size and industry. Outbounder searches millions of B2B profiles, reveals work emails, then checks every one a second time. Anything risky is dropped before it can bounce."
            bullets={['Two-step email verification', 'Never the same person twice across campaigns', 'Import your own CSV too']}
          ><FindVisual /></Tile>
          <Tile
            className="ob-t-half" kicker="Write" delay={0.06}
            title="Every email starts with a fact from their own website."
            text="Outbounder reads each company's homepage and about page, then Claude writes a subject, a first line and a short email in your voice. You see the exact sentence it used, so you can trust it or change it."
            bullets={["No spintax, no 'I saw that...'", 'Under 90 words, no links in email one', 'Regenerate with a hint in one key press']}
          ><WriteVisual /></Tile>

          <Tile
            className="ob-t-third" kicker="Review"
            title="Approve 25 emails in the time it takes to drink a coffee."
            text="A keyboard-first review queue. A to approve, E to edit, R to regenerate, X to reject. After you have checked 10 by hand, approve the rest above your confidence bar in one click."
          ><ReviewVisual /></Tile>
          <Tile
            className="ob-t-third" kicker="Reply" delay={0.06}
            title="Know who is interested before you finish your coffee."
            text="Replies from every inbox land in one view. Claude labels each one interested, not now, unsubscribe or out of office. Any reply stops the sequence. Interested ones also land in your email within minutes."
          ><ReplyVisual /></Tile>
          <Reveal className="ob-tile ob-t-third" delay={0.12} scale>
            <div className="ob-tile-copy">
              <span className="ob-kicker">Guardrails</span>
              <h3>The rules good cold emailers follow, written into the code.</h3>
              <ul className="ob-bullets ob-rules">
                {RULES.map((r) => <li key={r}><Check size={14} strokeWidth={2} aria-hidden="true" />{r}</li>)}
              </ul>
            </div>
            <GuardMeter />
          </Reveal>

          <Reveal className="ob-tile ob-t-full ob-t-send" scale>
            <div className="ob-tile-copy">
              <span className="ob-kicker">Send</span>
              <h3>Your main domain never sends a cold email.</h3>
              <p>Outbounder sets up a separate outreach domain and inboxes for you, shows you every DNS record to paste into Porkbun, and starts each inbox at 20 emails a day. Sends go out in each lead's morning, in their time zone.</p>
              <ul className="ob-facts">
                <li><Globe size={16} strokeWidth={1.6} aria-hidden="true" />Separate outreach domain</li>
                <li><Gauge size={16} strokeWidth={1.6} aria-hidden="true" />20 a day per inbox to start</li>
                <li><EyeOff size={16} strokeWidth={1.6} aria-hidden="true" />Plain text, no tracking pixels</li>
                <li><Link2Off size={16} strokeWidth={1.6} aria-hidden="true" />Unsubscribe link and header on every email</li>
              </ul>
            </div>
            <DnsVisual />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
