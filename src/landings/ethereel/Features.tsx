import { useRef, type ReactNode } from 'react'
import { useInView } from 'motion/react'
import { Check, X } from 'lucide-react'
import { Pill, Reveal, useClock } from './shared'
import { Caption, Cutaway, FollowCard, Phone, PlatformOverlay, Scene, type CutKind } from './reel'

/** A looping clock for a feature visual that runs only while the visual is 30% in view. */
function useVisClock(dur: number, poster = dur - 0.05) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const { t, reduce } = useClock(dur, inView, poster)
  return { ref, t, reduce }
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** Deterministic pseudo-random 0..1 for waveform bars. */
const rnd = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }

/* ---------- 7.1 waveform with removed pauses ---------- */
function SilenceVis() {
  const { ref, t } = useVisClock(6)
  const W = 520, H = 170, N = 104
  const pauses: [number, number][] = [[24, 34], [58, 66], [82, 92]]
  const inPause = (i: number) => pauses.some(([a, b]) => i >= a && i < b)
  const x = (i: number) => 10 + (i / N) * (W - 20)
  const ph = (t / 6) * (W - 20) + 10
  const cuts = pauses.filter(([a]) => ph > x(a)).length
  return (
    <div className="er-shot" ref={ref}>
      <div className="er-shot-bar"><span>take_04.mov</span><span className="er-num er-fixed" style={{ width: 128 }}>{cuts * 5} cuts · {cuts ? `-${(cuts * 3.7).toFixed(1)}` : '0.0'} s</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="er-svg" role="img" aria-label="Waveform of a take with three long pauses shaded for removal, keeping 120 ms before and 100 ms after each cut">
        {pauses.map(([a, b]) => (
          <g key={a}>
            <rect x={x(a)} y={22} width={x(b) - x(a)} height={H - 52} fill="var(--accent-soft)" stroke="var(--accent-edge)" />
            <line x1={x(a)} x2={x(a)} y1={22} y2={H - 30} stroke="var(--accent)" strokeDasharray="2 3" />
            <line x1={x(b)} x2={x(b)} y1={22} y2={H - 30} stroke="var(--accent)" strokeDasharray="2 3" />
            <text x={(x(a) + x(b)) / 2} y={16} textAnchor="middle" className="er-svg-label er-svg-accent">cut</text>
            <path d={`M${x(a) - 12} ${H - 22} H${x(a)}`} stroke="var(--ink)" strokeWidth="1" />
            <path d={`M${x(b)} ${H - 22} H${x(b) + 10}`} stroke="var(--ink)" strokeWidth="1" />
          </g>
        ))}
        <text x={x(24) - 14} y={H - 8} textAnchor="end" className="er-svg-label">120 ms kept</text>
        <text x={x(34) + 12} y={H - 8} className="er-svg-label">100 ms kept</text>
        {Array.from({ length: N }, (_, i) => {
          const q = inPause(i)
          const h = q ? 2 + rnd(i) * 4 : 12 + rnd(i) * 70 * (0.6 + 0.4 * Math.sin(i / 5))
          const mid = (H - 30 + 22) / 2
          return <rect key={i} x={x(i) - 1.4} y={mid - h / 2} width={2.8} height={h} fill={q ? 'var(--ghost)' : 'var(--ink)'} opacity={q ? 1 : 0.82} />
        })}
        <line x1={ph} x2={ph} y1={18} y2={H - 28} stroke="var(--accent)" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

/* ---------- 7.2 caption still plus vocabulary ---------- */
const VOCAB = ['Supabase', 'Ethereel', '@mayabuilds', 'Next.js', 'Stripe']
function CaptionVis() {
  const { ref, t } = useVisClock(4.2)
  const fixed = t > 1.6
  const pageText = t < 1.2 ? 'I built it' : fixed ? 'all on Supabase' : 'all on super base'
  return (
    <div className="er-duo" ref={ref}>
      <Phone className="er-phone-sm" ariaLabel="Reel still with the caption: all on Supabase">
        <div className="er-reel">
          <Scene t={t} speaking look="graded" zoom={1.12} />
          <Caption text={pageText} />
        </div>
      </Phone>
      <div className="er-shot er-vocab">
        <div className="er-shot-bar"><span>Settings · Captions</span></div>
        <div className="er-vocab-body">
          <p className="er-mini-label">Vocabulary</p>
          <div className="er-chips">
            {VOCAB.map((v) => <span key={v} className={`er-chip${v === 'Supabase' && t > 1.2 && t < 2.6 ? ' hot' : ''}`}>{v}</span>)}
          </div>
          <p className="er-mini-label">Spelling fixes</p>
          <ul className="er-fixes">
            <li><s>super base</s><span aria-hidden="true">→</span><b>Supabase</b>{fixed && <Check size={12} className="er-ok" aria-label="applied" />}</li>
            <li><s>ether reel</s><span aria-hidden="true">→</span><b>Ethereel</b></li>
            <li><s>may a builds</s><span aria-hidden="true">→</span><b>@mayabuilds</b></li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ---------- 7.3 three cutaway stills: the hand-drawn diagram tile ---------- */
const CUTS: [CutKind, string, string][] = [['flow', 'Flow', 'film, upload, post'], ['versus', 'Versus', 'sixty minutes or five'], ['graph', 'Graph', 'one a day, every day']]
function CutawayVis() {
  const { ref, t } = useVisClock(6.5, 6)
  return (
    <div className="er-trio" ref={ref}>
      {CUTS.map(([k, label, cap], i) => (
        <Phone key={k} className="er-phone-sm" ariaLabel={`${label} cutaway: a hand-drawn diagram on an exercise-book page`} label={<Pill tone="grey">{label}</Pill>}>
          <div className="er-reel">
            <Cutaway kind={k} p={clamp(t - i * 0.35, 0, 6)} />
            <Caption text={cap} ink />
          </div>
        </Phone>
      ))}
    </div>
  )
}

/* ---------- 7.4 Review screen with the revision dialog ---------- */
const ASK = 'The word at 0:12 should be Supabase'
function ReviewVis() {
  const { ref, t } = useVisClock(7, 6.9)
  const chars = Math.floor(clamp((t - 0.6) * 18, 0, ASK.length))
  return (
    <div className="er-shot er-review" ref={ref}>
      <div className="er-shot-bar"><span>Review</span><span className="er-faint">3 waiting</span></div>
      <div className="er-review-body">
        <Phone className="er-phone-xs" ariaLabel="Reel preview with TikTok buttons drawn on top">
          <div className="er-reel">
            <Scene t={t} speaking look="graded" />
            <Caption text="built on Supabase" />
          </div>
          <PlatformOverlay kind="tiktok" safe />
        </Phone>
        <div className="er-review-side">
          <p className="er-mini-label">Post caption</p>
          <div className="er-input">Editing one reel used to take me an hour <span className="er-faint er-num">41/90</span></div>
          <div className="er-input er-input-tall">I film one take and Ethereel does the rest. #buildinpublic</div>
          <div className="er-review-actions">
            <span className="er-fake-btn er-fake-primary">Pass</span>
            <span className="er-fake-btn">Request revision</span>
            <span className="er-fake-btn">Reject</span>
          </div>
        </div>
      </div>
      <div className="er-dialog" role="presentation">
        <div className="er-dialog-head"><b>Request revision</b><X size={14} aria-hidden="true" /></div>
        <div className="er-input er-input-focus" aria-label="Revision request">
          {ASK.slice(0, chars)}<span className="er-caret" aria-hidden="true" />
        </div>
        <p className="er-faint er-dialog-help">Say what to change in plain words. You can undo it.</p>
        <div className="er-dialog-foot">
          <span className="er-fake-btn">Cancel</span>
          <span className={`er-fake-btn er-fake-primary${chars === ASK.length ? ' ready' : ''}`}>Request revision</span>
        </div>
      </div>
    </div>
  )
}

/* ---------- 7.5 queue: five slots a day ---------- */
const DAYS = ['Mon 13', 'Tue 14', 'Wed 15', 'Thu 16', 'Fri 17', 'Sat 18', 'Sun 19']
const SLOTS = ['9am', '11am', '2pm', '5pm', '7pm']
const TODAY = 2
const FILLED: Record<string, string> = {
  '0-0': 'Pricing myths', '0-3': 'Day 44', '1-1': 'Cold email', '1-2': 'Day 45', '1-4': 'My stack',
  '2-0': 'Day 46', '2-2': 'Onboarding', '3-1': 'Day 47', '3-3': 'Client Q&A', '4-0': 'Day 48',
}
const NEW_KEY = '2-3'
function QueueVis() {
  const { ref, t, reduce } = useVisClock(5.2)
  const landed = reduce || t > 1.2
  const toast = reduce || (t > 1.3 && t < 4.4)
  const cell = (d: number, s: number) => {
    const key = `${d}-${s}`
    const isNew = key === NEW_KEY
    const title = isNew ? (landed ? 'Raw to reel' : null) : FILLED[key]
    const past = d < TODAY || (d === TODAY && s < 2)
    return (
      <div key={key} className={`er-slot${past ? ' past' : ''}${isNew && landed ? ' new' : ''}`} role="gridcell" aria-label={`${DAYS[d]} ${SLOTS[s]}${title ? `: ${title}` : ': free'}`}>
        {title && (
          <span className="er-slot-card">
            <i className="er-slot-thumb" aria-hidden="true" />
            <span className="er-slot-title">{title}</span>
            <span className="er-slot-plat" aria-hidden="true"><b>TT</b><b>IG</b></span>
          </span>
        )}
      </div>
    )
  }
  return (
    <div className="er-shot er-queue" ref={ref}>
      <div className="er-shot-bar"><span>Queue · Week of 13 Oct</span><span className="er-faint">Europe/London</span></div>
      <div className="er-qgrid" role="grid" aria-label="Queue week view with five posting slots a day">
        <div className="er-qrow er-qhead" role="row">
          <span className="er-qtime" />
          {DAYS.map((d, i) => <span key={d} role="columnheader" className={i === TODAY ? 'today' : ''}>{d}</span>)}
        </div>
        {SLOTS.map((s, si) => (
          <div className="er-qrow" role="row" key={s}>
            <span className="er-qtime er-num" role="rowheader">{s}</span>
            {DAYS.map((_, di) => cell(di, si))}
          </div>
        ))}
      </div>
      <div className="er-qday" aria-label="Wednesday 15 October">
        <div className="er-qday-chips" aria-hidden="true">
          {DAYS.slice(1, 6).map((d, i) => <span key={d} className={i + 1 === TODAY ? 'on' : ''}>{d}</span>)}
        </div>
        {SLOTS.map((s, si) => (
          <div key={s} className="er-qday-row">
            <span className="er-num er-qtime">{s}</span>
            {cell(TODAY, si)}
          </div>
        ))}
      </div>
      <div className={`er-toast${toast ? ' on' : ''}`} role="presentation">
        <Check size={13} aria-hidden="true" /> Reel scheduled for Wed 17:00
      </div>
    </div>
  )
}

/* ---------- 7.6 two-lane sound ---------- */
function SoundVis() {
  const { ref, t } = useVisClock(6)
  const W = 520, N = 120
  const x = (i: number) => 64 + (i / N) * (W - 76)
  const dipA = 70, dipB = 92
  const ph = 64 + (t / 6) * (W - 76)
  const lufs = (-14 + Math.sin(t * 3.1) * 0.15).toFixed(1)
  return (
    <div className="er-shot" ref={ref}>
      <div className="er-shot-bar"><span>Mix</span><span className="er-num er-fixed" style={{ width: 96 }}>{lufs} LUFS</span></div>
      <svg viewBox={`0 0 ${W} 190`} className="er-svg" role="img" aria-label="Two lanes: the voice lane is loud, the music lane sits about 25 dB lower and dips again under a diagram cutaway">
        <rect x={x(dipA)} y={10} width={x(dipB) - x(dipA)} height={170} fill="var(--accent-soft)" stroke="var(--accent-edge)" />
        <text x={(x(dipA) + x(dipB)) / 2} y={176} textAnchor="middle" className="er-svg-label er-svg-accent">diagram</text>
        <text x={8} y={58} className="er-svg-label">Voice</text>
        <text x={8} y={134} className="er-svg-label">Music</text>
        <text x={8} y={148} className="er-svg-label er-svg-faint">-25 dB</text>
        <line x1={64} x2={W - 12} y1={56} y2={56} stroke="var(--hairline)" />
        <line x1={64} x2={W - 12} y1={136} y2={136} stroke="var(--hairline)" />
        {Array.from({ length: N }, (_, i) => {
          const v = 8 + rnd(i) * 34 * (0.55 + 0.45 * Math.abs(Math.sin(i / 7)))
          const dip = i >= dipA && i < dipB
          const m = (dip ? 2 : 6) + rnd(i + 300) * (dip ? 2 : 6)
          return (
            <g key={i}>
              <rect x={x(i) - 1.2} y={56 - v / 2} width={2.4} height={v} fill="var(--ink)" opacity="0.82" />
              <rect x={x(i) - 1.2} y={136 - m / 2} width={2.4} height={m} fill="var(--accent)" opacity="0.7" />
            </g>
          )
        })}
        <line x1={ph} x2={ph} y1={14} y2={160} stroke="var(--accent)" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

/* ---------- 7.7 brand: opener, follow card, graded close-up ---------- */
function BrandVis() {
  const { ref, t } = useVisClock(5)
  const split = 50 + Math.sin(t * 1.25) * 28
  return (
    <div className="er-trio" ref={ref}>
      <Phone className="er-phone-sm" ariaLabel="Opening title: Build notes, episode 12, with a hand-drawn underline" label={<Pill tone="grey">Opener</Pill>}>
        <div className="er-reel">
          <Scene t={t} speaking look="graded" />
          <div className="er-title" style={{ opacity: 1 }}>
            <span className="er-title-sub">Ep. 12</span>
            <span className="er-title-main">Build notes</span>
            <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
              <path d="M3 7 C22 3 46 9 64 5.4 C76 3.6 88 5 97 6.4" pathLength={1} fill="none" stroke="var(--reel-red)" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - clamp((t - 0.3) / 0.6)} />
            </svg>
          </div>
        </div>
      </Phone>
      <Phone className="er-phone-sm" ariaLabel="Follow card with the handle @mayabuilds turning to Following" label={<Pill tone="grey">Follow card</Pill>}>
        <div className="er-reel">
          <Scene t={t} speaking={false} look="graded" />
          <FollowCard p={(t % 5) * 0.9} />
          <Caption text="follow me" />
        </div>
      </Phone>
      <Phone className="er-phone-sm" ariaLabel="Graded close-up: the warm look compared with the flat raw colour" label={<Pill tone="grey">Look: Warm film</Pill>}>
        <div className="er-reel er-grade">
          <Scene t={t} speaking look="raw" zoom={1.45} />
          <div className="er-grade-top" style={{ clipPath: `inset(0 0 0 ${split}%)` }}><Scene t={t} speaking look="graded" zoom={1.45} /></div>
          <i className="er-grade-line" style={{ left: `${split}%` }} aria-hidden="true" />
        </div>
      </Phone>
    </div>
  )
}

type Row = { id: string; eyebrow: string; h3: ReactNode; body: string; ticks: [string, string, string]; vis: ReactNode; wide?: boolean }
const ROWS: Row[] = [
  { id: 'silence', eyebrow: 'Silence cutting', h3: 'Tight, but never choppy.', body: 'Ethereel measures how loud your voice is and cuts only the pauses longer than 400 ms, keeping a breath on either side. Clicks and lip smacks do not fool it.', ticks: ['Adaptive to your mic', 'Breath kept around every cut', 'Clicks ignored'], vis: <SilenceVis /> },
  { id: 'captions', eyebrow: 'Captions', h3: 'Your words, spelled your way.', body: 'Add your product names and handles once. Ethereel primes the transcript with them and fixes the usual mishearings, then shows 2 to 4 words at a time, right where people look.', ticks: ['Your vocabulary list', 'Clean 2 to 4 word pages', 'Fix any word in one sentence'], vis: <CaptionVis /> },
  { id: 'cutaways', eyebrow: 'Cutaways', h3: 'A hand-drawn diagram when the point needs one.', body: 'When you explain a process, a comparison or a number, Ethereel draws it on an exercise-book page while you keep talking. Drop in screenshots and they appear when you mention them.', ticks: ['Flow, versus, number, list, graph', 'Your screenshots as prints', 'Never more than 4 a reel'], vis: <CutawayVis /> },
  { id: 'review', eyebrow: 'Review', h3: 'Nothing posts until you say so.', body: 'Watch every reel with the TikTok or Instagram buttons on top, so nothing hides under the like button. Pass it, reject it, or ask for a change in plain words.', ticks: ['Platform overlays', 'Plain-language revisions', 'Undo any change'], vis: <ReviewVis />, wide: true },
  { id: 'queue', eyebrow: 'Queue', h3: 'Five good slots a day, in your time zone.', body: 'Pass a reel and it takes the next free slot: 9am, 11am, 2pm, 5pm or 7pm, or your own times. Ethereel posts to TikTok and Instagram with the cover frame set and sends you the live links.', ticks: ['Your posting times', 'TikTok and Instagram', 'Live links back in the app'], vis: <QueueVis />, wide: true },
  { id: 'sound', eyebrow: 'Sound', h3: 'Loud enough for the feed. Music that stays out of the way.', body: 'Every reel is levelled to the loudness TikTok and Instagram expect. Music sits about 25 dB under your voice and dips again under a diagram. Cuts get tiny fades so they never click.', ticks: ['Levelled to -14 LUFS', 'Music under your voice', 'No clicks at cuts'], vis: <SoundVis /> },
  { id: 'brand', eyebrow: 'Brand', h3: 'Your series, your handle, your look.', body: 'An opening title with your series name and a hand-drawn underline, a follow card when you say "still watching, follow me", and your colour preset on the footage. Set it once.', ticks: ['Series title opener', 'Follow card on your cue', 'Five looks or your own'], vis: <BrandVis /> },
]


export function Features() {
  return (
    <section className="er-section" id="features" aria-labelledby="features-h">
      <div className="er-rail er-pad">
        <h2 id="features-h" className="er-sr">Features</h2>
        <div className="er-rows">
          {ROWS.map((r, i) => (
            <article key={r.id} className={`er-row${i % 2 ? ' flip' : ''}${r.wide ? ' wide' : ''}`} aria-labelledby={`f-${r.id}`}>
              <Reveal className="er-row-copy">
                <Pill dot>{r.eyebrow}</Pill>
                <h3 id={`f-${r.id}`}>{r.h3}</h3>
                <p>{r.body}</p>
                <ul className="er-ticks">
                  {r.ticks.map((tk) => <li key={tk}><Check size={14} strokeWidth={2} aria-hidden="true" />{tk}</li>)}
                </ul>
              </Reveal>
              <Reveal className="er-row-vis" delay={0.08}>{r.vis}</Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
