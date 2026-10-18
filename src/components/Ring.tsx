import { motion } from 'motion/react'

export function Ring({ pct, size = 56, stroke = 5, tone = 'signal', children }: { pct: number; size?: number; stroke?: number; tone?: 'signal' | 'money'; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`var(--${tone})`} strokeWidth={stroke} strokeLinecap="butt"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(1, pct)) }}
          transition={{ duration: 1.1, ease: [0.2, 0.7, 0.1, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  )
}

export function Bar({ pct, tone, lg }: { pct: number; tone?: 'money'; lg?: boolean }) {
  return (
    <div className={`bar ${tone ?? ''} ${lg ? 'lg' : ''}`} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} />
    </div>
  )
}
