import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Avatar, BandTag, Eyebrow, RUBRIC, Reveal, mss, track, waveform } from './shared'

const DURATION = 64
const NOTES = [
  { t: 12, kind: 'Keep' as const, crit: 'Permission', quote: "Yes, it's a cold call. Can I have 30 seconds?", note: 'Nice and honest. She stayed on the line.', tryLine: '' },
  { t: 33, kind: 'Fix' as const, crit: 'Pain discovery', quote: "So you'd want to...", note: 'You answered for her. Ask, then wait.', tryLine: 'What does that cost you each month-end?' },
  { t: 52, kind: 'Keep' as const, crit: 'Next step', quote: 'Does Thursday at 10 work?', note: 'A time, not "a quick chat".', tryLine: '' },
]
const BARS = 96

export function Demo({ startKey }: { startKey: number }) {
  const bars = useMemo(() => waveform(BARS, 11), [])
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const raf = useRef(0)
  const last = useRef(0)

  useEffect(() => {
    if (!playing) return
    last.current = performance.now()
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000
      last.current = now
      setT((x) => {
        const nx = x + dt * speed
        if (nx >= DURATION) { setPlaying(false); track('lp_sample_completed', { seconds: DURATION }); return DURATION }
        return nx
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, speed])

  useEffect(() => {
    if (startKey > 0) { setT((x) => (x >= DURATION ? 0 : x)); setPlaying(true) }
  }, [startKey])

  const toggle = () => {
    if (!playing) track('lp_sample_played', { trigger: 'play_button' })
    if (t >= DURATION) setT(0)
    setPlaying((p) => !p)
  }
  const seek = (s: number) => { setT(s); track('lp_sample_played', { trigger: 'marker' }); setPlaying(true) }
  const active = [...NOTES].reverse().find((n) => t >= n.t && t < n.t + 9)

  return (
    <section className="sp-section sp-band" id="hear" aria-labelledby="sp-hear-h">
      <div className="sp-wrap">
        <Reveal className="sp-head">
          <Eyebrow>Hear it</Eyebrow>
          <h2 id="sp-hear-h" className="sp-h2">A real practice call, and the scorecard it got.</h2>
        </Reveal>
        <Reveal className="sp-demo">
          <div className="sp-frame sp-audio">
            <div className="sp-audio-head">
              <Avatar initials="MO" hue="violet" size={40} />
              <div className="sp-persona-meta">
                <b>Margaret Okafor</b>
                <span>Cold call · Normal · 1:04</span>
              </div>
            </div>
            <div className="sp-wavebox">
              <div className="sp-markers">
                {NOTES.map((n) => (
                  <button
                    key={n.t}
                    type="button"
                    className={`sp-marker ${active === n ? 'is-on' : ''}`}
                    style={{ left: `${(n.t / DURATION) * 100}%` }}
                    aria-label={`Jump to ${mss(n.t)}: ${n.kind}, ${n.crit}`}
                    onClick={() => seek(n.t)}
                  ><span className="sp-num">{mss(n.t)}</span></button>
                ))}
              </div>
              <svg className="sp-static-wave" viewBox={`0 0 ${BARS * 4} 56`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <clipPath id="sp-played"><rect x="0" y="0" width={(t / DURATION) * BARS * 4} height="56" /></clipPath>
                </defs>
                {bars.map((h, i) => <rect key={i} x={i * 4 + 0.5} y={28 - h * 26} width="2.4" height={h * 52} fill="var(--ghost)" />)}
                <g clipPath="url(#sp-played)">
                  {bars.map((h, i) => <rect key={i} x={i * 4 + 0.5} y={28 - h * 26} width="2.4" height={h * 52} fill="var(--accent)" />)}
                </g>
              </svg>
              <span className="sp-playhead-track" style={{ transform: `translateX(${(t / DURATION) * 100}%)` }} aria-hidden="true"><span className="sp-playhead" /></span>
            </div>
            <div className="sp-audio-ctrl">
              <button type="button" className="sp-btn sp-btn-md sp-btn-primary sp-play" onClick={toggle} aria-label={playing ? 'Pause sample call' : 'Play sample call'}>
                {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                <span>{playing ? 'Pause' : 'Play'}</span>
              </button>
              <button type="button" className="sp-btn sp-btn-md sp-btn-ghost sp-speed" onClick={() => setSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1))} aria-label={`Playback speed ${speed}x`}>
                <span className="sp-num">{speed}x</span>
              </button>
              <span className="sp-audio-time sp-num" aria-live="off">{mss(t)} / {mss(DURATION)}</span>
            </div>
            <p className="sp-audio-hint">Talk ratio: you 52%, Margaret 48%. Click a marker to jump to the note.</p>
          </div>

          <div className="sp-frame sp-demo-score">
            <div className="sp-score-top">
              <span className="sp-score-total sp-big"><span className="sp-num sp-score-n">72</span><span className="sp-score-of">/ 100</span></span>
              <BandTag b="solid" />
            </div>
            <ul className="sp-rubric">
              {RUBRIC.map((r) => (
                <li className="sp-rrow" key={r.label}>
                  <span className="sp-rrow-l">{r.label}</span>
                  <span className="sp-bar"><span className="sp-bar-fill" style={{ transform: `scaleX(${r.score / 20})` }} /></span>
                  <span className="sp-num sp-rrow-n">{r.score}</span>
                </li>
              ))}
            </ul>
            <div className="sp-topfix"><b>Top fix:</b> ask about the pain, then let her answer before you pitch.</div>
            <ul className="sp-demo-notes">
              {NOTES.slice(0, 2).map((n) => (
                <li key={n.t} className={`sp-dnote ${active === n ? 'is-active' : ''}`}>
                  <div className="sp-note-top">
                    <button type="button" className="sp-note-t sp-num" onClick={() => seek(n.t)} aria-label={`Play from ${mss(n.t)}`}>{mss(n.t)}</button>
                    <span className="sp-pill">{n.crit}</span>
                    <span className={`sp-tag ${n.kind === 'Fix' ? 'sp-tag-weak' : 'sp-tag-strong'}`}>{n.kind}</span>
                  </div>
                  <p className="sp-note-q">&ldquo;{n.quote}&rdquo; <span>{n.note}</span></p>
                  {n.tryLine && <p className="sp-note-try"><b>Try:</b> &lsquo;{n.tryLine}&rsquo;</p>}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <p className="sp-fineprint sp-center">Recorded on Sparring with the built-in Sceptical CFO persona. Your scores will vary.</p>
      </div>
    </section>
  )
}
