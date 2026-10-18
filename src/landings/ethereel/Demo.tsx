import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Pill, Reveal, SectionHead, mmss, track, useClock } from './shared'
import { DEMO_REEL, Phone, RawClip, Reel } from './reel'

const CHAPTERS: [number, string][] = [[3, 'opening title'], [9, 'first punch-in'], [18, 'diagram'], [34, 'follow card']]
const DUR = DEMO_REEL.duration
const RAW = 64

export function Demo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const [userPaused, setUserPaused] = useState(false)
  const [userPlayed, setUserPlayed] = useState(false)
  const [muted, setMuted] = useState(true)
  const [side, setSide] = useState<'before' | 'after'>('after')
  const playing = inView && !userPaused
  const { t, seek, reduce } = useClock(DUR, playing, 19.4, true, !userPlayed)
  const actuallyPlaying = playing && (!reduce || userPlayed)
  const fired = useRef(false)
  useEffect(() => {
    if (actuallyPlaying && !fired.current) { fired.current = true; track('demo_played') }
  }, [actuallyPlaying])

  const rawT = (t / DUR) * RAW
  const toggle = () => {
    if (actuallyPlaying) setUserPaused(true)
    else { setUserPaused(false); setUserPlayed(true) }
  }
  const chapter = [...CHAPTERS].reverse().find(([s]) => t >= s)

  const before = (
    <Phone ariaLabel="Before: the raw 64 second take, with pauses and no captions" label={<span className="er-demo-tag"><Pill tone="grey">Before</Pill><span className="er-num">{mmss(rawT)} / 1:04</span></span>}>
      <RawClip t={rawT} timecode={false} />
    </Phone>
  )
  const after = (
    <Phone ariaLabel="After: the 47 second Ethereel reel with captions, punch-ins, a diagram and a follow card" label={<span className="er-demo-tag"><Pill>After</Pill><span className="er-num">{mmss(t)} / 0:47</span></span>}>
      <Reel script={DEMO_REEL} t={t} />
    </Phone>
  )

  return (
    <section className="er-section" id="demo" aria-labelledby="demo-h">
      <div className="er-rail er-pad">
        <SectionHead
          center
          title={<span id="demo-h">Watch one clip go <em>through</em> Ethereel.</span>}
          sub="Real raw footage, no retakes. 64 seconds in, 47 seconds out."
        />
        <Reveal>
          <div className="er-player" ref={ref}>
            <div className="er-seg er-demo-seg" role="radiogroup" aria-label="Before or after">
              {(['before', 'after'] as const).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={side === s} className={side === s ? 'on' : ''} onClick={() => setSide(s)}>
                  {s === 'before' ? 'Before' : 'After'}
                </button>
              ))}
            </div>
            <div className="er-stage" data-side={side}>
              <div className="er-stage-before">{before}</div>
              <div className="er-stage-arrow" aria-hidden="true">
                <svg width="64" height="24" viewBox="0 0 64 24"><path d="M2 13 C18 9 34 15 56 11 M49 5 L57 11 L50 18" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="er-num">-17 s</span>
              </div>
              <div className="er-stage-after">{after}</div>
              {reduce && !userPlayed && (
                <button type="button" className="er-poster-play" onClick={toggle} aria-label="Play the before and after">
                  <Play size={18} /> Play
                </button>
              )}
            </div>

            <div className="er-controls">
              <button type="button" className="er-icon-btn" onClick={toggle} aria-label={actuallyPlaying ? 'Pause' : 'Play'}>
                {actuallyPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="er-scrub">
                <input
                  type="range" min={0} max={DUR} step={0.1} value={t} aria-label="Seek"
                  aria-valuetext={`${mmss(t)} of 0:47`}
                  onChange={(e) => seek(Number(e.target.value))}
                  style={{ ['--p' as string]: `${(t / DUR) * 100}%` }}
                />
                {CHAPTERS.map(([s, l]) => (
                  <button
                    key={s} type="button" className={`er-mark${t >= s ? ' past' : ''}`} style={{ left: `${(s / DUR) * 100}%` }}
                    onClick={() => seek(s)} aria-label={`Jump to ${mmss(s)} ${l}`} title={`${mmss(s)} ${l}`}
                  />
                ))}
              </div>
              <span className="er-num er-time">{mmss(t)}</span>
              <button type="button" className="er-icon-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={!muted}>
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
            <ol className="er-chapters" aria-label="Chapters">
              {CHAPTERS.map(([s, l]) => (
                <li key={s}>
                  <button type="button" className={chapter?.[0] === s ? 'on' : ''} onClick={() => seek(s)}>
                    <span className="er-num">{mmss(s)}</span> {l}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
        <p className="er-note er-center-text">Every edit here was made by Ethereel and approved with one tap.</p>
      </div>
    </section>
  )
}
