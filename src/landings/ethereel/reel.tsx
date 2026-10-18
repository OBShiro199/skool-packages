import { useId, type ReactNode } from 'react'

/* The reel look (Ethereel PRD 9.8 to 9.11): white Inter SemiBold captions with a thin black outline in
   2 to 4 word pages at 74% height, cutaways on an exercise-book page drawn in boiling felt tip, a
   series title with a hand-drawn underline, and a follow card. Everything is a pure function of the
   clip time `t`, so the same frame renders for play, scrub, sync and reduced-motion posters. */

export type CutKind = 'flow' | 'versus' | 'graph'
export type Page = { s: number; e: number; text: string }
export type ReelScript = {
  duration: number
  pages: Page[]
  zooms: [number, number][]
  jumpCuts: number[]
  cutaways: { s: number; e: number; kind: CutKind }[]
  title?: { s: number; e: number; text: string; sub: string }
  follow?: { s: number; e: number }
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

/** Splits a spoken line into 2 to 4 word pages spread evenly across [s, e]. */
export function pages(s: number, e: number, line: string): Page[] {
  const words = line.split(' ')
  const groups: string[][] = []
  let i = 0
  while (i < words.length) {
    const left = words.length - i
    let n = left <= 4 ? left : 3
    if (left === 5) n = 3
    if (/[.,?]$/.test(words[i + 1] ?? '') && n > 2) n = 2
    groups.push(words.slice(i, i + n))
    i += n
  }
  const step = (e - s) / groups.length
  return groups.map((g, k) => ({ s: s + k * step, e: s + (k + 1) * step - 0.04, text: g.join(' ') }))
}

/* ---------- scripts ---------- */

/** The 47 second demo reel (section 6). Chapters: 0:03 title, 0:09 punch-in, 0:18 diagram, 0:34 follow card. */
export const DEMO_REEL: ReelScript = {
  duration: 47,
  pages: [
    ...pages(0.3, 3, 'Editing one reel used to take me an hour.'),
    ...pages(3, 6, 'So I stopped editing. I film one take,'),
    ...pages(6.1, 9, 'send it to Ethereel, and go make coffee.'),
    ...pages(9.1, 13, 'When I come back, the pauses are gone,'),
    ...pages(13.1, 18, 'the captions are spelled right, even Supabase,'),
    ...pages(18.1, 26, 'and when I explain a process it draws it for me. Film, upload, post.'),
    ...pages(26.2, 34, 'I watch it with the TikTok buttons on top, change one word, and press pass.'),
    ...pages(34.1, 38, 'Still watching? Follow me for the next one.'),
    ...pages(38.2, 46.6, 'It posts at my next slot. Nine, eleven, two, five or seven. That is the whole edit.'),
  ],
  zooms: [[9, 13], [27.5, 30.5], [41, 44]],
  jumpCuts: [6.1, 13.1, 26.2, 38.2],
  cutaways: [{ s: 18, e: 26, kind: 'flow' }],
  title: { s: 3, e: 6.6, text: 'Build notes', sub: 'Ep. 12' },
  follow: { s: 34, e: 38 },
}

/** The 16 second hero loop. Step chips light at: pauses 0.6, captions 1, zoom 4.5, diagram 8, music 12.4. */
export const HERO_REEL: ReelScript = {
  duration: 16,
  pages: [
    ...pages(1, 4.4, 'Film one take. Send it over.'),
    ...pages(4.5, 8, 'Ethereel cuts every pause'),
    ...pages(8.1, 12, 'and draws the point for you.'),
    ...pages(12.4, 15.6, 'Then it posts. You just approve.'),
  ],
  zooms: [[4.5, 7.2]],
  jumpCuts: [0.6, 4.5, 12.4],
  cutaways: [{ s: 8, e: 12, kind: 'versus' }],
  title: { s: 1, e: 3.2, text: 'Build notes', sub: 'Ep. 12' },
  follow: { s: 13.4, e: 15.8 },
}
export const HERO_STEPS: [string, number][] = [['Pauses cut', 0.6], ['Captions', 1], ['Zoom', 4.5], ['Diagram', 8], ['Music', 12.4]]

/* ---------- scene: a person talking to camera, drawn in SVG ---------- */

export function Scene({ t, speaking, look, zoom = 1, shift = 0 }: {
  t: number; speaking: boolean; look: 'raw' | 'graded'; zoom?: number; shift?: number
}) {
  const open = speaking ? 0.7 + Math.abs(Math.sin(t * 13.1)) * 1.6 + Math.abs(Math.sin(t * 5.3)) * 0.7 : 0.45
  const blink = (t % 3.7) < 0.12 ? 0.15 : 1
  const sway = Math.sin(t * 0.8) * 0.9 + shift
  const tilt = Math.sin(t * 0.55) * 1.4
  const look2 = look === 'raw' && !speaking ? 1.5 : 0
  return (
    <svg
      className={`er-scene er-scene-${look}`}
      viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      style={{ transform: `scale(${zoom})` }}
    >
      <defs>
        <linearGradient id="er-wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8dccb" /><stop offset="1" stopColor="#c8b59c" />
        </linearGradient>
        <radialGradient id="er-glow" cx="0.2" cy="0.25" r="0.6">
          <stop offset="0" stopColor="#fff6e6" stopOpacity="0.9" /><stop offset="1" stopColor="#fff6e6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="er-jumper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b4a5e" /><stop offset="1" stopColor="#253244" />
        </linearGradient>
      </defs>
      <rect width="90" height="160" fill="url(#er-wall)" />
      <rect width="90" height="160" fill="url(#er-glow)" />
      {/* window light and shelf */}
      <rect x="4" y="14" width="22" height="34" fill="#f6efe3" opacity="0.55" />
      <line x1="15" y1="14" x2="15" y2="48" stroke="#d9c9b1" strokeWidth="0.8" />
      <rect x="58" y="44" width="32" height="2" fill="#9c7c5c" />
      <rect x="62" y="33" width="4" height="11" fill="#c2412d" opacity="0.85" />
      <rect x="66.5" y="35" width="3.5" height="9" fill="#5d7391" />
      <rect x="70.5" y="31" width="4" height="13" fill="#e2c48d" />
      <circle cx="82" cy="39" r="4.5" fill="#6f8a5a" />
      <rect x="79.5" y="40" width="5" height="4" fill="#b98a62" />
      {/* plant bottom left */}
      <ellipse cx="9" cy="120" rx="6" ry="13" fill="#6b8a58" transform="rotate(-18 9 120)" />
      <ellipse cx="15" cy="124" rx="5" ry="11" fill="#5c7a4b" transform="rotate(14 15 124)" />
      {/* person */}
      <g transform={`translate(${sway} 0)`}>
        <path d="M8 160 C10 128 22 118 36 114 L54 114 C68 118 80 128 82 160 Z" fill="url(#er-jumper)" />
        <path d="M37 113 L45 122 L53 113" fill="none" stroke="#1d2735" strokeWidth="1.2" />
        <rect x="39.5" y="96" width="11" height="18" rx="4" fill="#b98466" />
        <g transform={`rotate(${tilt} 45 84) translate(0 ${look2})`}>
          <ellipse cx="29.6" cy="80" rx="2.4" ry="4" fill="#c18c6c" />
          <ellipse cx="60.4" cy="80" rx="2.4" ry="4" fill="#c18c6c" />
          <ellipse cx="45" cy="78" rx="15.5" ry="19" fill="#cc987a" />
          <path d="M29 76 C27 58 37 52 46 53 C57 53 64 60 61 77 C59 68 54 64 47 63 C40 63 32 66 29 76 Z" fill="#2b1e18" />
          <g transform={`translate(0 ${77.5}) scale(1 ${blink}) translate(0 ${-77.5})`}>
            <ellipse cx="39" cy="77.5" rx="1.6" ry="1.4" fill="#1f1714" />
            <ellipse cx="51" cy="77.5" rx="1.6" ry="1.4" fill="#1f1714" />
          </g>
          <path d="M35.5 73.2 Q39 71.8 42.4 73" stroke="#2b1e18" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M47.6 73 Q51 71.8 54.5 73.2" stroke="#2b1e18" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M45 79 L43.8 84 L46 84.4" stroke="#a9715a" strokeWidth="0.7" fill="none" strokeLinecap="round" />
          <ellipse cx="45" cy="89" rx="3.8" ry={open} fill="#6e2f28" />
        </g>
      </g>
    </svg>
  )
}

/* ---------- felt-tip cutaway on an exercise-book page ---------- */

function D({ d, p, at, dur = 0.5, red, w = 1.1 }: { d: string; p: number; at: number; dur?: number; red?: boolean; w?: number }) {
  const k = clamp((p - at) / dur)
  return (
    <path
      d={d} pathLength={1} fill="none" stroke={red ? 'var(--reel-red)' : '#141414'} strokeWidth={w}
      strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - k}
    />
  )
}
function W({ x, y, children, p, at, size = 8, red, anchor = 'middle' }: {
  x: number; y: number; children: ReactNode; p: number; at: number; size?: number; red?: boolean; anchor?: 'middle' | 'start'
}) {
  return (
    <text
      x={x} y={y} textAnchor={anchor} fontSize={size} className="er-hand"
      fill={red ? 'var(--reel-red)' : '#141414'} opacity={clamp((p - at) / 0.25)}
    >{children}</text>
  )
}

