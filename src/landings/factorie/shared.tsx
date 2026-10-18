import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for anything that changes size. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the analytics helper in the PRD (section 18). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[factorie track]', name, props)
}

export function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Anchor scroll with the 72px nav offset; instant under reduced motion. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: prefersReduced() ? 'auto' : 'smooth' })
}

/** Fade and rise 8px once, 320ms, when 20% is in view. Reduced motion shows the end state. */
export function Reveal({
  children, delay = 0, className, as = 'div', y = 8,
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li'; y?: number }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  if (reduce) return as === 'li' ? <li className={className}>{children}</li> : <div className={className}>{children}</div>
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.32, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** Logo glyph: three rising bars, the tallest topped with a dot. */
export function Glyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className="fc-glyph">
      <rect x="2" y="10" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.55" />
      <rect x="7.5" y="7" width="3" height="9" rx="0.5" fill="currentColor" opacity="0.78" />
      <rect x="13" y="5" width="3" height="11" rx="0.5" fill="currentColor" />
      <circle cx="14.5" cy="2.2" r="1.5" fill="var(--cyan)" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="fc-wordmark"><Glyph /> Factorie</span>
}

export function Button({
  children, variant = 'primary', size = 'lg', onClick, href = '#pricing', ariaLabel, full = false,
}: {
  children: ReactNode; variant?: 'primary' | 'secondary'; size?: 'sm' | 'lg'
  onClick?: () => void; href?: string; ariaLabel?: string; full?: boolean
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={`fc-btn fc-btn-${variant} fc-btn-${size} ${full ? 'fc-btn-full' : ''}`}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}
    >
      {children}
    </a>
  )
}

/** "Start free trial" goes to /signup in the real app; in this preview it scrolls to pricing. */
export function TrialButton({ location, size = 'lg', full = false }: { location: string; size?: 'sm' | 'lg'; full?: boolean }) {
  return (
    <Button size={size} full={full} href="/signup" onClick={() => { track('lp_cta_click', { location, cta: 'trial' }); scrollToId('pricing') }}>
      Start free trial
    </Button>
  )
}

export function AuditButton({ location, label = 'Get a free AI visibility audit' }: { location: string; label?: string }) {
  return (
    <Button variant="secondary" href="/audit" onClick={() => track('lp_cta_click', { location, cta: 'audit' })}>
      {label}
    </Button>
  )
}

export function Eyebrow({ children, live = false }: { children: ReactNode; live?: boolean }) {
  return <span className="fc-eyebrow">{live && <i className="fc-live" aria-hidden="true" />}{children}</span>
}

export function SectionHead({ eyebrow, title, sub, center = false }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <Reveal className={`fc-head ${center ? 'fc-head-center' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="fc-h2">{title}</h2>
      {sub && <p className="fc-sub">{sub}</p>}
    </Reveal>
  )
}

export type EngineId = 'chatgpt' | 'perplexity' | 'gemini' | 'claude' | 'deepseek' | 'grok'
export const ENGINES: { id: EngineId; name: string; mark: string }[] = [
  { id: 'chatgpt', name: 'ChatGPT', mark: 'C' },
  { id: 'perplexity', name: 'Perplexity', mark: 'P' },
  { id: 'gemini', name: 'Gemini', mark: 'G' },
  { id: 'claude', name: 'Claude', mark: 'Cl' },
  { id: 'deepseek', name: 'DeepSeek', mark: 'D' },
  { id: 'grok', name: 'Grok', mark: 'X' },
]

/** Letter mark in a circle with the engine's series colour as the edge. No company logos. */
export function EngineMark({ id, size = 16 }: { id: EngineId; size?: number }) {
  const e = ENGINES.find((x) => x.id === id)!
  return (
    <span className={`fc-mark fc-mark-${id}`} style={{ width: size, height: size, fontSize: size <= 16 ? 8 : 11 }} aria-hidden="true">
      {e.mark}
    </span>
  )
}

/** A step counter that advances every `ms` while in view. Reduced motion holds the last step. */
export function useLoopStep(count: number, ms: number, amount = 0.35) {
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

/** Counts from 0 to `to` once `active`. Reduced motion shows the final number. */
export function useCountUp(to: number, ms: number, active: boolean, decimals = 0) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) return
    if (reduce) { setV(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const f = 10 ** decimals
      setV(Math.round(to * (1 - Math.pow(1 - p, 3)) * f) / f)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms, active, reduce, decimals])
  return v
}
