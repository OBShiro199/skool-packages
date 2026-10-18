import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for size changes. Brief curve for tile loops. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const
export const LOOP = [0.2, 0.7, 0.1, 1] as const

/** Stand-in for the PostHog or DataFast helper in the PRD (section 19). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[rota track]', name, props)
}

export function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: prefersReduced() ? 'auto' : 'smooth' })
}

/** Reveal once at 20% visibility: rise 12px over 480ms (PRD 1.4). */
export function Reveal({
  children, delay = 0, className, as = 'div',
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'article' }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : as === 'article' ? motion.article : motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.48, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** The Rota glyph: a small teal square split like one week of shifts. */
export function Glyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="rt-glyph">
      <rect x="1" y="1" width="14" height="14" rx="1" />
      <path d="M1 6h14M6 6v9M11 6v9" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="rt-wordmark"><Glyph /> Rota</span>
}

export function Button({
  children, variant = 'primary', size = 'md', onClick, href = '#pricing', ariaLabel,
}: {
  children: ReactNode; variant?: 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'
  onClick?: () => void; href?: string; ariaLabel?: string
}) {
  return (
    <a href={href} aria-label={ariaLabel} className={`rt-btn rt-btn-${variant} rt-btn-${size}`} onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}>
      {children}
    </a>
  )
}

export function TrialButton({ location, size = 'md' }: { location: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Button size={size} onClick={() => { track('lp_cta_clicked', { location }); scrollToId('pricing') }}>Start free trial</Button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="rt-eyebrow"><i aria-hidden="true" />{children}</span>
}

export function SectionHead({ eyebrow, title, sub, center = false, id }: { eyebrow?: string; title: ReactNode; sub?: string; center?: boolean; id?: string }) {
  return (
    <Reveal className={`rt-head ${center ? 'rt-head-center' : ''}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="rt-h2" id={id}>{title}</h2>
      {sub && <p className="rt-sub">{sub}</p>}
    </Reveal>
  )
}

export type Role = 'barista' | 'kitchen' | 'floor' | 'bar' | 'desk' | 'stylist' | 'coach'
export function Chip({ role, children, ghost = false, open = false, conflict }: { role: Role; children: ReactNode; ghost?: boolean; open?: boolean; conflict?: 'block' | 'warn' }) {
  return (
    <span className={`rt-chip is-${role} ${ghost ? 'is-ghost' : ''} ${open ? 'is-open' : ''} ${conflict ? `is-${conflict}` : ''}`}>{children}</span>
  )
}

/** Cycles 0..count-1 while on screen. Reduced motion pins the last step. */
export function useLoopStep(count: number, ms: number) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [inView, reduce, count, ms])
  return { ref, step: reduce ? count - 1 : step, inView, reduce: !!reduce }
}

export function useCountUp(to: number, ms: number, active: boolean) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) return
    if (reduce) { setV(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms, active, reduce])
  return reduce ? to : v
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
