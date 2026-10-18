import type { JSX, ReactNode } from 'react'

/**
 * One small brand mark per kit, keyed by slug. Drawn on a 24×24 grid; must read at 16px.
 *
 * Family rules: everything sits inside a 3 to 21 live area, strokes are 1.5 with round caps and
 * joins, boxes use a 2.5 to 3 corner radius, and each shape is the kit's accent hue as a soft
 * tinted fill with a darker edge of the same hue. Small solid details (a dot, a tab) use the
 * accent itself. No black, no big saturated fills.
 */

type Hue = { c: string; d: string }

/** Accent (c) and its darker edge (d), taken from each kit's landing page and design PRD. */
const H: Record<string, Hue> = {
  etcher: { c: '#3f9a6e', d: '#2c7350' },
  factorie: { c: '#8a6fdf', d: '#6248c4' },
  ethereel: { c: '#c2412d', d: '#9a3120' },
  conversate: { c: '#3c8fb0', d: '#246f8e' },
  outbounder: { c: '#6a7ee6', d: '#4559c8' },
  signet: { c: '#7f72d9', d: '#5446b8' },
  folio: { c: '#8b74e3', d: '#6a4fd0' },
  bookwell: { c: '#c7801a', d: '#93560a' },
  helpdeck: { c: '#5f86e0', d: '#3a5fc4' },
  sparring: { c: '#3f95c9', d: '#22709f' },
  marquee: { c: '#3e9e9a', d: '#24726f' },
  harvest: { c: '#4f9d8a', d: '#2f6e5f' },
  echo: { c: '#8a6be0', d: '#5b3fc0' },
  tally: { c: '#3f9a90', d: '#2b6f68' },
  halo: { c: '#c8952c', d: '#8a6212' },
  shortlist: { c: '#6c7ae0', d: '#4652b8' },
  rota: { c: '#3f9c96', d: '#1f6b66' },
  retain: { c: '#8b7fd6', d: '#5a4fb0' },
  quotient: { c: '#3fa6a0', d: '#23756f' },
  dossier: { c: '#3f9a9c', d: '#24696b' },
}

const SW = 1.5
const TINT = 0.2

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

/** Soft tinted fill with a darker edge. */
const soft = (h: Hue, tint = TINT) => ({ fill: h.c, fillOpacity: tint, stroke: h.d })
/** Line only, in the darker edge. */
const line = (h: Hue) => ({ stroke: h.d })

