import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight, MessageSquare } from 'lucide-react'

/** Quiet Precision curves: out for reveals, morph for UI changes. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the real analytics helper described in the PRD (section 17). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[helpdeck track]', name, props)
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Fade and rise 12px once when in view. */
export function Reveal({
  children, delay = 0, className, as = 'div',
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : as === 'section' ? motion.section : motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0 : 0.36, delay: reduce ? 0 : Math.min(delay, 0.27), ease: EASE }}
    >
      {children}
    </Tag>
  )
}

export function Wordmark() {
  return (
    <span className="hd-wordmark">
      <span className="hd-wordmark-icon" aria-hidden="true"><MessageSquare size={15} strokeWidth={2.2} /></span>
      Helpdeck
    </span>
  )
}

export function TrialButton({ location, size = 'md', label = 'Start free trial' }: { location: string; size?: 'sm' | 'md'; label?: string }) {
  return (
    <a
      href="#pricing"
      className={`hd-btn hd-btn-primary hd-btn-${size}`}
      onClick={(e) => { e.preventDefault(); track('cta_click', { location }); scrollToId('pricing') }}
    >
      {label} <ArrowRight size={16} className="hd-btn-arrow" aria-hidden="true" />
    </a>
  )
}

/** Types `text` at 18ms per character once `start` is true. Reduced motion shows it all. */
export function useTyping(text: string, start: boolean, speed = 18) {
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

/** Counts from 0 to `to` over `ms` once visible. */
export function useCountUp(to: number, ms: number, active: boolean) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) return
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
  }, [to, ms, active, reduce])
  return v
}

/** A step counter that advances every `ms` while the element is in view. */
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

export function TypingDots() {
  return (
    <span className="hd-dots" aria-label="Helpdeck is typing">
      <i /><i /><i />
    </span>
  )
}
