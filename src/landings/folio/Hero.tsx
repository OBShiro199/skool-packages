import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CalendarClock, FileCheck2, Link2 } from 'lucide-react'
import { Dots, EASE, Eyebrow, KITS, Slide, TrialButton, scrollToId, type Kit, type SlideKind } from './shared'

const STACK: { kind: SlideKind; kit: Kit; n: number; angle: number }[] = [
  { kind: 'hook', kit: KITS.violet, n: 1, angle: -8 },
  { kind: 'bullets', kit: KITS.white, n: 3, angle: -4 },
  { kind: 'stat', kit: KITS.ember, n: 5, angle: 0 },
  { kind: 'step', kit: KITS.white, n: 6, angle: 4 },
  { kind: 'cta', kit: KITS.violet, n: 9, angle: 8 },
]

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

function FanStack() {
  const reduce = useReducedMotion()
  const mobile = useIsMobile()
  const [dot, setDot] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setDot((d) => (d + 1) % 9), 1600)
    return () => window.clearInterval(id)
  }, [reduce])
  // Mobile: three slides only (hook, stat, cta).
  const slides = mobile ? [STACK[0], STACK[2], STACK[4]].map((s, i) => ({ ...s, angle: [-7, 0, 7][i] })) : STACK
  const mid = (slides.length - 1) / 2
  const step = mobile ? 74 : 66
  const width = mobile ? 168 : 196
  const fanEnd = 0.2 + 0.09 * (slides.length - 1) + 0.7

  return (
    <div className="fo-stack" role="img" aria-label="Five Folio carousel slides fanned out: hook, list, stat, step and call to action">
      {slides.map((s, i) => {
        const off = i - mid
        return (
          <motion.div
            key={`${mobile}-${s.n}`}
            className="fo-stack-item"
            style={{ zIndex: 10 - i, marginLeft: -width / 2 }}
            initial={reduce ? false : { rotate: 0, x: 0, y: 12, opacity: 0 }}
            animate={{ rotate: s.angle, x: off * step, y: Math.abs(off) * 14, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 + i * 0.09, ease: EASE }}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: fanEnd + i * 0.8 }}
            >
              <Slide kind={s.kind} kit={s.kit} n={s.n} width={width} className="fo-slide-float" />
            </motion.div>
          </motion.div>
        )
      })}

      <Dots count={9} active={dot} className="fo-stack-dots" />

      {[
        { cls: 'fo-chip-src', icon: <Link2 size={14} aria-hidden="true" />, text: 'blog.yoursite.com/onboarding', tone: 'plain' },
        { cls: 'fo-chip-cal', icon: <CalendarClock size={14} aria-hidden="true" />, text: 'Tue 08:30 · LinkedIn · Scheduled', tone: 'blue' },
        { cls: 'fo-chip-pdf', icon: <FileCheck2 size={14} aria-hidden="true" />, text: 'PDF ready · 9 slides', tone: 'green' },
      ].map((c, i) => (
        <motion.span
          key={c.cls}
          className={`fo-chip fo-chip-${c.tone} ${c.cls}`}
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.32, delay: fanEnd + i * 0.12, ease: EASE }}
        >
          {c.icon}{c.text}
        </motion.span>
      ))}
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, delay: 0.05 + i * 0.07, ease: EASE },
  }) as const

  return (
    <section className="fo-hero" id="top" aria-labelledby="fo-h1">
      <div className="fo-hero-copy">
        <motion.div {...item(0)}><Eyebrow>For founders, coaches and agencies who post on LinkedIn</Eyebrow></motion.div>
        <motion.h1 id="fo-h1" className="fo-display" {...item(1)}>Your best ideas, as carousels, in your brand.</motion.h1>
        <motion.p className="fo-lead" {...item(2)}>
          Paste a blog post, a YouTube video, a rough idea or a voice note. Folio writes the hook, the slides and the
          call to action, designs them in your colours and fonts, and schedules the PDF to LinkedIn.
        </motion.p>
        <motion.div className="fo-hero-ctas" {...item(3)}>
          <TrialButton location="hero" />
          <a href="#demo" className="fo-btn fo-btn-secondary fo-btn-lg" onClick={(e) => { e.preventDefault(); scrollToId('demo') }}>
            See it make one
          </a>
        </motion.div>
        <motion.p className="fo-micro" {...item(4)}>7 days free · First carousel in 5 minutes · From $39/month</motion.p>
      </div>
      <div className="fo-hero-visual">
        <FanStack />
      </div>
    </section>
  )
}
