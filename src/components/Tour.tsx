import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useStore, useUser } from '../lib/store'
import '../styles/tour.css'

type Step = { target: string; title: string; body: string }

// Targets are CSS selectors. A step whose target is hidden (e.g. the sidebar on a phone) shows as a centred card.
const STEPS: Step[] = [
  { target: '', title: 'Welcome to the vault', body: 'This is your dashboard. Here is a 30-second tour of everything you can do in here.' },
  { target: '[data-tour="clone"]', title: 'Clone a software app', body: 'Pick one of the 20 profitable apps. Each comes with the full build, the stack and a launch template you can make your own.' },
  { target: '[data-tour="leads"]', title: 'Find leads', body: 'Search millions of verified B2B leads in the UK, EU and US. Stack filters, save searches and export up to 5,000 leads a month.' },
  { target: '[data-tour="designs"]', title: 'Designs', body: 'A library of design systems from the best-looking sites. Copy one into your project as DESIGN.md and Claude Code builds in that style.' },
  { target: '[data-tour="start"]', title: 'Your next step', body: 'Once you sign the pledge for an app, this card shows exactly where you left off and the next task to tick.' },
  { target: '[data-tour="builds"]', title: 'Your builds', body: 'Every app you commit to lives here, with its progress bar, so you can jump straight back in.' },
  { target: '[data-tour="activity"]', title: 'Your activity', body: 'A day counts when you tick at least one item. Five days a week gets most members to a finished build in under a month.' },
  { target: '[data-tour="xp"]', title: 'XP, levels and streaks', body: 'Every task earns XP. Level up as you build and keep your streak alive.' },
  { target: '[data-tour="help"]', title: 'Docs and support', body: 'Step-by-step documentation for the stack, plus support if something breaks.' },
  { target: '.olly-launcher', title: 'Ask Olly', body: 'Stuck on anything? This opens the Skool community, where you can post your question or message me.' },
  { target: '.back-skool', title: 'Back to Skool', body: 'The daily calls, Q&A and the live $10K build all happen in the Skool community. This takes you straight there.' },
]

type Box = { top: number; left: number; width: number; height: number } | null

function measure(sel: string): Box {
  if (!sel) return null
  const el = document.querySelector(sel) as HTMLElement | null
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0 || r.right <= 0 || r.left >= innerWidth) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/** Guided tour of the dashboard. Shows until the member finishes or skips it; "Take the tour" brings it back. */
export function Tour() {
  const user = useUser()
  const setTourDone = useStore((s) => s.setTourDone)
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box>(null)
  const open = !!user && !user.tourDone
  const step = STEPS[i]

  const update = useCallback(() => setBox(measure(step.target)), [step.target])

  useEffect(() => {
    if (open) setI(0)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const el = step.target ? (document.querySelector(step.target) as HTMLElement | null) : null
    el?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    update()
    const t = setTimeout(update, 350)
    addEventListener('resize', update)
    addEventListener('scroll', update, true)
    return () => {
      clearTimeout(t)
      removeEventListener('resize', update)
      removeEventListener('scroll', update, true)
    }
  }, [open, step.target, update])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTourDone(true)
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1))
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  if (!open) return null

  const last = i === STEPS.length - 1
  function next() {
    if (last) setTourDone(true)
    else setI((v) => v + 1)
  }

  // Card beside the target when there is room, otherwise below or above it; centred when there is no target.
  const W = Math.min(340, innerWidth - 32)
  let pos: React.CSSProperties = { left: (innerWidth - W) / 2, top: Math.max(16, innerHeight / 2 - 110) }
  if (box) {
    const pad = 14
    if (box.left + box.width + pad + W < innerWidth - 16) {
      pos = { left: box.left + box.width + pad, top: Math.min(Math.max(16, box.top), innerHeight - 240) }
    } else if (box.top + box.height + pad + 220 < innerHeight) {
      pos = { left: Math.min(Math.max(16, box.left), innerWidth - W - 16), top: box.top + box.height + pad }
    } else {
      pos = { left: Math.min(Math.max(16, box.left), innerWidth - W - 16), top: Math.max(16, box.top - pad - 220) }
    }
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {box ? (
        <motion.div
          className="tour-spot"
          initial={false}
          animate={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        />
      ) : (
        <div className="tour-dim" />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className="tour-card"
          style={{ ...pos, width: W }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="tour-top">
            <span className="tour-count">{i + 1} of {STEPS.length}</span>
            <button className="tour-x" onClick={() => setTourDone(true)} aria-label="Skip the tour"><X size={15} /></button>
          </div>
          <h3 id="tour-title">{step.title}</h3>
          <p>{step.body}</p>
          <div className="tour-dots" aria-hidden>
            {STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />)}
          </div>
          <div className="tour-actions">
            {i > 0 ? (
              <button className="tour-btn" onClick={() => setI(i - 1)}><ArrowLeft size={14} /> Back</button>
            ) : (
              <button className="tour-btn ghost" onClick={() => setTourDone(true)}>Skip</button>
            )}
            <button className="tour-btn primary" onClick={next} autoFocus>
              {last ? 'Start building' : i === 0 ? 'Show me' : 'Next'} {!last && <ArrowRight size={14} />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
