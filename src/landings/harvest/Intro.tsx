import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Clock, MousePointerClick, Play, ShieldAlert, Square } from 'lucide-react'
import { EASE, Mark, Reveal, SectionHead, track } from './shared'

export function Numbers() {
  return (
    <section className="hv-section hv-numbers" aria-label="Example numbers">
      <div className="hv-rail">
        <Reveal>
          <p className="hv-numbers-line">Built for people who sell on LinkedIn at</p>
          <div className="hv-numbers-row">
            <div><span className="hv-big">1,200</span><p>warm people a month on an average weekly poster's posts*</p></div>
            <div><span className="hv-big">3%</span><p>fit a typical B2B buyer*</p></div>
            <div><span className="hv-big">7:00</span><p>your digest lands</p></div>
          </div>
          <p className="hv-footnote">* Example maths for a founder whose posts get 300 reactions a week. Your numbers will differ.</p>
        </Reveal>
      </div>
    </section>
  )
}

const PROBLEMS = [
  { icon: Clock, t: 'Reactions vanish.', b: 'A post peaks in 48 hours. By Friday the 340 people who reacted are buried under new posts.' },
  { icon: MousePointerClick, t: 'Scrolling is slow.', b: 'Opening 30 profiles to find 4 buyers takes 90 minutes and still gets you no emails.' },
  { icon: ShieldAlert, t: 'Cookie tools are risky.', b: 'Tools that run on your LinkedIn login can get your own account restricted.' },
]

export function Problem() {
  return (
    <section className="hv-section hv-band" id="problem">
      <div className="hv-rail">
        <SectionHead eyebrow="The problem" title="Your best leads already raised their hand. Nobody wrote it down." />
        <div className="hv-problem-grid">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.06} className="hv-problem">
              <p.icon size={16} strokeWidth={1.5} className="hv-accent-ink" aria-hidden="true" />
              <h3>{p.t}</h3>
              <p>{p.b}</p>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="hv-closing">Harvest does the scroll, the lookups and the first line for you. You do the selling.</p></Reveal>
      </div>
    </section>
  )
}

const DIGEST = [
  {
    name: 'Sam Lee', tier: 'Hot', score: 86, role: 'Head of Customer Success at Northbeam (51 to 200)',
    engaged: "Commented on Priya Shah's post about onboarding churn.",
    opener: 'Your point about churn starting in week two matched what we see too: most teams lose people before the first report lands.',
  },
  {
    name: 'Dana Okafor', tier: 'Hot', score: 82, role: 'VP Revenue at Fieldline (201 to 500)',
    engaged: 'Reacted to your post about pipeline reviews.',
    opener: 'Pipeline reviews that start from last week’s calls rather than the CRM seem to be where a lot of revenue teams are heading.',
  },
  {
    name: 'Marco Ruiz', tier: 'Warm', score: 74, role: 'Founder at Tallyhouse (11 to 50)',
    engaged: 'Commented on your post about hiring a first salesperson.',
    opener: 'Hiring the first seller before the founder has a repeatable pitch is the trap you described, and it is a common one.',
  },
]

/** The digest email exactly as DESIGN.md section 9, three leads. */
function Digest() {
  const reduce = useReducedMotion()
  return (
    <Reveal className="hv-frame hv-digest">
      <div className="hv-mail-chrome" aria-hidden="true">
        <span><b>From</b> Harvest</span>
        <span><b>Subject</b> 12 warm leads from yesterday's posts</span>
      </div>
      <div className="hv-digest-scroll" tabIndex={0} aria-label="Example digest email, scrollable">
        <div className="hv-digest-head">
          <span className="hv-wordmark"><Mark />Harvest</span>
          <span className="hv-muted">Tue 14 Oct, 07:00</span>
        </div>
        <div className="hv-digest-intro">
          <p className="hv-digest-title">12 warm leads from yesterday's posts</p>
          <p className="hv-muted">From 3 posts and 2 creators. 214 engagers filtered by your ICP.</p>
        </div>
        {DIGEST.map((l, i) => (
          <motion.div
            key={l.name}
            className="hv-digest-lead"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.48, delay: 0.2 + i * 0.06, ease: EASE }}
          >
            <p className="hv-digest-name">{l.name} <span className={l.tier === 'Hot' ? 'hv-hot-ink' : 'hv-warm-ink'}>· {l.tier} · <span className="hv-data">{l.score}</span></span></p>
            <p>{l.role}</p>
            <p className="hv-muted">{l.engaged}</p>
            <p className="hv-opener-box">{l.opener}</p>
            <div className="hv-digest-btns" aria-hidden="true"><span>Open in Harvest</span><span>Copy email</span></div>
          </motion.div>
        ))}
        <div className="hv-digest-foot">
          <span className="hv-link-ish">8 more in Harvest</span>
          <span>Enriched 210 of 300 this month</span>
          <span>Change digest settings · Unsubscribe from digests</span>
        </div>
      </div>
    </Reveal>
  )
}

