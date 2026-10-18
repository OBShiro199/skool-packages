import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Brief easing for small product motion, plus the Quiet Precision reveal and morph curves. */
export const EASE = [0.2, 0.7, 0.1, 1] as const
export const OUT = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the analytics helper (PRD section 17). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[retain track]', name, props)
}

/** Anchor scroll with the 72px nav offset. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Rise once, 360ms, once at 20% in view. Reduced motion renders the end state. */
export function Reveal({ children, delay = 0, className, id }: { children: ReactNode; delay?: number; className?: string; id?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className} id={id}>{children}</div>
  return (
    <motion.div
      className={className} id={id}
      initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.36, delay, ease: OUT }}
    >
      {children}
    </motion.div>
  )
}

/** Wordmark: "Retain" with a lilac dot. */
export function Wordmark() {
  return <span className="rt-wordmark"><i className="rt-mark" aria-hidden="true" />Retain</span>
}

type BtnProps = { children: ReactNode; href?: string; variant?: 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'; onClick?: () => void; full?: boolean }
export function Btn({ children, href = '#', variant = 'primary', size = 'md', onClick, full }: BtnProps) {
  return (
    <a
      href={href}
      className={`rt-btn rt-btn-${variant} rt-btn-${size}${full ? ' rt-btn-full' : ''}`}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}
    >
      {children}
    </a>
  )
}

export type Tone = 'accent' | 'high' | 'watch' | 'low' | 'grey'
export function Pill({ tone = 'accent', dot, children }: { tone?: Tone; dot?: boolean | 'live'; children: ReactNode }) {
  return (
    <span className={`rt-pill rt-pill-${tone}`}>
      {dot && <i className={`rt-dot${dot === 'live' ? ' rt-dot-live' : ''}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="rt-eyebrow">{children}</span>
}

export function SectionHead({ eyebrow, title, sub, center }: { eyebrow?: string; title: string; sub?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={`rt-head${center ? ' rt-head-center' : ''}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2>{title}</h2>
      {sub && <p className="rt-sub">{sub}</p>}
    </Reveal>
  )
}

/** Advances a step every `ms` while in view. Reduced motion holds `rest` (the finished state). */
export function useLoop(count: number, ms: number, rest = count - 1) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = !!useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [inView, reduce, count, ms])
  return { ref, step: reduce ? rest : step, reduce }
}

/** A small "Example data" caption so mock numbers never read as claims. */
export function Example() {
  return <span className="rt-example">Example data</span>
}
