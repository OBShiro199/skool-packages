import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { AuditButton, EASE, ENGINES, EngineMark, Eyebrow, Reveal, TrialButton, useCountUp, type EngineId } from './shared'

/** Eight weekly points per engine, 0 to 100. "All engines" is the weighted line in violet. */
const SERIES: { id: EngineId | 'all'; pts: number[] }[] = [
  { id: 'chatgpt', pts: [22, 24, 23, 27, 29, 31, 33, 36] },
  { id: 'perplexity', pts: [30, 33, 31, 35, 38, 37, 41, 44] },
  { id: 'gemini', pts: [18, 17, 20, 22, 21, 25, 27, 29] },
  { id: 'claude', pts: [26, 25, 28, 27, 30, 33, 32, 35] },
  { id: 'deepseek', pts: [12, 14, 13, 16, 18, 17, 20, 22] },
  { id: 'grok', pts: [8, 10, 9, 12, 11, 14, 15, 17] },
  { id: 'all', pts: [21, 23, 22, 25, 27, 28, 31, 34.2] },
]

const W = 520
const H = 150
const toPath = (pts: number[]) =>
  pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (pts.length - 1)) * W).toFixed(1)},${(H - (v / 50) * H).toFixed(1)}`).join(' ')

function VisibilityChart() {
  return (
    <svg className="fc-linechart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Visibility over eight weeks for six engines. All engines rose from 21 to 34.2.">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="0" x2={W} y1={(i * H) / 4} y2={(i * H) / 4} className="fc-gridline" />
      ))}
      {SERIES.map((s) => (
        <path key={s.id} d={toPath(s.pts)} className={`fc-line fc-line-${s.id}`} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

const CARDS: [string, string, string, boolean][] = [
  ['Visibility', '34.2', '+3.1', true],
  ['Share of voice', '28%', '+4%', true],
  ['Avg position', '2.6', '-0.4', true],
  ['Mention rate', '44%', '+6%', true],
]

function Dashboard() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduce = useReducedMotion()
  const score = useCountUp(34.2, 500, inView, 1)
  const rise = (delay: number) => (reduce ? {} : {
    initial: { opacity: 0, y: 8 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    transition: { duration: 0.32, delay, ease: EASE },
  })
  return (
    <div className="fc-hero-visual" ref={ref}>
      <motion.div className="fc-frame fc-dash" {...(reduce ? {} : { initial: { opacity: 0 }, animate: inView ? { opacity: 1 } : {}, transition: { duration: 0.32, ease: EASE } })}
        role="img" aria-label="Factorie overview: visibility 34.2, share of voice 28%, average position 2.6, mention rate 44%, with a visibility chart for six engines.">
        <div className="fc-dash-bar">
          <span className="fc-dash-crumb">Acme Analytics <b>/</b> Overview</span>
          <span className="fc-runchip"><i className="fc-live" aria-hidden="true" /><span className="fc-mono">Last check 3h ago</span></span>
        </div>
        <div className="fc-dash-cards">
          {CARDS.map(([l, v, d]) => (
            <div key={l} className="fc-score">
              <span className="fc-score-label fc-mono">{l}</span>
              <span className="fc-score-value">{v}</span>
              <span className="fc-delta is-up fc-mono">{d}</span>
            </div>
          ))}
        </div>
        <div className="fc-dash-chart">
          <div className="fc-dash-chart-head">
            <span className="fc-mono fc-label">Visibility · 8 weeks</span>
            <span className="fc-legend">
              {ENGINES.map((e) => <EngineMark key={e.id} id={e.id} />)}
              <span className="fc-legend-all fc-mono">All</span>
            </span>
          </div>
          <VisibilityChart />
          <div className="fc-axis fc-mono" aria-hidden="true"><span>Aug 24</span><span>Sep 21</span><span>Oct 12</span></div>
        </div>
      </motion.div>

      <motion.div className="fc-float fc-float-score" {...rise(0.24)} aria-label="Visibility 34.2, up 3.1 versus last week">
        <span className="fc-score-label fc-mono">Visibility</span>
        <span className="fc-float-value"><span className="fc-num fc-slot">{score.toFixed(1)}</span></span>
        <span className="fc-delta is-up fc-mono"><ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />+3.1 vs last week</span>
      </motion.div>

      <motion.div className="fc-float fc-float-answer" {...rise(0.12)}>
        <span className="fc-float-label fc-mono"><EngineMark id="chatgpt" /> ChatGPT · position 2</span>
        <ol className="fc-answer-list">
          <li>1. <mark className="fc-hl-comp">Profound</mark> ...</li>
          <li>2. <mark className="fc-hl-you" aria-label="Your brand, position 2">Factorie</mark> ...</li>
          <li>3. <mark className="fc-hl-comp">Otterly</mark> ...</li>
        </ol>
      </motion.div>
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const item = (i: number) => (reduce ? {} : {
    initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, delay: i * 0.04, ease: EASE },
  })
  return (
    <header className="fc-hero" id="top">
      <div className="fc-dots" aria-hidden="true" />
      <div className="fc-container fc-hero-grid">
        <div className="fc-hero-copy">
          <motion.div {...item(0)}><Eyebrow live>AI visibility tracking for ChatGPT, Perplexity, Gemini, Claude and more</Eyebrow></motion.div>
          <motion.h1 className="fc-display" {...item(1)}>See where AI recommends you. And who it recommends instead.</motion.h1>
          <motion.p className="fc-lead" {...item(2)}>
            Factorie asks ChatGPT, Perplexity, Gemini, Claude, DeepSeek and Grok the questions your buyers ask, every week. You see your
            visibility score, your rank in every answer, the sources they cite and the pages to write next.
          </motion.p>
          <motion.div className="fc-ctas" {...item(3)}>
            <TrialButton location="hero" />
            <AuditButton location="hero" />
          </motion.div>
          <motion.p className="fc-micro fc-mono" {...item(4)}>7-day free trial · Set up in 10 minutes · Cancel in two clicks</motion.p>
        </div>
        <Dashboard />
      </div>
    </header>
  )
}

export function LogoStrip() {
  return (
    <section className="fc-strip" aria-label="Engines tracked">
      <div className="fc-container">
        <p className="fc-strip-line">Track your brand across the engines your buyers use</p>
        <ul className="fc-strip-row">
          {ENGINES.map((e, i) => (
            <Reveal as="li" key={e.id} delay={i * 0.04} y={0} className="fc-strip-item">
              <EngineMark id={e.id} size={24} />
              <span>{e.name}</span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
