import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'

/** Quiet Precision curves: out for reveals, morph for anything that changes size. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the PostHog helper in the PRD (section 19). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[signet track]', name, props)
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

/** Fade and rise 12px once, 360ms, when 20% is in view. Reduced motion: 150ms fade only. */
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

/** The seal mark: a violet wax seal with a small waveform pressed into it. */
export function SealMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="sg-seal">
      <path
        d="M12 1.6l2.1 1.5 2.6-.2 1.1 2.3 2.3 1.1-.2 2.6 1.5 2.1-1.5 2.1.2 2.6-2.3 1.1-1.1 2.3-2.6-.2L12 22.4l-2.1-1.5-2.6.2-1.1-2.3-2.3-1.1.2-2.6L2.6 13l1.5-2.1-.2-2.6 2.3-1.1 1.1-2.3 2.6.2z"
        fill="#f4f2fd" stroke="#7f72d9" strokeWidth="1.3" strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="6.2" fill="none" stroke="#7f72d9" strokeWidth="1" opacity="0.55" />
      <path d="M8.2 12h.9M10 10.4v3.2M12 9v6M14 10.4v3.2M15.8 12h-.9" stroke="#5446b8" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="sg-wordmark"><SealMark /> Signet</span>
  )
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
      className={`sg-btn sg-btn-${variant} sg-btn-${size}`}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick() } }}
    >
      {children}
    </a>
  )
}

/** Every "Start free trial" goes to /signup in the real app; here it lands on pricing. */
export function TrialButton({ location, size = 'md', plan }: { location: string; size?: 'sm' | 'md' | 'lg'; plan?: string }) {
  return (
    <Button
      size={size}
      onClick={() => {
        track('lp_cta_clicked', { location })
        // In the real app this goes to /signup?plan=<plan>&interval=<interval>.
        if (!plan) scrollToId('pricing')
      }}
      href="#pricing"
    >
      Start free trial
    </Button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="sg-eyebrow">{children}</span>
}

export function SectionHead({ eyebrow, title, sub, center = false }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <Reveal className={`sg-head ${center ? 'sg-head-center' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="sg-h2">{title}</h2>
      {sub && <p className="sg-sub">{sub}</p>}
    </Reveal>
  )
}

type Status = 'Draft' | 'Sent' | 'Viewed' | 'Signed' | 'Paid'
export function StatusPill({ status, dim = false }: { status: Status; dim?: boolean }) {
  return (
    <span className={`sg-status sg-status-${status.toLowerCase()} ${dim ? 'is-dim' : ''}`}>
      <i aria-hidden="true" />{status}
    </span>
  )
}

/**
 * A hand-signed "Jane Cole". Draws on with stroke-dashoffset when `play` is true.
 * Reduced motion shows the finished signature.
 */
export const SIGNATURE_PATHS = [
  // J
  'M18 10 C 26 8, 34 8, 40 9 M31 9 C 32 22, 31 36, 26 44 C 22 50, 13 50, 10 44 C 8 39, 13 36, 18 38',
  // ane
  'M44 32 C 40 28, 33 30, 33 36 C 33 41, 40 41, 44 33 C 44 38, 45 41, 49 40 C 52 38, 53 33, 55 31 C 56 35, 55 39, 56 41 C 58 34, 62 30, 65 32 C 67 35, 65 40, 68 41 C 72 41, 75 37, 77 34 C 79 31, 75 29, 73 33 C 71 38, 75 42, 80 40 C 83 39, 85 37, 87 35',
  // Cole
  'M108 18 C 100 12, 88 16, 87 28 C 86 39, 96 44, 106 38 M111 31 C 106 30, 104 37, 108 40 C 112 42, 116 36, 113 32 C 116 33, 119 32, 121 30 C 124 22, 128 12, 126 10 C 122 10, 120 26, 121 36 C 122 41, 126 41, 129 37 C 131 35, 132 34, 134 34 C 139 34, 140 29, 136 29 C 132 30, 131 39, 136 41 C 141 42, 146 38, 150 35',
  // underline flourish
  'M14 52 C 50 47, 100 46, 152 44',
]

export function Signature({ play, className = '', delay = 0, label = 'Signature: Jane Cole' }: { play: boolean; className?: string; delay?: number; label?: string }) {
  const reduce = useReducedMotion()
  const starts = [0, 0.45, 1.05, 1.7]
  const durs = [0.45, 0.6, 0.65, 0.4]
  return (
    <svg className={`sg-signature ${className}`} viewBox="0 0 160 56" role="img" aria-label={label}>
      {SIGNATURE_PATHS.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={i === 3 ? 1.4 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
          animate={play || reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : {
            pathLength: { duration: durs[i], delay: play ? delay + starts[i] : 0, ease: [0.45, 0.05, 0.4, 1] },
            opacity: { duration: 0.01, delay: play ? delay + starts[i] : 0 },
          }}
        />
      ))}
    </svg>
  )
}

/** Small recorded-audio waveform. Bars breathe while `live`. */
export function Waveform({ bars = 28, live = true, className = '' }: { bars?: number; live?: boolean; className?: string }) {
  const heights = Array.from({ length: bars }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 0.75)
  return (
    <span className={`sg-wave ${live ? 'is-live' : ''} ${className}`} aria-hidden="true">
      {heights.map((h, i) => <i key={i} style={{ '--h': h.toFixed(2), animationDelay: `${(i % 7) * 90}ms` } as CSSProperties} />)}
    </span>
  )
}

export function Tick({ size = 12 }: { size?: number }) {
  return <span className="sg-tick" aria-hidden="true"><Check size={size} strokeWidth={2.5} /></span>
}

/** A step counter that advances every `ms` while the element is in view. Reduced motion holds the last step. */
export function useLoopStep(count: number, ms: number) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [inView, reduce, count, ms])
  return { ref, step: reduce ? count - 1 : step, inView, reduce: !!reduce }
}

/** Counts from 0 to `to` once `active`. */
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
