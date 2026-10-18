import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'

/** Quiet Precision curves: out for reveals, morph for UI changes. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the analytics helper in the PRD (section 17). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[conversate track]', name, props)
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Fade and rise 12px once when 20% in view. Reduced motion: a 150ms fade. */
export function Reveal({
  children, delay = 0, className, as = 'div',
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.15 : 0.36, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** Two overlapping speech boxes in 1.5px strokes, the front one with a Lagoon soft fill. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="cv-mark">
      <path d="M3.5 4.5h10a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H8l-3 2.5V14h-1.5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" stroke="#08090a" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10.5 9.5h10a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H19v2.5L16 19h-5.5a2 2 0 0 1-2-2v-5.5a2 2 0 0 1 2-2Z" fill="#eef6f9" stroke="#3c8fb0" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="cv-wordmark"><Mark />conversate</span>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="cv-eyebrow">{children}</span>
}

export function TrialButton({ location, size = 'md', label = 'Start free trial', event }: { location: string; size?: 'sm' | 'md' | 'lg'; label?: string; event?: string }) {
  return (
    <a
      href="#pricing"
      className={`cv-btn cv-btn-primary cv-btn-${size}`}
      onClick={(e) => { e.preventDefault(); track(event ?? (location === 'nav' ? 'nav_cta_click' : 'cta_click'), { location }); scrollToId('pricing') }}
    >
      {label}
    </a>
  )
}

/** URL input + "Build my help centre". Submits to /signup?site=<url> (simulated here). */
export function UrlForm({ event, id }: { event: string; id: string }) {
  const [url, setUrl] = useState('')
  const [sent, setSent] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    track(event, { has_url: url.trim().length > 0 })
    setSent(true)
  }
  return (
    <form className="cv-urlform" onSubmit={submit} aria-describedby={`${id}-status`}>
      <label htmlFor={id} className="cv-sr">Your website address</label>
      <input
        id={id}
        className="cv-input cv-input-lg"
        type="url"
        inputMode="url"
        placeholder="https://yourwebsite.com"
        value={url}
        onChange={(e) => { setUrl(e.target.value); setSent(false) }}
      />
      <button type="submit" className="cv-btn cv-btn-primary cv-btn-lg">
        Build my help centre <ArrowRight size={16} aria-hidden="true" />
      </button>
      <span id={`${id}-status`} className="cv-sr" role="status">
        {sent ? `Going to /signup?site=${encodeURIComponent(url.trim())}` : ''}
      </span>
    </form>
  )
}

/** Reveals `text` letter by letter over `ms` once `start` is true. Reduced motion: full text. */
export function useTyping(text: string, start: boolean, ms = 900) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!start) return
    if (reduce) { setN(text.length); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setN(Math.round(text.length * p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, start, reduce, ms])
  return { shown: text.slice(0, reduce ? text.length : n), done: reduce || n >= text.length }
}

/** A step counter that advances every `ms` while the element is in view. Reduced motion: last step. */
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

export function TypingDots({ label = 'Assistant is typing' }: { label?: string }) {
  return (
    <span className="cv-dots" role="img" aria-label={label}>
      <i /><i /><i />
    </span>
  )
}

export function Conf({ v }: { v: number }) {
  const tone = v >= 0.75 ? 'ok' : v >= 0.55 ? 'warn' : 'bad'
  const word = v >= 0.75 ? 'High' : v >= 0.55 ? 'Medium' : 'Low'
  return <span className={`cv-tag cv-tag-${tone}`}>{word} {v.toFixed(2)}</span>
}
