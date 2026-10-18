import type { CSSProperties, ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Lock, Play } from 'lucide-react'
import { Audiogram } from './Audiogram'
import { CHAPTERS, EASE, LOOP, Reveal, SectionHead, Tick, useLoopStep } from './shared'

type TileProps = {
  size: 'wide' | 'narrow' | 'half'
  eyebrow: string; title: string; body: string; bullets: string[]
  visual: ReactNode; delay?: number
}

function Tile({ size, eyebrow, title, body, bullets, visual, delay = 0 }: TileProps) {
  return (
    <Reveal as="li" className={`ec-tile ec-tile-${size}`} delay={delay}>
      <div className="ec-tile-copy">
        <span className="ec-tile-eyebrow">{eyebrow}</span>
        <h3 className="ec-h3">{title}</h3>
        <p className="ec-tile-body">{body}</p>
        <ul className="ec-bullets">
          {bullets.map((b) => <li key={b}><Check size={14} strokeWidth={1.75} aria-hidden="true" />{b}</li>)}
        </ul>
      </div>
      <Reveal className="ec-tile-visual" delay={delay + 0.12} y={16}>{visual}</Reveal>
    </Reveal>
  )
}

/* 7.1 Chapters beside a speech strip; the playhead walks from chapter to chapter. */
const STRIP_CH = [0.02, 0.2, 0.39, 0.58, 0.79]
function ChaptersVisual() {
  const { ref, step } = useLoopStep(5, 1500)
  const segs = Array.from({ length: 46 }, (_, i) => ({ who: Math.floor(i / 3 + Math.sin(i)) % 2, h: 0.35 + Math.abs(Math.sin(i * 2.1)) * 0.65 }))
  return (
    <div ref={ref} className="ec-v-chapters" role="img" aria-label="Chapters tab beside the speech strip, with a tick where each chapter starts">
      <div className="ec-strip-v" aria-hidden="true">
        <div className="ec-strip-segs">
          {segs.map((s, i) => <i key={i} className={s.who ? 'is-b' : ''} style={{ '--h': s.h.toFixed(2) } as CSSProperties} />)}
        </div>
        {STRIP_CH.map((x, i) => <span key={i} className={`ec-strip-tick ${i === step ? 'is-on' : ''}`} style={{ left: `${x * 100}%` }} />)}
        <motion.span className="ec-strip-head" animate={{ left: `${STRIP_CH[step] * 100}%` }} transition={{ duration: 0.6, ease: LOOP }} />
        <div className="ec-strip-legend"><span><i /> Sam</span><span><i className="is-b" /> Priya</span></div>
      </div>
      <ol className="ec-v-chlist" aria-hidden="true">
        {CHAPTERS.slice(0, 5).map(([t, title], i) => (
          <li key={t} className={i === step ? 'is-on' : ''}><time className="ec-mono">{t}</time><span>{title}</span></li>
        ))}
      </ol>
    </div>
  )
}

