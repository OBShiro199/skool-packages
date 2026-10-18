import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, ChevronDown, FileAudio, Minus, Pause, Play, Sparkles } from 'lucide-react'
import { Audiogram } from './Audiogram'
import {
  CHAPTERS, EASE, MORPH, Button, Live, Reveal, SectionHead, Tick, TrialButton, Wordmark, scrollToId,
  track, useCountUp,
} from './shared'

/* ------------------------------------------------------------------ 5. Problem */

const PROBLEMS: [number, string, string, string][] = [
  [4, ' hours', ':', 'writing show notes, chapters, a newsletter and posts for one episode by hand.'],
  [9000, ' words', ':', 'what you say in an hour. Without a transcript page, Google sees none of them.'],
  [3, ' tools', ':', 'one for transcripts, one for show notes, one for audiograms. Three bills, three logins.'],
]

function ProblemNumber({ to, unit }: { to: number; unit: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const v = useCountUp(to, 900, inView)
  return (
    <span ref={ref} className="ec-bignum">
      <span className="ec-bignum-slot"><span className="is-ghost" aria-hidden="true">{to.toLocaleString('en-US')}</span><span>{v.toLocaleString('en-US')}</span></span>
      <span className="ec-bignum-unit">{unit}</span>
    </span>
  )
}

export function Problem() {
  return (
    <section className="ec-section ec-band" aria-labelledby="ec-problem-h">
      <div className="ec-container">
        <SectionHead id="ec-problem-h" eyebrow="The other half of podcasting" title="Recording takes an hour. Shipping it takes the rest of your week." />
        <ul className="ec-problems">
          {PROBLEMS.map(([n, unit, , line], i) => (
            <Reveal as="li" key={unit} delay={i * 0.08} className="ec-problem">
              <ProblemNumber to={n} unit={unit} />
              <p>{line}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="ec-problem-close"><p>Most hosts skip half of it. Agencies do all of it, for every client, every week.</p></Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 6. Demo */

const SCENES = [
  { t: '0:00', label: 'Upload', caption: 'Drop in the episode file, or let RSS bring it in' },
  { t: '0:12', label: 'Progress', caption: 'Transcribe, then write. You can close the tab' },
  { t: '0:26', label: 'Tabs fill', caption: 'Titles, notes, chapters and quotes fill in' },
  { t: '0:38', label: 'Regenerate', caption: 'Regenerate the newsletter intro: "more playful"' },
  { t: '0:50', label: 'Audiogram', caption: 'Turn a verified quote into an audiogram' },
  { t: '1:02', label: 'Publish', caption: 'Publish the episode page with the full transcript' },
]
const SCENE_MS = 3200

function Scene({ i }: { i: number }) {
  if (i === 0) return (
    <div className="ec-sc ec-sc-center">
      <div className="ec-drop">
        <FileAudio size={20} strokeWidth={1.5} aria-hidden="true" />
        <b>ep-87-final.mp3</b>
        <span className="ec-mono">48:12 · 66 MB</span>
        <span className="ec-meter"><motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.6, ease: MORPH }} /></span>
      </div>
    </div>
  )
  if (i === 1) return (
    <div className="ec-sc ec-sc-center">
      <div className="ec-sc-job">
        {['Uploaded', 'Transcribed with speakers', 'Writing your notes', 'Ready'].map((s, k) => (
          <motion.div key={s} className={`ec-sc-jobrow ${k < 2 ? 'is-done' : k === 2 ? 'is-now' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.3, duration: 0.36, ease: EASE }}>
            {k < 2 ? <Tick /> : k === 2 ? <Live /> : <span className="ec-ring" />}<span>{s}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
  if (i === 2) return (
    <div className="ec-sc ec-sc-tabs">
      <div className="ec-sc-tabbar">{['Titles', 'Notes', 'Chapters', 'Quotes'].map((t, k) => <span key={t} className={k === 0 ? 'is-on' : ''}>{t}</span>)}</div>
      <ul>
        {['Selling hours, not seats', 'The week we stopped counting seats', 'Priya Raman on pricing what people use', 'Why agencies loved paying less', 'Ten seats, two users'].map((t, k) => (
          <motion.li key={t} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + k * 0.18, duration: 0.36, ease: EASE }}>
            <span className="ec-mono">{k + 1}</span>{t}
          </motion.li>
        ))}
      </ul>
    </div>
  )
  if (i === 3) return (
    <div className="ec-sc ec-sc-center">
      <div className="ec-sc-regen">
        <span className="ec-regen-chip"><Sparkles size={12} strokeWidth={1.75} aria-hidden="true" /> more playful</span>
        <div className="ec-regen-text">
          <motion.p initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.1, duration: 0.2 }}>This week Priya explains how Echo changed its pricing model.</motion.p>
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.3, ease: EASE }}>Ten seats sold, two used. This week Priya tells us why she stopped counting chairs.</motion.p>
        </div>
        <span className="ec-regen-ver ec-mono">Version 3 of 10 · Undo</span>
      </div>
    </div>
  )
  if (i === 4) return (
    <div className="ec-sc ec-sc-ag">
      <div className="ec-quote ec-sc-q"><p>“Seats were the wrong thing to count.”</p><div className="ec-quote-meta"><span>Priya · <span className="ec-mono">15:05</span></span><span className="ec-verified is-on"><Tick /> Verified</span></div></div>
      <span className="ec-sc-arrow ec-mono" aria-hidden="true">──&gt;</span>
      <Audiogram variant="Bars" compact label="Audiogram rendered from the quote" />
    </div>
  )
  return (
    <div className="ec-sc ec-sc-center">
      <div className="ec-sc-pub">
        <span className="ec-status is-published">Published</span>
        <b>bootstrappedhour.com/ep-87</b>
        <span className="ec-mono">transcript.vtt · chapters.json</span>
      </div>
    </div>
  )
}

function DemoScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  const [scene, setScene] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  useEffect(() => { if (!reduce && !userPaused) setPlaying(inView) }, [inView, reduce, userPaused])
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS)
    return () => window.clearInterval(id)
  }, [playing])
  const play = () => { setUserPaused(false); setPlaying(true); track('lp_demo_played') }
  const toggle = () => { if (playing) { setPlaying(false); setUserPaused(true) } else play() }
  const poster = reduce && !playing
  return (
    <figure className="ec-demo-frame ec-frame">
      <div ref={ref} className="ec-demo-stage" aria-hidden="true">
        <AnimatePresence mode="wait">
          <motion.div key={scene} className="ec-demo-scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Scene i={scene} />
          </motion.div>
        </AnimatePresence>
        <p className="ec-caption">{SCENES[scene].caption}</p>
      </div>
      {poster && (
        <button type="button" className="ec-play" onClick={play} aria-label="Play the product walkthrough"><Play size={22} strokeWidth={1.5} /></button>
      )}
      <div className="ec-demo-bar">
        <button type="button" className="ec-demo-toggle" onClick={toggle} aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}>
          {playing ? <Pause size={13} strokeWidth={1.75} /> : <Play size={13} strokeWidth={1.75} />}
        </button>
        <div className="ec-demo-steps" role="group" aria-label="Walkthrough steps">
          {SCENES.map((s, k) => (
            <button key={s.label} type="button" className={k === scene ? 'is-on' : ''} aria-pressed={k === scene} onClick={() => setScene(k)}>
              <span className="ec-mono">{s.t}</span><span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <figcaption className="ec-sr">
        Walkthrough: upload an episode, watch it transcribe and write, see titles and chapters fill in, regenerate the
        newsletter intro to be more playful, make an audiogram from a verified quote, and publish the episode page.
      </figcaption>
    </figure>
  )
}

const SAMPLE_TITLES = ['Selling hours, not seats', 'The week we stopped counting seats', 'Priya Raman on pricing what people use', 'Why agencies loved paying less', 'Ten seats, two users']

function FreeToolPanel() {
  const [feed, setFeed] = useState<string | null>(null)
  useEffect(() => {
    const on = (e: Event) => setFeed((e as CustomEvent<string>).detail)
    window.addEventListener('echo-feed', on)
    return () => window.removeEventListener('echo-feed', on)
  }, [])
  let host = ''
  try { host = feed ? new URL(feed).host : '' } catch { host = '' }
  return (
    <div className="ec-tool ec-frame" aria-live="polite">
      <div className="ec-tool-head">
        <span className="ec-tool-art" aria-hidden="true"><i /><i /><i /></span>
        <div>
          <span className="ec-tool-kicker">{feed ? 'Sample result' : 'Sample from a fictional show'}</span>
          <b>The Bootstrapped Hour</b>
          <span className="ec-tool-ep">Latest: Ep 87 with Priya Raman</span>
        </div>
      </div>
      {feed && (
        <p className="ec-tool-note">
          This example page cannot fetch <b>{host || 'your feed'}</b>, so it shows the sample. In Echo, your own latest episode appears here.
        </p>
      )}
      <div className="ec-tool-block">
        <span className="ec-tool-label">5 title options</span>
        <ol className="ec-tool-titles">
          {SAMPLE_TITLES.map((t, i) => (
            <Reveal as="li" key={t} delay={i * 0.04} y={6}><span className="ec-mono">{i + 1}</span>{t}</Reveal>
          ))}
        </ol>
      </div>
      <div className="ec-tool-block">
        <span className="ec-tool-label">Chapters</span>
        <ol className="ec-tool-ch">
          {CHAPTERS.map(([t, title], i) => (
            <Reveal as="li" key={t} delay={0.2 + i * 0.04} y={6}><time className="ec-mono">{t}</time>{title}</Reveal>
          ))}
        </ol>
      </div>
      <Button variant="primary" size="md" onClick={() => { track('lp_cta_clicked', { location: 'free_tool' }); scrollToId('pricing') }}>Get the full pack free for 7 days</Button>
    </div>
  )
}

export function Demo() {
  return (
    <section className="ec-section" id="demo" aria-labelledby="ec-demo-h">
      <div className="ec-container">
        <SectionHead id="ec-demo-h" eyebrow="See it on your show" title="Paste your feed. Watch your latest episode turn into everything." />
        <div className="ec-demo-grid">
          <Reveal><DemoScreen /></Reveal>
          <Reveal delay={0.08}><FreeToolPanel /></Reveal>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 8. How it works */

const STEPS: [string, string][] = [
  ['Add your episode.', 'Upload a file or connect your RSS feed once.'],
  ['Echo writes it up.', 'Transcript with speakers, then notes, chapters, quotes, a newsletter, posts and a blog post in your voice.'],
  ['Clip and publish.', 'Make audiograms from the best moments and publish the episode page.'],
]

const PIPELINE = String.raw`  episode.mp3 ──┐
                ├──> transcript ──> voice card ──> writing
  RSS feed ─────┘    speakers        from 300 to    5 titles
  checked every      word times      3,000 words    notes + chapters
  15 minutes                         you wrote      quotes (checked
                                                    word for word)
                                                    newsletter, posts
                                                    SEO blog post
                     quote ──> audiogram  1080x1920, about 2 minutes
                     all   ──> episode page + chapters.json`

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const reduce = useReducedMotion()
  return (
    <section className="ec-section ec-band" id="how" aria-labelledby="ec-how-h">
      <div className="ec-container">
        <SectionHead id="ec-how-h" eyebrow="How it works" title="Three steps. About twenty minutes." />
        <div ref={ref} className="ec-steps-wrap">
          <motion.span
            className="ec-steps-line"
            aria-hidden="true"
            initial={{ scaleX: reduce ? 1 : 0 }}
            animate={{ scaleX: inView || reduce ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.6, ease: MORPH }}
          />
          <ol className="ec-steps">
            {STEPS.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 0.12} className="ec-step">
                <span className="ec-step-n">{String(i + 1).padStart(2, '0')}</span>
                <p><b>{t}</b> {d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
        <Reveal className="ec-ascii ec-frame" delay={0.1}>
          <div className="ec-ascii-head"><span>What happens to one episode</span><span className="ec-mono">pipeline.txt</span></div>
          <pre className="ec-mono" role="img" aria-label="Pipeline: an uploaded file or RSS episode becomes a transcript with speakers and word times, then a voice card from your writing guides the titles, notes, chapters, checked quotes, newsletter, posts and blog post. A quote becomes a 1080 by 1920 audiogram in about two minutes, and everything publishes as an episode page with chapters.json.">{PIPELINE}</pre>
        </Reveal>
        <div className="ec-center"><TrialButton location="how" size="lg" /></div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 9. Compare */

const COLS = ['Echo', 'Castmagic', 'Podsqueeze', 'Headliner', 'Swell AI']
const ROWS: [string, ...string[]][] = [
  ['Starting price', '$29/month (6 audio hours)', '$29/mo for 5 hours [verify]', '$8.99 to $15/mo, about 2 hours [verify]', 'Free plan, paid from about $15/mo [verify]', '$39/mo [verify]'],
  ['Show notes, titles, chapters', 'Yes', 'Yes', 'Yes', 'Limited [verify]', 'Yes'],
  ['Quotes checked word for word', 'Yes', 'No [verify]', 'No [verify]', 'No', 'No [verify]'],
  ['Writes in your voice from a sample', 'Yes', 'Custom prompts [verify]', '[verify]', 'No', '[verify]'],
  ['Newsletter + SEO blog post', 'Yes', 'Yes', 'Yes [verify]', 'No', 'Yes [verify]'],
  ['Vertical audiograms with captions', 'Yes', 'No [verify]', 'Video clips [verify]', 'Yes', 'Clips [verify]'],
  ['RSS auto-import', 'Yes', '[verify]', '[verify]', 'Yes [verify]', '[verify]'],
  ['Public episode page with transcript', 'Yes', 'No [verify]', 'No [verify]', 'No', 'No [verify]'],
  ['Many shows in one workspace', 'Up to 25', 'Team seats [verify]', 'Agency plan [verify]', '[verify]', '[verify]'],
]

function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace('[verify]', '').trim()
  return (
    <>
      {text === 'Yes' && <Check size={13} strokeWidth={2} aria-hidden="true" className="ec-yes" />}
      {text === 'No' && <Minus size={13} strokeWidth={2} aria-hidden="true" className="ec-no" />}
      {text}{verify && <span className="ec-verify">{text ? ' ' : ''}to verify</span>}
    </>
  )
}

export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.5 })
  useEffect(() => { if (seen) track('lp_compare_viewed') }, [seen])
  const reduce = useReducedMotion()
  return (
    <section className="ec-section" id="compare" aria-labelledby="ec-compare-h">
      <div className="ec-container">
        <SectionHead id="ec-compare-h" eyebrow="Compare" title="Notes, clips and an SEO page in one tool" />
        <div ref={ref} className="ec-table-frame ec-frame">
          <div className="ec-table-scroll">
            <table className="ec-table">
              <caption className="ec-sr">Echo compared with Castmagic, Podsqueeze, Headliner and Swell AI. Entry plans billed monthly, checked October 2026.</caption>
              <thead>
                <tr>
                  <th scope="col"><span className="ec-sr">Feature</span></th>
                  {COLS.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'is-us' : ''}>{i === 0 ? <span className="ec-us-chip"><span className="ec-mark-mini" aria-hidden="true" />Echo</span> : c}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, ...vals], r) => (
                  <motion.tr key={label} initial={reduce ? { opacity: 1 } : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.2, delay: reduce ? 0 : r * 0.04 }}>
                    <th scope="row">{label}</th>
                    {vals.map((v, i) => <td key={i} className={i === 0 ? 'is-us' : ''}><Cell v={v} /></td>)}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="ec-table-note">One price covers the writing and the clips. Most hosts replace two subscriptions.</p>
        <p className="ec-fine">Competitor prices are entry plans billed monthly, taken from comparison sites in October 2026. Cells marked “to verify” still need checking on each vendor's own pricing page.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 10. Testimonials slot */

export function Testimonials() {
  return (
    <section className="ec-section ec-band" aria-labelledby="ec-quotes-h">
      <div className="ec-container">
        <SectionHead id="ec-quotes-h" eyebrow="Early hosts" title="From the people shipping weekly" />
        <ul className="ec-testis">
          {[0, 1, 2].map((i) => (
            <Reveal as="li" key={i} delay={i * 0.08} className="ec-testi">
              <span className="ec-testi-art" aria-hidden="true" />
              <p>Your first customer quote goes here</p>
              <span className="ec-testi-who">Host name · Show name</span>
            </Reveal>
          ))}
        </ul>
        <p className="ec-fine">Placeholder slot, shown on this example only. The live page hides it until there are three real quotes, shared with permission.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 11. Pricing */

type Plan = { id: string; name: string; for: string; monthly: string; annualMo: string; annual: string; pop?: boolean; rows: [string, string][] }
const PLANS: Plan[] = [
  { id: 'creator', name: 'Creator', for: 'Indie podcasters', monthly: '29', annualMo: '24.17', annual: '$290/year',
    rows: [['Audio hours a month', '6'], ['Longest episode', '2 hours'], ['Shows', '1'], ['Seats', '1'], ['Audiograms a month', '20'], ['Regenerations a month', '25'], ['Hide "Made with Echo" badge', '']] },
  { id: 'studio', name: 'Studio', for: 'Brands and serious shows', monthly: '79', annualMo: '65.83', annual: '$790/year', pop: true,
    rows: [['Audio hours a month', '20'], ['Longest episode', '3 hours'], ['Shows', '5'], ['Seats', '3'], ['Audiograms a month', '50'], ['Regenerations a month', '50'], ['Hide "Made with Echo" badge', 'Yes']] },
  { id: 'agency', name: 'Agency', for: 'Podcast agencies', monthly: '199', annualMo: '165.83', annual: '$1,990/year',
    rows: [['Audio hours a month', '50'], ['Longest episode', '4 hours'], ['Shows', '25'], ['Seats', '10'], ['Audiograms a month', '150'], ['Regenerations a month', '100'], ['Hide "Made with Echo" badge', 'Yes']] },
]
const EVERY = ['Show notes, titles, chapters, quotes, newsletter, social posts, blog post', 'RSS auto-import', 'Public episode pages and embed player', 'chapters.json and transcript files']

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const flip = () => { setAnnual((a) => { track('lp_pricing_toggled', { to: a ? 'monthly' : 'annual' }); return !a }) }
  return (
    <section className="ec-section" id="pricing" aria-labelledby="ec-pricing-h">
      <div className="ec-container">
        <SectionHead id="ec-pricing-h" center eyebrow="Pricing" title="Priced by audio hours, not seats" sub="Every plan starts with a 7 day free trial with 2 audio hours. Cancel from Billing in two clicks." />
        <div className="ec-toggle-row">
          <span className={!annual ? 'is-on' : ''} aria-hidden="true">Monthly</span>
          <button type="button" role="switch" aria-checked={annual} aria-label="Bill annually" className="ec-switch" onClick={flip}>
            <motion.span className="ec-switch-thumb" animate={{ x: annual ? 20 : 0 }} transition={{ duration: reduce ? 0 : 0.2, ease: MORPH }} />
          </button>
          <span className={annual ? 'is-on' : ''} aria-hidden="true">Annual</span>
          <span className="ec-free-chip">2 months free</span>
        </div>
        <p className="ec-sr" aria-live="polite">{annual ? 'Showing annual prices: Creator 24 dollars 17 a month, Studio 65 dollars 83, Agency 165 dollars 83, billed yearly.' : 'Showing monthly prices: Creator 29 dollars, Studio 79 dollars, Agency 199 dollars a month.'}</p>
        <ul className="ec-plans">
          {PLANS.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 0.08} className={`ec-plan ${p.pop ? 'is-pop' : ''}`}>
              <div className="ec-plan-top">
                <h3 className="ec-h3">{p.name}</h3>
                <span className={`ec-pop-chip ${p.pop ? '' : 'is-hidden'}`}>Most popular</span>
              </div>
              <p className="ec-plan-for">{p.for}</p>
              <div className="ec-price">
                <span className="ec-price-cur">$</span>
                <span className="ec-price-slot" style={{ minWidth: `${p.annualMo.length + 1.6}ch` }}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={annual ? 'a' : 'm'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2 }}>
                      {annual ? p.annualMo : p.monthly}<small>/mo</small>
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
              <p className="ec-price-note">{annual ? `${p.annual}, billed yearly` : 'Billed monthly'}</p>
              <Button size="md" onClick={() => { track('lp_cta_clicked', { location: `pricing_${p.id}` }) }} href={`#signup?plan=${p.id}&interval=${annual ? 'year' : 'month'}`}>Start free trial</Button>
              <dl className="ec-plan-rows">
                {p.rows.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v === 'Yes' ? <><Check size={13} strokeWidth={2} aria-hidden="true" /> Yes</> : v || <span className="ec-dash">Not included</span>}</dd></div>
                ))}
              </dl>
              <ul className="ec-plan-every">
                {EVERY.map((e) => <li key={e}><Check size={13} strokeWidth={1.75} aria-hidden="true" />{e}</li>)}
              </ul>
            </Reveal>
          ))}
        </ul>
        <Reveal className="ec-roi"><p>At 4 hours saved per episode, Creator costs less than $2 an hour of your time.</p><p className="ec-risk">No setup fee. No contract. Your episode pages stay yours.</p></Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 12. FAQ */

export const FAQ: [string, string][] = [
  ['What is an audio hour?', 'One hour of episode audio that Echo transcribes and writes up. A 45 minute episode uses 0.75 hours. Regenerating an asset or making an audiogram does not use audio hours; they have their own monthly counts.'],
  ['Which files can I upload?', 'MP3, M4A, WAV, AAC, MP4 and MOV, up to 1 GB. Video files are fine: Echo uses the audio.'],
  ['How does RSS import work?', 'Paste your feed URL from your podcast host (Buzzsprout, Transistor, Captivate, Spotify for Creators, RSS.com and others). Echo checks it every 15 minutes. New episodes either process by themselves or wait for your click, your choice per show.'],
  ['Will it sound like me?', 'Paste 300 to 3,000 words you have written. Echo builds a voice card from it and every asset follows it. You can edit anything, and regenerate with an instruction.'],
  ['Are the quotes real?', 'Yes. Every quote is checked word for word against the transcript and timed to the second. If a quote does not match, Echo drops it.'],
  ['How long do audiograms take?', 'About two minutes for a 60 second clip. They are 1080x1920 MP4 files with captions burned in, ready for Reels, Shorts, TikTok and LinkedIn.'],
  ['Does the episode page affect my download numbers?', "No. The player streams from your own podcast host, so every play counts on your host's stats as usual."],
  ['Can I add chapters to Apple Podcasts and Spotify?', "Echo gives you a chapters.json URL and a transcript file URL for each published episode. Paste them into your host's Podcasting 2.0 fields where supported."],
  ['Which languages work?', 'Transcription detects most languages. The writing is English in this version.'],
  ['I run an agency. How do client shows work?', 'One workspace holds up to 25 shows, each with its own feed, voice, colours and public pages. Invite your producers as members; only you see billing.'],
  ['What happens to my audio?', 'Uploaded files are stored privately and deleted 30 days after processing. Audiogram files are kept for 90 days, so download the ones you post. Transcripts and written assets stay until you delete them.'],
  ['What if I run out of hours?', 'New RSS episodes still arrive and wait. Upgrade any time from Billing and they process straight away, or wait for your monthly reset.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const reduce = useReducedMotion()
  return (
    <section className="ec-section ec-band" id="faq" aria-labelledby="ec-faq-h">
      <div className="ec-container ec-faq-grid">
        <SectionHead id="ec-faq-h" eyebrow="FAQ" title="Questions hosts ask first" />
        <div className="ec-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className={`ec-faq-item ${isOpen ? 'is-open' : ''}`}>
                <h3>
                  <button
                    type="button" id={`ec-faq-q${i}`} aria-expanded={isOpen} aria-controls={`ec-faq-a${i}`}
                    onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('lp_faq_opened', { index: i }) }}
                  >
                    <span><span className="ec-faq-n ec-mono">{String(i + 1).padStart(2, '0')}</span>{q}</span>
                    <ChevronDown size={16} strokeWidth={1.75} className="ec-faq-chev" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`ec-faq-a${i}`} role="region" aria-labelledby={`ec-faq-q${i}`} className="ec-faq-a"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: MORPH }}
                    >
                      <p>{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 13. Final CTA */

export function FinalCta() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.2 })
  const reduce = useReducedMotion()
  return (
    <section className="ec-section ec-final" aria-labelledby="ec-final-h">
      <div className="ec-ripples is-final" aria-hidden="true"><i /><i /><i /><i /></div>
      <div ref={ref} className="ec-container ec-final-inner">
        <h2 className="ec-h2" id="ec-final-h">Your next episode, written up <em>before you have finished editing it.</em></h2>
        <p className="ec-sub">Start with your latest episode. It takes about twenty minutes.</p>
        <ul className="ec-final-chips" aria-label="What you get: titles, notes, chapters, quotes and clips">
          {['Titles', 'Notes', 'Chapters', 'Quotes', 'Clips'].map((c, i) => (
            <motion.li key={c} initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }} animate={seen || reduce ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.08, ease: EASE }}>
              <Tick />{c}
            </motion.li>
          ))}
        </ul>
        <TrialButton location="final" size="lg" />
        <p className="ec-trust">7 days free. 2 audio hours included.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 14. Footer */

