import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Play } from 'lucide-react'
import { Button, EASE, Eyebrow, MORPH, Signature, Tick, TrialButton, Waveform, scrollToId, track } from './shared'

const STEPS = ['Upload', 'Transcribe', 'Read the call', 'Draft']

/** JobProgress: fills once on load over 1.6s, ends on "Drafting" with the accent dot pulsing. */
function JobProgress() {
  const reduce = useReducedMotion()
  const [done, setDone] = useState(reduce ? 3 : 0)
  useEffect(() => {
    if (reduce) { setDone(3); return }
    const ids = [1, 2, 3].map((n) => window.setTimeout(() => setDone(n), 400 + n * 400))
    return () => ids.forEach(window.clearTimeout)
  }, [reduce])
  return (
    <div className="sg-job" role="progressbar" aria-label="Proposal job" aria-valuemin={0} aria-valuemax={4} aria-valuenow={done}>
      <div className="sg-job-track" aria-hidden="true">
        <motion.span className="sg-job-fill" initial={false} animate={{ scaleX: done / 3 }} transition={{ duration: reduce ? 0 : 0.4, ease: MORPH }} />
      </div>
      <ol className="sg-job-steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i < done ? 'is-done' : i === done ? 'is-current' : ''}>
            <i aria-hidden="true" />
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="sg-job-label"><span className="sg-live" aria-hidden="true" /> {done >= 3 ? 'Drafting' : 'Working'} the Northwind proposal</p>
    </div>
  )
}

function HeroVisual() {
  const reduce = useReducedMotion()
  const layer = (delay: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.6, delay: reduce ? 0 : delay, ease: EASE },
  })
  const [signed, setSigned] = useState(!!reduce)
  useEffect(() => {
    if (reduce) return
    const id = window.setTimeout(() => setSigned(true), 1800)
    return () => window.clearTimeout(id)
  }, [reduce])

  return (
    <div className="sg-hero-visual" role="img" aria-label="Proposal editor showing an exec summary for Northwind Coffee, a call card drafting the proposal, and a toast saying Jane Cole signed and paid a $3,600 deposit">
      <motion.div className="sg-paper sg-editor" {...layer(0)} aria-hidden="true">
        <div className="sg-editor-bar">
          <span className="sg-editor-crumb">Proposals / <b>Northwind Coffee</b></span>
          <span className="sg-status sg-status-draft"><i />Draft</span>
        </div>
        <div className="sg-editor-body">
          <p className="sg-doc-kicker">Proposal for Northwind Coffee</p>
          <h3 className="sg-doc-title">A faster Shopify store before the spring menu launch</h3>
          <p className="sg-doc-section">Exec summary</p>
          <p className="sg-doc-text">
            Northwind wants online orders to match the café queue. Today the store loads slowly on phones and
            checkout drops one in three carts. We will migrate you to a new Shopify theme, fix checkout and have
            it live six weeks before launch.
          </p>
          <div className="sg-doc-lines" aria-hidden="true"><i /><i /><i style={{ width: '62%' }} /></div>
          <div className="sg-doc-sign">
            <div>
              <Signature play={signed} className="sg-doc-sigsvg" delay={0.1} />
              <span className="sg-doc-sigline">Jane Cole, Northwind Coffee</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div className="sg-paper sg-callcard" {...layer(0.14)} aria-hidden="true">
        <div className="sg-callcard-head">
          <span className="sg-callcard-file">northwind-discovery.m4a</span>
          <span className="sg-callcard-time">45:12</span>
        </div>
        <Waveform bars={34} />
        <JobProgress />
      </motion.div>

      <motion.div className="sg-paper sg-toast" {...layer(0.28)} aria-hidden="true">
        <motion.div
          className="sg-toast-inner"
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={signed ? { opacity: 1, scale: [0.96, 1.03, 1] } : { opacity: 0, scale: 0.96 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
        >
          <Tick size={13} />
          <span><b>Jane Cole signed.</b> Deposit $3,600 paid.</span>
        </motion.div>
      </motion.div>
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const item = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : i * 0.08, ease: EASE },
  })
  return (
    <header className="sg-hero sg-section sg-tint" id="top">
      <div className="sg-container sg-hero-grid">
        <div className="sg-hero-copy">
          <motion.div {...item(0)}><Eyebrow>For agencies, freelancers and consultants</Eyebrow></motion.div>
          <motion.h1 className="sg-h1" {...item(1)}>Your sales call, turned into a signed proposal <em>by this afternoon.</em></motion.h1>
          <motion.p className="sg-lead" {...item(2)}>
            Upload the recording. Signet pulls out the client's goals, pains and budget, writes a branded proposal
            priced from your own rate card, and tells you the moment they open, sign and pay the deposit.
          </motion.p>
          <motion.div className="sg-hero-ctas" {...item(3)}>
            <TrialButton location="hero" size="lg" />
            <Button
              variant="secondary"
              size="lg"
              href="#demo"
              onClick={() => { scrollToId('demo'); window.dispatchEvent(new CustomEvent('signet:play-demo')); track('lp_demo_played', { trigger: 'button' }) }}
            >
              <Play size={15} strokeWidth={1.75} aria-hidden="true" /> Watch the 60 second demo
            </Button>
          </motion.div>
          <motion.p className="sg-trust" {...item(4)}>7 days free. Cancel in two clicks. Your first proposal takes about 10 minutes.</motion.p>
        </div>
        <HeroVisual />
      </div>
    </header>
  )
}

const ROLES = ['Web design studios', 'SEO agencies', 'Paid ads agencies', 'Video production', 'Fractional CMOs', 'Freelance developers']

export function LogoStrip() {
  const reduce = useReducedMotion()
  return (
    <section className="sg-strip" aria-label="Who Signet is for">
      <motion.div
        className="sg-container"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: reduce ? 0.15 : 0.4, ease: EASE }}
      >
        <p className="sg-strip-line">Built for the people who sell their time</p>
        <ul className="sg-roles">
          {ROLES.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </motion.div>
    </section>
  )
}
