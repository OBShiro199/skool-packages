import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for in-place changes. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

export const fmt = (n: number) => n.toLocaleString('en-US')

/** Stand-in for the analytics helper (PRD section 23). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[harvest track]', name, props)
}

/** Anchor scroll that clears the sticky nav (scroll-margin 80px). */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Fade up 12px over 480ms, once, at 15% visibility. Reduced motion: end state at once. */
export function Reveal({ children, delay = 0, className, as = 'div' }: {
  children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li'
}) {
  const reduce = useReducedMotion()
  const M = as === 'li' ? motion.li : motion.div
  if (reduce) return as === 'li' ? <li className={className}>{children}</li> : <div className={className}>{children}</div>
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.48, delay, ease: EASE }}
    >
      {children}
    </M>
  )
}

/** Brand mark: a square with three rising strokes (a row of crops, a bar chart). */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="hv-mark">
      <rect x="0.5" y="0.5" width="19" height="19" rx="5.5" fill="#fff" stroke="var(--accent)" />
      <path d="M6.5 14V11M10 14V8.5M13.5 14V6" stroke="var(--accent-ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="hv-wordmark"><Mark />Harvest</span>
}

type BtnProps = {
  children: ReactNode; href?: string; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg'
  onClick?: () => void; full?: boolean
}
export function Btn({ children, href = '#', variant = 'primary', size = 'md', onClick, full }: BtnProps) {
  return (
    <a
      href={href}
      className={`hv-btn hv-btn-${variant} hv-btn-${size}${full ? ' hv-btn-full' : ''}`}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}
    >
      {children}
    </a>
  )
}

export type Tone = 'accent' | 'hot' | 'warm' | 'cold' | 'green' | 'violet' | 'sky' | 'amber'
export function Pill({ tone = 'accent', dot, children, className = '' }: {
  tone?: Tone; dot?: boolean | 'live'; children: ReactNode; className?: string
}) {
  return (
    <span className={`hv-pill hv-pill-${tone} ${className}`}>
      {dot && <i className={`hv-dot${dot === 'live' ? ' hv-dot-live' : ''}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="hv-eyebrow">{children}</span>
}

export function SectionHead({ eyebrow, title, sub, center }: {
  eyebrow?: string; title: string; sub?: ReactNode; center?: boolean
}) {
  return (
    <Reveal className={`hv-head${center ? ' hv-head-center' : ''}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2>{title}</h2>
      {sub && <p className="hv-sub">{sub}</p>}
    </Reveal>
  )
}

/** Advances a step every `ms` while in view. Reduced motion holds the final step. */
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

/** Counts from 0 to `to` over `ms` once `start` is true. Reduced motion shows the end value. */
export function useCountUp(to: number, start: boolean, ms = 600) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!start) return
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
  }, [to, start, ms, reduce])
  return reduce ? to : v
}

/** Types `text` once `start` is true. Reduced motion shows it all. */
export function useTyping(text: string, start: boolean, speed = 28) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!start) { setN(0); return }
    if (reduce) { setN(text.length); return }
    setN(0)
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setN(i)
      if (i >= text.length) window.clearInterval(id)
    }, speed)
    return () => window.clearInterval(id)
  }, [text, start, reduce, speed])
  return reduce ? text : text.slice(0, n)
}

export type Lead = {
  name: string; title: string; company: string; size: string; tier: 'Hot' | 'Warm'; score: number; engaged: string
}
export const LEADS: Lead[] = [
  { name: 'Sam Lee', title: 'Head of Customer Success', company: 'Northbeam', size: '51 to 200', tier: 'Hot', score: 86, engaged: "Commented on Priya Shah's post" },
  { name: 'Dana Okafor', title: 'VP Revenue', company: 'Fieldline', size: '201 to 500', tier: 'Hot', score: 82, engaged: 'Reacted to your post' },
  { name: 'Marco Ruiz', title: 'Founder', company: 'Tallyhouse', size: '11 to 50', tier: 'Warm', score: 74, engaged: 'Commented on your post' },
  { name: 'Aisha Grant', title: 'Director of Operations', company: 'Kettle & Co', size: '51 to 200', tier: 'Warm', score: 69, engaged: "Reacted to Jon Pace's post" },
  { name: 'Lena Fischer', title: 'Head of Growth', company: 'Quayside', size: '11 to 50', tier: 'Warm', score: 63, engaged: 'Commented on your post' },
]

export function TierPill({ tier }: { tier: 'Hot' | 'Warm' | 'Cold' }) {
  return <Pill tone={tier === 'Hot' ? 'hot' : tier === 'Warm' ? 'warm' : 'cold'} className="hv-tier">{tier}</Pill>
}

export function Avatar({ name, tone = 0 }: { name: string; tone?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return <span className={`hv-avatar hv-avatar-${tone % 4}`} aria-hidden="true">{initials}</span>
}
