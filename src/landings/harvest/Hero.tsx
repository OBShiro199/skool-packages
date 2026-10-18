import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Copy } from 'lucide-react'
import { Btn, EASE, Eyebrow, LEADS, TierPill, fmt, scrollToId, track, useCountUp } from './shared'

const COUNTS: [number, string][] = [[1204, 'engagers'], [318, 'filtered'], [61, 'enriched'], [9, 'hot'], [14, 'warm']]

function Count({ to, label, start }: { to: number; label: string; start: boolean }) {
  const v = useCountUp(to, start, 600)
  return (
    <div className="hv-count">
      <span className="hv-count-n hv-data">{fmt(v)}</span>
      <span className="hv-count-l">{label}</span>
    </div>
  )
}

/** Today screen mock: count strip, then 5 rows rise, then the opener card fades up (1.6s, once). */
function TodayMock() {
  const reduce = useReducedMotion()
  const [start, setStart] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => setStart(true), 150); return () => window.clearTimeout(t) }, [])
  return (
    <div
      className="hv-hero-visual"
      role="img"
      aria-label="Harvest Today screen: 1,204 engagers collected, 318 filtered, 61 enriched, 9 hot and 14 warm leads, with five lead rows and an opener for Sam Lee"
    >
      <div className="hv-frame hv-today">
        <div className="hv-today-bar">
          <span className="hv-today-title">Today</span>
          <span className="hv-runstatus"><i className="hv-dot hv-dot-live" aria-hidden="true" />Ready <span className="hv-data">07:00</span></span>
        </div>
        <div className="hv-counts">
          {COUNTS.map(([n, l]) => <Count key={l} to={n} label={l} start={start} />)}
        </div>
        <div className="hv-today-head" aria-hidden="true">
          <span>Person</span><span className="hv-col-co">Company</span><span>Tier</span><span className="hv-col-score">Score</span>
        </div>
        <ul className="hv-today-rows">
          {LEADS.map((l, i) => (
            <motion.li
              key={l.name}
              className={`hv-today-row${i > 2 ? ' hv-row-extra' : ''}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={start ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.36, delay: 0.6 + i * 0.06, ease: EASE }}
            >
              <span className="hv-person"><b>{l.name}</b><span>{l.title}</span></span>
              <span className="hv-col-co hv-person"><b>{l.company}</b><span>{l.size}</span></span>
              <TierPill tier={l.tier} />
              <span className="hv-col-score hv-data">{l.score}</span>
            </motion.li>
          ))}
        </ul>
      </div>
      <motion.div
        className="hv-frame hv-opener-card"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={start ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.3, delay: 1.3, ease: EASE }}
      >
        <div className="hv-opener-card-top"><b>Opener for Sam Lee</b><span className="hv-data hv-faint">118 / 240</span></div>
        <p className="hv-opener-box">Your point about churn starting in week two matched what we see too: most teams lose people before the first report lands.</p>
        <span className="hv-btn hv-btn-primary hv-btn-sm hv-fake-btn" aria-hidden="true"><Copy size={14} />Copy opener</span>
      </motion.div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="hv-section hv-hero" id="top">
      <div className="hv-rail hv-hero-grid">
        <div className="hv-hero-copy">
          <Eyebrow>For founders, agencies and recruiters who post on LinkedIn</Eyebrow>
          <h1>Everyone who liked your post, sorted into leads by 7am.</h1>
          <p className="hv-hero-sub">
            Harvest collects the people who react to and comment on the LinkedIn posts you choose (yours, your competitors',
            your niche's creators), finds their role, company and verified email, and emails you the 20 who fit your buyer
            every morning, each with an opener that mentions what they engaged with.
          </p>
          <div className="hv-cta-row">
            <Btn size="lg" href="#pricing" onClick={() => { track('hero_cta_clicked', { button: 'trial' }); scrollToId('pricing') }}>
              Start free trial <ArrowRight size={16} />
            </Btn>
            <Btn size="lg" variant="secondary" href="#demo" onClick={() => { track('hero_cta_clicked', { button: 'digest' }); scrollToId('demo') }}>
              See a real digest
            </Btn>
          </div>
          <p className="hv-trust">7-day trial · Never logs in to LinkedIn as you · Cancel in two clicks</p>
        </div>
        <TodayMock />
      </div>
    </section>
  )
}
