import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Btn, EASE, Eyebrow, scrollToId, track } from './shared'
import { Phone, RatingScreen, SmsBubble, type RatingState } from './phone'

const KPIS: [string, string][] = [['Requests sent', '412'], ['Clicked to Google', '31%'], ['New reviews', '58'], ['Average', '4.82']]

/** Hero phone: a 4 second sequence plays once (tap the 5th star, thank-you line, Google button presses), then rests.
 *  After that it is a working rating page: tap any star, the Google button stays exactly where it is. */
function HeroPhone({ onDemo }: { onDemo: () => void }) {
  const reduce = useReducedMotion()
  const [s, setS] = useState<RatingState>(reduce ? { rating: 5 } : { rating: 0 })
  useEffect(() => {
    if (reduce) return
    const steps: [number, RatingState][] = [
      [1200, { rating: 5, tap: 'star' }],
      [1900, { rating: 5 }],
      [2900, { rating: 5, tap: 'google', pressed: true }],
      [3250, { rating: 5, tap: 'google' }],
      [3800, { rating: 5 }],
    ]
    const ids = steps.map(([t, st]) => window.setTimeout(() => setS(st), t))
    return () => ids.forEach(window.clearTimeout)
  }, [reduce])
  return (
    <Phone className="hl-hero-phone">
      <RatingScreen
        state={s}
        onRate={(r) => setS({ rating: r })}
        onGoogle={() => { setS((p) => ({ ...p, googleOpened: true })); onDemo() }}
        onToggleNote={() => setS((p) => ({ ...p, noteOpen: !(p.noteOpen ?? (p.rating >= 1 && p.rating <= 3)) }))}
      />
    </Phone>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const rise = (delay: number, y = 16) => reduce ? {} : {
    initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.36, delay, ease: EASE },
  }
  const seeDemo = () => { track('lp_cta_click', { location: 'hero_demo' }); scrollToId('demo'); window.dispatchEvent(new CustomEvent('halo-play-demo')) }
  return (
    <section className="hl-section hl-hero" id="top">
      <div className="hl-rail hl-hero-grid">
        <div className="hl-hero-copy">
          <motion.div {...rise(0, 12)}><Eyebrow>For dentists, clinics, salons, trades and the agencies that serve them</Eyebrow></motion.div>
          <motion.h1 {...rise(0.06, 12)}>More Google reviews, without breaking <em className="hl-serif">Google's rules.</em></motion.h1>
          <motion.p {...rise(0.12, 12)} className="hl-hero-sub">
            Halo texts every customer after their visit with a two-tap way to rate you and post on Google. Unhappy customers
            can also tell you privately, so you hear about problems the same day. New reviews get a reply drafted in your
            voice, ready to approve.
          </motion.p>
          <motion.div {...rise(0.18, 12)} className="hl-cta-row">
            <Btn size="lg" href="/signup" onClick={() => track('lp_cta_click', { location: 'hero' })}>Start free trial <ArrowRight size={16} /></Btn>
            <Btn size="lg" variant="secondary" href="#demo" onClick={seeDemo}>See what customers get</Btn>
          </motion.div>
          <motion.p {...rise(0.24, 12)} className="hl-trust">7 days free. No card to start. Set up in 5 minutes with a link you already have.</motion.p>
        </div>
        <div className="hl-hero-visual" aria-label="The rating page Brightside Dental's customers see, with the review request text and a slice of the Halo dashboard" role="group">
          <motion.div className="hl-frame hl-hero-dash" {...rise(0.48)} aria-hidden="true">
            <div className="hl-dash-bar"><span>Dashboard</span><span className="hl-faint">All locations · 30 days</span></div>
            <div className="hl-dash-kpis">
              {KPIS.map(([l, v]) => <div key={l} className="hl-kpi"><span className="hl-kpi-l">{l}</span><span className="hl-kpi-v">{v}</span></div>)}
            </div>
          </motion.div>
          <motion.div className="hl-hero-phone-wrap" {...rise(0.34)}>
            <HeroPhone onDemo={() => track('lp_demo_play', { from: 'hero_phone' })} />
          </motion.div>
          <motion.div className="hl-frame hl-hero-sms" {...rise(0.2)}>
            <span className="hl-sms-from"><b>Brightside Dental</b><span className="hl-faint">now</span></span>
            <SmsBubble />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
