import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { FileText } from 'lucide-react'
import { Button, Cite, ConfBadge, EASE, Eyebrow, MORPH, StatePill, TrialButton, scrollToId, track, useCountUp } from './shared'

const QUESTIONS: [string, string, 'Approved' | 'Drafted' | 'Needs review' | 'Drafting'][] = [
  ['3.4', 'Do you perform annual penetration tests?', 'Approved'],
  ['4.1', 'Is customer data encrypted at rest?', 'Drafted'],
  ['4.2', 'Which key management service do you use?', 'Drafted'],
  ['4.3', 'How long are backups retained?', 'Needs review'],
  ['4.4', 'Are backups tested for restore?', 'Drafting'],
]

/** Back layer: the review workspace on question 4.1. */
function Workspace() {
  return (
    <div className="ds-ws ds-frame" aria-hidden="true">
      <div className="ds-ws-bar">
        <span className="ds-ws-dots"><i /><i /><i /></span>
        <span className="ds-ws-title">Acme Corp vendor review</span>
        <span className="ds-ws-file ds-mono">acme-vendor-review.xlsx</span>
      </div>
      <div className="ds-ws-grid">
        <ul className="ds-ws-list">
          <li className="ds-ws-sec">4 Data protection</li>
          {QUESTIONS.map(([n, q, s]) => (
            <li key={n} className={n === '4.1' ? 'is-on' : ''}>
              <span className="ds-mono">{n}</span>
              <span className="ds-ws-q">{q}</span>
              <StatePill state={s} />
            </li>
          ))}
        </ul>
        <div className="ds-ws-main">
          <div className="ds-ws-qhead">
            <span className="ds-mono ds-ws-ref">Question 4.1 · Sheet “Security” · row 42</span>
            <ConfBadge band="High" score={92} />
          </div>
          <p className="ds-ws-question">Is customer data encrypted at rest?</p>
          <p className="ds-ws-answer">
            Yes. All customer data is encrypted at rest with AES-256, using keys managed in AWS KMS and rotated every
            year.<sup className="ds-num">1</sup> Backups use the same encryption.<sup className="ds-num">2</sup>
          </p>
          <div className="ds-ws-cites">
            <Cite n={1} label="Information Security Policy, p. 7" on />
            <Cite n={2} label="SOC 2 report, CC6.1" />
          </div>
          <div className="ds-ws-actions">
            <span className="ds-ws-btn">Redraft</span>
            <span className="ds-ws-btn is-firm">Approve</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Evidence({ play }: { play: boolean }) {
  const reduce = useReducedMotion()
  return (
    <div className="ds-evi ds-frame" aria-hidden="true">
      <div className="ds-evi-head"><FileText size={14} strokeWidth={1.5} /> Information Security Policy, p. 7</div>
      <p className="ds-evi-text">
        8.2 Storage. <span className="ds-hl">
          <motion.span className="ds-hl-sweep" initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: play || reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.6, delay: 0.7, ease: MORPH }} />
          <span className="ds-hl-text">Customer data is encrypted at rest using AES-256.</span>
        </span> Keys are held in AWS KMS and rotated annually.
      </p>
      <div className="ds-evi-foot"><span>Updated 12 Mar 2026</span><span className="ds-evi-open">Open source</span></div>
    </div>
  )
}

function RunProgress({ play }: { play: boolean }) {
  const reduce = useReducedMotion()
  const n = useCountUp(233, 312, 1600, play)
  return (
    <div className="ds-run ds-frame" aria-hidden="true">
      <div className="ds-run-top">
        <span className="ds-live" />
        <span>Drafting <b className="ds-num">{n}</b> of <span className="ds-num">388</span></span>
      </div>
      <div className="ds-run-track">
        <motion.span className="ds-run-fill" initial={{ scaleX: reduce ? 0.8 : 0.6 }} animate={{ scaleX: play || reduce ? 0.8 : 0.6 }} transition={{ duration: reduce ? 0 : 1.6, ease: MORPH }} />
      </div>
      <span className="ds-run-foot">Batches of 8 · sources from 14 documents</span>
    </div>
  )
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  const reduce = useReducedMotion()
  const item = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : 0.08 * i, ease: EASE },
  })
  const layer = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.15 : 0.5, delay: reduce ? 0 : 0.2 + 0.14 * i, ease: EASE },
  })
  return (
    <header className="ds-page is-tint ds-hero" id="top">
      <aside className="ds-margin" aria-hidden="true">
        <span className="ds-clause">§ 0</span>
        <span className="ds-note">Cover sheet</span>
        <span className="ds-stamp">Draft for review</span>
      </aside>
      <div className="ds-body ds-hero-grid">
      <div className="ds-hero-copy">
        <motion.div {...item(0)}><Eyebrow>For B2B SaaS teams selling to enterprise</Eyebrow></motion.div>
        <motion.h1 className="ds-h1" {...item(1)}>
          Security questionnaires, answered from <span className="ds-under">your own documents.</span>
        </motion.h1>
        <motion.p className="ds-lead" {...item(2)}>
          Drop in the buyer’s spreadsheet. Dossier drafts every answer from your policies, SOC 2 report and past
          questionnaires, shows the exact passage behind each one, and flags what needs a human. Export the same file
          back, filled in.
        </motion.p>
        <motion.div className="ds-hero-ctas" id="hero-ctas" {...item(3)}>
          <TrialButton location="hero" size="lg" />
          <Button variant="secondary" size="lg" onClick={() => { track('lp_demo_cta'); scrollToId('demo'); window.dispatchEvent(new CustomEvent('ds-play-demo')) }}>
            Watch the 60 second demo
          </Button>
        </motion.div>
        <motion.p className="ds-trust" {...item(4)}>7 days free. Your documents are never used to train AI models.</motion.p>
      </div>
      <div className="ds-hero-shot" ref={ref} role="img" aria-label="Dossier review workspace on the Acme Corp vendor review. Question 4.1, is customer data encrypted at rest, is answered with two citations and a High 92 confidence badge. An evidence card shows the quoted line from the Information Security Policy, page 7, and a progress card reads drafting 312 of 388.">
        <motion.div className="ds-shot-back" {...layer(0)}><Workspace /></motion.div>
        <motion.div className="ds-shot-evi" {...layer(1)}><Evidence play={inView} /></motion.div>
        <motion.div className="ds-shot-run" {...layer(2)}><RunProgress play={inView} /></motion.div>
      </div>
      </div>
    </header>
  )
}

const ROLES = ['Founders', 'Sales engineers', 'Solutions consultants', 'Security leads', 'Compliance managers', 'RevOps']

export function RoleStrip() {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="ds-roles" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: reduce ? 0.15 : 0.4, ease: EASE }}
    >
      <p className="ds-roles-line">Built for the people who fill in the spreadsheet</p>
      <ul className="ds-roles-list">
        {ROLES.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </motion.div>
  )
}
