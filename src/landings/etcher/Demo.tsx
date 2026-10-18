import { useEffect, useRef, useState, type JSX } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Pause, Play } from 'lucide-react'
import { EASE, Reveal, track } from './shared'
import { Board } from './Hero'
import { CallingVisual, ImportVisual, ReportsVisual, WrapVisual } from './Features'

const CHAPTERS: { key: string; label: string; caption: string; Scene: () => JSX.Element }[] = [
  { key: 'import', label: 'Import', caption: 'Drop in a CSV. Duplicates by email and domain are skipped.', Scene: ImportVisual },
  { key: 'call', label: 'Call', caption: 'Click the number. The browser rings on your local line.', Scene: CallingVisual },
  { key: 'wrap', label: 'Wrap-up', caption: 'Pick an outcome. The call lands on the timeline.', Scene: WrapVisual },
  { key: 'move', label: 'Move', caption: 'Drag the deal to Negotiation. Totals update in place.', Scene: () => <Board prefix="demo" /> },
  { key: 'forecast', label: 'Forecast', caption: 'Monday morning: calls per rep and revenue by month.', Scene: ReportsVisual },
]
const CH_MS = 5400
const CH_SECONDS = 18 // each chapter is 18s of the 90s demo
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function Demo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = !!useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [ch, setCh] = useState(0)
  const [t, setT] = useState(0) // ms into the chapter

  // plays when 50% in view, pauses when out (not with reduced motion: poster + play button)
  useEffect(() => {
    if (reduce || userPaused) return
    if (inView && !playing) { setPlaying(true); if (!started) { setStarted(true); track('demo_play', { chapter: CHAPTERS[ch].key }) } }
    if (!inView && playing) setPlaying(false)
  }, [inView, reduce, userPaused, playing, started, ch])

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      setT((x) => {
        const n = x + dt
        if (n >= CH_MS) { setCh((c) => (c + 1) % CHAPTERS.length); return 0 }
        return n
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const seek = (i: number) => {
    setCh(i); setT(0); setStarted(true); setUserPaused(false); setPlaying(true)
    track('demo_play', { chapter: CHAPTERS[i].key })
  }
  const toggle = () => {
    if (playing) { setPlaying(false); setUserPaused(true) } else { setUserPaused(false); setStarted(true); setPlaying(true); track('demo_play', { chapter: CHAPTERS[ch].key }) }
  }

  const total = Math.floor(ch * CH_SECONDS + (t / CH_MS) * CH_SECONDS)
  const time = clock(total)
  const C = CHAPTERS[ch]

  return (
    <section className="et-section" id="demo" aria-labelledby="et-demo-h">
      <div className="et-wrap">
        <Reveal className="et-head et-head-center">
          <h2 id="et-demo-h" className="et-h2">Watch a lead go from CSV to closed in 90 seconds.</h2>
          <p className="et-sub">Import, call, log, move, win. No extra apps.</p>
        </Reveal>
        <Reveal>
          <div className="et-player" ref={ref}>
            <div className="et-player-stage" aria-live="polite">
              {!started ? (
                <div className="et-poster">
                  <Board animate={false} prefix="poster" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={C.key} className="et-scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
                    <div className={`et-scene-inner et-scene-${C.key}`}><C.Scene /></div>
                  </motion.div>
                </AnimatePresence>
              )}
              {started && <p className="et-caption">{C.caption}</p>}
              {!playing && (
                <button type="button" className="et-bigplay" onClick={toggle} aria-label={started ? 'Resume demo' : 'Play the 90 second demo'}>
                  <Play size={20} fill="currentColor" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="et-player-bar">
              <button type="button" className="et-icon-btn" onClick={toggle} aria-label={playing ? 'Pause demo' : 'Play demo'}>
                {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              </button>
              <span className="et-num et-time">{time} / 1:30</span>
              <div className="et-scrub" aria-hidden="true">
                {CHAPTERS.map((c, i) => (
                  <span key={c.key}><i style={{ transform: `scaleX(${i < ch ? 1 : i === ch ? t / CH_MS : 0})` }} /></span>
                ))}
              </div>
            </div>
          </div>
          <div className="et-chapters" role="group" aria-label="Demo chapters">
            {CHAPTERS.map((c, i) => (
              <button key={c.key} type="button" className={`et-chapter ${i === ch && started ? 'on' : ''}`} aria-pressed={i === ch && started} onClick={() => seek(i)}>
                <span className="et-num">{clock(i * CH_SECONDS)}</span> {c.label}
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
