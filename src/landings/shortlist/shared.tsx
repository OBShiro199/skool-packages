import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for size and position changes. Brief curve for tile loops. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const
export const LOOP = [0.2, 0.7, 0.1, 1] as const

/** Stand-in for the PostHog helper in the PRD (section 20). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[shortlist track]', name, props)
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

/** Reveal once at 20% visibility: 360ms, 6px rise (PRD 1.4). */
export function Reveal({
  children, delay = 0, className, as = 'div',
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.36, delay: Math.min(delay, 0.27), ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** The Shortlist mark: three index cards, the front one ticked. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="sl-mark">
      <rect x="6" y="2.5" width="13" height="9" rx="2" className="sl-mark-back" />
      <rect x="4.5" y="6" width="13" height="9" rx="2" className="sl-mark-mid" />
      <rect x="3" y="9.5" width="13" height="10" rx="2" className="sl-mark-front" />
      <path d="M6.4 14.6l2 2 4-4.2" className="sl-mark-tick" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="sl-wordmark"><Mark /> Shortlist</span>
}

export function Button({
  children, variant = 'primary', size = 'md', onClick, href = '#pricing', ariaLabel,
}: {
  children: ReactNode; variant?: 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'
  onClick?: () => void; href?: string; ariaLabel?: string
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={`sl-btn sl-btn-${variant} sl-btn-${size}`}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}
    >
      {children}
    </a>
  )
}

export function TrialButton({ location, size = 'md', plan, interval }: { location: string; size?: 'sm' | 'md' | 'lg'; plan?: string; interval?: string }) {
  return (
    <Button
      size={size}
      onClick={() => {
        track('cta_clicked', { location, plan, interval })
        if (location !== 'pricing') scrollToId('pricing')
      }}
    >
      Start free trial
    </Button>
  )
}

export function CareersButton({ location, size = 'md' }: { location: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Button variant="secondary" size={size} onClick={() => { track('demo_careers_clicked', { location }); scrollToId('demo') }}>
      See a live careers page
    </Button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="sl-eyebrow"><i aria-hidden="true" />{children}</span>
}

export function SectionHead({ eyebrow, title, sub, center = false, id }: { eyebrow?: string; title: ReactNode; sub?: string; center?: boolean; id?: string }) {
  return (
    <Reveal className={`sl-head ${center ? 'sl-head-center' : ''}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="sl-h2" id={id}>{title}</h2>
      {sub && <p className="sl-sub">{sub}</p>}
    </Reveal>
  )
}

export type Stage = 'Applied' | 'Screen' | 'Interview' | 'Offer' | 'Hired' | 'Rejected'
export function StagePill({ stage, count }: { stage: Stage; count?: number }) {
  return (
    <span className={`sl-stage is-${stage.toLowerCase()}`}>
      <i aria-hidden="true" />{stage}{count !== undefined && <b>{count}</b>}
    </span>
  )
}

export type Verdict = 'Meets' | 'Partly' | 'Not shown' | 'Unclear'
export function VerdictPill({ v }: { v: Verdict }) {
  return <span className={`sl-verdict is-${v.toLowerCase().replace(' ', '-')}`}><i aria-hidden="true" />{v}</span>
}

/** Cycles 0..count-1 while the element is on screen. Reduced motion pins the last step. */
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
