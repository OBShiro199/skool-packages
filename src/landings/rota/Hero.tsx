import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CalendarCheck, Coffee, Dumbbell, Play, Scissors, Stethoscope, UtensilsCrossed, Flower2 } from 'lucide-react'
import { Button, EASE, TrialButton } from './shared'
import { RotaGrid } from './Grid'

/* ------------------------------------------------------------------ 3. Hero */

function useHeroPhase() {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  const [sms, setSms] = useState(false)
  const [animate, setAnimate] = useState(true)
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)').matches
    if (reduce || !desktop) { setAnimate(false); setPhase(2); setSms(true); return }
    const t = [
      window.setTimeout(() => setPhase(1), 350),
      window.setTimeout(() => setPhase(2), 1700),
      window.setTimeout(() => setSms(true), 2000),
    ]
    return () => t.forEach((id) => window.clearTimeout(id))
  }, [reduce])
  return { phase, sms, animate }
}

export function Hero({ onDemo }: { onDemo: () => void }) {
  const reduce = useReducedMotion()
  const { phase, sms, animate } = useHeroPhase()
  const rise = (d: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.48, delay: d, ease: EASE },
  })
  return (
    <header className="rt-hero" id="top">
      <div className="rt-hero-axis" aria-hidden="true">
        {['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'].map((t) => <span key={t}>{t}</span>)}
      </div>
      <div className="rt-container rt-hero-grid">
        <div className="rt-hero-copy">
          <motion.span className="rt-eyebrow" {...rise(0)}><i aria-hidden="true" />For cafes, gyms, salons and clinics</motion.span>
          <motion.h1 className="rt-h1" {...rise(0.06)}>Next week's rota, done before your coffee goes cold.</motion.h1>
          <motion.p className="rt-lead" {...rise(0.12)}>
            Rota drafts your week from everyone's availability, warns you about clashes and overtime, then texts each
            person their own shifts. Swaps, cover and clock-in happen on their phones. You approve with one tap.
          </motion.p>
          <motion.div className="rt-ctas" {...rise(0.18)}>
            <TrialButton location="hero" size="lg" />
            <Button variant="secondary" size="lg" onClick={onDemo}>
              <Play size={14} strokeWidth={1.5} aria-hidden="true" className="rt-teal" />Watch the 60 second demo
            </Button>
          </motion.div>
          <motion.p className="rt-faint" {...rise(0.18)}>7 days free. From $39 a location a month. Staff use it free.</motion.p>
        </div>

        <motion.figure
          className="rt-hero-visual"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.12, ease: EASE }}
          aria-label="The Rota builder for Cafe Luna, week of 20 October: five staff and an open shifts row, with a Published tag. A phone overlaps the corner showing the shift text and the next shift card."
        >
          <div className="rt-builder rt-frame" aria-hidden="true">
            <div className="rt-builder-bar">
              <span className="rt-builder-title"><CalendarCheck size={14} strokeWidth={1.5} />Cafe Luna · w/c 20 Oct</span>
              <span className="rt-draftinfo">24 shifts · 2 open · <b>$3,412</b></span>
              <span className={`rt-tag ${phase === 2 ? 'is-pub' : ''}`}><i />{phase === 2 ? 'Published' : 'Draft'}</span>
            </div>
            <RotaGrid phase={phase} animate={animate} />
          </div>
          <div className="rt-phone rt-hero-phone" aria-hidden="true">
            <span className="rt-phone-notch" />
            <span className="rt-phone-time">9:41</span>
            <div className="rt-sms-slot">
              <motion.div
                className="rt-sms"
                initial={false}
                animate={{ opacity: sms ? 1 : 0, y: sms ? 0 : 8 }}
                transition={{ duration: 0.36, ease: EASE }}
              >
                <span className="rt-sms-from">Rota · now</span>
                Cafe Luna rota w/c 20 Oct: Mon 06:00-14:00, Wed 09:00-17:00 ...
              </motion.div>
            </div>
            <div className="rt-next">
              <span className="rt-next-k">Next shift</span>
              <b>Mon 20 Oct</b>
              <span className="rt-next-t">06:00-14:00</span>
              <span className="rt-chip is-barista">Barista</span>
            </div>
          </div>
        </motion.figure>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ 4. Logo strip (category marks, not customer logos) */

const KINDS: [typeof Coffee, string][] = [
  [Coffee, 'Independent cafes'], [Dumbbell, 'Boutique gyms'], [Scissors, 'Hair salons'],
  [Stethoscope, 'Physio clinics'], [UtensilsCrossed, 'Bars and kitchens'], [Flower2, 'Yoga studios'],
]

export function LogoStrip() {
  return (
    <section className="rt-logos" aria-label="Built for teams like these">
      <div className="rt-container">
        <p>Built for teams like</p>
        <ul>{KINDS.map(([Icon, k]) => <li key={k}><Icon size={15} strokeWidth={1.5} aria-hidden="true" />{k}</li>)}</ul>
      </div>
    </section>
  )
}
