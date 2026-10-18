import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Check, GripVertical, Lightbulb, Link2, Mic, PlayCircle, Sparkles } from 'lucide-react'
import { Eyebrow, KITS, MORPH, Reveal, Slide } from './shared'

/** Runs `fn` every `ms` while the element is in view and motion is allowed. */
function useTicker(ms: number, active: boolean) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setT((x) => x + 1), ms)
    return () => window.clearInterval(id)
  }, [ms, active])
  return t
}

function Tile({
  className, eyebrow, tone, title, body, ticks, children, delay = 0,
}: { className: string; eyebrow: string; tone?: 'violet' | 'peach'; title: string; body: string; ticks: string[]; children: ReactNode; delay?: number }) {
  return (
    <Reveal className={`fo-tile ${className}`} delay={delay}>
      <div className="fo-tile-visual">{children}</div>
      <div className="fo-tile-copy">
        <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
        <h3 className="fo-h3">{title}</h3>
        <p className="fo-body">{body}</p>
        <ul className="fo-ticks">
          {ticks.map((t) => <li key={t}><Check size={14} strokeWidth={2} aria-hidden="true" />{t}</li>)}
        </ul>
      </div>
    </Reveal>
  )
}

/* 7.1 Source tabs with the voice recorder live */
function SourceVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = useReducedMotion()
  const t = useTicker(1000, inView && !reduce)
  const secs = 42 + (t % 18)
  const tabs = [
    { icon: Link2, label: 'Blog URL' }, { icon: PlayCircle, label: 'YouTube' },
    { icon: Lightbulb, label: 'Idea' }, { icon: Mic, label: 'Voice note' },
  ]
  const bars = [6, 14, 22, 12, 28, 18, 34, 20, 10, 26, 16, 30, 12, 22, 8, 18, 26, 14, 20, 10, 24, 16, 28, 12]
  return (
    <div ref={ref} className="fo-src" role="img" aria-label="Source tabs with the voice note recorder active and a live waveform">
      <div className="fo-src-tabs">
        {tabs.map(({ icon: Icon, label }) => (
          <span key={label} className={label === 'Voice note' ? 'on' : ''}><Icon size={14} strokeWidth={1.5} />{label}</span>
        ))}
      </div>
      <div className="fo-src-panel">
        <div className="fo-src-rec">
          <span className="fo-live" />
          <span>Recording</span>
          <span className="fo-tab">0:{String(secs).padStart(2, '0')} / 10:00</span>
        </div>
        <div className="fo-wave">
          {bars.map((h, i) => (
            <motion.i
              key={i}
              style={{ height: h * 1.6 }}
              animate={reduce || !inView ? undefined : { scaleY: [0.35, 1, 0.5, 0.85, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: (i % 8) * 0.09, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <p className="fo-src-note">“The onboarding fix that took us from 52% to 87%…”</p>
      </div>
    </div>
  )
}

/* 7.2 Same slide, three brand kits */
function BrandVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = useReducedMotion()
  const t = useTicker(2500, inView && !reduce)
  const kits = [KITS.violet, KITS.ember, KITS.ocean]
  const k = t % 3
  return (
    <div ref={ref} className="fo-brand" role="img" aria-label="The same hook slide shown in three brand kits: Violet, Ember and Ocean">
      <div className="fo-brand-stage">
        {kits.map((kit, i) => (
          <motion.div
            key={kit.name}
            className="fo-brand-slide"
            initial={false}
            animate={{ opacity: i === k ? 1 : 0 }}
            transition={{ duration: 0.6, ease: MORPH }}
          >
            <Slide kind="hook" kit={kit} n={1} />
          </motion.div>
        ))}
      </div>
      <div className="fo-brand-kits">
        {kits.map((kit, i) => (
          <span key={kit.name} className={i === k ? 'on' : ''}>
            <i style={{ background: kit.accent }} />{kit.name}
          </span>
        ))}
      </div>
    </div>
  )
}

/* 7.3 The 8 layouts, one highlighted at a time */
const LAYOUTS = ['Hook', 'Statement', 'Bullets', 'Step', 'Quote', 'Stat', 'Compare', 'CTA']
function LayoutDiagram({ name }: { name: string }) {
  switch (name) {
    case 'Hook': return <><b className="w60" /><b className="w90 h" /><b className="w70 h" /><b className="w40 s" /></>
    case 'Statement': return <><b className="w90 h" /><b className="w80 h" /><b className="w50 s" /></>
    case 'Bullets': return <><b className="w60 h" /><b className="w70 dot" /><b className="w60 dot" /><b className="w70 dot" /></>
    case 'Step': return <><b className="num">03</b><b className="w70 h" /><b className="w90 s" /></>
    case 'Quote': return <><b className="q">“</b><b className="w90 h" /><b className="w50 s" /></>
    case 'Stat': return <><b className="num big">87%</b><b className="w60 s" /></>
    case 'Compare': return <span className="cmp"><span><b className="w90" /><b className="w70" /></span><span><b className="w90" /><b className="w70" /></span></span>
    default: return <><b className="face" /><b className="w70 h c" /><b className="w50 pill c" /></>
  }
}
function LayoutVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = useReducedMotion()
  const t = useTicker(1300, inView && !reduce)
  const on = reduce ? 0 : t % LAYOUTS.length
  return (
    <div ref={ref} className="fo-layouts" role="img" aria-label="The eight slide layouts: hook, statement, bullets, step, quote, stat, compare and call to action">
      {LAYOUTS.map((l, i) => (
        <span key={l} className={`fo-layout ${i === on ? 'on' : ''}`}>
          <span className="fo-layout-art"><LayoutDiagram name={l} /></span>
          <span className="fo-layout-name">{l}</span>
        </span>
      ))}
    </div>
  )
}

/* 7.4 Editor rail: slide 5 moves to position 2, AI popover open */
const RAIL = [
  { id: 'a', name: 'Hook' }, { id: 'b', name: 'Bullets' }, { id: 'c', name: 'Step' },
  { id: 'd', name: 'Quote' }, { id: 'e', name: 'Stat' },
]
function EditorVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduce = useReducedMotion()
  const t = useTicker(3200, inView && !reduce)
  const moved = reduce ? true : inView && t % 2 === 0
  const order = moved ? [RAIL[0], RAIL[4], RAIL[1], RAIL[2], RAIL[3]] : RAIL
  return (
    <div ref={ref} className="fo-editor" role="img" aria-label="The slide rail with the stat slide dragged from position 5 to 2, and the AI rewrite popover open">
      <ol className="fo-rail">
        {order.map((s, i) => (
          <motion.li
            key={s.id}
            layout={!reduce}
            transition={{ duration: 0.9, ease: MORPH }}
            className={s.id === 'e' ? 'drag' : s.id === 'a' ? 'sel' : ''}
          >
            <GripVertical size={14} strokeWidth={1.5} className="grip" />
            <span className="pos fo-tab">{i + 1}</span>
            <span className="thumb" />
            <span className="nm">{s.name}</span>
          </motion.li>
        ))}
      </ol>
      <div className="fo-pop">
        <span className="fo-pop-h"><Sparkles size={14} strokeWidth={1.5} />Rewrite slide 1</span>
        {['Punchier', 'Shorter', 'Add an example'].map((p, i) => (
          <span key={p} className={`fo-pop-row ${i === 0 ? 'on' : ''}`}>{p}{i === 0 && <span className="fo-live" />}</span>
        ))}
        <span className="fo-pop-foot">Undo restores the old one</span>
      </div>
    </div>
  )
}

/* 7.5 Month calendar with one chip turning green */
function CalendarVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduce = useReducedMotion()
  const t = useTicker(2600, inView && !reduce)
  const published = reduce ? true : inView && t % 2 === 1
  const chips: Record<number, { label: string; tone: string }> = {
    2: { label: 'Onboarding fix', tone: 'blue' }, 5: { label: 'Pricing teardown', tone: 'peach' },
    9: { label: '3 hiring lessons', tone: 'blue' }, 14: { label: 'Churn checklist', tone: 'violet' },
    16: { label: 'Cold email', tone: 'peach' }, 21: { label: 'Founder FAQ', tone: 'blue' },
    23: { label: 'Weekly recap', tone: 'violet' }, 26: { label: 'Case study', tone: 'peach' },
  }
  const days = Array.from({ length: 28 }, (_, i) => i + 1)
  return (
    <div ref={ref} className="fo-cal-wrap">
      <div className="fo-cal" role="img" aria-label="A month calendar of scheduled carousels; one turns green: Published, 4,812 impressions">
        <div className="fo-cal-head">
          <span>November</span>
          <span className="fo-tab fo-faint">8 scheduled</span>
        </div>
        <div className="fo-cal-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} className="fo-cal-dow">{d}</span>)}
          {days.map((d) => {
            const c = chips[d]
            const hero = d === 9
            return (
              <span key={d} className={`fo-cal-cell ${hero ? 'today' : ''}`}>
                <span className="fo-tab">{d}</span>
                {c && !hero && <span className={`fo-cchip fo-cchip-${c.tone}`}>{c.label}</span>}
                {hero && (
                  <span className="fo-cchip-slot">
                    <motion.span className="fo-cchip fo-cchip-blue" animate={{ opacity: published ? 0 : 1 }} transition={{ duration: 0.3 }}>
                      Tue 08:30 · Scheduled
                    </motion.span>
                    <motion.span className="fo-cchip fo-cchip-green" initial={false} animate={{ opacity: published ? 1 : 0 }} transition={{ duration: 0.3 }}>
                      Published · <span className="fo-tab">4,812</span> impressions
                    </motion.span>
                  </span>
                )}
              </span>
            )
          })}
        </div>
      </div>
      <p className="fo-small fo-faint">Example data</p>
    </div>
  )
}

export function Features() {
  return (
    <section className="fo-sec" id="features" aria-labelledby="fo-features-h">
      <div className="fo-sec-head">
        <h2 id="fo-features-h" className="fo-h2 fo-sr">What Folio does</h2>
      </div>
      <div className="fo-bento">
        <Tile
          className="fo-t-src" eyebrow="Any source"
          title="Blog post, YouTube video, idea or voice note."
          body="Paste a link and Folio reads the article or pulls the video transcript. Got a thought on a walk? Record a voice note on your phone and turn it into slides when you get back."
          ticks={['Blog and article URLs', 'YouTube videos and Shorts', 'Voice notes up to 10 minutes']}
        ><SourceVisual /></Tile>
        <Tile
          className="fo-t-brand" eyebrow="Brand kit" tone="peach" delay={0.04}
          title="Set your look once. Every slide follows it."
          body="Logo, colours, fonts, headshot and handle. Folio checks your colours are readable and puts your face and handle on every slide so people know who made it."
          ticks={['12 fonts or your own', 'Contrast checked', 'Several brands for agencies']}
        ><BrandVisual /></Tile>
        <Tile
          className="fo-t-write" eyebrow="Writing" delay={0.08}
          title="A hook that earns the swipe. A CTA that gets the comment."
          body="Claude writes one hook slide, 6 to 9 body slides and a call to action, choosing a layout for each one: lists, steps, stats, quotes, before and after. Numbers and names come from your source, never made up."
          ticks={['8 layouts', 'Lengths checked for every slide', 'LinkedIn caption written too']}
        ><LayoutVisual /></Tile>
        <Tile
          className="fo-t-edit" eyebrow="Editor" tone="peach" delay={0.12}
          title="Change anything. Ask AI to fix the rest."
          body="Click any text to edit it. Ask for “punchier”, “shorter” or “add an example” on one slide and undo if you prefer the old one. Drag slides into a new order."
          ticks={['AI rewrite per slide', 'Drag to reorder', 'Undo on everything']}
        ><EditorVisual /></Tile>
        <Tile
          className="fo-t-pub" eyebrow="Publish" delay={0.16}
          title="PDF for LinkedIn, PNGs for Instagram, on your calendar."
          body="Export a LinkedIn document PDF and Instagram-ready PNGs in one click. Schedule them to your profile, your company page or Instagram, and see impressions and reactions for every carousel in your library."
          ticks={['LinkedIn profile and page', 'Instagram carousels', 'Analytics per carousel (Pro)']}
        ><CalendarVisual /></Tile>
      </div>
    </section>
  )
}

