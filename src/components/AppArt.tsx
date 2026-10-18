import type { AppDef } from '../content/types'

const TONES: Record<AppDef['art']['tone'], { bg: string; bg2: string; fg: string; accent: string; soft: string }> = {
  blue: { bg: '#E8EEFF', bg2: '#D4DFFF', fg: '#14246B', accent: '#2B59FF', soft: '#C9D6FF' },
  green: { bg: '#E3F4EA', bg2: '#CBEBD8', fg: '#0B4A2B', accent: '#16A05C', soft: '#B8E3C9' },
  ink: { bg: '#E9F0FB', bg2: '#D6E3F7', fg: '#1D2B45', accent: '#3E6FD8', soft: '#C4D5F0' },
  amber: { bg: '#FBF0DC', bg2: '#F5E1BA', fg: '#5C3A00', accent: '#E08E00', soft: '#F0D39A' },
  violet: { bg: '#EEE9FF', bg2: '#DDD3FF', fg: '#2A1A73', accent: '#6B4BD8', soft: '#CFC2FF' },
}

/**
 * Generated thumbnail: a small branded product window showing what the app does,
 * with the brand wordmark. Pure SVG so it is crisp at every size.
 */
export function AppArt({ app, height = 170 }: { app: Pick<AppDef, 'art' | 'name'>; height?: number | 'auto' }) {
  const t = TONES[app.art.tone]
  const id = `g-${app.name.replace(/\W/g, '')}`
  return (
    <svg viewBox="0 0 320 170" width="100%" height={height === 'auto' ? undefined : height} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${app.name} product preview`}
      style={{ display: 'block', ...(height === 'auto' ? { aspectRatio: '320 / 170', height: 'auto' } : {}) }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.bg} />
          <stop offset="1" stopColor={t.bg2} />
        </linearGradient>
      </defs>
      <rect width="320" height="170" fill={`url(#${id})`} />
      <circle cx="292" cy="18" r="70" fill={t.accent} opacity=".08" />
      {/* product window */}
      <g transform="translate(34 26)">
        <rect width="252" height="128" rx="8" fill="#fff" />
        <rect width="252" height="128" rx="8" fill="none" stroke={t.fg} strokeOpacity=".08" />
        <circle cx="12" cy="11" r="3" fill={t.fg} opacity=".14" />
        <circle cx="22" cy="11" r="3" fill={t.fg} opacity=".14" />
        <circle cx="32" cy="11" r="3" fill={t.fg} opacity=".14" />
        <text x="244" y="14" textAnchor="end" fontFamily="Geist, sans-serif" fontSize="9" fontWeight="600" fill={t.fg}>{app.name}</text>
        <line x1="0" y1="22" x2="252" y2="22" stroke={t.fg} strokeOpacity=".07" />
        {/* sidebar */}
        <rect x="8" y="30" width="40" height="90" rx="4" fill={t.bg} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x="14" y={38 + i * 14} width={i === 0 ? 28 : 22} height="5" rx="2.5" fill={i === 0 ? t.accent : t.fg} opacity={i === 0 ? 1 : 0.18} />)}
        <g transform="translate(56 30)"><Motif motif={app.art.motif} t={t} /></g>
      </g>
    </svg>
  )
}

type T = (typeof TONES)['blue']

