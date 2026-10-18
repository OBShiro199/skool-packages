import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for things that change size or value. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Tiny analytics helper (DataFast/PostHog in a real build). Here it only emits a DOM event. */
export function track(name: string, props: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent('bw-track', { detail: { name, ...props } }))
}

/** Fade and rise once when 20% of the element is in view. */
export function Reveal({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'article' }) {
  const reduce = useReducedMotion()
  const Comp = as === 'li' ? motion.li : as === 'article' ? motion.article : motion.div
  return (
    <Comp
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.01 : 0.36, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </Comp>
  )
}

/** Runs a step counter while the element is in view. Stops (and stays at `rest`) with reduced motion. */
export function useLoop(steps: number, ms: number, rest = steps - 1) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (reduce || !inView) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % steps), ms)
    return () => window.clearInterval(id)
  }, [reduce, inView, steps, ms])
  return { ref, step: reduce ? rest : step, reduce: !!reduce, inView }
}

/** Counts up from 0 to `to` over `ms` once in view. */
export function CountUp({ to, ms = 900, prefix = '', format = (n: number) => n.toLocaleString('en-US') }: { to: number; ms?: number; prefix?: string; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduce) { setN(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduce, to, ms])
  return <span ref={ref} className="bw-num">{prefix}{format(n)}</span>
}

/** Smooth in-page anchor jump that respects reduced motion and the sticky nav. */
export function jumpTo(e: MouseEvent, id: string) {
  const el = document.getElementById(id)
  if (!el) return
  e.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** In the example site, signup is not wired: show a small note instead of leaving the page. */
export function ctaClick(e: MouseEvent, location: string) {
  e.preventDefault()
  track('cta_click', { location })
  window.dispatchEvent(new CustomEvent('bw-toast', { detail: 'Example site: in your build this goes to /signup.' }))
}

export function TrialButton({ location, size = 'lg', className = '' }: { location: string; size?: 'sm' | 'lg'; className?: string }) {
  return (
    <a href="/signup" className={`bw-btn bw-btn-primary bw-btn-${size} ${className}`} onClick={(e) => ctaClick(e, location)}>
      Start free trial
    </a>
  )
}

export function Wordmark() {
  return (
    <span className="bw-wordmark">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="5" fill="#FBEBD2" stroke="#C7801A" strokeWidth="1.8" />
        <path d="M8 3v4M16 3v4" stroke="#C7801A" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 13.5l2.4 2.4 4.6-4.8" stroke="#9A5C0A" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Bookwell
    </span>
  )
}

export function SectionHead({ eyebrow, title, sub, center = false }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={`bw-head${center ? ' bw-center' : ''}`}>
      {eyebrow && <span className="bw-eyebrow"><i />{eyebrow}</span>}
      <h2>{title}</h2>
      {sub && <p className="bw-sub">{sub}</p>}
    </Reveal>
  )
}
