import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import { waveHeights } from './shared'

export type AudiogramStyle = 'Bars' | 'Line' | 'Minimal'

const WORDS = ['We', 'stopped', 'selling', 'seats', 'and', 'started', 'selling', 'hours.']

/**
 * A vertical audiogram inside a phone frame: show tile, a moving waveform in one of three styles and
 * word-by-word captions. Loops only while in view; reduced motion shows the last frame, still.
 */
export function Audiogram({ variant = 'Bars', label, compact = false }: { variant?: AudiogramStyle; label?: string; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduce = useReducedMotion()
  const [word, setWord] = useState(0)
  useEffect(() => {
    if (!inView || reduce) return
    const id = window.setInterval(() => setWord((w) => (w + 1) % (WORDS.length + 2)), 520)
    return () => window.clearInterval(id)
  }, [inView, reduce])
  const shown = reduce ? WORDS.length - 1 : word
  const playing = inView && !reduce
  const heights = waveHeights(variant === 'Line' ? 40 : 22, variant === 'Minimal' ? 4 : 2)

  return (
    <div
      ref={ref}
      className={`ec-phone ec-ag-${variant.toLowerCase()} ${compact ? 'is-compact' : ''}`}
      role="img"
      aria-label={label ?? `${variant} style audiogram with word-by-word captions: "${WORDS.join(' ')}"`}
    >
      <span className="ec-phone-notch" aria-hidden="true" />
      <div className="ec-ag-screen" aria-hidden="true">
        <div className="ec-ag-top">
          <span className="ec-ag-art"><i /><i /><i /></span>
          <span className="ec-ag-show">
            <b>The Bootstrapped Hour</b>
            <small>Ep 87 · Priya Raman</small>
          </span>
        </div>
        <div className={`ec-ag-wave ${playing ? 'is-playing' : ''}`}>
          {variant === 'Line' ? (
            <svg viewBox="0 0 200 60" preserveAspectRatio="none">
              <path
                className="ec-ag-line"
                d={'M0 30 ' + heights.map((h, i) => `L${(i / (heights.length - 1)) * 200} ${30 + (i % 2 ? 1 : -1) * h * 22}`).join(' ')}
              />
            </svg>
          ) : (
            heights.map((h, i) => (
              <i key={i} style={{ '--h': h.toFixed(2), animationDelay: `${(i % 7) * 70}ms` } as CSSProperties} />
            ))
          )}
        </div>
        <p className="ec-ag-caption">
          {WORDS.map((w, i) => (
            <span key={i} className={i === shown ? 'is-now' : i < shown ? 'is-said' : ''}>{w} </span>
          ))}
        </p>
        <div className="ec-ag-progress"><span style={{ transform: `scaleX(${Math.min(1, (shown + 1) / WORDS.length)})` }} /></div>
      </div>
      <span className="ec-phone-style">{variant}</span>
    </div>
  )
}
