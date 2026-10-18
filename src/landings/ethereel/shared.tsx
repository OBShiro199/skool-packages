import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for in-place UI changes. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for lib/analytics.ts (PRD section 18). */
export function track(event: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[ethereel track]', event, props)
}

/** Smooth anchor scroll with the 56px nav offset. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 56
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Default reveal: fade in and rise 8px, 360ms, when 20% in view, once. */
export function Reveal({ children, delay = 0, className, as = 'div' }: {
  children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li'
}) {
  const reduce = useReducedMotion()
  const M = as === 'li' ? motion.li : motion.div
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.36, delay: Math.min(delay, 0.24), ease: EASE }}
    >
      {children}
    </M>
  )
}

/** Waveform mark plus the wordmark, Ethereel set in Geist with an italic serif "reel". */
export function Wordmark() {
  return (
    <span className="er-wordmark">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="0.5" y="0.5" width="19" height="19" fill="var(--accent-soft)" stroke="var(--accent-edge)" />
        {[4, 7, 10, 13, 16].map((x, i) => {
          const h = [5, 10, 13, 8, 4][i]
          return <line key={x} x1={x} x2={x} y1={10 - h / 2} y2={10 + h / 2} stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
        })}
      </svg>
      <span>Ethe<em>reel</em></span>
    </span>
  )
}

type BtnProps = {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'lg'
  onClick?: () => void; href?: string; full?: boolean; className?: string
}
export function Btn({ children, variant = 'primary', size = 'lg', onClick, href = '#pricing', full, className = '' }: BtnProps) {
  return (
    <a
      href={href}
      className={`er-btn er-btn-${variant} er-btn-${size}${full ? ' er-btn-full' : ''} ${className}`}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}
    >
      {children}
    </a>
  )
}

/** Primary CTA: "Start free trial", fires cta_click with its location. */
export function TrialBtn({ location, size = 'lg', full, label = 'Start free trial' }: {
  location: string; size?: 'sm' | 'lg'; full?: boolean; label?: string
}) {
  return (
    <Btn size={size} full={full} onClick={() => { track('cta_click', { location }); scrollToId('pricing') }}>
      {label}
    </Btn>
  )
}

export function Pill({ tone = 'accent', dot, children, className = '' }: {
  tone?: 'accent' | 'grey' | 'green' | 'violet'; dot?: boolean | 'live'; children: ReactNode; className?: string
}) {
  return (
    <span className={`er-pill er-pill-${tone} ${className}`}>
      {dot && <i className={`er-dot${dot === 'live' ? ' er-dot-live' : ''}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Section heading. `title` may contain an <em> rendered in Instrument Serif italic. */
export function SectionHead({ title, sub, center }: { title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={`er-head${center ? ' er-head-center' : ''}`}>
      <h2>{title}</h2>
      {sub && <p className="er-sub">{sub}</p>}
    </Reveal>
  )
}

/**
 * A looping clock in seconds that runs only while `playing`. Reduced motion pins it to `poster`.
 * Uses requestAnimationFrame and throttles React updates to ~20 fps.
 */
export function useClock(duration: number, playing: boolean, poster = 0, loop = true, respectReduce = true) {
  const reduce = !!useReducedMotion()
  const [t, setT] = useState(poster)
  const tRef = useRef(poster)
  const hold = reduce && respectReduce
  useEffect(() => {
    if (hold) { tRef.current = poster; setT(poster) }
  }, [hold, poster])
  useEffect(() => {
    if (!playing || hold) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      let next = tRef.current + dt
      if (next >= duration) next = loop ? next % duration : duration
      tRef.current = next
      acc += dt
      if (acc > 0.05) { acc = 0; setT(next) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, hold, duration, loop])
  const seek = (s: number) => { tRef.current = Math.max(0, Math.min(duration, s)); setT(tRef.current) }
  return { t, seek, reduce }
}

/** A step counter that advances every `ms` while in view. Reduced motion holds the last step. */
export function useLoopStep(count: number, ms: number, amount = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount })
  const reduce = !!useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [inView, reduce, count, ms])
  return { ref, step: reduce ? count - 1 : step, inView, reduce }
}

/** Counts from 0 to `to` over `ms` once in view. Reduced motion shows the final number. */
export function useCountUp(to: number, ms = 600) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = !!useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduce) { setN(to); return }
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduce, to, ms])
  return { ref, n }
}

export const mmss = (s: number) => {
  const v = Math.max(0, Math.floor(s))
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
}
