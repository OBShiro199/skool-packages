import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Play } from 'lucide-react'
import { CONCEPTS, TITLE, Thumb } from './Thumb'
import { EASE, Eyebrow, LiveDot, MORPH, TrialButton, VarTag, scrollToId } from './shared'

/** The concept gallery: cards fill one by one (loading pattern, then image fade), as in the app. */
export function Gallery({ autoplay = true }: { autoplay?: boolean }) {
  const reduce = useReducedMotion()
  const [ready, setReady] = useState(reduce || !autoplay ? 6 : 0)
  useEffect(() => {
    if (reduce || !autoplay) return
    const timers = CONCEPTS.map((_, i) => window.setTimeout(() => setReady(i + 1), 700 + i * 120 + (i === 0 ? 0 : 200)))
    return () => timers.forEach(clearTimeout)
  }, [reduce, autoplay])
  const status = ready === 0 ? 'Writing ideas' : ready < 6 ? `Painting ${ready + 1} of 6` : '6 concepts ready'
  return (
    <div className="mq-gallery" role="img" aria-label={`Concept gallery for "${TITLE}" with six thumbnail concepts ready`}>
      <div className="mq-g-bar">
        <span className="mq-g-title">{TITLE}</span>
        <span className="mq-g-actions" aria-hidden="true">
          <span className="mq-btn mq-btn-xs">Regenerate all (6 credits)</span>
          <span className="mq-btn mq-btn-xs mq-btn-primary">Start a test</span>
        </span>
      </div>
      <div className="mq-g-progress">
        <span className="mq-g-status">{ready < 6 && <LiveDot />}{status}</span>
        <motion.span className="mq-g-meter" initial={false} animate={{ scaleX: ready / 6 }} transition={{ duration: 0.4, ease: MORPH }} />
      </div>
      <div className="mq-g-grid">
        {CONCEPTS.map((c, i) => (
          <div className="mq-g-card" key={c.angle}>
            <div className="mq-g-frame">
              <span className="mq-loading" />
              <motion.div className="mq-g-img" initial={false} animate={{ opacity: i < ready ? 1 : 0 }} transition={{ duration: 0.2 }}>
                <Thumb c={c} />
              </motion.div>
            </div>
            <div className="mq-g-meta">
              <span className="mq-pill">{c.angle}</span>
              <span className="mq-g-why">{c.why}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ResultCard() {
  return (
    <div className="mq-result">
      <div className="mq-result-pair">
        <div className="mq-result-v"><Thumb c={CONCEPTS[1]} badge={false} /><VarTag v="A" /></div>
        <div className="mq-result-v is-win"><Thumb c={CONCEPTS[4]} badge={false} /><VarTag v="B" /></div>
      </div>
      <p className="mq-result-line"><b>B won</b> · <span className="mq-num">+34% CTR</span> · <span className="mq-num">97% sure</span></p>
    </div>
  )
}

export function Hero({ onDemo }: { onDemo: () => void }) {
  const reduce = useReducedMotion()
  const rise = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : 0.08 * i, ease: EASE },
  })
  return (
    <section className="mq-hero" id="top" aria-labelledby="mq-h1">
      <div className="mq-wrap mq-hero-grid">
        <div className="mq-hero-copy">
          <motion.div {...rise(0)}><Eyebrow>For creators with 10k to 500k subscribers</Eyebrow></motion.div>
          <motion.h1 id="mq-h1" className="mq-display" {...rise(1)}>Thumbnails with your real face. Tested on your real views.</motion.h1>
          <motion.p className="mq-lead" {...rise(2)}>
            Type a title. Marquee drafts six thumbnail ideas with your face cut out and a bold headline in about two
            minutes. Pick your favourites and it tests them on your live video, then keeps the one people click.
          </motion.p>
          <motion.div className="mq-hero-ctas" {...rise(3)}>
            <TrialButton location="hero" />
            <button type="button" className="mq-btn mq-btn-lg" onClick={() => { scrollToId('demo'); onDemo() }}>
              <Play size={15} aria-hidden="true" /> Watch the 45 second demo
            </button>
          </motion.div>
          <motion.p className="mq-trust" {...rise(4)}>7 days free · Cancel in two clicks · Works with any YouTube channel</motion.p>
        </div>
        <div className="mq-hero-visual">
          <motion.div className="mq-frame mq-hero-frame" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: reduce ? 0 : 0.3, ease: EASE }}>
            <Gallery />
          </motion.div>
          <motion.div className="mq-frame mq-hero-result" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: reduce ? 0 : 1.2, ease: EASE }}>
            <ResultCard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
