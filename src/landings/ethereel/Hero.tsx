import { useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Check, CircleDot, Mic2, Send, Type } from 'lucide-react'
import { Btn, EASE, Pill, Reveal, SectionHead, TrialBtn, scrollToId, useClock, useCountUp } from './shared'
import { HERO_REEL, HERO_STEPS, Phone, RawClip, Reel } from './reel'

const POSTER = 11 // a frame inside the finished diagram, with a caption showing

function Up({ children, i, className }: { children: ReactNode; i: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay: i * 0.04, ease: EASE }}
    >{children}</motion.div>
  )
}

function PlayBadge() {
  return <span className="er-play-badge" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M4 2.5v9l7.5-4.5z" fill="currentColor" /></svg></span>
}

export function Hero() {
  const visRef = useRef<HTMLDivElement>(null)
  const inView = useInView(visRef, { amount: 0.5 })
  const reduce = !!useReducedMotion()
  const { t } = useClock(HERO_REEL.duration, inView, POSTER)
  const rawT = (t / HERO_REEL.duration) * 64
  const [swapped, setSwapped] = useState(false)

  return (
    <section className="er-section er-hero" id="top" aria-labelledby="hero-h1">
      <div className="er-rail er-hero-grid">
        <div className="er-hero-copy">
          <Up i={0}><Pill dot>For coaches, consultants and founders who film themselves</Pill></Up>
          <Up i={1}>
            <h1 id="hero-h1">Send a raw clip. Get back a reel that looks <em>hand-edited.</em></h1>
          </Up>
          <Up i={2}>
            <p className="er-lede">
              Ethereel cuts your pauses, writes your captions, adds zooms and hand-drawn diagrams, mixes the sound and
              posts to TikTok and Instagram at your best times. You approve every reel first.
            </p>
          </Up>
          <Up i={3} className="er-hero-ctas">
            <TrialBtn location="hero" />
            <Btn variant="secondary" href="#demo" onClick={() => scrollToId('demo')}>Watch a 20 second before and after</Btn>
          </Up>
          <Up i={4}><p className="er-micro">7 days free · 5 reels on the trial · From $89/month</p></Up>
        </div>

        <motion.div
          ref={visRef} className="er-hero-vis"
          initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.36, delay: 0.12, ease: EASE }}
        >
          {/* desktop: two overlapping phones */}
          <div className="er-hero-pair">
            <Phone
              className="er-hero-raw" ariaLabel="Raw clip, 1 minute 4 seconds: a woman talking to camera with pauses, no captions"
              label={<Pill tone="grey">Raw clip 1:04</Pill>}
            >
              <RawClip t={rawT} />
              {reduce && <PlayBadge />}
            </Phone>
            <Phone
              className="er-hero-edit" ariaLabel="Ethereel reel, 47 seconds: the same take with captions, a punch-in zoom and a hand-drawn diagram cutaway"
              label={<Pill>Ethereel reel 0:47</Pill>}
            >
              <Reel script={HERO_REEL} t={t} />
              {reduce && <PlayBadge />}
            </Phone>
          </div>

          {/* mobile: one reel with the raw clip as picture-in-picture, tap to swap */}
          <div className="er-hero-solo">
            <Phone
              className="er-hero-main"
              ariaLabel={swapped ? 'Raw clip, unedited take' : 'Ethereel reel with captions, zoom and a diagram cutaway'}
              label={<Pill tone={swapped ? 'grey' : 'accent'}>{swapped ? 'Raw clip 1:04' : 'Ethereel reel 0:47'}</Pill>}
            >
              {swapped ? <RawClip t={rawT} /> : <Reel script={HERO_REEL} t={t} />}
            </Phone>
            <button
              type="button" className="er-pip" onClick={() => setSwapped((s) => !s)}
              aria-label={swapped ? 'Show the Ethereel reel' : 'Show the raw clip'}
            >
              {swapped ? <Reel script={HERO_REEL} t={t} /> : <RawClip t={rawT} timecode={false} />}
              <span className="er-pip-tag">{swapped ? 'Reel' : 'Raw'}</span>
            </button>
          </div>

          <ol className="er-steps" aria-label="Edits applied in this reel">
            {HERO_STEPS.map(([label, at], i) => {
              const lit = reduce || t >= at
              return (
                <li key={label} className={lit ? 'lit' : ''}>
                  <span className="er-step-n" aria-hidden="true">{lit ? <Check size={11} strokeWidth={2.4} /> : i + 1}</span>
                  {label}
                  {label === 'Music' && <span className="er-eq" aria-hidden="true"><i /><i /><i /></span>}
                </li>
              )
            })}
          </ol>
        </motion.div>
      </div>
    </section>
  )
}

const AUDIENCE = ['Coaches', 'Consultants', 'SaaS founders', 'Agency owners', 'Podcasters', 'Course creators', 'Recruiters', 'Fractional execs']

export function LogoStrip() {
  const reduce = useReducedMotion()
  return (
    <section className="er-section" aria-label="Who it is for">
      <div className="er-rail er-logos">
        <p className="er-faint">Made for people whose face is the brand</p>
        <ul>
          {AUDIENCE.map((a, i) => (
            <motion.li
              key={a} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.36, delay: Math.min(i, 6) * 0.04, ease: EASE }}
            >{a}</motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const PROBLEMS = [
  { icon: Mic2, title: 'Every pause, every "um".', body: 'Cutting a 60 second take by hand is 20 minutes of scrubbing.' },
  { icon: Type, title: 'Captions that are almost right.', body: 'Auto captions spell your product wrong and cover your face.' },
  { icon: Send, title: 'Posting is a second job.', body: 'Two apps, two upload screens, cover frames, and picking a time.' },
]

export function Problem() {
  const { ref, n } = useCountUp(25, 600)
  return (
    <section className="er-section" aria-labelledby="problem-h">
      <div className="er-rail er-pad">
        <SectionHead
          title={<span id="problem-h">You can film a reel in 2 minutes. Editing it takes <em>an hour.</em></span>}
          sub="So the clips sit in your camera roll and the algorithm forgets you."
        />
        <ul className="er-cols3">
          {PROBLEMS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.04} className="er-col">
              <p.icon size={16} strokeWidth={1.5} className="er-col-icon" aria-hidden="true" />
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="er-stat">
          <CircleDot size={16} strokeWidth={1.5} aria-hidden="true" />
          <p>
            One reel a day, edited by hand, is about{' '}
            <strong><span ref={ref} className="er-num er-fixed" style={{ width: '2ch' }}>{n}</span> hours a month.</strong>
          </p>
        </Reveal>
      </div>
    </section>
  )
}

