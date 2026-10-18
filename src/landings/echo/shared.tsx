import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'

/** Quiet Precision curves: out for reveals, morph for size changes. Brief curve for tile loops. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const
export const LOOP = [0.2, 0.7, 0.1, 1] as const

/** Stand-in for the PostHog helper in the PRD (section 21). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[echo track]', name, props)
}

export function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Anchor scroll with the 72px nav offset. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: prefersReduced() ? 'auto' : 'smooth' })
}

/** Fade and rise 12px once at 20% in view, 360ms. Reduced motion: 150ms fade only. */
export function Reveal({
  children, delay = 0, className, as = 'div', y = 12,
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li'; y?: number }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** The Echo mark: three rounded bars of rising height, like a small waveform. */
export function EchoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="ec-mark">
      <rect x="3" y="11" width="4" height="8" rx="2" />
      <rect x="9" y="7" width="4" height="12" rx="2" />
      <rect x="15" y="3" width="4" height="16" rx="2" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="ec-wordmark"><EchoMark /> Echo</span>
}

export function Button({
  children, variant = 'primary', size = 'md', onClick, href = '#pricing', ariaLabel, type,
}: {
  children: ReactNode; variant?: 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'
  onClick?: () => void; href?: string; ariaLabel?: string; type?: 'submit'
}) {
  const cls = `ec-btn ec-btn-${variant} ec-btn-${size}`
  if (type === 'submit') return <button type="submit" className={cls} aria-label={ariaLabel}>{children}</button>
  return (
    <a href={href} aria-label={ariaLabel} className={cls} onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}>
      {children}
    </a>
  )
}

/** Every "Start free trial" goes to /signup in the real app; on this example it lands on pricing. */
export function TrialButton({ location, size = 'md' }: { location: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Button size={size} onClick={() => { track('lp_cta_clicked', { location }); scrollToId('pricing') }}>
      Start free trial
    </Button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="ec-eyebrow"><i aria-hidden="true" />{children}</span>
}

export function SectionHead({ eyebrow, title, sub, center = false, id }: { eyebrow: string; title: ReactNode; sub?: string; center?: boolean; id?: string }) {
  return (
    <Reveal className={`ec-head ${center ? 'ec-head-center' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="ec-h2" id={id}>{title}</h2>
      {sub && <p className="ec-sub">{sub}</p>}
    </Reveal>
  )
}

export function Tick() {
  return <span className="ec-tick" aria-hidden="true"><Check size={11} strokeWidth={2.5} /></span>
}

export function Live() {
  return <span className="ec-live" aria-hidden="true" />
}

/** Deterministic waveform heights so every render matches. */
export function waveHeights(n: number, seed = 1) {
  return Array.from({ length: n }, (_, i) => 0.22 + Math.abs(Math.sin((i + seed) * 1.37) * Math.cos((i + seed) * 0.53)) * 0.78)
}

/** Bars that breathe while `live`; reduced motion holds them still. */
export function Waveform({ bars = 32, live = true, className = '', seed = 1 }: { bars?: number; live?: boolean; className?: string; seed?: number }) {
  return (
    <span className={`ec-wave ${live ? 'is-live' : ''} ${className}`} aria-hidden="true">
      {waveHeights(bars, seed).map((h, i) => <i key={i} style={{ '--h': h.toFixed(2), animationDelay: `${(i % 9) * 80}ms` } as CSSProperties} />)}
    </span>
  )
}

/** A step counter that advances every `ms` while in view. Reduced motion holds the last step. */
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

/** Counts from 0 to `to` once `active`, on the morph curve feel (ease out cubic). */
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

/** Shared sample: the nine chapters of a fictional interview episode. */
export const CHAPTERS: [string, string][] = [
  ['00:00', 'Cold open'],
  ['02:14', 'Why Priya left agency life'],
  ['08:40', 'The first ten customers'],
  ['15:05', 'Pricing by audio hour'],
  ['21:32', 'Saying no to a big client'],
  ['28:10', 'Hiring the first producer'],
  ['34:47', 'What the numbers hid'],
  ['41:20', 'Rapid fire'],
  ['46:02', 'Where to find Priya'],
]
