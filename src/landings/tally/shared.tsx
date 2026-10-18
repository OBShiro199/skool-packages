import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for size changes. Brief curve for tile loops. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const
export const LOOP = [0.2, 0.7, 0.1, 1] as const

/** Stand-in for the PostHog helper in the PRD (section 19). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[tally track]', name, props)
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

export function Reveal({
  children, delay = 0, className, as = 'div', scale = false,
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li'; scale?: boolean }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: scale ? 0.98 : 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** The tally mark: four teal strokes and one ink diagonal. */
export function TallyMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="tl-mark">
      {[4, 8, 12, 16].map((x) => <path key={x} d={`M${x} 3.5v15`} />)}
      <path d="M2 15.5L20 6.5" className="tl-mark-cross" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="tl-wordmark"><TallyMark /> Tally</span>
}

export function Button({
  children, variant = 'primary', size = 'md', onClick, href = '#pricing', ariaLabel,
}: {
  children: ReactNode; variant?: 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'
  onClick?: () => void; href?: string; ariaLabel?: string
}) {
  return (
    <a href={href} aria-label={ariaLabel} className={`tl-btn tl-btn-${variant} tl-btn-${size}`} onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}>
      {children}
    </a>
  )
}

export function TrialButton({ location, size = 'md' }: { location: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Button size={size} onClick={() => { track('lp_cta_clicked', { location }); scrollToId('pricing') }}>Start free trial</Button>
  )
}

/** Eyebrow pill with a ledger index ("05") in mono before it. */
export function Eyebrow({ children, n }: { children: ReactNode; n?: string }) {
  return (
    <span className="tl-eyebrow-row">
      {n && <span className="tl-index" aria-hidden="true">{n}</span>}
      <span className="tl-eyebrow"><i aria-hidden="true" />{children}</span>
    </span>
  )
}

export function SectionHead({ eyebrow, title, sub, center = false, id, n }: { eyebrow: string; title: ReactNode; sub?: string; center?: boolean; id?: string; n?: string }) {
  return (
    <Reveal className={`tl-head ${center ? 'tl-head-center' : ''}`}>
      <Eyebrow n={n}>{eyebrow}</Eyebrow>
      <h2 className="tl-h2" id={id}>{title}</h2>
      {sub && <p className="tl-sub">{sub}</p>}
    </Reveal>
  )
}

export type Status = 'Draft' | 'Scheduled' | 'Sent' | 'Viewed' | 'Part paid' | 'Paid' | 'Overdue'
export function StatusPill({ status }: { status: Status }) {
  return <span className={`tl-status is-${status.toLowerCase().replace(' ', '-')}`}><i aria-hidden="true" />{status}</span>
}

/** Corner crosshairs for the ledger grid. */
export function Crosshairs() {
  return <span className="tl-cross" aria-hidden="true"><i>+</i><i>+</i><i>+</i><i>+</i></span>
}

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
  return v
}

export const money = (n: number, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n)
