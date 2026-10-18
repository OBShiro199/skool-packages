import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for in-place UI changes. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the analytics helper in the PRD (section 18). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[outbounder track]', name, props)
}

/** Smooth anchor scroll with the 64px nav offset. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 64
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Section reveal: fade in and rise once when 20% is in view. Reduced motion: opacity only. */
export function Reveal({
  children, delay = 0, className, y = 16, scale,
}: { children: ReactNode; delay?: number; className?: string; y?: number; scale?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, scale: scale ? 0.98 : 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.15 : scale ? 0.5 : 0.36, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Paper-plane glyph of two triangles in the accent, plus the wordmark. */
export function Wordmark() {
  return (
    <span className="ob-wordmark">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M1.5 8.2 16.5 1.5 11 16.5 8.4 9.6Z" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M8.4 9.6 16.5 1.5" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      outbounder
    </span>
  )
}

type BtnProps = {
  children: ReactNode; href?: string; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'lg'
  onClick?: () => void; full?: boolean; ariaLabel?: string
}
export function Btn({ children, href = '#', variant = 'primary', size = 'lg', onClick, full, ariaLabel }: BtnProps) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={`ob-btn ob-btn-${variant} ob-btn-${size}${full ? ' ob-btn-full' : ''}`}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}
    >
      {children}
    </a>
  )
}

export function Pill({ tone = 'accent', dot, children, className = '' }: {
  tone?: 'accent' | 'grey' | 'amber' | 'coral' | 'green'; dot?: boolean | 'live'; children: ReactNode; className?: string
}) {
  return (
    <span className={`ob-pill ob-pill-${tone} ${className}`}>
      {dot && <i className={`ob-dot${dot === 'live' ? ' ob-dot-live' : ''}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function SectionHead({ title, sub, id, center }: { title: string; sub?: ReactNode; id?: string; center?: boolean }) {
  return (
    <Reveal className={`ob-head${center ? ' ob-head-center' : ''}`}>
      <h2 id={id}>{title}</h2>
      {sub && <p className="ob-sub">{sub}</p>}
    </Reveal>
  )
}

/** Types `text` at `speed` ms per character once `start` is true. Reduced motion shows it all. */
export function useTyping(text: string, start: boolean, speed = 40) {
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
  return { shown: text.slice(0, n), done: n >= text.length }
}

/** A step counter that advances every `ms` while in view. Reduced motion holds the last step. */
export function useLoopStep(count: number, ms: number, amount = 0.3) {
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

export const fmt = (n: number) => n.toLocaleString('en-US')
