import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'

/** Quiet Precision curves: out for reveals, morph for anything that changes size. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the PostHog helper in the PRD (section 19). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[sparring track]', name, props)
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
  children, delay = 0, className, as = 'div', id,
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li'; id?: string }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      id={id}
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : Math.min(delay, 0.48), ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** Two interlocking rounded squares: corner blue and an ink edge. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="sp-mark">
      <rect x="1" y="1" width="12" height="12" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.4" />
      <rect x="7" y="7" width="12" height="12" rx="3" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="sp-wordmark"><Mark /> Sparring</span>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="sp-eyebrow">{children}</span>
}

export function TrialButton({ location, size = 'lg', plan, interval }: { location: string; size?: 'lg' | 'md' | 'sm'; plan?: string; interval?: string }) {
  const href = plan ? `/signup?plan=${plan}&interval=${interval ?? 'month'}` : '/signup'
  return (
    <a href={href} className={`sp-btn sp-btn-primary sp-btn-${size}`} onClick={(e) => { e.preventDefault(); track('lp_cta_clicked', { location }) }}>
      Start free trial
    </a>
  )
}

export function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="sp-ticks">
      {items.map((t) => (
        <li key={t}><Check size={14} strokeWidth={1.8} aria-hidden="true" />{t}</li>
      ))}
    </ul>
  )
}

export function LiveDot() {
  return <span className="sp-dot" aria-hidden="true" />
}

export type Hue = 'violet' | 'green' | 'rose' | 'amber' | 'blue'
export function Avatar({ initials, hue, size = 32 }: { initials: string; hue: Hue; size?: number }) {
  return <span className={`sp-avatar sp-hue-${hue}`} style={{ width: size, height: size, fontSize: size >= 40 ? 14 : 12 }} aria-hidden="true">{initials}</span>
}

export type Band = 'strong' | 'solid' | 'weak'
export const band = (score: number, max = 100): Band => {
  const pct = (score / max) * 100
  return pct >= 75 ? 'strong' : pct >= 50 ? 'solid' : 'weak'
}
export const BAND_LABEL: Record<Band, string> = { strong: 'Strong', solid: 'Solid', weak: 'Needs work' }
export function BandTag({ b }: { b: Band }) {
  return <span className={`sp-tag sp-tag-${b}`}>{BAND_LABEL[b]}</span>
}

/** The call that runs through the page: Margaret Okafor, Cold call, Normal, 72 / 100. */
export const RUBRIC: { label: string; score: number; reason: string }[] = [
  { label: 'Opener', score: 16, reason: 'Named yourself and the reason in one breath.' },
  { label: 'Permission', score: 14, reason: 'Honest about the cold call; asked for 30 seconds.' },
  { label: 'Pain discovery', score: 11, reason: 'Pitched before you found a pain she would admit.' },
  { label: 'Objection handling', score: 13, reason: 'Acknowledged "we use spreadsheets", then rushed.' },
  { label: 'Next step', score: 18, reason: 'Asked for a time, not "a quick chat".' },
]

/** Counts from 0 to `to` over `ms` once `active`. Reduced motion jumps to the end. */
export function useCount(to: number, ms: number, active: boolean, delay = 0) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) return
    if (reduce) { setV(to); return }
    let raf = 0
    const t0 = performance.now() + delay
    const tick = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - t0) / ms))
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms, active, reduce, delay])
  return v
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

export const mss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Deterministic waveform bars (no randomness between renders). */
export function waveform(n: number, seed = 7) {
  const out: number[] = []
  let x = seed
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280
    const r = x / 233280
    const env = 0.45 + 0.55 * Math.abs(Math.sin(i / 6.5)) * (0.6 + 0.4 * Math.sin(i / 23))
    out.push(Math.max(0.12, Math.min(1, env * (0.55 + r * 0.6))))
  }
  return out
}
