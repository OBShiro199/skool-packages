import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, Check, CircleHelp, EyeOff, Hand, Link2, Loader, Pause, Play } from 'lucide-react'
import { EASE, ENGINES, EngineMark, Eyebrow, MORPH, Reveal, track, useLoopStep, type EngineId } from './shared'

/* ------------------------------------------------------------------ Problem */

const PROBLEMS: [typeof EyeOff, string, string][] = [
  [EyeOff, "You can't see it.", 'Every engine answers differently, changes week to week, and gives different answers in different countries.'],
  [Hand, "Checking by hand doesn't last.", '25 questions x 6 assistants is 150 copy-and-pastes a week. Nobody keeps that up.'],
  [CircleHelp, "You don't know what to fix.", 'Which pages do the engines read? Which competitor keeps getting cited? Where should you show up?'],
]

export function Problem() {
  return (
    <section className="fc-section" aria-labelledby="fc-problem-h">
      <div className="fc-container">
        <Reveal className="fc-head">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="fc-h2" id="fc-problem-h">Your buyers stopped Googling. They ask AI, and it names three brands.</h2>
          <p className="fc-sub">If you're not one of them, you lose the deal before you know it existed. And there's no Search Console for AI answers.</p>
        </Reveal>
        <ul className="fc-grid3">
          {PROBLEMS.map(([Icon, t, d], i) => (
            <Reveal as="li" key={t} delay={i * 0.04} className="fc-cell">
              <span className="fc-icon"><Icon size={16} strokeWidth={1.5} aria-hidden="true" /></span>
              <h3 className="fc-h3">{t}</h3>
              <p className="fc-small">{d}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="fc-chat" delay={0.12}>
          <div className="fc-chat-q">What's the best AEO tool for a SaaS startup?</div>
          <div className="fc-chat-a">
            <span className="fc-mono fc-label">Answer</span>
            <ol>
              <li>1. <b>Profound</b>, for enterprise teams with a big budget.</li>
              <li>2. <b>Searchable</b>, if you also want Google AI Overviews.</li>
              <li>3. <b>Peec AI</b>, a lighter option for smaller teams.</li>
            </ol>
            <Reveal className="fc-you" delay={0.32}><span>You</span></Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Product demo */

const CHAPTERS: [string, string, string][] = [
  ['0:00', 'Paste your URL', 'Paste your website. Factorie reads the homepage and key pages.'],
  ['0:20', 'Approve 20 prompts', 'Twenty buyer-style questions to track. Edit, delete or add your own.'],
  ['0:40', 'Watch the first check', 'Every prompt runs on every engine while you watch.'],
  ['1:05', 'Read the answers', 'Your brand in green, competitors in red, sources in blue.'],
  ['1:20', 'Your next page to write', 'One page to write next, with an outline.'],
]
const CHAPTER_MS = 4200

function TypeText({ text, active, speed = 55 }: { text: string; active: boolean; speed?: number }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) { setN(0); return }
    if (reduce) { setN(text.length); return }
    const id = window.setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed)
    return () => window.clearInterval(id)
  }, [active, reduce, text, speed])
  return <>{text.slice(0, n)}<span className="fc-caret" aria-hidden="true" /></>
}

function SceneUrl() {
  return (
    <div className="fc-scene fc-scene-url">
      <span className="fc-mono fc-label">Step 1 of 6 · Website</span>
      <div className="fc-input"><Link2 size={14} strokeWidth={1.5} aria-hidden="true" /><span className="fc-mono"><TypeText text="acmeanalytics.com" active /></span></div>
      <ul className="fc-reading fc-mono">
        {['Reading homepage', 'Reading /pricing', 'Reading /features', 'Writing brand summary'].map((l, i) => (
          <motion.li key={l} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.5, duration: 0.36, ease: EASE }}>
            <Check size={12} strokeWidth={2} aria-hidden="true" /> {l}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

const PROMPTS: [string, string][] = [
  ['best product analytics tool for SaaS', 'Best-of'],
  ['Mixpanel alternatives for startups', 'Alternatives'],
  ['how to track feature adoption', 'Problem'],
  ['Amplitude vs Acme Analytics', 'Comparison'],
  ['analytics for a PLG onboarding flow', 'Use-case'],
]
function ScenePrompts() {
  return (
    <div className="fc-scene">
      <span className="fc-mono fc-label">20 prompts · approve to start tracking</span>
      <ul className="fc-prompts">
        {PROMPTS.map(([p, tag], i) => (
          <motion.li key={p} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.18, duration: 0.36, ease: EASE }}>
            <span className="fc-check"><Check size={11} strokeWidth={2.5} aria-hidden="true" /></span>
            <span className="fc-ellipsis">{p}</span>
            <span className={`fc-tag fc-tag-${tag.toLowerCase()}`}>{tag}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function SceneRun() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setPct((p) => Math.min(100, p + 4)), 120)
    return () => window.clearInterval(id)
  }, [])
  const done = Math.round((pct / 100) * 125)
  return (
    <div className="fc-scene">
      <span className="fc-mono fc-label">First check · running</span>
      <div className="fc-run">
        <div className="fc-meter"><motion.i animate={{ scaleX: pct / 100 }} transition={{ duration: 0.3, ease: MORPH }} /></div>
        <ul className="fc-run-engines">
          {ENGINES.slice(0, 5).map((e, i) => (
            <li key={e.id}>
              <EngineMark id={e.id} size={20} />
              <span className="fc-run-state">{pct >= 30 + i * 14 ? <Check size={12} strokeWidth={2.5} className="fc-ok" aria-hidden="true" /> : <Loader size={12} strokeWidth={2} className="fc-spin" aria-hidden="true" />}</span>
            </li>
          ))}
        </ul>
        <p className="fc-mono fc-run-count"><span className="fc-slot-3">{done}</span> of 125 checks done</p>
      </div>
    </div>
  )
}

function SceneAnswer() {
  return (
    <div className="fc-scene">
      <span className="fc-mono fc-label"><EngineMark id="perplexity" /> Perplexity · "best product analytics tool for SaaS"</span>
      <Highlighted />
    </div>
  )
}

function Highlighted({ play = true }: { play?: boolean }) {
  const reduce = useReducedMotion()
  const hl = (i: number) => (reduce ? {} : { initial: { opacity: 0.25 }, animate: play ? { opacity: 1 } : { opacity: 0.25 }, transition: { delay: 0.2 + i * 0.12, duration: 0.32, ease: EASE } })
  return (
    <p className="fc-answer">
      For an early-stage SaaS team, <motion.mark className="fc-hl-comp" {...hl(0)}>Mixpanel</motion.mark> is the common default, but{' '}
      <motion.mark className="fc-hl-you" {...hl(1)} aria-label="Your brand, position 2">Acme Analytics</motion.mark> is cheaper and faster to set up.{' '}
      <motion.mark className="fc-hl-comp" {...hl(2)}>Amplitude</motion.mark> suits larger product orgs{' '}
      <motion.mark className="fc-hl-src" {...hl(3)}>g2.com</motion.mark>.
    </p>
  )
}

function SceneRec() {
  return (
    <div className="fc-scene">
      <span className="fc-mono fc-label">Recommendation · write a page</span>
      <div className="fc-rec is-open">
        <div className="fc-rec-top"><span className="fc-tag fc-tag-best-of">New page</span><Impact n={4} /></div>
        <p className="fc-rec-title">Acme Analytics vs Mixpanel for startups</p>
        <ol className="fc-outline fc-mono">
          {['H2 Who each tool suits', 'H2 Pricing at 10k users', 'H2 Setup time, side by side', 'H2 When to pick Mixpanel'].map((l, i) => (
            <motion.li key={l} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.3, duration: 0.32, ease: EASE }}>{l}</motion.li>
          ))}
        </ol>
      </div>
    </div>
  )
}

const SCENES = [SceneUrl, ScenePrompts, SceneRun, SceneAnswer, SceneRec]

export function Demo() {
  const reduce = useReducedMotion()
  const frame = useRef<HTMLDivElement>(null)
  const inView = useInView(frame, { amount: 0.5 })
  const [chapter, setChapter] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)

  // Plays when 50% in view, pauses when out. Reduced motion: poster and a play button.
  useEffect(() => {
    if (reduce || userPaused) return
    setPlaying(inView)
  }, [inView, reduce, userPaused])
  useEffect(() => {
    if (!playing) return
    const id = window.setTimeout(() => setChapter((c) => (c + 1) % SCENES.length), CHAPTER_MS)
    return () => window.clearTimeout(id)
  }, [playing, chapter])

  const toggle = () => {
    if (!playing) track('lp_video_play')
    setUserPaused(playing)
    setPlaying(!playing)
  }
  const Scene = SCENES[chapter]
  const started = playing || chapter > 0

  return (
    <section className="fc-section" id="product" aria-labelledby="fc-demo-h">
      <div className="fc-container">
        <Reveal className="fc-head">
          <Eyebrow>See it in action</Eyebrow>
          <h2 className="fc-h2" id="fc-demo-h">From website to visibility score in 10 minutes</h2>
          <p className="fc-sub">Paste your URL. Factorie reads your site, writes the questions your buyers ask, and runs the first check while you watch.</p>
        </Reveal>
        <Reveal>
          <div className="fc-player" ref={frame}>
            <div className="fc-player-screen" aria-hidden="true">
              <div className="fc-dots fc-dots-soft" />
              {started ? (
                <AnimatePresence mode="wait">
                  <motion.div key={chapter} className="fc-scene-wrap" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: EASE }}>
                    <Scene />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="fc-poster">
                  <span className="fc-mono fc-label">Overview</span>
                  <span className="fc-poster-score fc-num">34.2</span>
                  <span className="fc-mono fc-label">Visibility, all engines</span>
                </div>
              )}
            </div>
            <p className="fc-caption" aria-hidden="true">{CHAPTERS[chapter][2]}</p>
            <div className="fc-player-bar">
              <button type="button" className="fc-play" onClick={toggle} aria-label={playing ? 'Pause product demo' : 'Play product demo'}>
                {playing ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
              </button>
              <div className="fc-timeline" aria-hidden="true">
                {CHAPTERS.map((c, i) => (
                  <span key={c[0]} className={`fc-tl-seg ${i < chapter ? 'is-done' : ''} ${i === chapter ? 'is-on' : ''}`}>
                    <i style={i === chapter && playing ? { animationDuration: `${CHAPTER_MS}ms` } : undefined} className={i === chapter && playing ? 'is-running' : ''} />
                  </span>
                ))}
              </div>
              <span className="fc-mono fc-timecode">{CHAPTERS[chapter][0]} / 1:30</span>
            </div>
          </div>
          <p className="fc-sr">
            Product demo, 90 seconds: paste your website and Factorie reads your pages; approve 20 suggested buyer prompts; watch the first check run
            on every engine; read each answer with your brand highlighted green and competitors red; get the next page to write with an outline.
          </p>
          <ul className="fc-chapters" aria-label="Chapters">
            {CHAPTERS.map(([t, l], i) => (
              <li key={t}>
                <button type="button" className={`fc-chapter ${i === chapter ? 'is-on' : ''}`} aria-pressed={i === chapter}
                  onClick={() => { setChapter(i); track('lp_video_chapter', { chapter: t }); if (!reduce) { setPlaying(true); setUserPaused(false) } }}>
                  <span className="fc-mono">{t}</span> {l}
                </button>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Feature bento */

const BOARD: Record<EngineId, number[]> = {
  chatgpt: [36.0, 37.4, 35.8, 38.9],
  perplexity: [44.1, 41.2, 45.6, 43.0],
  gemini: [29.3, 33.8, 31.1, 34.6],
  claude: [35.2, 36.1, 39.4, 37.7],
  deepseek: [22.4, 24.9, 21.7, 26.3],
  grok: [17.5, 16.2, 19.8, 18.4],
}
const PREV: Record<EngineId, number> = { chatgpt: 33.2, perplexity: 41.9, gemini: 27.6, claude: 34.1, deepseek: 20.3, grok: 15.6 }

/** Engines leaderboard: scores tick each "week" and rows re-sort into rank order. */
function Leaderboard() {
  const { ref, step } = useLoopStep(4, 2600)
  const reduce = useReducedMotion()
  const rows = ENGINES.map((e) => ({ ...e, v: BOARD[e.id][step], d: BOARD[e.id][step] - PREV[e.id] })).sort((a, b) => b.v - a.v)
  return (
    <div className="fc-board" ref={ref} role="img" aria-label="Engines leaderboard ranking your visibility on each engine: Perplexity, ChatGPT, Claude, Gemini, DeepSeek, Grok.">
      <div className="fc-board-head fc-mono"><span>#</span><span>Engine</span><span>Visibility</span><span className="fc-board-d">vs last wk</span></div>
      <ul>
        {rows.map((r, i) => (
          <motion.li key={r.id} layout={!reduce} transition={{ layout: { duration: 0.6, ease: MORPH } }} className="fc-board-row">
            <span className="fc-mono fc-rank">{String(i + 1).padStart(2, '0')}</span>
            <span className="fc-board-name"><EngineMark id={r.id} size={20} />{r.name}</span>
            <span className="fc-board-bar">
              <span className="fc-bar"><motion.i animate={{ scaleX: r.v / 50 }} transition={{ duration: 0.5, ease: MORPH }} className={`fc-bar-${r.id}`} /></span>
              <span className="fc-mono fc-slot-4">{r.v.toFixed(1)}</span>
            </span>
            <span className={`fc-mono fc-board-d ${r.d >= 0 ? 'is-up' : 'is-down'}`}>
              {r.d >= 0 ? <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" /> : <ArrowDownRight size={12} strokeWidth={2} aria-hidden="true" />}
              {r.d >= 0 ? '+' : ''}{r.d.toFixed(1)}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

const TAB_ENGINES: EngineId[] = ['chatgpt', 'perplexity', 'gemini', 'claude']
const TAB_POS = ['2', '1', '4', '—']
function AnswersTile() {
  const { ref, step } = useLoopStep(TAB_ENGINES.length, 3000)
  return (
    <div className="fc-viz" ref={ref}>
      <div className="fc-tabs" role="presentation">
        {TAB_ENGINES.map((id, i) => (
          <span key={id} className={`fc-etab ${i === step ? 'is-on' : ''}`}>
            <EngineMark id={id} />
            <span className={`fc-pos ${TAB_POS[i] === '—' ? 'is-none' : ''} fc-mono`}>{TAB_POS[i]}</span>
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Highlighted />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const SOV: { name: string; cls: string; v: number[] }[] = [
  { name: 'You', cls: 'brand', v: [28, 34, 22, 31] },
  { name: 'Profound', cls: 'c1', v: [32, 26, 35, 29] },
  { name: 'Otterly', cls: 'c2', v: [18, 21, 20, 17] },
  { name: 'Peec AI', cls: 'c3', v: [14, 12, 15, 16] },
  { name: 'Others', cls: 'other', v: [8, 7, 8, 7] },
]
function CompetitorsTile() {
  const { ref, step } = useLoopStep(4, 2800)
  const reduce = useReducedMotion()
  const you = SOV[0].v[step]
  const C = 2 * Math.PI * 34
  let acc = 0
  return (
    <div className="fc-viz fc-sov" ref={ref}>
      <div className="fc-donut-wrap">
        <svg viewBox="0 0 88 88" className="fc-donut" role="img" aria-label={`Share of voice on ${ENGINES[step].name}: you ${you}%`}>
          {SOV.map((s) => {
            const len = (s.v[step] / 100) * C
            const off = acc
            acc += len
            return (
              <motion.circle key={s.name} cx="44" cy="44" r="34" className={`fc-seg-${s.cls}`} fill="none" strokeWidth="10"
                initial={false} animate={{ strokeDasharray: `${len - 1.5} ${C - len + 1.5}`, strokeDashoffset: -off }}
                transition={{ duration: reduce ? 0 : 0.6, ease: MORPH }} transform="rotate(-90 44 44)" />
            )
          })}
        </svg>
        <span className="fc-donut-c"><span className="fc-num fc-slot-3">{you}%</span><span className="fc-mono fc-label">{ENGINES[step].name}</span></span>
      </div>
      <ul className="fc-stacks">
        {ENGINES.slice(0, 4).map((e, ei) => (
          <li key={e.id} className={ei === step ? 'is-on' : ''}>
            <EngineMark id={e.id} />
            <span className="fc-stack">{SOV.map((s) => <i key={s.name} className={`fc-bg-${s.cls}`} style={{ flexGrow: s.v[ei] }} />)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const DOMAINS: [string, number, boolean, boolean][] = [
  ['g2.com', 412, true, false],
  ['reddit.com/r/SaaS', 268, false, true],
  ['zapier.com/blog', 191, false, true],
  ['capterra.com', 154, true, false],
]
function SourcesTile() {
  const { ref, step, inView } = useLoopStep(1000, 1400)
  const reduce = useReducedMotion()
  return (
    <div className="fc-viz" ref={ref}>
      <table className="fc-domains">
        <thead><tr><th scope="col">Domain</th><th scope="col">Citations</th><th scope="col" className="fc-hide-sm">You</th><th scope="col"><span className="fc-sr">Tag</span></th></tr></thead>
        <tbody>
          {DOMAINS.map(([d, n, you, target], i) => {
            const v = n + (reduce ? 0 : ((step * (i + 2)) % 9))
            return (
              <motion.tr key={d} initial={reduce ? false : { opacity: 0, y: 6 }} animate={inView || reduce ? { opacity: 1, y: 0 } : undefined} transition={{ delay: i * 0.025, duration: 0.36, ease: EASE }}>
                <td><span className="fc-fav" aria-hidden="true">{d[0].toUpperCase()}</span><span className="fc-ellipsis">{d}</span></td>
                <td><span className="fc-cite"><span className="fc-mono fc-slot-3">{v}</span><span className="fc-bar fc-bar-sm"><motion.i animate={{ scaleX: v / 430 }} transition={{ duration: 0.4, ease: MORPH }} /></span></span></td>
                <td className="fc-hide-sm">{you ? <Check size={14} strokeWidth={2} className="fc-ok" aria-label="You are cited" /> : <span className="fc-ghost" aria-label="You are not cited">–</span>}</td>
                <td>{target && <span className="fc-tag fc-tag-amber">Outreach target</span>}</td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Impact({ n }: { n: number }) {
  return (
    <span className="fc-impact" aria-label={`Impact ${n} of 5`}>
      {[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < n ? 'is-on' : ''} />)}
    </span>
  )
}

const OUTLINE = ['H2 What "AEO tool" means for a SaaS startup', 'H2 Five tools compared on price and engines', 'H2 How we scored them', 'H2 Which one to pick']
function RecsTile() {
  const { ref, step } = useLoopStep(OUTLINE.length + 2, 900)
  const shown = Math.min(step, OUTLINE.length)
  return (
    <div className="fc-viz fc-recs" ref={ref}>
      <div className="fc-rec is-open">
        <div className="fc-rec-top"><span className="fc-tag fc-tag-best-of">New page</span><span className="fc-mono fc-label">Targets 4 prompts</span><Impact n={5} /></div>
        <p className="fc-rec-title">Best AEO tools for SaaS startups in 2026</p>
        <ol className="fc-outline fc-mono">
          {OUTLINE.map((l, i) => (
            <li key={l} className={i < shown ? 'is-in' : ''}>{l}</li>
          ))}
          <li className={`fc-typing ${shown < OUTLINE.length ? 'is-in' : ''}`} aria-hidden="true"><i /><i /><i /></li>
        </ol>
      </div>
      <div className="fc-rec">
        <div className="fc-rec-top"><span className="fc-tag fc-tag-alternatives">Get listed</span><span className="fc-mono fc-label">Targets 3 prompts</span><Impact n={3} /></div>
        <p className="fc-rec-title">Ask to be added to the zapier.com AI tools roundup</p>
      </div>
    </div>
  )
}

const DIGEST: [string, number, number, string][] = [
  ['Visibility', 34.2, 3.1, ''],
  ['Share of voice', 28, 4, '%'],
  ['Avg position', 2.6, -0.4, ''],
  ['Mention rate', 44, 6, '%'],
]
function DigestTile() {
  const { ref, step } = useLoopStep(2, 3200)
  return (
    <div className="fc-viz fc-digest-wrap" ref={ref}>
      <div className="fc-digest">
        <div className="fc-digest-head"><span className="fc-wordmark fc-wordmark-sm">Factorie</span><span className="fc-mono fc-label">Mon 8:00</span></div>
        <div className="fc-digest-grid">
          {DIGEST.map(([l, v, d, u]) => {
            const good = l === 'Avg position' ? d < 0 : d > 0
            return (
              <div key={l}>
                <span className="fc-mono fc-label">{l}</span>
                <span className="fc-digest-v fc-num">{v}{u}</span>
                <span className={`fc-mono fc-delta ${good ? 'is-up' : 'is-down'}`}>{d > 0 ? '+' : ''}{d}{u}</span>
              </div>
            )
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} className="fc-digest-line" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: EASE }}>
            {step === 0
              ? <><span className="fc-tag fc-tag-coral">New</span> Profound named on 3 more prompts</>
              : <><span className="fc-tag fc-tag-green">Up</span> You entered the top 3 on Gemini</>}
          </motion.div>
        </AnimatePresence>
        <div className="fc-digest-action"><span className="fc-mono fc-label">One action</span>Write "Acme vs Mixpanel for startups"</div>
      </div>
    </div>
  )
}

type Tile = { key: string; span: 'wide' | 'one'; eyebrow: string; title: string; text: string; bullets?: string[]; viz: () => React.JSX.Element }
const TILES: Tile[] = [
  {
    key: 'vis', span: 'wide', eyebrow: 'Visibility', title: 'One number for how often AI recommends you',
    text: 'A 0 to 100 score per engine that counts every mention and weights it by position. First place counts more than seventh. Watch it move week by week.',
    bullets: ['Per engine and across all engines', 'Share of voice against your competitors', 'Average position and mention rate'], viz: Leaderboard,
  },
  {
    key: 'ans', span: 'one', eyebrow: 'Answers', title: 'Read exactly what each engine said',
    text: 'Every answer is saved. Your brand is highlighted green, competitors red, sources blue. Click through history to see when you entered the list, or dropped out.', viz: AnswersTile,
  },
  {
    key: 'comp', span: 'one', eyebrow: 'Competitors', title: 'See who AI recommends instead of you',
    text: "Share of voice by engine, head-to-head tables, and the prompts each competitor wins. Factorie also flags brands that keep appearing that you don't track yet.", viz: CompetitorsTile,
  },
  {
    key: 'src', span: 'wide', eyebrow: 'Sources', title: 'Find the pages that shape the answers',
    text: "Factorie counts every URL the engines cite. See which review sites, listicles and Reddit threads mention your competitors but not you. That's your outreach list.", viz: SourcesTile,
  },
  {
    key: 'rec', span: 'wide', eyebrow: 'What to do next', title: 'A weekly list of pages to write and places to appear',
    text: "Factorie looks at the prompts you're losing, the sources the engines trust and your own site, then suggests the five actions most likely to change the answer, with an outline for each page.", viz: RecsTile,
  },
  {
    key: 'dig', span: 'one', eyebrow: 'Digest', title: 'Your AI visibility in your inbox at 8am',
    text: 'Scores by engine, rank changes, new competitor mentions, top sources and one action. Read it in a minute.', viz: DigestTile,
  },
]

export function Features() {
  return (
    <section className="fc-section" id="features" aria-label="Features">
      <div className="fc-container">
        <div className="fc-bento">
          {TILES.map((t, i) => {
            const Viz = t.viz
            return (
              <Reveal key={t.key} delay={(i % 2) * 0.04} className={`fc-tile fc-tile-${t.span} fc-tile-${t.key}`}>
                <Viz />
                <div className="fc-tile-copy">
                  <span className="fc-kicker fc-mono">{t.eyebrow}</span>
                  <h3 className="fc-h3">{t.title}</h3>
                  <p className="fc-small">{t.text}</p>
                  {t.bullets && (
                    <ul className="fc-bullets">
                      {t.bullets.map((b) => <li key={b}><Check size={14} strokeWidth={2} aria-hidden="true" />{b}</li>)}
                    </ul>
                  )}
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