const STEPS = [
  'Paste a post URL',
  'Collect now',
  'Today fills in',
  'Open a lead',
  'Copy the opener',
  'Push to HubSpot',
]

/** Captioned walkthrough player. Muted, never autoplays; click to play. Built in code instead of a video file. */
function Walkthrough() {
  const reduce = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!playing) return
    if (step >= STEPS.length - 1) { const t = window.setTimeout(() => setPlaying(false), 1800); return () => window.clearTimeout(t) }
    const t = window.setTimeout(() => setStep((s) => s + 1), 1800)
    return () => window.clearTimeout(t)
  }, [playing, step])
  const poster = !playing && step === 0
  const s = poster ? 2 : step
  const play = () => { track('demo_video_played', { seconds_watched: 0 }); setStep(0); setPlaying(true) }
  return (
    <Reveal delay={0.08} className="hv-video-col">
      <div className="hv-frame hv-video">
        <div className="hv-video-stage" aria-hidden="true">
          <div className="hv-vs-bar"><Mark size={16} /><span>{s < 2 ? 'Sources' : 'Today'}</span><span className="hv-vs-step hv-data">{poster ? '1:00' : `${step + 1}/6`}</span></div>
          <div className="hv-vs-body">
            <div className={`hv-vs-url${s === 0 ? ' on' : ''}`}><span className="hv-data">linkedin.com/posts/priya-shah_onboarding…</span><span className={`hv-vs-btn${s === 1 ? ' on' : ''}`}>Collect now</span></div>
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <div key={r} className={`hv-vs-row${s >= 2 ? ' on' : ''}${s >= 3 && r === 0 ? ' sel' : ''}`} style={{ transitionDelay: reduce ? '0ms' : `${r * 60}ms` }}>
                <i /><i /><b className={r < 2 ? 'hot' : r < 5 ? 'warm' : 'cold'} />
              </div>
            ))}
            <div className={`hv-vs-panel${s >= 3 ? ' on' : ''}`}>
              <span className="hv-vs-name">Sam Lee · Hot · 86</span>
              <span className="hv-vs-opener">Your point about churn starting in week two matched what we see too.</span>
              <span className={`hv-vs-copy${step >= 4 ? ' on' : ''}`}>{step >= 4 ? 'Copied' : 'Copy opener'}</span>
              <span className={`hv-vs-push${step >= 5 ? ' on' : ''}`}>{step >= 5 ? 'Pushed to HubSpot' : 'Push'}</span>
            </div>
          </div>
        </div>
        <div className="hv-video-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${playing || step > 0 ? (step + 1) / STEPS.length : 0})` }} />
        </div>
        <p className="hv-caption" aria-live="polite">{playing || step > 0 ? STEPS[step] : 'Muted, with captions. 60 seconds.'}</p>
        <AnimatePresence>
          {!playing && (
            <motion.button
              type="button"
              className="hv-play"
              onClick={play}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <Play size={16} aria-hidden="true" />{step > 0 ? 'Play again' : 'Play the walkthrough'}
            </motion.button>
          )}
        </AnimatePresence>
        {playing && (
          <button type="button" className="hv-stop" onClick={() => setPlaying(false)} aria-label="Pause walkthrough"><Square size={12} /></button>
        )}
      </div>
      <p className="hv-video-caption">From post link to CRM in under a minute of your time.</p>
    </Reveal>
  )
}

export function Demo() {
  return (
    <section className="hv-section" id="demo">
      <div className="hv-rail">
        <SectionHead eyebrow="See it" title="This is tomorrow morning." />
        <div className="hv-demo-grid">
          <Digest />
          <Walkthrough />
        </div>
      </div>
    </section>
  )
}
