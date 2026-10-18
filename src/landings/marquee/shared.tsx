import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'

/** Quiet Precision curves: out for reveals, morph for anything that changes size. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the PostHog helper in the PRD (section 19). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[marquee track]', name, props)
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Opacity 0 to 1 and rise 12px, 360ms, once, when 20% is in view. Reduced motion: 150ms fade only. */
export function Reveal({
  children, delay = 0, className, id,
}: { children: ReactNode; delay?: number; className?: string; id?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      id={id}
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : Math.min(delay, 0.48), ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Logo mark: a rounded rectangle with three dots on its top edge, like marquee bulbs. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1.5" y="5" width="17" height="12" rx="3" fill="var(--accent-soft)" stroke="var(--ink)" strokeWidth="1.4" />
      <circle cx="6" cy="5" r="2" fill="var(--accent)" stroke="#fff" strokeWidth="1" />
      <circle cx="10" cy="5" r="2" fill="var(--accent)" stroke="#fff" strokeWidth="1" />
      <circle cx="14" cy="5" r="2" fill="var(--accent)" stroke="#fff" strokeWidth="1" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="mq-wordmark"><Mark /> Marquee</span>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="mq-eyebrow">{children}</span>
}

export function TrialButton({ location, size = 'lg', plan, interval }: { location: string; size?: 'lg' | 'md' | 'sm'; plan?: string; interval?: string }) {
  const href = plan ? `/signup?plan=${plan}&interval=${interval ?? 'month'}` : '/signup'
  return (
    <a href={href} className={`mq-btn mq-btn-primary mq-btn-${size}`} onClick={(e) => { e.preventDefault(); track('cta_clicked', { location, plan, interval }) }}>
      Start free trial
    </a>
  )
}

export function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="mq-ticks">
      {items.map((t) => <li key={t}><Check size={14} strokeWidth={1.8} aria-hidden="true" />{t}</li>)}
    </ul>
  )
}

export function LiveDot() {
  return <span className="mq-dot" aria-hidden="true" />
}

export function VarTag({ v }: { v: 'A' | 'B' | 'C' }) {
  return <span className={`mq-var mq-var-${v.toLowerCase()}`}>{v}</span>
}

/** Advances a step every `ms` while in view. Reduced motion holds `final`. */
export function useLoop(count: number, ms: number, final = count - 1) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = !!useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [inView, reduce, count, ms])
  return { ref, step: reduce ? final : step, inView, reduce }
}

/** Counts from 0 to `to` over `ms` once `active`. Reduced motion jumps to the end. */
export function useCount(to: number, ms: number, active: boolean, delay = 0, decimals = 0) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) return
    if (reduce) { setV(to); return }
    let raf = 0
    const t0 = performance.now() + delay
    const f = Math.pow(10, decimals)
    const tick = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - t0) / ms))
      setV(Math.round(to * (1 - Math.pow(1 - p, 3)) * f) / f)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms, active, reduce, delay, decimals])
  return v
}
