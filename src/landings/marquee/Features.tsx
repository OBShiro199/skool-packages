import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ShieldCheck } from 'lucide-react'
import { CONCEPTS, Face, TITLE, Thumb, type Expr } from './Thumb'
import { CtrChart, ScheduleStrip } from './Parts'
import { EASE, Eyebrow, LiveDot, MORPH, Reveal, Ticks, VarTag, useCount, useLoop } from './shared'

function Tile({ span, id, eyebrow, title, body, bullets, children, label }: {
  span: 2 | 3 | 4; id?: string; eyebrow: string; title: string; body: string; bullets: string[]; children: ReactNode; label: string
}) {
  return (
    <Reveal className={`mq-tile mq-span-${span}`} id={id}>
      <div className="mq-tile-vis" role="img" aria-label={label}>{children}</div>
      <div className="mq-tile-text">
        <span className="mq-kicker">{eyebrow}</span>
        <h3 className="mq-h3">{title}</h3>
        <p className="mq-body">{body}</p>
        <Ticks items={bullets} />
      </div>
    </Reveal>
  )
}

/* 7.1 Faces grid: 8 cut-outs on a checkerboard with expression pills; one is always "Cutting out". */
const FACES: { e: Expr; l: string; shirt: string }[] = [
  { e: 'shocked', l: 'Shocked', shirt: '#2f6f6c' }, { e: 'smile', l: 'Happy', shirt: '#364fc7' },
  { e: 'think', l: 'Thinking', shirt: '#f59f00' }, { e: 'serious', l: 'Serious', shirt: '#212529' },
  { e: 'point', l: 'Pointing', shirt: '#c2255c' }, { e: 'grin', l: 'Excited', shirt: '#2f9e44' },
  { e: 'shocked', l: 'Shocked', shirt: '#7048e8' }, { e: 'smile', l: 'Happy', shirt: '#e8590c' },
]
function FacesVis() {
  const { ref, step } = useLoop(8, 1500, 7)
  return (
    <div ref={ref} className="mq-faces">
      {FACES.map((f, i) => {
        const cutting = i === step
        return (
          <div key={i} className="mq-face">
            <div className="mq-checker">
              <motion.div initial={false} animate={{ opacity: cutting ? 0.25 : 1 }} transition={{ duration: 0.3 }}><Face expr={f.e} shirt={f.shirt} /></motion.div>
            </div>
            <span className={`mq-pill ${cutting ? 'is-on' : ''}`}>{cutting ? <><LiveDot /> Cutting out</> : f.l}</span>
          </div>
        )
      })}
    </div>
  )
}

