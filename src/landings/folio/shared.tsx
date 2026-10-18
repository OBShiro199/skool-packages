import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/** Quiet Precision curves: out for reveals, morph for in-place changes. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const MORPH = [0.2, 0, 0, 1] as const

/** Stand-in for the analytics helper in the PRD (section 16). */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug('[folio track]', name, props)
}

/** Smooth anchor scroll that respects the 72px scroll margin. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 64
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

/** Default reveal: fade and rise 8px, 320ms, once when 20% in view. */
export function Reveal({
  children, delay = 0, className, as = 'div', style,
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li'; style?: CSSProperties }) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      className={className}
      style={style}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.32, delay: Math.min(delay, 0.24), ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** Three stacked cards, the front one in the accent. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="fo-mark">
      <rect x="2" y="5.5" width="10" height="12.5" rx="1.5" fill="#fff" stroke="#d8cff6" strokeWidth="1.5" transform="rotate(-10 7 12)" />
      <rect x="5" y="3.5" width="10" height="12.5" rx="1.5" fill="#fff" stroke="#b9a9ef" strokeWidth="1.5" />
      <rect x="8" y="2" width="10" height="12.5" rx="1.5" fill="#f5f3fd" stroke="#8b74e3" strokeWidth="1.5" transform="rotate(10 13 8)" />
    </svg>
  )
}

export function Wordmark() {
  return <span className="fo-wordmark"><Mark />Folio</span>
}

export function TrialButton({
  location, size = 'lg', className = '',
}: { location: string; size?: 'lg' | 'md'; className?: string }) {
  return (
    <a
      href="/signup"
      className={`fo-btn fo-btn-primary fo-btn-${size} ${className}`}
      onClick={(e) => { e.preventDefault(); track('cta_click', { location }) }}
    >
      Start free trial
    </a>
  )
}

export function Eyebrow({ children, tone = 'violet' }: { children: ReactNode; tone?: 'violet' | 'peach' }) {
  return <span className={`fo-eyebrow fo-eyebrow-${tone}`}><span className="fo-dot" aria-hidden="true" />{children}</span>
}

/* ---------------- Slide templates (mini, HTML) ---------------- */

export type Kit = { name: string; bg: string; ink: string; muted: string; accent: string; accentInk: string; font: string }

export const KITS: Record<'violet' | 'ember' | 'ocean' | 'white', Kit> = {
  violet: { name: 'Violet', bg: '#F7F4FF', ink: '#1E1838', muted: '#5B5478', accent: '#6D4AFF', accentInk: '#FFFFFF', font: "'Space Grotesk', Geist, sans-serif" },
  ember: { name: 'Ember', bg: '#FFF6EF', ink: '#2A1608', muted: '#6E5442', accent: '#D9561B', accentInk: '#FFFFFF', font: "'Space Grotesk', Geist, sans-serif" },
  ocean: { name: 'Ocean', bg: '#F1F7FB', ink: '#0F2233', muted: '#4A6275', accent: '#1C6FD1', accentInk: '#FFFFFF', font: 'Geist, sans-serif' },
  white: { name: 'Violet', bg: '#FFFFFF', ink: '#1E1838', muted: '#5B5478', accent: '#6D4AFF', accentInk: '#FFFFFF', font: "'Space Grotesk', Geist, sans-serif" },
}

export type SlideKind = 'hook' | 'bullets' | 'stat' | 'step' | 'cta' | 'quote'

/**
 * A portrait (4:5) slide. Every size inside is in em, and the slide's font-size is a tenth of its width,
 * so the same component renders crisply at any scale.
 */
export function Slide({
  kind, kit = KITS.violet, n, total = 9, width, className = '', headline,
}: { kind: SlideKind; kit?: Kit; n: number; total?: number; width?: number; className?: string; headline?: string }) {
  const style = {
    '--s-bg': kit.bg, '--s-ink': kit.ink, '--s-muted': kit.muted, '--s-accent': kit.accent, '--s-accent-ink': kit.accentInk,
    '--s-font': kit.font,
    ...(width ? { width, fontSize: width / 10 } : {}),
  } as CSSProperties
  return (
    <div className={`fo-slide fo-slide-${kind} ${className}`} style={style} aria-hidden="true">
      {(kind === 'hook' || kind === 'cta') && <span className="fo-s-circle" />}
      <div className="fo-s-body">
        {kind === 'hook' && (
          <>
            <span className="fo-s-kicker">Onboarding</span>
            <span className="fo-s-h">{headline ?? '40% of your trials never see the product'}</span>
            <span className="fo-s-sub">Here is the 7-step fix we used</span>
            <span className="fo-s-swipe">Swipe →</span>
          </>
        )}
        {kind === 'bullets' && (
          <>
            <span className="fo-s-title">Why it happens</span>
            <span className="fo-s-list">
              {['Empty dashboards', 'Too many fields', 'No first win'].map((b) => (
                <span key={b}><i />{b}</span>
              ))}
            </span>
          </>
        )}
        {kind === 'stat' && (
          <>
            <span className="fo-s-stat">87%</span>
            <span className="fo-s-label">finish setup with a checklist</span>
            <span className="fo-s-sub">Up from 52% with an empty dashboard</span>
          </>
        )}
        {kind === 'step' && (
          <>
            <span className="fo-s-num">03</span>
            <span className="fo-s-title">Show one win in the first minute</span>
            <span className="fo-s-sub">Load sample data so the dashboard is never empty.</span>
          </>
        )}
        {kind === 'quote' && (
          <>
            <span className="fo-s-qmark">“</span>
            <span className="fo-s-title">Nobody reads an empty dashboard.</span>
            <span className="fo-s-sub">From the onboarding post</span>
          </>
        )}
        {kind === 'cta' && (
          <>
            <span className="fo-s-face fo-s-face-lg" />
            <span className="fo-s-title fo-s-center">Want the checklist?</span>
            <span className="fo-s-pill">Comment CHECKLIST</span>
            <span className="fo-s-sub fo-s-center">Follow for a teardown every Tuesday</span>
          </>
        )}
      </div>
      <div className="fo-s-foot">
        <span className="fo-s-face" />
        <span className="fo-s-who"><b>Maya Lin</b><em>@mayabuilds</em></span>
        <span className="fo-s-count">{n}/{total}</span>
      </div>
    </div>
  )
}

/** Swipe dots: one active of `count`. */
export function Dots({ count, active, className = '' }: { count: number; active: number; className?: string }) {
  return (
    <span className={`fo-dots ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <i key={i} className={i === active ? 'on' : ''} />)}
    </span>
  )
}
