import { motion, useReducedMotion } from 'motion/react'
import { MORPH, VarTag } from './shared'

export const ORDER: ('A' | 'B')[] = ['A', 'B', 'B', 'A', 'B', 'A', 'A', 'B']

/** One cell per day in the variant's fill, today with the accent edge and a 4px accent bar. */
export function ScheduleStrip({ today, label = true }: { today: number; label?: boolean }) {
  return (
    <div className="mq-strip">
      <div className="mq-strip-cells">
        {ORDER.map((v, i) => (
          <span key={i} className={`mq-cell mq-var-${v.toLowerCase()} ${i === today ? 'is-today' : ''} ${i > today ? 'is-future' : ''}`}>
            <span className="mq-cell-d">{i + 1}</span>{v}
          </span>
        ))}
      </div>
      {label && <p className="mq-strip-l mq-num">Day {today + 1} of 8 · {ORDER[today]} is live until midnight Pacific</p>}
    </div>
  )
}

/* Daily CTR per variant, drawn as two 1.5px lines in the variant inks. */
const A = [4.2, 4.7, 4.1, 4.5, 4.6, 4.2, 4.5, 4.4]
const B = [5.5, 6.1, 5.7, 6.2, 5.8, 6.1, 5.9, 5.9]
const toPath = (pts: number[], w: number, h: number) => pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1)) * w} ${h - ((v - 3) / 4.5) * h}`).join(' ')

export function CtrChart({ draw, w = 320, h = 120, delay = 0 }: { draw: boolean; w?: number; h?: number; delay?: number }) {
  const reduce = useReducedMotion()
  const line = (d: string, cls: string, extra: number) => (
    <motion.path d={d} className={cls} fill="none" strokeWidth="1.5"
      initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: draw || reduce ? 1 : 0 }}
      transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : delay + extra, ease: MORPH }} />
  )
  return (
    <div className="mq-chart">
      <div className="mq-chart-legend"><span><VarTag v="A" /> 4.4% CTR</span><span><VarTag v="B" /> 5.9% CTR</span></div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1={h - 0.5} x2={w} y2={h - 0.5} stroke="var(--hairline)" vectorEffect="non-scaling-stroke" />
        {line(toPath(A, w, h), 'mq-line-a', 0)}
        {line(toPath(B, w, h), 'mq-line-b', 0.15)}
      </svg>
    </div>
  )
}
