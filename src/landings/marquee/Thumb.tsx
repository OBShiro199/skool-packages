/* Thumbnails built in code: a gradient background painted for the topic, a sticker-style face cut-out
   (inline SVG with a white edge), a bold headline and a prop. No images. */

export type Expr = 'shocked' | 'smile' | 'think' | 'serious' | 'point' | 'grin'

export function Face({ expr = 'shocked', shirt = '#2f6f6c', className }: { expr?: Expr; shirt?: string; className?: string }) {
  const skin = '#e9b48e'
  const ink = '#2a1a12'
  return (
    <svg className={className} viewBox="0 0 100 120" aria-hidden="true">
      <g paintOrder="stroke" stroke="#fff" strokeWidth="5" strokeLinejoin="round">
        <path d="M14 120 C16 98 30 90 50 90 C70 90 84 98 86 120 Z" fill={shirt} />
        <rect x="42" y="74" width="16" height="20" fill={skin} />
        <ellipse cx="50" cy="50" rx="25" ry="29" fill={skin} />
        <path d="M24 46 C22 22 38 14 52 15 C68 16 80 26 76 46 C72 34 62 30 50 31 C38 31 28 36 24 46 Z" fill={ink} />
        {expr === 'point' && <path d="M84 86 L98 62 L92 59 L80 82 Z" fill={skin} />}
        {expr === 'think' && <path d="M60 92 C62 80 70 74 74 76 C78 78 74 86 70 92 Z" fill={skin} />}
      </g>
      {/* brows */}
      {expr === 'shocked' && <><path d="M33 36 Q39 31 45 35" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" /><path d="M55 35 Q61 31 67 36" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" /></>}
      {expr === 'serious' && <><path d="M33 40 L45 42" stroke={ink} strokeWidth="2.6" strokeLinecap="round" /><path d="M55 42 L67 40" stroke={ink} strokeWidth="2.6" strokeLinecap="round" /></>}
      {expr === 'think' && <><path d="M33 39 Q39 37 45 39" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" /><path d="M55 36 Q61 33 67 37" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" /></>}
      {/* eyes */}
      {expr === 'shocked' ? (
        <><circle cx="40" cy="47" r="5" fill="#fff" /><circle cx="60" cy="47" r="5" fill="#fff" /><circle cx="40" cy="47" r="2.4" fill={ink} /><circle cx="60" cy="47" r="2.4" fill={ink} /></>
      ) : expr === 'smile' || expr === 'grin' ? (
        <><path d="M35 48 Q40 44 45 48" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" /><path d="M55 48 Q60 44 65 48" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" /></>
      ) : (
        <><circle cx="40" cy="48" r="2.6" fill={ink} /><circle cx="60" cy="48" r="2.6" fill={ink} /></>
      )}
      {/* mouth */}
      {expr === 'shocked' && <ellipse cx="50" cy="66" rx="6" ry="8" fill="#5a1f1a" />}
      {expr === 'smile' && <path d="M40 62 Q50 71 60 62" stroke="#5a1f1a" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {expr === 'grin' && <path d="M38 61 Q50 76 62 61 Z" fill="#fff" stroke="#5a1f1a" strokeWidth="2.4" strokeLinejoin="round" />}
      {expr === 'think' && <path d="M44 65 Q50 63 56 66" stroke="#5a1f1a" strokeWidth="2.6" fill="none" strokeLinecap="round" />}
      {(expr === 'serious' || expr === 'point') && <path d="M42 65 L58 65" stroke="#5a1f1a" strokeWidth="2.8" strokeLinecap="round" />}
    </svg>
  )
}

export type Concept = {
  angle: string
  why: string
  bg: string
  head: string
  sub?: string
  headTone: 'light' | 'dark'
  expr: Expr
  side: 'left' | 'right'
  prop?: 'arrow' | 'circle' | 'split' | 'vs' | 'burst' | 'number'
  shirt: string
  time: string
}

export const TITLE = "I tried 30 AI tools so you don't have to"

export const CONCEPTS: Concept[] = [
  { angle: 'Curiosity', why: 'Hides which tool won, so the click is the answer.', bg: 'linear-gradient(135deg, #ffe066 0%, #ffa94d 100%)', head: 'Only 1 worked', headTone: 'dark', expr: 'shocked', side: 'right', prop: 'circle', shirt: '#2f6f6c', time: '18:42' },
  { angle: 'Bold claim', why: 'A strong opinion people want to argue with.', bg: 'linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%)', head: 'Stop paying for AI', headTone: 'light', expr: 'point', side: 'left', prop: 'arrow', shirt: '#1c1c28', time: '18:42' },
  { angle: 'Before and after', why: 'Shows the result in one glance.', bg: 'linear-gradient(90deg, #adb5bd 0%, #adb5bd 50%, #51cf66 50%, #2f9e44 100%)', head: 'Before', sub: 'After', headTone: 'light', expr: 'smile', side: 'right', prop: 'split', shirt: '#364fc7', time: '18:42' },
  { angle: 'The big number', why: 'One huge number reads at any size.', bg: 'linear-gradient(135deg, #845ef7 0%, #d6336c 100%)', head: '30 → 1', headTone: 'light', expr: 'think', side: 'right', prop: 'number', shirt: '#f59f00', time: '18:42' },
  { angle: 'The reaction', why: 'A big face does the talking.', bg: 'radial-gradient(circle at 30% 50%, #ffd43b 0%, #ff922b 45%, #e8590c 100%)', head: 'Wait…', headTone: 'light', expr: 'shocked', side: 'right', prop: 'burst', shirt: '#c2255c', time: '18:42' },
  { angle: 'The versus', why: 'Two sides make the choice obvious.', bg: 'linear-gradient(90deg, #339af0 0%, #1c7ed6 50%, #fa5252 50%, #e03131 100%)', head: '$0', sub: '$200', headTone: 'light', expr: 'serious', side: 'left', prop: 'vs', shirt: '#212529', time: '18:42' },
]

export function Thumb({ c, badge = true, expr, safe = false, className = '' }: { c: Concept; badge?: boolean; expr?: Expr; safe?: boolean; className?: string }) {
  const e = expr ?? c.expr
  return (
    <div className={`mq-thumb ${className}`} style={{ background: c.bg }}>
      {c.prop === 'burst' && <span className="mq-t-burst" aria-hidden="true" />}
      {c.prop === 'split' || c.prop === 'vs' ? (
        <>
          <span className={`mq-t-half mq-t-l mq-t-${c.headTone}`}>{c.head}</span>
          <span className={`mq-t-half mq-t-r mq-t-${c.headTone}`}>{c.sub}</span>
          {c.prop === 'vs' && <span className="mq-t-vs">vs</span>}
        </>
      ) : (
        <span className={`mq-t-head mq-t-${c.headTone} mq-t-${c.side === 'left' ? 'onright' : 'onleft'} ${c.prop === 'number' ? 'mq-t-num' : ''}`}>{c.head}</span>
      )}
      {c.prop === 'circle' && <span className="mq-t-circle" aria-hidden="true" />}
      {c.prop === 'arrow' && (
        <svg className="mq-t-arrow" viewBox="0 0 60 40" aria-hidden="true"><path d="M4 30 C20 30 30 22 40 12 M30 10 L42 10 L42 22" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
      <Face expr={e} shirt={c.shirt} className={`mq-t-face mq-t-face-${c.prop === 'vs' ? 'mid' : c.side}`} />
      {badge && <span className="mq-t-time">{c.time}</span>}
      {safe && <span className="mq-t-safe" aria-hidden="true"><span>Time badge</span></span>}
    </div>
  )
}