/** Draws one of the cutaway kinds, `p` seconds into it. */
export function Diagram({ kind, p }: { kind: CutKind; p: number }) {
  if (kind === 'flow') {
    return (
      <g>
        <D p={p} at={0.1} d="M25 22 C34 21 56 21.5 66 22.4 C66.6 30 66.2 34 65.6 39 C52 39.6 36 39.2 24.6 38.6 C24.2 32 24.4 27 25 22 Z" />
        <W p={p} at={0.5} x={45} y={33.5}>Film</W>
        <D p={p} at={0.8} dur={0.3} d="M45 41 C45.4 46 44.8 50 45.2 55 M41.6 51.6 L45.2 55.6 L48.6 51.2" />
        <D p={p} at={1.2} d="M24.6 58 C36 57.2 54 57.6 66.2 58.6 C66.8 65 66.4 70 65.8 75 C52 75.8 36 75.4 25 74.6 C24.4 69 24.2 64 24.6 58 Z" />
        <W p={p} at={1.6} x={45} y={69.5}>Upload</W>
        <D p={p} at={1.9} dur={0.3} d="M45.2 77 C44.8 82 45.4 86 45 91 M41.4 87.4 L45 91.6 L48.8 87.6" />
        <D p={p} at={2.3} d="M25.2 94 C36 93.4 54 93.8 65.8 94.8 C66.4 101 66 106 65.4 111 C52 111.8 36 111.4 24.8 110.6 C24.4 105 24.6 100 25.2 94 Z" />
        <W p={p} at={2.7} x={45} y={105.5}>Post</W>
        <D p={p} at={3.1} dur={0.7} red w={1.4} d="M20 102 C19 90 34 88 47 88.6 C62 89 72 94 71 103 C70 113 56 117 42 116.4 C29 115.8 20 111 21.6 99" />
      </g>
    )
  }
  if (kind === 'versus') {
    return (
      <g>
        <W p={p} at={0.1} x={24} y={34} size={7}>by hand</W>
        <W p={p} at={0.3} x={66} y={34} size={7}>Ethereel</W>
        <D p={p} at={0.2} dur={0.4} d="M45.2 24 C44.6 44 45.4 70 44.8 92" />
        <W p={p} at={0.6} x={24} y={62} size={15}>60</W>
        <W p={p} at={0.7} x={24} y={73} size={6.5}>min a reel</W>
        <W p={p} at={1.3} x={66} y={62} size={15} red>5</W>
        <W p={p} at={1.4} x={66} y={73} size={6.5}>min of you</W>
        <D p={p} at={1.0} dur={0.4} d="M13 57 C20 54 28 51 35 47" />
        <D p={p} at={1.8} dur={0.5} red w={1.4} d="M54 77 C60 78.4 68 78 78 76.6" />
        <W p={p} at={2.2} x={45} y={110} size={9}>vs</W>
      </g>
    )
  }
  return (
    <g>
      <D p={p} at={0.1} d="M18 34 C17.6 60 18.4 90 18 112 C36 112.6 56 112.2 76 112.6" />
      <W p={p} at={0.4} x={20} y={30} size={6.5} anchor="start">reels posted</W>
      <W p={p} at={0.5} x={76} y={122} size={6.5}>weeks</W>
      <D p={p} at={0.7} dur={1} w={1.3} d="M20 108 C28 106 32 104 38 99 C44 93 48 92 54 82 C60 72 64 60 72 48" />
      <D p={p} at={1.8} dur={0.4} red w={1.4} d="M67.5 47 C67.8 42 75.6 41.8 76.2 47.6 C76.6 53 68.2 53.6 67.6 47.6" />
      <W p={p} at={2.1} x={60} y={40} size={7} red>1 a day</W>
    </g>
  )
}

