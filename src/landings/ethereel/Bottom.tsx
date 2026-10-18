import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { EASE, MORPH, Pill, Reveal, SectionHead, TrialBtn, Wordmark, track, useLoopStep } from './shared'

/* ---------- 8. How it works, with the ASCII pipeline ---------- */
const STEPS = [
  ['Set your style once.', 'Series title, handles, hashtags, look and music.'],
  ['Upload raw clips.', 'Straight from your phone. Big files are fine and resume if your Wi-Fi drops.'],
  ['Review and pass.', 'Each reel lands in Review in about 4 minutes. Pass it and it posts at your next slot.'],
]
const PIPE: [string, string][] = [
  ['prepare', 'HDR->SDR 0:58'], ['transcribe', '142 words'], ['cut pauses', '15 cuts -11 s'], ['plan cutaways', '2 diagrams'],
  ['render', '100%'], ['mix audio', '-14 LUFS'], ['check the file', '12/12 checks'], ['write caption', 'done'],
]
const INNER = 34

function AsciiPipeline() {
  const { ref, step, reduce } = useLoopStep(PIPE.length + 2, 700)
  const at = reduce ? PIPE.length : step
  const bar = '-'.repeat(INNER)
  const row = (i: number) => {
    const [name, detail] = PIPE[i]
    const mark = i < at ? '[x]' : i === at ? '[>]' : '[ ]'
    return { text: ` ${mark} ${name.padEnd(15)}${(i <= at ? detail : '').padStart(14)} `.padEnd(INNER), on: i === at, done: i < at }
  }
  const finished = at >= PIPE.length
  return (
    <figure className="er-ascii" ref={ref}>
      <pre aria-label="Pipeline: upload a raw take, Ethereel prepares, transcribes, cuts pauses, plans cutaways, renders, mixes audio to -14 LUFS, checks the file and writes the caption in about 4 minutes, then it waits in Review. When you press Pass it is queued for the 5pm slot and posts to TikTok and Instagram.">
        <span aria-hidden="true">
          {' upload   raw_take.mov   1:04\n'}
          {'    |\n    v\n'}
          {` +${bar}+\n`}
          {PIPE.map((_, i) => {
            const r = row(i)
            return <span key={i}>{' |'}<span className={r.on ? 'er-ascii-on' : r.done ? 'er-ascii-done' : 'er-ascii-wait'}>{r.text}</span>{'|\n'}</span>
          })}
          {` +${bar}+\n`}
          {'    |  about 4 min for a 60 s clip\n    v\n'}
          <span className={finished ? 'er-ascii-on' : ''}>{' review --- you press Pass ---> queue 5pm'}</span>{'\n'}
          {'                                |-> TikTok\n'}
          {'                                `-> Instagram'}
        </span>
      </pre>
    </figure>
  )
}