/* 7.2 A YouTube-style wall of the six concepts; one regenerates at a time. */
function ConceptsVis() {
  const { ref, step } = useLoop(12, 900, 11)
  const regen = step % 2 === 0 ? Math.floor(step / 2) : -1
  return (
    <div ref={ref} className="mq-wall">
      {CONCEPTS.map((c, i) => (
        <div key={c.angle} className="mq-yt">
          <div className="mq-yt-frame">
            <span className="mq-loading" />
            <motion.div className="mq-g-img" initial={false} animate={{ opacity: regen === i ? 0 : 1 }} transition={{ duration: 0.2 }}><Thumb c={c} /></motion.div>
            <span className="mq-yt-angle">{c.angle}</span>
          </div>
          <div className="mq-yt-meta">
            <span className="mq-yt-av" aria-hidden="true" />
            <div>
              <b>{TITLE}</b>
              <span>{regen === i ? <><LiveDot /> Painting (1 credit)</> : 'Your channel · 18:42'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* 7.3 The editor with the safe-zone overlay and the phone preview; the face swaps each loop. */
function EditorVis() {
  const { ref, step } = useLoop(2, 2200, 1)
  const expr: Expr = step === 1 ? 'shocked' : 'smile'
  return (
    <div ref={ref} className="mq-ed">
      <div className="mq-ed-stage">
        <Thumb c={CONCEPTS[0]} expr={expr} safe />
        <span className="mq-sel mq-sel-sm" aria-hidden="true" />
      </div>
      <div className="mq-ed-row">
        <div className="mq-chips">
          <span className={`mq-pill ${expr === 'smile' ? 'is-on' : ''}`}>Smile</span>
          <span className={`mq-pill ${expr === 'shocked' ? 'is-on' : ''}`}>Shocked</span>
        </div>
        <div className="mq-ed-phone"><Thumb c={CONCEPTS[0]} expr={expr} /></div>
      </div>
    </div>
  )
}

/* 7.4 Test detail: the schedule strip moves day by day, the CTR chart draws, numbers tick. */
function TestVis() {
  const { ref, step, inView } = useLoop(8, 1100, 7)
  const once = useInView(ref, { once: true, amount: 0.3 })
  const conf = useCount(97, 1200, once, 600)
  return (
    <div ref={ref} className="mq-test">
      <div className="mq-test-head">
        <span className="mq-test-title">{TITLE}</span>
        <span className="mq-chip-run"><LiveDot /> Running</span>
      </div>
      <ScheduleStrip today={step} />
      <div className="mq-test-body">
        <CtrChart draw={once && inView} w={300} h={96} delay={0.2} />
        <table className="mq-nums">
          <thead><tr><th scope="col">Variant</th><th scope="col">Impr.</th><th scope="col">CTR</th><th scope="col">Avg view</th></tr></thead>
          <tbody>
            <tr><td><VarTag v="A" /></td><td className="mq-num">41,208</td><td className="mq-num">4.4%</td><td className="mq-num">7:41</td></tr>
            <tr className="is-lead"><td><VarTag v="B" /></td><td className="mq-num">40,377</td><td className="mq-num">5.9%</td><td className="mq-num">7:48</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mq-conf">
        <span>How sure</span>
        <span className="mq-conf-bar"><motion.span initial={false} animate={{ scaleX: conf / 100 }} transition={{ duration: 0.4, ease: MORPH }} /></span>
        <span className="mq-num mq-conf-n">{conf}%</span>
        <span className="mq-conf-word">Very likely B</span>
      </div>
    </div>
  )
}

/* 7.5 Guardrail: clicks up, watch time down, so no winner. */
function GuardVis() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const bar = (v: number, d: number) => ({ initial: { scaleX: reduce ? v : 0 }, animate: { scaleX: inView ? v : 0 }, transition: { duration: reduce ? 0 : 0.6, delay: reduce ? 0 : d, ease: MORPH } })
  return (
    <div ref={ref} className="mq-guard">
      <div className="mq-guard-head"><span className="mq-guard-i"><ShieldCheck size={14} aria-hidden="true" /></span><b>No clear winner</b><span className="mq-tag-grey">Original kept</span></div>
      <div className="mq-guard-rows">
        <div className="mq-guard-row"><span>Clicks (CTR)</span><span className="mq-gbar"><motion.span className="is-up" {...bar(0.68, 0.2)} /></span><span className="mq-num mq-up">+18% <VarTag v="C" /></span></div>
        <div className="mq-guard-row"><span>Avg view duration</span><span className="mq-gbar"><motion.span className="is-down" {...bar(0.42, 0.5)} /></span><span className="mq-num mq-down">−22% <VarTag v="C" /></span></div>
      </div>
      <motion.p className="mq-guard-line" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ duration: 0.36, delay: reduce ? 0 : 1.1, ease: EASE }}>
        C got more clicks, but viewers left sooner. Marquee kept your original.
      </motion.p>
    </div>
  )
}

/* 7.6 Channels list with 4 channels and a tests table. */
const CHANNELS = [
  { n: 'Build With Noor', s: '212K', tests: 3, hue: '#d6336c' },
  { n: 'Garage Lab', s: '48K', tests: 1, hue: '#1c7ed6' },
  { n: 'Field Notes', s: '96K', tests: 2, hue: '#2f9e44' },
  { n: 'Ana Cooks Fast', s: '31K', tests: 0, hue: '#f59f00' },
]
function ChannelsVis() {
  const { ref, step } = useLoop(4, 1600, 0)
  return (
    <div ref={ref} className="mq-ch">
      <ul className="mq-ch-list">
        {CHANNELS.map((c) => (
          <li key={c.n}>
            <span className="mq-ch-av" style={{ background: c.hue }} aria-hidden="true">{c.n[0]}</span>
            <span className="mq-ch-n">{c.n}</span>
            <span className="mq-num mq-ch-s">{c.s}</span>
            <span className="mq-ch-t">{c.tests > 0 ? <><LiveDot /> <span className="mq-num">{c.tests}</span> running</> : 'No tests'}</span>
          </li>
        ))}
      </ul>
      <div className="mq-ch-tests">
        {[0, 1].map((r) => (
          <div key={r} className="mq-ch-row">
            <div className="mq-ch-xs"><Thumb c={CONCEPTS[r === 0 ? 3 : 5]} badge={false} /></div>
            <div className="mq-ch-strip">{(['A', 'B', 'B', 'A'] as const).map((v, i) => <span key={i} className={`mq-cell mq-cell-xs mq-var-${v.toLowerCase()} ${i === (step + r) % 4 ? 'is-today' : ''}`}>{v}</span>)}</div>
            <span className="mq-num mq-ch-day">Day {((step + r) % 4) + 3} of 8</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ASCII = String.raw` day        1   2   3   4   5   6   7   8
 live       A   B   B   A   B   A   A   B
            |   |   |   |   |   |   |   |
 A days     1 +         4 +     6 + 7       = 18  -> average day 4.5
 B days         2 + 3 +     5 +         8   = 18  -> average day 4.5

 Same average day, so a slow start or a busy weekend
 lands on both thumbnails equally.

 CTR = clicks / impressions, summed per variant
 A   1,813 / 41,208 = 4.4%
 B   2,382 / 40,377 = 5.9%        (5.9 - 4.4) / 4.4 = +34%
 guardrail: avg view duration  A 7:41   B 7:48   -> B may win`

export function Features() {
  return (
    <section className="mq-section" id="features" aria-labelledby="mq-feat-h">
      <div className="mq-wrap">
        <Reveal className="mq-head">
          <Eyebrow>Features</Eyebrow>
          <h2 id="mq-feat-h" className="mq-h2">Your face, six ideas, an editor and a fair test.</h2>
        </Reveal>
        <div className="mq-bento">
          <Tile span={2} eyebrow="Face library" title="Upload your face once. Every thumbnail is really you."
            body="Add 5 to 10 photos. Marquee cuts each one out with a clean edge and tags the expression, so a 'shocked' concept gets your real shocked face. No face training, no uncanny AI version of you."
            bullets={['Clean cut-outs in seconds', 'Tagged by expression, change any tag', 'Separate libraries for every person on your team']}
            label="Faces grid with eight cut-outs on a checkerboard and expression pills"
          ><FacesVis /></Tile>
          <Tile span={4} eyebrow="Concepts" title="Six angles on every title."
            body="Curiosity gap, bold claim, before and after, the big number, the reaction, the versus. Each concept takes a different angle, so you are choosing between ideas, not between shades of red."
            bullets={['Backgrounds painted for your topic', 'Headlines written to be read on a phone', 'Regenerate one idea for 1 credit']}
            label="Six concept thumbnails in a YouTube style grid, each with its angle"
          ><ConceptsVis /></Tile>
          <Tile span={2} eyebrow="Editor" title="Move it, swap it, export it under 2 MB."
            body="Drag the face, scale the headline, apply a text style, swap to another expression in one click. A live phone-size preview shows how it looks in the feed, and the export is always 1280x720 and under YouTube's limit."
            bullets={['Your brand colours and fonts', "Shows where YouTube's time badge covers the image", 'Undo, redo, autosave']}
            label="Thumbnail editor with the safe-zone overlay on and the phone preview"
          ><EditorVis /></Tile>
          <Tile span={4} id="testing" eyebrow="A/B testing" title="Let your viewers pick the winner."
            body="Choose 2 or 3 thumbnails. Marquee shows one on your video each day in a balanced order, reads impressions and click-through rate from YouTube, and tells you when a winner is real, not when it is Tuesday."
            bullets={['Balanced daily schedule that cancels out slow days', 'Shows how sure it is, in plain words', 'Puts the winner live automatically']}
            label="Test detail with the A B B A B A A B schedule strip, a CTR chart and the numbers table"
          ><TestVis /></Tile>
          <Reveal className="mq-tile mq-span-6 mq-ascii-tile">
            <div className="mq-ascii-bar"><span>why the order is A B B A B A A B</span><span>test maths</span></div>
            <pre className="mq-ascii" aria-label="Worked example: A runs on days 1, 4, 6 and 7, B on days 2, 3, 5 and 8, so both average day 4.5. A gets 1,813 clicks from 41,208 impressions, 4.4 percent. B gets 2,382 from 40,377, 5.9 percent, which is 34 percent higher, and B's watch time held, so B may win.">{ASCII}</pre>
          </Reveal>
          <Tile span={3} eyebrow="Guardrail" title="Clickbait cannot win."
            body="If a thumbnail gets more clicks but viewers leave sooner, Marquee will not crown it. Your watch time is what YouTube rewards, so it is what Marquee protects."
            bullets={['Checks average view duration for every variant', 'Keeps your original when results are unclear', 'Your original thumbnail is always backed up']}
            label="No clear winner panel: variant C has 18 percent more clicks but 22 percent less view duration"
          ><GuardVis /></Tile>
          <Tile span={3} eyebrow="Teams" title="Ten channels, one workspace."
            body="Connect every client channel, keep a face library per presenter, and give editors access without sharing anyone's Google password."
            bullets={['Up to 10 channels and 5 seats on Agency', 'Roles for owners, admins and editors', 'Results per channel for your client reports']}
            label="Channels list with four channels and a tests table"
          ><ChannelsVis /></Tile>
        </div>
      </div>
    </section>
  )
}