export function Cutaway({ kind, p }: { kind: CutKind; p: number }) {
  const uid = useId().replace(/:/g, '')
  const seed = Math.floor(p * 8) % 3
  return (
    <div className="er-paper">
      <svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          {[0, 1, 2].map((s) => (
            <filter key={s} id={`${uid}b${s}`} x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={1} seed={s * 7 + 3} />
              <feDisplacementMap in="SourceGraphic" scale="1.1" />
            </filter>
          ))}
        </defs>
        <g filter={`url(#${uid}b${seed})`}><Diagram kind={kind} p={p} /></g>
      </svg>
    </div>
  )
}

/* ---------- overlays ---------- */

export function Caption({ text, ink, k }: { text?: string; ink?: boolean; k?: string }) {
  return (
    <div className="er-cap-zone" aria-hidden="true">
      {text && <span key={k ?? text} className={`er-cap${ink ? ' er-cap-ink' : ''}`}>{text}</span>}
    </div>
  )
}

function Title({ text, sub, p }: { text: string; sub: string; p: number }) {
  return (
    <div className="er-title" style={{ opacity: clamp(p / 0.2) }}>
      <span className="er-title-sub">{sub}</span>
      <span className="er-title-main">{text}</span>
      <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M3 7 C22 3 46 9 64 5.4 C76 3.6 88 5 97 6.4" pathLength={1} fill="none" stroke="var(--reel-red)" strokeWidth="3.4"
          strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - clamp((p - 0.2) / 0.5)}
        />
      </svg>
    </div>
  )
}

