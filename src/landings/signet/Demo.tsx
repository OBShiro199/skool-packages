import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Mail, Pause, Play, Upload } from 'lucide-react'
import { EASE, SectionHead, Signature, StatusPill, Tick, Waveform, track } from './shared'

/**
 * Stand-in for the 60 second Screen Studio recording. The PRD hosts an MP4; this kit has no media,
 * so the "video" is built in code: nine captioned scenes on a 60 second timeline with real seeking.
 */
const SCENES = [
  { at: 0, caption: 'Upload a call' },
  { at: 14, caption: 'The brief appears' },
  { at: 26, caption: 'The draft appears' },
  { at: 31, caption: 'Rewrite the summary: "shorter"' },
  { at: 35, caption: 'Send the link' },
  { at: 38, caption: 'The client opens it on a phone' },
  { at: 41, caption: 'They sign' },
  { at: 48, caption: 'They pay the deposit' },
  { at: 54, caption: 'You get the "Signed" email' },
]
const DURATION = 60
const CHIPS: [string, number][] = [['0:05 Upload', 5], ['0:22 The brief', 22], ['0:41 Sign and pay', 41]]

function sceneAt(t: number) {
  let i = 0
  SCENES.forEach((s, n) => { if (t >= s.at) i = n })
  return i
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

function Scene({ i, t }: { i: number; t: number }) {
  switch (i) {
    case 0: {
      const p = Math.min(1, t / 12)
      return (
        <div className="sg-sc sg-sc-center">
          <div className="sg-sc-drop">
            <Upload size={18} strokeWidth={1.5} aria-hidden="true" />
            <b>northwind-discovery.m4a</b>
            <span>45:12 · 38 MB</span>
            <Waveform bars={30} />
            <div className="sg-meter"><span style={{ transform: `scaleX(${p})` }} /></div>
            <span className="sg-num">{Math.round(p * 100)}% uploaded</span>
          </div>
        </div>
      )
    }
    case 1:
      return (
        <div className="sg-sc sg-sc-brief">
          <p className="sg-sc-label">Brief · Northwind Coffee</p>
          <ul>
            <li><b>Goal</b> Online orders that keep up with the café queue</li>
            <li><b>Pain</b> Checkout drops one in three carts on phones</li>
            <li><b>Budget</b> <mark>"We spent about $20k with our last agency"</mark></li>
            <li><b>Open question</b> Who owns the Shopify account today?</li>
          </ul>
        </div>
      )
    case 2:
    case 3:
      return (
        <div className="sg-sc sg-sc-doc">
          <p className="sg-sc-label">Exec summary</p>
          {i === 2 ? (
            <p>Northwind wants online orders to match the café queue. Today the store loads slowly on phones and checkout drops one in three carts.</p>
          ) : (
            <p><del>Northwind wants online orders to match the café queue. Today the store loads slowly on phones and</del> <ins>A faster store, a checkout that</ins> <ins>keeps</ins> <del>checkout drops</del> one in three carts <ins>it loses today.</ins></p>
          )}
          <div className="sg-sc-opts">
            <span>Good <b className="sg-num">$6,400</b></span>
            <span className="is-rec">Better <b className="sg-num">$12,000</b></span>
            <span>Best <b className="sg-num">$18,500</b></span>
          </div>
        </div>
      )
    case 4:
      return (
        <div className="sg-sc sg-sc-center">
          <div className="sg-sc-send">
            <span className="sg-sc-link">signet.app/p/7Hq2…xK9</span>
            <span className="sg-sc-pills"><StatusPill status="Draft" dim /><span aria-hidden="true">→</span><StatusPill status="Sent" /></span>
          </div>
        </div>
      )
    case 5:
    case 6:
    case 7:
      return (
        <div className="sg-sc sg-sc-center">
          <div className="sg-sc-phone">
            <p className="sg-sc-label">Northwind Coffee · Proposal</p>
            {i === 5 && <div className="sg-doc-lines"><i /><i /><i style={{ width: '70%' }} /><i /><i style={{ width: '50%' }} /></div>}
            {i >= 6 && (
              <div className="sg-sc-sign">
                <Signature play className="sg-sc-sig" />
                <span>Jane Cole</span>
              </div>
            )}
            <span className={`sg-sc-pay ${i === 7 ? 'is-paid' : ''}`}>{i === 7 ? <><Tick size={11} /> Deposit paid</> : 'Pay $3,600 deposit'}</span>
          </div>
        </div>
      )
    default:
      return (
        <div className="sg-sc sg-sc-center">
          <div className="sg-sc-mail">
            <Mail size={16} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <b>Signed: Northwind Coffee</b>
              <span>Jane Cole signed at 14:32 and paid the $3,600 deposit.</span>
            </div>
            <StatusPill status="Paid" />
          </div>
        </div>
      )
  }
}

export function Demo() {
  const reduce = useReducedMotion()
  const frameRef = useRef<HTMLDivElement>(null)
  const inView = useInView(frameRef, { amount: 0.5 })
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const autoplayed = useRef(false)

  const play = useCallback((trigger: string) => {
    setPlaying(true)
    track('lp_demo_played', { trigger })
  }, [])

  // muted autoplay only when in view and reduced motion is off; reduced motion shows the poster
  useEffect(() => {
    if (inView && !reduce && !autoplayed.current) { autoplayed.current = true; play('autoplay') }
    if (!inView) setPlaying(false)
  }, [inView, reduce, play])

  useEffect(() => {
    const on = () => window.setTimeout(() => setPlaying(true), 450)
    window.addEventListener('signet:play-demo', on)
    return () => window.removeEventListener('signet:play-demo', on)
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setT((v) => {
        const nv = v + dt
        if (v < DURATION * 0.9 && nv >= DURATION * 0.9) track('lp_demo_completed', { seconds: Math.round(nv) })
        return nv >= DURATION ? 0 : nv
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const i = sceneAt(t)
  const started = playing || t > 0

  return (
    <section className="sg-section sg-band" id="demo" aria-label="Product demo">
      <div className="sg-container">
        <SectionHead eyebrow="See it work" title="45 minute call in. Proposal out in four." center />
        <div className="sg-video sg-frame" ref={frameRef}>
          <div className="sg-video-stage" aria-live="off">
            {started ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={i}
                  className="sg-video-scene"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  <Scene i={i} t={t} />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="sg-video-poster" aria-hidden="true">
                <Scene i={2} t={0} />
              </div>
            )}
            <p className="sg-caption" aria-hidden={!started}>{started ? SCENES[i].caption : 'From a 45 minute call to a signed, paid proposal'}</p>
            {!playing && started && <span className="sg-veil" aria-hidden="true" />}
            {!playing && (
              <button type="button" className="sg-play" onClick={() => play('button')} aria-label={started ? 'Resume the demo' : 'Play the 60 second demo'}>
                <Play size={22} strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="sg-video-bar">
            <button type="button" className="sg-video-toggle" onClick={() => (playing ? setPlaying(false) : play('button'))} aria-label={playing ? 'Pause demo' : 'Play demo'}>
              {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            </button>
            <div className="sg-video-progress" aria-hidden="true"><span style={{ transform: `scaleX(${t / DURATION})` }} /></div>
            <span className="sg-video-time sg-num">{fmt(t)} / 1:00</span>
          </div>
        </div>
        <div className="sg-chips" role="group" aria-label="Jump to a moment in the demo">
          {CHIPS.map(([label, at]) => {
            const active = started && sceneAt(at) === i
            return (
              <button key={label} type="button" className={`sg-chip ${active ? 'is-active' : ''}`} onClick={() => { setT(at); play('chip') }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
