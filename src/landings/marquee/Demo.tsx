import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Download, Pause, Play } from 'lucide-react'
import { CONCEPTS, TITLE, Thumb, type Expr } from './Thumb'
import { Gallery } from './Hero'
import { CtrChart, ScheduleStrip } from './Parts'
import { Eyebrow, LiveDot, Reveal, VarTag, track } from './shared'

const LEN = 45
const SCENES = [
  { from: 0, cap: 'Type the title of your video.' },
  { from: 5, cap: 'Six concepts with your face fill in.' },
  { from: 15, cap: 'Swap the face to "shocked", change the headline, export.' },
  { from: 25, cap: 'Start a test: A and B on a balanced daily schedule.' },
  { from: 35, cap: 'B won with +34% CTR. B is now live on YouTube.' },
]
const sceneAt = (t: number) => SCENES.reduce((acc, s, i) => (t >= s.from ? i : acc), 0)
const mss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function SceneTitle({ t }: { t: number }) {
  const n = Math.round(Math.min(1, t / 4) * TITLE.length)
  return (
    <div className="mq-sc mq-sc-title">
      <label>Video title</label>
      <div className="mq-sc-input">{TITLE.slice(0, n)}<span className="mq-caret" /></div>
      <span className="mq-btn mq-btn-md mq-btn-primary">Generate 6 concepts (6 credits)</span>
      <span className="mq-sc-faint">62 credits left this month</span>
    </div>
  )
}

function SceneEditor({ t }: { t: number }) {
  const expr: Expr = t >= 18 ? 'shocked' : 'smile'
  const c = { ...CONCEPTS[0], head: t >= 21 ? 'Only ONE worked' : 'Only 1 worked' }
  return (
    <div className="mq-sc mq-sc-editor">
      <div className="mq-sc-stage">
        <Thumb c={c} expr={expr} safe />
        <span className="mq-sel" aria-hidden="true" />
      </div>
      <div className="mq-sc-side">
        <span className="mq-sc-label">Face</span>
        <div className="mq-chips">
          {(['Neutral', 'Smile', 'Shocked'] as const).map((x) => <span key={x} className={`mq-pill ${(x === 'Shocked') === (expr === 'shocked') && x !== 'Neutral' ? 'is-on' : ''}`}>{x}</span>)}
        </div>
        <span className="mq-sc-label">Phone preview</span>
        <div className="mq-sc-phone"><Thumb c={c} expr={expr} /><span className="mq-sc-phone-t">{TITLE}</span></div>
        <span className="mq-btn mq-btn-md mq-btn-primary"><Download size={14} aria-hidden="true" /> Export 1280x720</span>
        <span className={`mq-toast ${t >= 23 ? 'is-on' : ''}`}>Exported, 412 KB</span>
      </div>
    </div>
  )
}

function SceneTest({ t }: { t: number }) {
  const today = Math.min(7, Math.floor((t - 25) / 1.2))
  return (
    <div className="mq-sc mq-sc-test">
      <div className="mq-sc-pair">
        <div><Thumb c={CONCEPTS[1]} /><VarTag v="A" /></div>
        <div><Thumb c={CONCEPTS[4]} /><VarTag v="B" /></div>
      </div>
      <ScheduleStrip today={today} />
      <p className="mq-sc-faint">Starts tonight at midnight Pacific (09:00 your time)</p>
    </div>
  )
}

function SceneResult() {
  return (
    <div className="mq-sc mq-sc-result">
      <div className="mq-sc-win">
        <div className="mq-sc-winthumb"><Thumb c={CONCEPTS[4]} /><span className="mq-live-tag"><LiveDot /> Live</span></div>
        <div className="mq-sc-wintext">
          <span className="mq-big">B won</span>
          <span className="mq-sc-num mq-num">+34% CTR · 97% sure</span>
          <span className="mq-sc-faint">Watch time held: 7:48 vs 7:41 average view duration</span>
        </div>
      </div>
      <CtrChart draw w={600} h={140} />
    </div>
  )
}

export function Demo({ startKey }: { startKey: number }) {
  const reduce = useReducedMotion()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const raf = useRef(0)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 960))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setT((x) => {
        const nx = x + dt
        if (nx >= LEN) { setPlaying(false); track('demo_completed'); return LEN }
        return nx
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing])

  const play = () => {
    if (!started) track('demo_played')
    setStarted(true)
    setT((x) => (x >= LEN ? 0 : x))
    setPlaying(true)
  }
  useEffect(() => { if (startKey > 0) play() }, [startKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const scene = sceneAt(t)
  return (
    <section className="mq-section mq-band" id="demo" aria-labelledby="mq-demo-h">
      <div className="mq-wrap">
        <Reveal className="mq-head mq-head-center">
          <Eyebrow>See it work</Eyebrow>
          <h2 id="mq-demo-h" className="mq-h2">From title to a proven thumbnail.</h2>
        </Reveal>
        <Reveal className="mq-frame mq-video">
          <div className="mq-video-stage" ref={stageRef}>
            <div className="mq-video-inner" style={{ transform: `scale(${scale})` }} aria-hidden={!started}>
              {!started ? (
                <div className="mq-sc mq-sc-poster"><Gallery autoplay={false} /></div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={scene} className="mq-sc-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.15 : 0.25 }}>
                    {scene === 0 && <SceneTitle t={t} />}
                    {scene === 1 && <div className="mq-sc mq-sc-poster"><Gallery /></div>}
                    {scene === 2 && <SceneEditor t={t} />}
                    {scene === 3 && <SceneTest t={t} />}
                    {scene === 4 && <SceneResult />}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
            {started && <p className="mq-caption" aria-live="polite">{SCENES[scene].cap}</p>}
            {!started && (
              <button type="button" className="mq-bigplay" onClick={play} aria-label="Play the 45 second demo">
                <Play size={22} aria-hidden="true" /><span>Play demo · 0:45</span>
              </button>
            )}
          </div>
          <div className="mq-video-ctrl">
            <button type="button" className="mq-btn mq-btn-sm mq-vplay" onClick={() => (playing ? setPlaying(false) : play())} aria-label={playing ? 'Pause demo' : 'Play demo'}>
              {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            </button>
            <span className="mq-vbar" aria-hidden="true"><span style={{ transform: `scaleX(${t / LEN})` }} /></span>
            <span className="mq-vtime mq-num">{mss(t)} / 0:45</span>
          </div>
        </Reveal>
        <ul className="mq-caps3">
          <li>2 minutes to six ideas</li>
          <li>Your real face, cut out</li>
          <li>Tested on real views</li>
        </ul>
      </div>
    </section>
  )
}
