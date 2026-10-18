import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for size changes, the brief's curve for tile loops. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const
export const LOOP = [0.2, 0.7, 0.1, 1] as const

/** Stand-in for the PostHog helper in the PRD (section 19). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[dossier track]', name, props)
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

/** The folder mark: a square folder outline with one short tab filled in teal. */
export function FolderMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="ds-mark">
      <path d="M2.75 5.25h14.5v11.5H2.75z" className="ds-mark-body" />
      <path d="M2.75 2.75h6l1.5 2.5h-7.5z" className="ds-mark-tab" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="ds-wordmark"><FolderMark /> Dossier</span>
}

export function Button({
  children, variant = 'primary', size = 'md', onClick, href = '#pricing', ariaLabel,
}: {
  children: ReactNode; variant?: 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'
  onClick?: () => void; href?: string; ariaLabel?: string
}) {
  return (
    <a href={href} aria-label={ariaLabel} className={`ds-btn ds-btn-${variant} ds-btn-${size}`} onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}>
      {children}
    </a>
  )
}

export function TrialButton({ location, size = 'md', label = 'Start free trial' }: { location: string; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  return (
    <Button size={size} onClick={() => { track('lp_cta_clicked', { location }); scrollToId('pricing') }}>{label}</Button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="ds-eyebrow"><i aria-hidden="true" />{children}</span>
}

/**
 * Every section is a page of the dossier: a margin column on the left (clause number and a short note, like
 * marginalia on a printed brief) and the body on the right of a teal double rule.
 */
export function Page({
  id, clause, note, band = false, tint = false, children, labelledBy,
}: { id: string; clause: string; note: string; band?: boolean; tint?: boolean; children: ReactNode; labelledBy: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`ds-page ${band ? 'is-band' : ''} ${tint ? 'is-tint' : ''}`}>
      <aside className="ds-margin" aria-hidden="true">
        <span className="ds-clause">§ {clause}</span>
        <span className="ds-note">{note}</span>
      </aside>
      <div className="ds-body">{children}</div>
    </section>
  )
}

export function SectionHead({ eyebrow, title, sub, id, center = false }: { eyebrow: string; title: ReactNode; sub?: string; id: string; center?: boolean }) {
  return (
    <Reveal className={`ds-head ${center ? 'is-center' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="ds-h2" id={id}>{title}</h2>
      {sub && <p className="ds-sub">{sub}</p>}
    </Reveal>
  )
}

export type Band = 'High' | 'Medium' | 'Low'
export function ConfBadge({ band, score }: { band: Band; score: number }) {
  return <span className={`ds-conf is-${band.toLowerCase()}`}>{band} <b className="ds-num">{score}</b></span>
}

export type QState = 'Not drafted' | 'Drafting' | 'Drafted' | 'Needs review' | 'Approved'
export function StatePill({ state }: { state: QState }) {
  return <span className={`ds-state is-${state.toLowerCase().replace(' ', '-')}`}><i aria-hidden="true" />{state}</span>
}

export function Cite({ n, label, on = false }: { n: number; label: string; on?: boolean }) {
  return <span className={`ds-cite ${on ? 'is-on' : ''}`}><sup className="ds-num">{n}</sup>{label}</span>
}

/** A step counter that only runs while its region is on screen; reduced motion pins it to the last step. */
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

export function useCountUp(from: number, to: number, ms: number, active: boolean) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(from)
  useEffect(() => {
    if (!active) return
    if (reduce) { setV(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      setV(Math.round(from + (to - from) * e))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [from, to, ms, active, reduce])
  return reduce ? to : v
}
