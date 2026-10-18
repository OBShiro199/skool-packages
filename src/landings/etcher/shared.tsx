import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight, Check } from 'lucide-react'

/** Quiet Precision curves: out for reveals, morph for UI changes. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the analytics helper in the PRD (section 16). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[etcher track]', name, props)
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Opacity 0 to 1 and rise 8px, 360ms, once, when 20% is in view. */
export function Reveal({
  children, delay = 0, className, as = 'div',
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0 : 0.36, delay: reduce ? 0 : Math.min(delay, 0.24), ease: EASE }}
    >
      {children}
    </Tag>
  )
}

export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg className="et-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="0.5" y="0.5" width="23" height="23" rx="6" fill="var(--accent-soft)" stroke="var(--accent-edge)" />
      <path d="M7 7.5h10M7 12h7M7 16.5h10" stroke="var(--accent-ink)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="et-wordmark"><Mark /> Etcher</span>
  )
}

export function TrialButton({ location, size = 'lg', label = 'Start free trial', plan }: { location: string; size?: 'lg' | 'md' | 'sm'; label?: string; plan?: string }) {
  return (
    <a
      href={plan ? `/signup?plan=${plan}` : '/signup'}
      className={`et-btn et-btn-primary et-btn-${size}`}
      onClick={(e) => { e.preventDefault(); track('cta_click', { location }); scrollToId('pricing') }}
    >
      {label} <ArrowRight size={size === 'sm' ? 14 : 16} className="et-btn-arrow" aria-hidden="true" />
    </a>
  )
}

export function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="et-ticks">
      {items.map((t) => (
        <li key={t}><span className="et-tick" aria-hidden="true"><Check size={12} strokeWidth={2.4} /></span>{t}</li>
      ))}
    </ul>
  )
}

export function LiveDot({ tone = 'accent' }: { tone?: 'accent' | 'danger' | 'ghost' }) {
  return <span className={`et-dot et-dot-${tone}`} aria-hidden="true" />
}

/** Counts from `from` to `to` over `ms`. Reduced motion jumps to the end. */
export function useCount(to: number, ms: number, active: boolean, from = 0) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(from)
  const last = useRef(from)
  useEffect(() => {
    if (!active) return
    if (reduce) { setV(to); last.current = to; return }
    const start = last.current
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const val = Math.round(start + (to - start) * (1 - Math.pow(1 - p, 3)))
      setV(val)
      last.current = val
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms, active, reduce])
  return v
}

/** Advances a step every `ms` while the element is in view. Reduced motion holds `final`. */
export function useLoop(count: number, ms: number, final = count - 1) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const reduce = !!useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [inView, reduce, count, ms])
  return { ref, step: reduce ? final : step, inView, reduce }
}

/** A seconds timer that ticks once a second while `running`. */
export function useTimer(start: number, running: boolean) {
  const [s, setS] = useState(start)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setS((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])
  return [s, setS] as const
}

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
export const usd = (n: number) => `$${n.toLocaleString('en-US')}`
export const usdK = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)