export function FollowCard({ p }: { p: number }) {
  const done = p > 1.4
  return (
    <div className="er-follow" style={{ opacity: clamp(p / 0.2), transform: `translateY(${(1 - clamp(p / 0.3)) * 6}%)` }}>
      <span className="er-follow-av" aria-hidden="true">M</span>
      <span className="er-follow-name">@mayabuilds</span>
      <span className={`er-follow-btn${done ? ' done' : ''}`}>{done ? 'Following' : 'Follow'}</span>
    </div>
  )
}

/** Renders the finished reel at time `t`. */
export function Reel({ script, t }: { script: ReelScript; t: number }) {
  const page = script.pages.find((x) => t >= x.s && t < x.e)
  const cut = script.cutaways.find((c) => t >= c.s && t < c.e)
  const zIn = script.zooms.some(([s, e]) => t >= s && t < e)
  const cuts = script.jumpCuts.filter((c) => t >= c).length
  const shift = cuts % 2 ? -2.4 : 0
  const z = (zIn ? 1.22 : 1) * (cuts % 2 ? 1.04 : 1)
  const ti = script.title && t >= script.title.s && t < script.title.e ? script.title : null
  const fo = script.follow && t >= script.follow.s && t < script.follow.e ? script.follow : null
  return (
    <div className="er-reel">
      <Scene t={t} speaking={!!page} look="graded" zoom={z} shift={shift} />
      {cut && <Cutaway kind={cut.kind} p={t - cut.s} />}
      {ti && !cut && <Title text={ti.text} sub={ti.sub} p={t - ti.s} />}
      {fo && <FollowCard p={t - fo.s} />}
      <Caption text={page?.text} ink={!!cut} k={page ? `${page.s}` : undefined} />
    </div>
  )
}

/** The raw take at time `t` (64 s long): flat colour, no captions, natural pauses. */
export function RawClip({ t, timecode = true }: { t: number; timecode?: boolean }) {
  const speaking = (t * 1.1) % 5.2 < 3.5
  return (
    <div className="er-reel">
      <Scene t={t} speaking={speaking} look="raw" />
      {timecode && <span className="er-raw-tc">{`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} / 1:04`}</span>}
    </div>
  )
}

/** A generic platform overlay (drawn, not copied): right rail, bottom text block, tab bar. */
export function PlatformOverlay({ kind = 'tiktok', safe }: { kind?: 'tiktok' | 'instagram'; safe?: boolean }) {
  return (
    <div className={`er-ovl er-ovl-${kind}`} aria-hidden="true">
      <div className="er-ovl-rail">{Array.from({ length: kind === 'tiktok' ? 5 : 4 }, (_, i) => <i key={i} />)}</div>
      <div className="er-ovl-text"><b /><i /><i /></div>
      {kind === 'tiktok' && <div className="er-ovl-tabs">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</div>}
      {safe && <div className="er-ovl-safe" />}
    </div>
  )
}

/** 9:16 phone frame: 6px radius, hairline outside, black inside, no device art. */
export function Phone({ children, className = '', label, ariaLabel }: {
  children: ReactNode; className?: string; label?: ReactNode; ariaLabel: string
}) {
  return (
    <figure className={`er-phone-wrap ${className}`}>
      <div className="er-phone" role="img" aria-label={ariaLabel}>{children}</div>
      {label && <figcaption className="er-phone-label">{label}</figcaption>}
    </figure>
  )
}