export function HowItWorks() {
  const reduce = useReducedMotion()
  return (
    <section className="er-section" id="how" aria-labelledby="how-h">
      <div className="er-rail er-pad">
        <SectionHead title={<span id="how-h">Three steps. About <em>five minutes</em> of your time.</span>} />
        <div className="er-how">
          <ol className="er-cols3 er-how-steps">
            {STEPS.map(([h, p], i) => (
              <li key={h} className="er-col">
                <motion.span
                  className="er-how-n" aria-hidden="true"
                  initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.36, delay: i * 0.12, ease: EASE }}
                >{i + 1}</motion.span>
                <h3>{h}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
          <Reveal><AsciiPipeline /></Reveal>
        </div>
        <div><TrialBtn location="features" /></div>
      </div>
    </section>
  )
}

/* ---------- 9. Comparison ---------- */
const TOOLS = ['Ethereel', 'Opus Clip', 'Submagic', 'CapCut', 'Captions.ai', 'Descript']
const ROWS: [string, string[]][] = [
  ['Built for', ['Raw talking-head take to finished reel', 'Long video to many clips', 'Captions on short clips', 'Manual editing', 'Captions and AI edits', 'Editing by text']],
  ['Silence cutting with breath padding', ['Yes', 'Partial', 'Yes', 'Manual', 'Yes', 'Yes']],
  ['Your vocabulary and handle fixes', ['Yes', 'No', 'Partial', 'No', 'Partial', 'Yes']],
  ['Hand-drawn diagram cutaways', ['Yes', 'No', 'No', 'Manual', 'No', 'No']],
  ['Your screenshots placed when you say them', ['Yes', 'No', 'No', 'Manual', 'No', 'Manual']],
  ['Review with TikTok/IG overlay', ['Yes', 'No', 'No', 'No', 'No', 'No']],
  ['Plain-language revisions with undo', ['Yes', 'No', 'No', 'No', 'Partial', 'Partial']],
  ['Posts at your slots, both platforms', ['Yes', 'Yes', 'Partial', 'No', 'No', 'No']],
  ['Nothing posts without approval', ['Always', 'Optional', 'n/a', 'n/a', 'n/a', 'n/a']],
  ['Price from (monthly)', ['$89', '$15 [verify]', '$16 [verify]', '$8 [verify]', '$10 [verify]', '$24 [verify]']],
]

function Cell({ v }: { v: string }) {
  const tone = v === 'Yes' || v === 'Always' ? 'yes' : v === 'No' ? 'no' : v === 'Partial' || v === 'Manual' || v === 'Optional' ? 'part' : 'text'
  return <span className={`er-cell er-cell-${tone}`}>{tone === 'yes' && <Check size={13} strokeWidth={2.2} aria-hidden="true" />}{v}</span>
}

export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { amount: 0.3, once: true })
  const reduce = useReducedMotion()
  useEffect(() => { if (seen) track('comparison_viewed') }, [seen])
  return (
    <section className="er-section" id="compare" aria-labelledby="compare-h">
      <div className="er-rail er-pad">
        <SectionHead
          title={<span id="compare-h">Built to <em>finish</em> your reel, not find clips.</span>}
          sub="Most tools chop long videos into many clips or hand you an editor. Ethereel edits one take like a person would, then waits for your yes."
        />
        <div className="er-table-wrap" ref={ref} tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
          <table className="er-table">
            <thead>
              <tr>
                <th scope="col"><span className="er-sr">Feature</span></th>
                {TOOLS.map((t, i) => (
                  <th key={t} scope="col" className={i === 0 ? 'er-us' : ''}>
                    {i === 0 ? (
                      <motion.span initial={reduce ? false : { opacity: 0 }} animate={seen ? { opacity: 1 } : undefined} transition={{ duration: 0.36, ease: EASE }}>{t}</motion.span>
                    ) : t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, vals]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {vals.map((v, i) => <td key={i} className={i === 0 ? 'er-us' : ''}><Cell v={v} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="er-note">
          Competitor features and prices checked Oct 2026 from their public pages and may have changed. Partial means the
          feature exists with limits. [verify before publishing]
        </p>
      </div>
    </section>
  )
}

/* ---------- 10. Testimonials: shipped hidden until there are real quotes ---------- */
const showTestimonials = false
export function Testimonials() {
  if (!showTestimonials) return null
  return null
}

/* ---------- 11. Pricing ---------- */
type Plan = { id: 'creator' | 'pro'; name: string; m: number; y: number; billed: string; line: string; tag?: string; incl: string[] }
const PLANS: Plan[] = [
  { id: 'creator', name: 'Creator', m: 89, y: 74, billed: '$890', line: 'One reel a day.', incl: ['30 videos a month', 'Clips up to 2 minutes', '5 clips per upload', '2 revisions per video', 'TikTok and Instagram posting', 'Diagrams and your screenshots', 'Your look, music and captions'] },
  { id: 'pro', name: 'Pro', m: 199, y: 166, billed: '$1,990', line: 'Up to three reels a day.', tag: 'For daily posters on both platforms', incl: ['90 videos a month', 'Clips up to 3 minutes', '10 clips per upload', '4 revisions per video', 'Fast processing (two at a time)', 'Everything in Creator'] },
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const opts = [false, true]
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const set = (v: boolean) => { setAnnual(v); track('pricing_toggle', { interval: v ? 'annual' : 'monthly' }) }
  const onKey = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    const next = !annual
    set(next)
    btns.current[next ? 1 : 0]?.focus()
  }
  return (
    <section className="er-section" id="pricing" aria-labelledby="pricing-h">
      <div className="er-rail er-pad">
        <div className="er-price-head">
          <SectionHead center title={<span id="pricing-h">Pick how often you <em>post.</em></span>} />
          <div className="er-seg" role="radiogroup" aria-label="Billing interval" onKeyDown={onKey}>
            {opts.map((v) => (
              <button
                key={String(v)} ref={(el) => { btns.current[v ? 1 : 0] = el }} type="button" role="radio"
                aria-checked={annual === v} tabIndex={annual === v ? 0 : -1} className={annual === v ? 'on' : ''} onClick={() => set(v)}
              >
                {v ? 'Annual (2 months free)' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
        <div className="er-plans">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.04} className={`er-plan${p.id === 'pro' ? ' pro' : ''}`}>
              <div className="er-plan-top">
                <h3>{p.name}</h3>
                {p.tag ? <Pill dot>{p.tag}</Pill> : <span />}
              </div>
              <div className="er-price" aria-live="polite">
                <span className="er-price-num er-num">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={annual ? 'y' : 'm'}
                      initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.16, ease: MORPH }}
                    >${annual ? p.y : p.m}</motion.span>
                  </AnimatePresence>
                </span>
                <span className="er-price-per">/month</span>
              </div>
              <p className="er-billed er-num" style={{ visibility: annual ? 'visible' : 'hidden' }}>billed {p.billed} yearly</p>
              <p className="er-plan-line">{p.line}</p>
              <ul className="er-ticks">
                {p.incl.map((x) => <li key={x}><Check size={14} strokeWidth={2} aria-hidden="true" />{x}</li>)}
              </ul>
              <TrialBtn location={`pricing_${p.id}`} full />
            </Reveal>
          ))}
        </div>
        <p className="er-note er-center-text">Every plan starts with a 7 day free trial with 5 reels. Cancel any time from Billing.</p>
      </div>
    </section>
  )
}

/* ---------- 12. FAQ ---------- */
export const FAQ: [string, string][] = [
  ['What kind of video works best?', 'One person talking to camera, 30 seconds to 2 minutes (3 on Pro), filmed on a phone. One take is fine; Ethereel removes the pauses and restarts between sentences when you leave a gap.'],
  ['Does anything post without me?', 'No. Every reel waits in Review until you press Pass. There is no auto-approve setting.'],
  ['Can I change something after it is edited?', 'Yes. Press Request revision and say what you want in plain words, like "the word at 0:12 should be Supabase" or "remove the second diagram". You get a new version and a list of what changed, and you can undo it.'],
  ['Will captions spell my product name right?', 'Add it to your vocabulary once. Ethereel uses it when transcribing and fixes the usual mishearings. You can also fix any word from Review.'],
  ['What are the diagrams?', 'Short hand-drawn cutaways on a paper page: steps, comparisons, numbers, lists, simple graphs, or your own screenshots. They appear while your voice keeps going, at most 4 per reel.'],
  ['Which platforms do you post to?', 'TikTok and Instagram Reels. You connect them once; we never see your passwords.'],
  ['When do reels post?', 'At your next free slot. The defaults are 9am, 11am, 2pm, 5pm and 7pm in your time zone, and you can set your own.'],
  ['How long does a reel take?', 'About 4 minutes for a 60 second clip. Several clips process one after another (two at a time on Pro).'],
  ['Can I use my own music?', 'Yes. Pick from the library or upload your own tracks. Ethereel keeps the music well under your voice.'],
  ['Can I download the reel?', 'Yes, every version is downloadable as an MP4 that meets the TikTok and Instagram specs.'],
  ['What happens to my raw clips?', 'They stay private in your account. Raw files are deleted 14 days after you pass or reject a reel; the finished reels stay.'],
  ['Can I cancel?', 'Yes, from Billing at any time. Your reels stay downloadable until the end of the period.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const reduce = useReducedMotion()
  const base = useId()
  return (
    <section className="er-section" id="faq" aria-labelledby="faq-h">
      <div className="er-rail er-pad er-faq-grid">
        <SectionHead title={<span id="faq-h">FAQ</span>} />
        <ul className="er-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            const pid = `${base}-p${i}`
            return (
              <li key={q}>
                <h3>
                  <button
                    type="button" aria-expanded={isOpen} aria-controls={pid} id={`${base}-b${i}`}
                    onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('faq_opened', { question: q }) }}
                  >
                    <span>{q}</span>
                    <ChevronDown size={16} className="er-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={pid} role="region" aria-labelledby={`${base}-b${i}`} className="er-faq-a"
                      initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: MORPH }}
                    >
                      <p>{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ---------- 13. Final CTA ---------- */
export function FinalCta() {
  return (
    <section className="er-section er-final" id="final" aria-labelledby="final-h">
      <div className="er-rail er-final-inner">
        <Reveal className="er-head er-head-center">
          <h2 id="final-h">Your next 30 reels are already in your <em>camera roll.</em></h2>
          <p className="er-sub">Upload one now. It is back in your Review inbox in about 4 minutes.</p>
        </Reveal>
        <Reveal className="er-final-cta" delay={0.04}>
          <TrialBtn location="final" />
          <p className="er-micro">7 days free · 5 reels · Cancel any time</p>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 14. Footer ---------- */
const FOOT: [string, [string, string][]][] = [
  ['Product', [['Features', '#features'], ['Pricing', '#pricing'], ['How it works', '#how'], ['Docs', '/docs']]],
  ['For', [['Coaches', '/for/coaches'], ['Consultants', '/for/consultants'], ['Founders', '/for/founders'], ['Podcasters', '/for/podcasters']]],
  ['Company', [['About', '/about'], ['Blog', '/blog'], ['Contact', '/contact']]],
  ['Legal', [['Terms', '/terms'], ['Privacy', '/privacy']]],
]

export function Footer() {
  return (
    <footer className="er-section er-footer">
      <div className="er-rail">
        <div className="er-foot-grid">
          <div className="er-foot-brand"><Wordmark /></div>
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <p className="er-foot-h">{h}</p>
              <ul>{links.map(([l, href]) => <li key={l}><a href={href} onClick={(e) => e.preventDefault()}>{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="er-foot-bottom">
          <span>© 2026 Ethereel</span>
          <span>Made with Ethereel: follow @ethereel on TikTok</span>
        </div>
      </div>
    </footer>
  )
}
