import { useEffect } from 'react'
import { CONCEPTS, Face, type Concept } from '../landings/marquee/Thumb'

const FONT = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap'

function useFont(href: string) {
  useEffect(() => {
    if (document.querySelector(`link[data-pv-font="${href}"]`)) return
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = href
    l.dataset.pvFont = href
    document.head.appendChild(l)
  }, [href])
}

function Thumb({ c, win }: { c: Concept; win?: boolean }) {
  const split = c.prop === 'split' || c.prop === 'vs'
  return (
    <div className={`pvm-thumb${win ? ' is-win' : ''}`}>
      <div className="pvm-img" style={{ background: c.bg }}>
        {c.prop === 'burst' && <i className="pvm-burst" />}
        {split ? (
          <>
            <b className={`pvm-half pvm-l pvm-${c.headTone}`}>{c.head}</b>
            <b className={`pvm-half pvm-r pvm-${c.headTone}`}>{c.sub}</b>
          </>
        ) : (
          <b className={`pvm-head pvm-${c.headTone} ${c.side === 'left' ? 'pvm-onright' : 'pvm-onleft'}`}>{c.head}</b>
        )}
        <span className={`pvm-face pvm-face-${c.prop === 'vs' ? 'mid' : c.side}`}><Face expr={c.expr} shirt={c.shirt} /></span>
        <span className="pvm-time">{c.time}</span>
      </div>
      {win && <span className="pvm-win"><i />Winner</span>}
    </div>
  )
}

const WALL = [3, 0, 5, 4, 1, 2, 0, 3, 1, 5, 2, 4]

export default function MarqueePreview() {
  useFont(FONT)
  return (
    <div className="pv-marquee">
      <style>{CSS}</style>
      <div className="pvm-wall">
        {WALL.map((ci, i) => <Thumb key={i} c={CONCEPTS[ci]} win={i === 3} />)}
      </div>
      <div className="pvm-fade" />
      <div className="pvm-copy">
        <span className="pvm-chip"><i />A/B testing on your live video</span>
        <h1>Marquee</h1>
        <p>Thumbnails that prove themselves.</p>
      </div>
    </div>
  )
}

const CSS = `
.pv-marquee { position: relative; overflow: hidden; width: 1200px; height: 750px; background: #ffffff; font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #3c4149; -webkit-font-smoothing: antialiased; }
.pv-marquee * { box-sizing: border-box; }
.pv-marquee svg { transform: none !important; }
.pv-marquee .pvm-wall { position: absolute; left: 600px; top: -70px; width: 1040px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; transform: rotate(-12deg); transform-origin: 0 0; }
.pv-marquee .pvm-thumb { position: relative; padding: 0; transition: transform .5s cubic-bezier(0.16, 1, 0.3, 1); }
.pv-marquee .pvm-img { position: relative; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; isolation: isolate; box-shadow: 0 0 0 1px rgba(8,9,10,.06); }
.pv-marquee .pvm-thumb.is-win { z-index: 2; }
.pv-marquee .pvm-thumb.is-win .pvm-img { box-shadow: 0 0 0 6px #ffffff, 0 0 0 10px #3e9e9a, 0 24px 48px -12px rgba(30,98,95,.45); }
a.app-card:hover .pv-marquee .pvm-thumb.is-win { transform: scale(1.04); }
.pv-marquee .pvm-win { position: absolute; left: 14px; top: -22px; display: inline-flex; align-items: center; gap: 10px; padding: 8px 16px; background: #eef7f6; border: 2px solid #bfe1de; border-radius: 8px; color: #1e625f; font: 600 26px/1 Geist, sans-serif; letter-spacing: -0.02em; }
.pv-marquee .pvm-win i { width: 12px; height: 12px; border-radius: 50%; background: #3e9e9a; }
.pv-marquee .pvm-head { position: absolute; top: 9%; width: 56%; font-family: 'Space Grotesk', Geist, sans-serif; font-weight: 700; font-size: 44px; line-height: .92; letter-spacing: -0.04em; z-index: 2; text-wrap: balance; }
.pv-marquee .pvm-onleft { left: 6%; }
.pv-marquee .pvm-onright { right: 5%; text-align: right; }
.pv-marquee .pvm-half { position: absolute; top: 8%; font-family: 'Space Grotesk', Geist, sans-serif; font-weight: 700; font-size: 38px; line-height: 1; letter-spacing: -0.04em; z-index: 2; }
.pv-marquee .pvm-l { left: 5%; } .pv-marquee .pvm-r { right: 5%; }
.pv-marquee .pvm-light { color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.35); }
.pv-marquee .pvm-dark { color: #111; text-shadow: 0 2px 0 rgba(255,255,255,.6); }
.pv-marquee .pvm-face { position: absolute; bottom: -2%; height: 92%; z-index: 1; display: block; aspect-ratio: 100 / 120; }
.pv-marquee .pvm-face svg { width: 100%; height: 100%; display: block; }
.pv-marquee .pvm-face-right { right: 4%; } .pv-marquee .pvm-face-left { left: 3%; }
.pv-marquee .pvm-face-mid { left: 50%; margin-left: -12%; height: 78%; }
.pv-marquee .pvm-burst { position: absolute; left: -10%; top: -20%; width: 70%; aspect-ratio: 1; background: repeating-conic-gradient(rgba(255,255,255,.28) 0 8deg, transparent 8deg 22deg); border-radius: 50%; }
.pv-marquee .pvm-time { position: absolute; right: 3%; bottom: 5%; z-index: 3; background: rgba(8,9,10,.72); color: #fff; font: 500 14px/1 Geist, sans-serif; padding: 4px 6px; border-radius: 4px; font-variant-numeric: tabular-nums; }
.pv-marquee .pvm-fade { position: absolute; inset: 0; background: linear-gradient(77deg, #ffffff 0%, #ffffff 34%, rgba(255,255,255,.9) 44%, rgba(255,255,255,0) 60%); pointer-events: none; }
.pv-marquee .pvm-copy { position: absolute; left: 72px; bottom: 76px; display: flex; flex-direction: column; align-items: flex-start; gap: 18px; }
.pv-marquee .pvm-chip { display: inline-flex; align-items: center; gap: 12px; padding: 10px 18px; border: 2px solid #bfe1de; background: #eef7f6; border-radius: 8px; color: #1e625f; font-size: 26px; line-height: 1; font-weight: 500; letter-spacing: -0.02em; margin-bottom: 6px; }
.pv-marquee .pvm-chip i { width: 12px; height: 12px; border-radius: 50%; background: #3e9e9a; box-shadow: 0 0 0 5px rgba(62,158,154,.18); }
.pv-marquee h1 { margin: 0; font-family: 'Space Grotesk', Geist, sans-serif; font-weight: 600; font-size: 148px; line-height: .86; letter-spacing: -0.055em; color: #08090a; }
.pv-marquee p { margin: 0; font-size: 42px; line-height: 1.1; letter-spacing: -0.035em; color: #3c4149; font-weight: 500; max-width: 13em; }
`
