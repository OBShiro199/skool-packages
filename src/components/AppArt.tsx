import type { AppDef } from '../content/types'

const TONES: Record<AppDef['art']['tone'], { bg: string; fg: string; accent: string }> = {
  blue: { bg: '#E9EEFF', fg: '#1F3FBF', accent: '#2B59FF' },
  green: { bg: '#E5F3EA', fg: '#0F5C35', accent: '#167A47' },
  ink: { bg: '#EDEDEA', fg: '#0F0F0F', accent: '#3A3A3A' },
  amber: { bg: '#F8EEDB', fg: '#7A4D00', accent: '#C98500' },
  violet: { bg: '#EFEAFE', fg: '#3E2A99', accent: '#6B4BD8' },
}

/** Generated thumbnail. Each motif is a tiny drawing of what the product does. */
export function AppArt({ app, height = 150 }: { app: Pick<AppDef, 'art' | 'name'>; height?: number }) {
  const t = TONES[app.art.tone]
  return (
    <svg viewBox="0 0 320 150" width="100%" height={height} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${app.name} thumbnail`} style={{ display: 'block', background: t.bg }}>
      <defs>
        <pattern id={`grid-${app.name}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke={t.fg} strokeOpacity=".07" />
        </pattern>
      </defs>
      <rect width="320" height="150" fill={`url(#grid-${app.name})`} />
      <Motif motif={app.art.motif} t={t} />
    </svg>
  )
}

function Motif({ motif, t }: { motif: AppDef['art']['motif']; t: { bg: string; fg: string; accent: string } }) {
  switch (motif) {
    case 'waveform': {
      const bars = Array.from({ length: 34 }, (_, i) => 10 + Math.abs(Math.sin(i * 0.7) * 34 + Math.cos(i * 1.9) * 14))
      return (
        <g>
          {/* phone frames */}
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${196 + i * 38} ${28 + i * 6})`}>
              <rect width="34" height="60" fill="#fff" stroke={t.fg} strokeOpacity=".35" />
              <rect x="4" y="38" width="26" height="4" fill={t.accent} />
              <rect x="4" y="45" width="18" height="4" fill={t.fg} fillOpacity=".5" />
              <circle cx="17" cy="20" r="8" fill={t.accent} fillOpacity=".25" />
            </g>
          ))}
          {bars.map((h, i) => (
            <rect key={i} x={20 + i * 5} y={75 - h / 2} width="3" height={h} fill={i > 12 && i < 22 ? t.accent : t.fg} fillOpacity={i > 12 && i < 22 ? 1 : 0.35}>
              <animate attributeName="height" values={`${h};${h * 0.55};${h}`} dur={`${1.2 + (i % 5) * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${75 - h / 2};${75 - h * 0.275};${75 - h / 2}`} dur={`${1.2 + (i % 5) * 0.2}s`} repeatCount="indefinite" />
            </rect>
          ))}
          <rect x="84" y="112" width="52" height="16" fill={t.fg} />
          <text x="110" y="124" fill="#fff" fontFamily="Geist, sans-serif" fontWeight="500" fontSize="9" textAnchor="middle">0:42 clip</text>
        </g>
      )
    }
    case 'mail':
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${24 + i * 8} ${24 + i * 14})`}>
              <rect width="150" height="34" fill="#fff" stroke={t.fg} strokeOpacity=".25" />
              <rect x="10" y="9" width="8" height="8" fill={i === 3 ? t.accent : t.fg} fillOpacity={i === 3 ? 1 : 0.3} />
              <rect x="26" y="9" width={60 + i * 10} height="5" fill={t.fg} fillOpacity=".55" />
              <rect x="26" y="19" width={90 - i * 6} height="4" fill={t.fg} fillOpacity=".2" />
            </g>
          ))}
          <g transform="translate(222 40)">
            <path d="M0 30 L70 0 L50 70 L32 44 Z" fill={t.accent} />
            <path d="M32 44 L70 0" stroke="#fff" strokeWidth="2" />
            <animateTransform attributeName="transform" type="translate" values="222 40; 228 34; 222 40" dur="2.4s" repeatCount="indefinite" />
          </g>
          <text x="256" y="132" fill={t.fg} fontFamily="Geist, sans-serif" fontWeight="500" fontSize="10" textAnchor="middle">42% open · 8 replies</text>
        </g>
      )
    case 'kanban':
      return (
        <g>
          {[0, 1, 2, 3].map((c) => (
            <g key={c} transform={`translate(${22 + c * 72} 22)`}>
              <rect width="64" height="8" fill={c === 3 ? t.accent : t.fg} fillOpacity={c === 3 ? 1 : 0.4} />
              {Array.from({ length: 3 - (c % 2) }, (_, r) => (
                <rect key={r} y={16 + r * 30} width="64" height="24" fill="#fff" stroke={t.fg} strokeOpacity=".2" />
              ))}
            </g>
          ))}
          <text x="294" y="138" fill={t.fg} fontFamily="Geist, sans-serif" fontWeight="500" fontSize="10" textAnchor="end">$18,400 won</text>
        </g>
      )
    case 'calendar':
      return (
        <g transform="translate(40 18)">
          {Array.from({ length: 21 }, (_, i) => {
            const on = [3, 8, 9, 12, 17].includes(i)
            return <rect key={i} x={(i % 7) * 34} y={Math.floor(i / 7) * 36} width="30" height="32" fill={on ? t.accent : '#fff'} fillOpacity={on ? 0.9 : 1} stroke={t.fg} strokeOpacity=".2" />
          })}
          <text x="120" y="126" fill={t.fg} fontFamily="Geist, sans-serif" fontWeight="500" fontSize="10" textAnchor="middle">5 bookings today · 0 no-shows</text>
        </g>
      )
    case 'chart':
      return (
        <g>
          <polyline points="20,120 70,100 120,108 170,70 220,62 270,34 300,28" fill="none" stroke={t.accent} strokeWidth="3" />
        </g>
      )
    case 'chat':
      return (
        <g>
          <rect x="28" y="26" width="150" height="28" fill="#fff" stroke={t.fg} strokeOpacity=".25" />
          <rect x="38" y="36" width="110" height="5" fill={t.fg} fillOpacity=".45" />
          <rect x="120" y="64" width="170" height="40" fill={t.fg} />
          <rect x="132" y="76" width="130" height="5" fill="#fff" fillOpacity=".8" />
          <rect x="132" y="88" width="90" height="5" fill="#fff" fillOpacity=".5" />
          <rect x="28" y="112" width="96" height="22" fill="#fff" stroke={t.fg} strokeOpacity=".25" />
          <circle cx="44" cy="123" r="3" fill={t.fg}><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite" /></circle>
          <circle cx="56" cy="123" r="3" fill={t.fg}><animate attributeName="opacity" values="1;.2;1" dur="1s" begin=".2s" repeatCount="indefinite" /></circle>
          <circle cx="68" cy="123" r="3" fill={t.fg}><animate attributeName="opacity" values="1;.2;1" dur="1s" begin=".4s" repeatCount="indefinite" /></circle>
        </g>
      )
  }
}