/* 7.2 Three quote cards; the Verified tick lands on each in turn. */
const QUOTES: [string, string, string][] = [
  ['Priya', '15:05', 'Seats were the wrong thing to count.'],
  ['Priya', '21:32', 'Saying no to that client paid for the next year.'],
  ['Sam', '34:47', 'The dashboard was green and we were losing money.'],
]
function QuotesVisual() {
  const { ref, step } = useLoopStep(4, 900)
  return (
    <div ref={ref} className="ec-v-quotes" role="img" aria-label="Three pull quote cards, each with a green Verified tick">
      {QUOTES.map(([who, t, q], i) => (
        <div key={t} className="ec-quote" aria-hidden="true">
          <p>“{q}”</p>
          <div className="ec-quote-meta">
            <span>{who} · <time className="ec-mono">{t}</time></span>
            <span className={`ec-verified ${i < step || step === 3 ? 'is-on' : ''}`}><Tick /> Verified</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* 7.3 The voice card: tone pills light up one by one, then a sample line types in. */
const TONES = ['Warm', 'Plain words', 'Short sentences', 'First person', 'No emojis']
function VoiceVisual() {
  const { ref, step } = useLoopStep(6, 800)
  return (
    <div ref={ref} className="ec-v-voice ec-frame" role="img" aria-label="Voice card with tone pills and Do and Don't lists">
      <div className="ec-voice-head" aria-hidden="true"><b>Voice card</b><span>From 1,240 words you wrote</span></div>
      <ul className="ec-tones" aria-hidden="true">
        {TONES.map((t, i) => <li key={t} className={i <= step - 1 || step === 5 ? 'is-on' : ''}>{t}</li>)}
      </ul>
      <div className="ec-dodont" aria-hidden="true">
        <div><b>Do</b><p>Say “we”, not “the team”</p><p>End on a question</p></div>
        <div><b>Don’t</b><p>“Unlock”, “dive in”</p><p>Exclamation marks</p></div>
      </div>
    </div>
  )
}

/* 7.4 Three phone frames, one per style. */
function AudiogramsVisual() {
  return (
    <div className="ec-v-phones">
      <Audiogram variant="Bars" compact />
      <Audiogram variant="Line" compact />
      <Audiogram variant="Minimal" compact />
    </div>
  )
}

/* 7.5 A public episode page in a browser frame; the sticky player plays through. */
function PageVisual() {
  const { ref, step } = useLoopStep(8, 700)
  return (
    <div ref={ref} className="ec-v-page ec-frame" role="img" aria-label="Public episode page with the full transcript split by chapter and a sticky player">
      <div className="ec-browser" aria-hidden="true">
        <span className="ec-dots"><i /><i /><i /></span>
        <span className="ec-url"><Lock size={10} strokeWidth={2} /> bootstrappedhour.com/ep-87</span>
      </div>
      <div className="ec-page-body" aria-hidden="true">
        <b className="ec-page-title">Ep 87 · Selling hours, not seats</b>
        <span className="ec-page-ch ec-mono">15:05 · Pricing by audio hour</span>
        <p><span className="ec-page-who">Priya</span> The week three agencies asked for ten seats and used two.</p>
        <span className="ec-page-ch ec-mono">21:32 · Saying no to a big client</span>
        <p><span className="ec-page-who">Sam</span> Walk me through that call.</p>
      </div>
      <div className="ec-player" aria-hidden="true">
        <span className="ec-player-btn"><Play size={10} strokeWidth={2} /></span>
        <span className="ec-player-track"><motion.span animate={{ scaleX: 0.12 + step * 0.11 }} transition={{ duration: 0.7, ease: 'linear' }} /></span>
        <span className="ec-mono">{`${15 + step}:${step % 2 ? '35' : '05'}`}</span>
      </div>
    </div>
  )
}

/* 7.6 The Episodes table filtered by show; rows slide in when the filter changes. */
const SHOWS: [string, string][] = [['Northwind Talks', 'teal'], ['Field Notes', 'amber'], ['The Ops Room', 'rose']]
const EPISODES: [number, string, string][] = [
  [0, 'Ep 41 · Shipping on Fridays', 'Ready'], [1, 'Ep 12 · Soil, then seeds', 'Writing'], [2, 'Ep 9 · The on-call rota', 'Published'],
  [0, 'Ep 40 · Hiring slow', 'Published'], [1, 'Ep 11 · Market day', 'Ready'], [2, 'Ep 8 · Postmortems', 'Published'],
  [0, 'Ep 39 · Pricing in public', 'Published'], [1, 'Ep 10 · The first frost', 'Published'], [2, 'Ep 7 · Paging less', 'Ready'],
]
function AgencyVisual() {
  const { ref, step } = useLoopStep(4, 2000)
  const filter = step === 3 ? -1 : step
  const rows = EPISODES.filter(([s]) => filter < 0 || s === filter).slice(0, 3)
  return (
    <div ref={ref} className="ec-v-table ec-frame" role="img" aria-label="Episodes table filtered by show, each show with its own colour">
      <div className="ec-filter" aria-hidden="true">
        <span className="ec-filter-chip">Show <b>{filter < 0 ? 'All 25' : SHOWS[filter][0]}</b></span>
        <span className="ec-filter-add">+ Add filter</span>
      </div>
      <ul aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map(([s, ep, status], i) => (
            <motion.li
              key={ep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.36, delay: i * 0.025, ease: EASE }}
            >
              <span className={`ec-showdot is-${SHOWS[s][1]}`} />
              <span className="ec-ellipsis">{ep}</span>
              <span className={`ec-status is-${status.toLowerCase()}`}>{status}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

export function Features() {
  return (
    <section className="ec-section" id="features" aria-labelledby="ec-features-h">
      <div className="ec-container">
        <SectionHead
          id="ec-features-h"
          eyebrow="Features"
          title={<>Everything an episode needs, <em>from one upload.</em></>}
        />
        <ul className="ec-bento">
          <Tile
            size="wide" eyebrow="Notes and chapters" title="Timestamps that land on the right second"
            body="Echo reads the whole conversation, not a summary of it. Chapters start where the topic changes, and you can drag one by a few seconds if you disagree."
            bullets={['5 title options with different angles', 'Show notes with key points, resources and a guest bio', 'Copy chapters in YouTube or podcast host format']}
            visual={<ChaptersVisual />}
          />
          <Tile
            size="narrow" delay={0.08} eyebrow="Pull quotes" title="Five quotes. Every one checked against the transcript."
            body="AI loves to paraphrase. Echo checks each quote is exactly what was said, snaps it to the second, and drops it if it is not."
            bullets={['Verified tick on every quote', 'Speaker names you set once', 'One click to make it an audiogram']}
            visual={<QuotesVisual />}
          />
          <Tile
            size="narrow" eyebrow="Your voice" title="Paste something you wrote. Echo writes like that."
            body="Echo builds a voice card from your own writing: the words you use, how long your sentences are, whether you ever use emojis. Every asset follows it."
            bullets={['One voice per show, for agencies with many clients', 'Regenerate any asset with an instruction', 'Undo to any of the last 10 versions']}
            visual={<VoiceVisual />}
          />
          <Tile
            size="wide" delay={0.08} eyebrow="Audiograms" title="Highlight 45 seconds. Get a vertical clip with captions."
            body="Pick a quote or one of the five suggested clips, choose a style in your show's colours, and Echo renders a 1080x1920 MP4 with a moving waveform and word-by-word captions in about two minutes."
            bullets={['Three styles: Bars, Line, Minimal', 'Captions from the transcript, no typing', 'Ready for Reels, Shorts, TikTok and LinkedIn']}
            visual={<AudiogramsVisual />}
          />
          <Tile
            size="half" eyebrow="Episode pages" title="Every episode gets a page with the full transcript."
            body="Publish a clean episode page with notes, chapters, quotes and a player that streams from your own host, so your download stats stay where they are. Embed the player on your site in one paste."
            bullets={['Full transcript as real text, split by chapter', 'chapters.json and transcript files for Apple and Spotify', 'SEO blog post written for one real search term']}
            visual={<PageVisual />}
          />
          <Tile
            size="half" delay={0.08} eyebrow="Agencies" title="Twenty-five client shows. One login."
            body="Each show has its own feed, voice, colours and public pages. Your team works in one workspace and new episodes arrive by themselves from every client's RSS feed."
            bullets={['Auto-import new episodes every 15 minutes', 'Roles for owners, admins and producers', 'One bill, usage shared across shows']}
            visual={<AgencyVisual />}
          />
        </ul>
      </div>
    </section>
  )
}
