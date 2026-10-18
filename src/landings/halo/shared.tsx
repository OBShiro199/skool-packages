import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for in-place changes. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

export const fmt = (n: number) => n.toLocaleString('en-US')

/** Stand-in for the analytics helper (PRD section 23). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[halo track]', name, props)
}

/** Anchor scroll with the 72px nav offset. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Fade up 12px over 360ms, once, at 20% visibility. Reduced motion: end state at once. */
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
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.36, delay, ease: EASE }}
    >
      {children}
    </M>
  )
}

/** Ring mark: a 20px ring with a small star cut into the top. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="hl-mark">
      <circle cx="10" cy="11" r="7.25" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      <path d="M10 0.9l1.25 2.55 2.8.4-2.03 1.98.48 2.8L10 7.3 7.5 8.63l.48-2.8L5.95 3.85l2.8-.4z" fill="var(--accent-ink)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="hl-wordmark"><Mark />Halo</span>
}

type BtnProps = {
  children: ReactNode; href?: string; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg'
  onClick?: () => void; full?: boolean
}
export function Btn({ children, href = '#', variant = 'primary', size = 'md', onClick, full }: BtnProps) {
  return (
    <a
      href={href}
      className={`hl-btn hl-btn-${variant} hl-btn-${size}${full ? ' hl-btn-full' : ''}`}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}
    >
      {children}
    </a>
  )
}

export type Tone = 'accent' | 'grey' | 'green' | 'blue' | 'amber' | 'coral'
export function Pill({ tone = 'accent', dot, children, className = '' }: {
  tone?: Tone; dot?: boolean | 'live'; children: ReactNode; className?: string
}) {
  return (
    <span className={`hl-pill hl-pill-${tone} ${className}`}>
      {dot && <i className={`hl-dot${dot === 'live' ? ' hl-dot-live' : ''}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="hl-eyebrow">{children}</span>
}

export function SectionHead({ eyebrow, title, sub, center }: {
  eyebrow?: string; title: string; sub?: ReactNode; center?: boolean
}) {
  return (
    <Reveal className={`hl-head${center ? ' hl-head-center' : ''}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2>{title}</h2>
      {sub && <p className="hl-sub">{sub}</p>}
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

export function Avatar({ name, tone = 0 }: { name: string; tone?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return <span className={`hl-avatar hl-avatar-${tone % 4}`} aria-hidden="true">{initials}</span>
}
