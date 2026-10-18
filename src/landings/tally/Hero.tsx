import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Mail } from 'lucide-react'
import { Button, Crosshairs, EASE, Eyebrow, Reveal, StatusPill, TrialButton, scrollToId, track } from './shared'

const STEPS = ['−3 days', 'Due', '+3', '+7', '+14']

function HeroVisual() {
  const reduce = useReducedMotion()
  const [dots, setDots] = useState(reduce ? 2 : 0)
  const [paid, setPaid] = useState(!!reduce)
  useEffect(() => {
    if (reduce) return
    const t = [window.setTimeout(() => setDots(1), 900), window.setTimeout(() => setDots(2), 1200), window.setTimeout(() => setPaid(true), 2100)]
    return () => t.forEach(window.clearTimeout)
  }, [reduce])
  const layer = (i: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.42, delay: reduce ? 0 : 0.2 + i * 0.14, ease: EASE },
  })
  return (
    <div className="tl-hero-visual" role="img" aria-label="Invoice INV-0042 for Northwind Coffee, 2,400 dollars, with the first two reminders sent; a reminder email from Moss Studio's own domain; and a phone showing the pay page with a toast: Northwind paid 2,400 dollars.">
      <motion.div className="tl-frame tl-inv" {...layer(0)} aria-hidden="true">
        <div className="tl-inv-top">
          <span className="tl-mono tl-inv-no">INV-0042</span>
          <span className="tl-pill-slot"><StatusPill status={paid ? 'Paid' : 'Sent'} /></span>
        </div>
        <div className="tl-inv-client">Northwind Coffee</div>
        <div className="tl-inv-grid">
          <div><span>Amount due</span><b className="tl-money">{paid ? '$0.00' : '$2,400.00'}</b></div>
          <div><span>Issued</span><b>1 Nov</b></div>
          <div><span>Due</span><b>15 Nov</b></div>
        </div>
        <div className="tl-seq">
          <span className="tl-seq-label">Reminders</span>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s} className={`${i < dots ? 'is-sent' : ''} ${paid && i >= dots ? 'is-cancelled' : ''}`}><i />{s}</li>
            ))}
          </ol>
          <span className="tl-seq-note">{paid ? 'Paid. Remaining reminders cancelled.' : 'Next: on the due date, 9:00 client time'}</span>
        </div>
      </motion.div>
      <motion.div className="tl-frame tl-mail" {...layer(1)} aria-hidden="true">
        <div className="tl-mail-from"><Mail size={14} strokeWidth={1.5} /><span><b>Moss Studio</b> &lt;accounts@billing.moss.studio&gt;</span></div>
        <div className="tl-mail-subject">Quick reminder: INV-0042 for $2,400.00</div>
        <p className="tl-mail-body">Hi Dana, a friendly note that this invoice is due on Friday. You can pay by card or bank below.</p>
        <span className="tl-mail-btn">View and pay</span>
      </motion.div>
      <motion.div className="tl-phone" {...layer(2)} aria-hidden="true">
        <div className="tl-phone-screen">
          <span className="tl-phone-brand"><i /> Moss Studio</span>
          <span className="tl-phone-k">Invoice INV-0042</span>
          <b className="tl-money tl-phone-amt">$2,400.00</b>
          <span className="tl-phone-opt is-on">Card</span>
          <span className="tl-phone-opt">Bank (ACH)</span>
          <span className={`tl-phone-pay ${paid ? 'is-paid' : ''}`}>{paid ? <><Check size={13} strokeWidth={2.25} /> Paid</> : 'Pay $2,400.00'}</span>
        </div>
      </motion.div>
      <AnimatePresence>
        {paid && (
          <motion.div className="tl-toast" initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE }} aria-hidden="true">
            <span>Northwind paid <b className="tl-money">$2,400.00</b></span><StatusPill status="Paid" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const item = (i: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, delay: reduce ? 0 : i * 0.08, ease: EASE },
  })
  return (
    <header className="tl-hero tl-ruled" id="top">
      <Crosshairs />
      <div className="tl-container tl-hero-grid">
        <div className="tl-hero-copy">
          <motion.div {...item(0)}><Eyebrow n="01">For freelancers, consultants and small agencies</Eyebrow></motion.div>
          <motion.h1 className="tl-h1" {...item(1)}>Invoices that chase themselves.</motion.h1>
          <motion.p className="tl-lead" {...item(2)}>
            Send a branded invoice from your own email domain. Tally reminds your client politely, then a little more
            firmly, until they pay. The moment they pay or reply, it stops.
          </motion.p>
          <motion.div className="tl-hero-ctas" {...item(3)}>
            <TrialButton location="hero" size="lg" />
            <Button variant="secondary" size="lg" href="#demo" onClick={() => { scrollToId('demo'); window.dispatchEvent(new Event('tally-play')); track('lp_demo_played', { trigger: 'button' }) }}>See it in 45 seconds</Button>
          </motion.div>
          <motion.p className="tl-trust" {...item(4)}>7 days free. Clients pay into your own Stripe account. Tally never touches the money.</motion.p>
        </div>
        <HeroVisual />
      </div>
    </header>
  )
}

const ROLES = ['Designers', 'Developers', 'Copywriters', 'Video editors', 'Consultants', 'Small agencies']

export function LogoStrip() {
  return (
    <section className="tl-strip" aria-label="Who Tally is made for">
      <Reveal className="tl-container">
        <p className="tl-strip-line">Made for people who invoice for their time</p>
        <ul className="tl-roles">{ROLES.map((r) => <li key={r}>{r}</li>)}</ul>
      </Reveal>
    </section>
  )
}
