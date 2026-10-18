import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Sparkles } from 'lucide-react'
import { Btn, EASE, MORPH, Pill, scrollToId, track, useTyping } from './shared'

type Lead = { initials: string; name: string; role: string; site: string; email: string; subject: string; line: string; source: string }

const LEADS: Lead[] = [
  {
    initials: 'SL', name: 'Sarah Lee', role: 'Founder, Northpeak Studio', site: 'northpeak.studio', email: 'sarah@northpeak.studio',
    subject: 'Outdoor brands on Shopify',
    line: "Northpeak's case studies are all outdoor brands on Shopify, which is a sharp niche for a 12-person studio.",
    source: 'northpeak.studio/work',
  },
  {
    initials: 'TR', name: 'Tom Reid', role: 'MD, Fieldwork Recruitment', site: 'fieldworkrecruitment.co.uk', email: 'tom@fieldworkrecruitment.co.uk',
    subject: 'Agri-engineering roles',
    line: 'Fieldwork only places engineers in agriculture and food production, so every client already speaks your language.',
    source: 'fieldworkrecruitment.co.uk/about',
  },
]

/** 0 Finding, 1 Verifying, 2 Reading, 3 Writing, 4 Ready */
function statusFor(step: number, lead: Lead) {
  return ['Finding', 'Verifying', `Reading ${lead.site}`, 'Writing', 'Ready'][step]
}

function HeroCard() {
  const reduce = useReducedMotion()
  const [leadIdx, setLeadIdx] = useState(0)
  const [step, setStep] = useState(reduce ? 4 : 0)
  const lead = LEADS[leadIdx]
  const typing = useTyping(lead.line, step >= 3, 40)

  useEffect(() => {
    if (reduce) { setStep(4); return }
    if (step < 3) {
      const id = window.setTimeout(() => setStep((s) => s + 1), 700)
      return () => window.clearTimeout(id)
    }
    if (step === 3 && typing.done) {
      const id = window.setTimeout(() => setStep(4), 400)
      return () => window.clearTimeout(id)
    }
    if (step === 4) {
      const id = window.setTimeout(() => { setLeadIdx((i) => (i + 1) % LEADS.length); setStep(0) }, 3000)
      return () => window.clearTimeout(id)
    }
  }, [step, typing.done, reduce])

  const working = step < 4
  const progress = [8, 9, 10, 11, 12][step]

  return (
    <div className="ob-hcard" aria-hidden="true">
      <div className="ob-hcard-bar">
        <span className="ob-hcard-title">UK design studios <span className="ob-faint">· Campaign</span></span>
        <span className="ob-mono ob-faint ob-hcard-count">{String(progress).padStart(2, '0')} / 25 written</span>
      </div>
      <div className="ob-hcard-meter"><motion.i animate={{ scaleX: progress / 25 }} transition={{ duration: 0.4, ease: MORPH }} /></div>

      <div className="ob-hcard-row ob-hcard-row-active">
        <span className="ob-avatar">{lead.initials}</span>
        <span className="ob-hcard-who">
          <b>{lead.name}</b>
          <span className="ob-muted">{lead.role}</span>
        </span>
        <span className="ob-status-slot">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={`${leadIdx}-${step}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
              {working
                ? <Pill tone={step === 0 ? 'grey' : 'accent'} dot="live" className="ob-status">{statusFor(step, lead)}</Pill>
                : <Pill tone="accent" className="ob-status ob-status-ready"><Check size={12} strokeWidth={2.4} /> Ready</Pill>}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <div className="ob-email">
        <div className="ob-email-inner">
          <div className="ob-email-meta">
            <span><span className="ob-faint">To</span> <span className="ob-mono">{lead.email}</span></span>
            <span className="ob-email-subj">
              <span className="ob-faint">Subject</span>
              <motion.span animate={{ opacity: step >= 3 ? 1 : 0 }} transition={{ duration: 0.2 }}>{lead.subject}</motion.span>
              {step < 3 && <span className="ob-skel ob-skel-inline" />}
            </span>
          </div>
          <p className="ob-email-line">
            <span className="ob-ai-mark"><Sparkles size={12} strokeWidth={2} /></span>
            <span>Hi {lead.name.split(' ')[0]},</span>
            {step >= 1 && step < 3 && <span className="ob-faint ob-email-hint">{step === 1 ? 'Checking the address twice' : `Reading ${lead.site}`}</span>}
          </p>
          <p className="ob-email-first">
            <span className="ob-email-ghost">{lead.line}</span>
            <span className="ob-email-typed">
              {step < 3
                ? <span className="ob-email-wait"><span className="ob-skel" /><span className="ob-skel ob-short" /></span>
                : <>{typing.shown}{!typing.done && <i className="ob-caret" />}</>}
            </span>
          </p>
          <p className="ob-email-rest">
            <span /><span /><span className="ob-short" />
          </p>
          <div className="ob-email-source">
            <span className="ob-faint">Source</span>
            <motion.span className="ob-mono" animate={{ opacity: step >= 3 ? 1 : 0.35 }} transition={{ duration: 0.2 }}>{lead.source}</motion.span>
          </div>
        </div>
      </div>

      <div className="ob-hcard-queue">
        {[['JM', 'Jo Marsh', 'Founder, Lowtide Design'], ['AK', 'Amir Khan', 'Partner, Blocklight']].map(([i, n, r]) => (
          <div className="ob-hcard-row" key={n}>
            <span className="ob-avatar ob-avatar-dim">{i}</span>
            <span className="ob-hcard-who"><b>{n}</b><span className="ob-muted">{r}</span></span>
            <span className="ob-status-slot"><Pill tone="accent" className="ob-status ob-status-ready"><Check size={12} strokeWidth={2.4} /> Ready</Pill></span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="ob-section ob-hero" id="top">
      <div className="ob-rail ob-hero-grid">
        <div className="ob-hero-copy">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: EASE }}>
            <Pill tone="accent" className="ob-eyebrow">For founders and agencies who do their own outbound</Pill>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: 0.05, ease: EASE }}>
            Cold email that reads like you wrote it.
          </motion.h1>
          <motion.p className="ob-hero-sub" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: 0.1, ease: EASE }}>
            Describe who you sell to. Outbounder finds verified leads, reads each company's website, writes a first line about
            something real, and sends from safe inboxes on your own outreach domain.
          </motion.p>
          <motion.div className="ob-hero-ctas" id="hero-ctas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: 0.15, ease: EASE }}>
            <Btn onClick={() => { track('hero_cta_clicked', { button: 'trial' }); scrollToId('pricing') }}>Start 7-day free trial</Btn>
            <Btn variant="secondary" href="/tools/first-line-generator" onClick={() => track('hero_cta_clicked', { button: 'free_tool' })}>
              Try the free first-line generator
            </Btn>
          </motion.div>
          <ul className="ob-ticks">
            {['7 days free', 'From $79/mo', 'Cancel in two clicks'].map((t) => (
              <li key={t}><Check size={14} strokeWidth={2} aria-hidden="true" /> {t}</li>
            ))}
          </ul>
        </div>
        <motion.div className="ob-hero-visual" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }}>
          <HeroCard />
          <p className="ob-sr">Example: Outbounder finds Sarah Lee, reads her studio's website and writes a first line about their outdoor-brand case studies.</p>
          <p className="ob-caption">Real example format. Every first line cites the page it came from.</p>
        </motion.div>
      </div>
    </section>
  )
}