const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Compare', 'Free show notes generator']],
  ['Compare', ['vs Castmagic', 'vs Podsqueeze', 'vs Headliner', 'vs Swell AI']],
  ['Resources', ['Docs', 'Podcast chapters guide', 'Show notes template']],
  ['Company', ['Contact', 'Privacy', 'Terms']],
]
const FOOT_ANCHOR: Record<string, string> = { Features: 'features', Pricing: 'pricing', Compare: 'compare', 'Free show notes generator': 'demo' }

export function Footer() {
  return (
    <footer className="ec-footer">
      <div className="ec-container">
        <div className="ec-foot-cols">
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <h2 className="ec-foot-h">{h}</h2>
              <ul>
                {links.map((l) => (
                  <li key={l}>
                    <a href={`#${FOOT_ANCHOR[l] ?? (h === 'Compare' ? 'compare' : 'top')}`} onClick={(e) => { const id = FOOT_ANCHOR[l] ?? (h === 'Compare' ? 'compare' : null); if (id) { e.preventDefault(); scrollToId(id) } }}>{l}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="ec-foot-bottom">
          <Wordmark />
          <span>© 2026 Echo</span>
          <span className="ec-foot-tag">Made for people who press record every week.</span>
        </div>
      </div>
    </footer>
  )
}