/** A five-point review star centred on (cx, cy). */
function star(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const k = i % 2 === 0 ? R : r
    pts.push(`${(cx + k * Math.cos(a)).toFixed(2)} ${(cy + k * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

export const MARKS: Record<string, (p: { size: number }) => JSX.Element> = {
  /** Etcher: a phone handset, the CRM your team calls from. */
  etcher: ({ size }) => {
    const h = H.etcher
    return (
      <Svg size={size}>
        <path {...soft(h)} d="M8.3 3.5H5.6a2 2 0 0 0-2 2.2c.9 7.6 7 13.7 14.6 14.6a2 2 0 0 0 2.2-2v-2.7a1.6 1.6 0 0 0-1.3-1.6l-2.9-.6a1.6 1.6 0 0 0-1.5.5l-1.2 1.3a12 12 0 0 1-5.3-5.3l1.3-1.2a1.6 1.6 0 0 0 .5-1.5l-.6-2.9a1.6 1.6 0 0 0-1.6-1.3Z" />
        <path {...line(h)} d="M14.5 3.8a6 6 0 0 1 5.7 5.7" stroke={h.c} />
      </Svg>
    )
  },

  /** Factorie: three rising bars, the tallest topped with a dot (where AI ranks you). */
  factorie: ({ size }) => {
    const h = H.factorie
    return (
      <Svg size={size}>
        <rect {...soft(h)} x="3.75" y="14" width="4" height="6.5" rx="1.25" />
        <rect {...soft(h)} x="10" y="10.5" width="4" height="10" rx="1.25" />
        <rect {...soft(h, 0.28)} x="16.25" y="7.5" width="4" height="13" rx="1.25" />
        <circle cx="18.25" cy="3.75" r="1.75" fill={h.c} />
      </Svg>
    )
  },

  /** Ethereel: a portrait reel frame with a play head. */
  ethereel: ({ size }) => {
    const h = H.ethereel
    return (
      <Svg size={size}>
        <rect {...soft(h)} x="5.75" y="2.75" width="12.5" height="18.5" rx="3" />
        <path d="M10.25 9.25v5.5l4.5-2.75Z" fill={h.c} stroke={h.d} strokeWidth="1.25" />
      </Svg>
    )
  },

  /** Conversate: two speech bubbles, the reply answered in the brand colour. */
  conversate: ({ size }) => {
    const h = H.conversate
    return (
      <Svg size={size}>
        <path {...line(h)} d="M4.5 3.75h8.5a2 2 0 0 1 2 2V7.5M8.5 12.75H8l-3 2.5v-2.5h-.5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2" />
        <path {...soft(h, 0.22)} d="M11 9.25h8.5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H19v2.5l-3-2.5h-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" />
      </Svg>
    )
  },

  /** Outbounder: a paper plane, cold email going out. */
  outbounder: ({ size }) => {
    const h = H.outbounder
    return (
      <Svg size={size}>
        <path {...soft(h)} d="M3 11 21 3l-6.6 18-3.1-8.3Z" />
        <path {...line(h)} d="M11.3 12.7 21 3" />
      </Svg>
    )
  },

  /** Signet: a pen nib, the proposal signed on the call. */
  signet: ({ size }) => {
    const h = H.signet
    return (
      <Svg size={size}>
        <path {...soft(h)} d="M12 21.25 5.75 13.5 8.5 6.25h7l2.75 7.25Z" />
        <path {...line(h)} d="M12 21.25v-7.5M8.75 3h6.5" />
        <circle cx="12" cy="11.75" r="1.6" fill={h.c} />
      </Svg>
    )
  },

  /** Folio: three slides fanned out, a carousel. */
  folio: ({ size }) => {
    const h = H.folio
    return (
      <Svg size={size}>
        <rect x="3.5" y="7" width="9" height="12" rx="2" fill="#fff" stroke={h.c} strokeOpacity="0.45" transform="rotate(-12 8 13)" />
        <rect x="7.5" y="5.5" width="9" height="12" rx="2" fill="#fff" stroke={h.c} strokeOpacity="0.75" />
        <rect {...soft(h, 0.2)} x="11.5" y="4" width="9" height="12" rx="2" transform="rotate(12 16 10)" />
      </Svg>
    )
  },

  /** Bookwell: a calendar page with the booking ticked. */
  bookwell: ({ size }) => {
    const h = H.bookwell
    return (
      <Svg size={size}>
        <rect {...soft(h)} x="3.5" y="5" width="17" height="15.5" rx="3" />
        <path {...line(h)} d="M8 3v4M16 3v4" />
        <path {...line(h)} d="m8.75 13.25 2.25 2.25 4.25-4.5" />
      </Svg>
    )
  },

  /** Helpdeck: an open book, support answered from your own docs. */
  helpdeck: ({ size }) => {
    const h = H.helpdeck
    return (
      <Svg size={size}>
        <path {...soft(h)} d="M12 6.75C10 5.25 7 4.75 3.25 5.25v13c3.75-.5 6.75 0 8.75 1.5Z" />
        <path {...soft(h, 0.28)} d="M12 6.75c2-1.5 5-2 8.75-1.5v13c-3.75-.5-6.75 0-8.75 1.5Z" />
      </Svg>
    )
  },

  /** Sparring: two squares squaring up, overlapping in the middle. */
  sparring: ({ size }) => {
    const h = H.sparring
    return (
      <Svg size={size}>
        <rect {...soft(h, 0.2)} x="2.75" y="2.75" width="12" height="12" rx="3" />
        <rect {...soft(h, 0.2)} x="9.25" y="9.25" width="12" height="12" rx="3" />
      </Svg>
    )
  },

  /** Marquee: a thumbnail frame, picture and all. */
  marquee: ({ size }) => {
    const h = H.marquee
    return (
      <Svg size={size}>
        <rect {...soft(h)} x="2.75" y="5" width="18.5" height="14" rx="3" />
        <path {...line(h)} d="m6.5 16 4-4.5 3 3 1.75-1.75L18 16" />
        <circle cx="15.75" cy="9" r="1.6" fill={h.c} />
      </Svg>
    )
  },

  /** Harvest: a sprout, warm leads grown from posts. */
  harvest: ({ size }) => {
    const h = H.harvest
    return (
      <Svg size={size}>
        <path {...soft(h)} d="M12 14.5C7.6 14.5 4.5 11.5 4.5 7c4.4 0 7.5 3 7.5 7.5Z" />
        <path {...soft(h, 0.28)} d="M12 11.5c0-4.4 3-7.5 7.5-7.5 0 4.4-3 7.5-7.5 7.5Z" />
        <path {...line(h)} d="M12 11.5v9M8 20.5h8" />
      </Svg>
    )
  },

  /** Echo: a voice and the two echoes it leaves behind. */
  echo: ({ size }) => {
    const h = H.echo
    return (
      <Svg size={size}>
        <circle {...soft(h, 0.28)} cx="6.5" cy="12" r="2.75" />
        <path {...line(h)} d="M10.36 7.4a6 6 0 0 1 0 9.2" />
        <path {...line(h)} d="M13.25 3.96a10.5 10.5 0 0 1 0 16.08" stroke={h.c} strokeOpacity="0.7" />
      </Svg>
    )
  },

  /** Tally: four strokes and the gate, a count that adds itself up. */
  tally: ({ size }) => {
    const h = H.tally
    return (
      <Svg size={size}>
        <rect x="2.75" y="4.75" width="18.5" height="14.5" rx="3" fill={h.c} fillOpacity={TINT} />
        {[6.5, 10, 13.5, 17].map((x) => <path key={x} {...line(h)} d={`M${x} 7v10`} />)}
        <path d="M4.5 15.5 19.5 8.5" stroke={h.c} />
      </Svg>
    )
  },

  /** Halo: a glowing ring around a single review star. */
  halo: ({ size }) => {
    const h = H.halo
    return (
      <Svg size={size}>
        <circle {...soft(h)} cx="12" cy="12" r="8.75" />
        <path d={star(12, 12.4, 4.6, 2.05)} fill={h.c} stroke={h.d} strokeWidth="1" />
      </Svg>
    )
  },

  /** Shortlist: a funnel, many applicants narrowed to the few. */
  shortlist: ({ size }) => {
    const h = H.shortlist
    return (
      <Svg size={size}>
        <path {...soft(h)} d="M3.5 4.25h17l-6.5 7.75v6.25l-4 2.5V12Z" />
        <path d="M6.75 7.25h10.5" stroke={h.c} strokeOpacity="0.6" />
      </Svg>
    )
  },

  /** Rota: staggered shift blocks across the week. */
  rota: ({ size }) => {
    const h = H.rota
    return (
      <Svg size={size}>
        <rect {...soft(h)} x="3" y="3.75" width="11" height="4.5" rx="2.25" />
        <rect {...soft(h, 0.28)} x="9" y="9.75" width="12" height="4.5" rx="2.25" />
        <rect {...soft(h)} x="5.5" y="15.75" width="10" height="4.5" rx="2.25" />
      </Svg>
    )
  },

  /** Retain: a magnet that holds on to customers. */
  retain: ({ size }) => {
    const h = H.retain
    return (
      <Svg size={size}>
        <path d="M4 4h5v4H4ZM15 4h5v4h-5Z" fill={h.c} fillOpacity="0.45" />
        <path {...soft(h)} d="M4 4h5v8a3 3 0 0 0 6 0V4h5v8a8 8 0 0 1-16 0Z" />
        <path {...line(h)} d="M4 8h5M15 8h5" />
      </Svg>
    )
  },

  /** Quotient: a price tag, the instant quote. */
  quotient: ({ size }) => {
    const h = H.quotient
    return (
      <Svg size={size}>
        <path {...soft(h)} d="M3.25 5.25a2 2 0 0 1 2-2h6.1a2 2 0 0 1 1.42.59l7.9 7.9a2 2 0 0 1 0 2.83l-6.1 6.1a2 2 0 0 1-2.83 0l-7.9-7.9a2 2 0 0 1-.59-1.42Z" />
        <circle cx="8" cy="8" r="1.6" fill={h.c} />
      </Svg>
    )
  },

  /** Dossier: a case folder with its tab marked. */
  dossier: ({ size }) => {
    const h = H.dossier
    return (
      <Svg size={size}>
        <path d="M3.25 8V5.5a1.5 1.5 0 0 1 1.5-1.5h4.3a1.5 1.5 0 0 1 1.2.6L12 7" fill={h.c} fillOpacity="0.7" stroke={h.d} />
        <rect {...soft(h)} x="3.25" y="7" width="17.5" height="13" rx="2.5" />
      </Svg>
    )
  },
}