function Motif({ motif, t }: { motif: AppDef['art']['motif']; t: T }) {
  switch (motif) {
    case 'waveform': {
      const bars = Array.from({ length: 22 }, (_, i) => 6 + Math.abs(Math.sin(i * 0.8) * 16 + Math.cos(i * 1.7) * 7))
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * 40} 0)`}>
              <rect width="34" height="58" rx="4" fill={i === 1 ? t.fg : t.soft} />
              <circle cx="17" cy="20" r="8" fill="#fff" opacity={i === 1 ? 0.25 : 0.6} />
              <rect x="5" y="40" width="24" height="5" rx="2" fill={i === 1 ? t.accent : '#fff'} />
              <rect x="8" y="48" width="18" height="3" rx="1.5" fill="#fff" opacity=".7" />
            </g>
          ))}
          <g transform="translate(126 6)">
            <rect width="62" height="16" rx="8" fill={t.accent} />
            <text x="31" y="11" textAnchor="middle" fontFamily="Geist, sans-serif" fontSize="7.5" fontWeight="600" fill="#fff">Ready to post</text>
          </g>
          {bars.map((h, i) => (
            <rect key={i} x={i * 8.5} y={78 - h / 2} width="4" height={h} rx="2" fill={i > 7 && i < 14 ? t.accent : t.fg} opacity={i > 7 && i < 14 ? 1 : 0.2}>
              <animate attributeName="height" values={`${h};${h * 0.5};${h}`} dur={`${1.1 + (i % 5) * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${78 - h / 2};${78 - h / 4};${78 - h / 2}`} dur={`${1.1 + (i % 5) * 0.2}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </g>
      )
    }
    case 'mail':
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(0 ${i * 22})`}>
              <rect width="188" height="18" rx="4" fill={i === 1 ? t.bg : '#fff'} stroke={t.fg} strokeOpacity=".07" />
              <circle cx="10" cy="9" r="4.5" fill={i === 1 ? t.accent : t.soft} />
              <rect x="20" y="5" width={50 + i * 8} height="4" rx="2" fill={t.fg} opacity=".55" />
              <rect x="20" y="11" width={90 - i * 6} height="3" rx="1.5" fill={t.fg} opacity=".18" />
              {i === 1 && <rect x="150" y="5" width="32" height="8" rx="4" fill={t.accent} opacity=".15" />}
              {i === 1 && <text x="166" y="11" textAnchor="middle" fontFamily="Geist, sans-serif" fontSize="6" fontWeight="600" fill={t.accent}>Replied</text>}
            </g>
          ))}
        </g>
      )
    case 'kanban':
      return (
        <g>
          {['Lead', 'Demo', 'Proposal', 'Won'].map((c, ci) => (
            <g key={c} transform={`translate(${ci * 48} 0)`}>
              <text x="0" y="6" fontFamily="Geist, sans-serif" fontSize="6.5" fontWeight="600" fill={t.fg} opacity=".6">{c}</text>
              {Array.from({ length: ci === 3 ? 2 : 3 - (ci % 2) }, (_, r) => (
                <g key={r} transform={`translate(0 ${12 + r * 24})`}>
                  <rect width="44" height="20" rx="4" fill={ci === 3 ? t.accent : '#fff'} opacity={ci === 3 ? 0.15 : 1} stroke={t.fg} strokeOpacity=".08" />
                  <rect x="5" y="5" width="24" height="3.5" rx="1.75" fill={t.fg} opacity=".5" />
                  <rect x="5" y="12" width="16" height="3" rx="1.5" fill={ci === 3 ? t.accent : t.fg} opacity={ci === 3 ? 1 : 0.2} />
                </g>
              ))}
            </g>
          ))}
          <text x="188" y="92" textAnchor="end" fontFamily="Geist, sans-serif" fontSize="8" fontWeight="600" fill={t.accent}>$84,200 pipeline</text>
        </g>
      )
    case 'calendar':
      return (
        <g>
          {Array.from({ length: 21 }, (_, i) => {
            const on = [3, 8, 9, 12, 17].includes(i)
            return <rect key={i} x={(i % 7) * 27} y={Math.floor(i / 7) * 26} width="23" height="22" rx="4" fill={on ? t.accent : t.bg} opacity={on ? 0.9 : 1} />
          })}
          <text x="0" y="92" fontFamily="Geist, sans-serif" fontSize="8" fontWeight="600" fill={t.fg}>5 bookings today · 0 no-shows</text>
        </g>
      )
    case 'chart':
      return (
        <g>
          {[['ChatGPT', 0.82], ['Perplexity', 0.64], ['Gemini', 0.48], ['Claude', 0.7]].map(([n, v], i) => (
            <g key={n as string} transform={`translate(0 ${i * 13})`}>
              <text x="0" y="7" fontFamily="Geist, sans-serif" fontSize="6.5" fill={t.fg} opacity=".6">{n as string}</text>
              <rect x="40" y="2" width="70" height="6" rx="3" fill={t.bg} />
              <rect x="40" y="2" width={70 * (v as number)} height="6" rx="3" fill={t.accent} />
            </g>
          ))}
          <g transform="translate(124 0)">
            <text x="0" y="8" fontFamily="Geist, sans-serif" fontSize="6.5" fill={t.fg} opacity=".6">Visibility</text>
            <text x="0" y="28" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700" fill={t.fg}>68%</text>
            <text x="0" y="38" fontFamily="Geist, sans-serif" fontSize="6.5" fontWeight="600" fill="#16A05C">+12 this week</text>
          </g>
          <polyline points="0,90 30,84 60,86 90,72 120,70 150,58 188,52" fill="none" stroke={t.accent} strokeWidth="2.5" strokeLinejoin="round" />
          <polyline points="0,90 30,88 60,86 90,85 120,82 150,80 188,78" fill="none" stroke={t.fg} strokeOpacity=".2" strokeWidth="2" strokeLinejoin="round" />
        </g>
      )
    case 'chat':
      return (
        <g>
          <rect x="0" y="0" width="112" height="22" rx="8" fill={t.bg} />
          <rect x="8" y="6" width="80" height="4" rx="2" fill={t.fg} opacity=".5" />
          <rect x="8" y="13" width="56" height="3" rx="1.5" fill={t.fg} opacity=".25" />
          <rect x="60" y="30" width="128" height="34" rx="8" fill={t.accent} />
          <rect x="70" y="38" width="96" height="4" rx="2" fill="#fff" opacity=".9" />
          <rect x="70" y="46" width="72" height="4" rx="2" fill="#fff" opacity=".6" />
          <rect x="70" y="54" width="40" height="5" rx="2.5" fill="#fff" opacity=".3" />
          <rect x="0" y="72" width="70" height="20" rx="8" fill={t.bg} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={14 + i * 10} cy="82" r="3" fill={t.fg} opacity=".5">
              <animate attributeName="opacity" values=".5;.12;.5" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <circle cx="178" cy="84" r="9" fill={t.accent} />
          <path d="M174 84h8M178 80v8" stroke="#fff" strokeWidth="1.6" />
        </g>
      )
  }
}
