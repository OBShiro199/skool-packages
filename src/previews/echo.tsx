import { useEffect } from 'react'

const FONT = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,300..700,0..100,0..1&display=swap'

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

const BARS = Array.from({ length: 84 }, (_, i) => 0.18 + Math.abs(Math.sin((i + 3) * 1.37) * Math.cos((i + 3) * 0.53)) * 0.82)
const CLIP: [number, number] = [50, 66]

/* One episode in the middle, everything it turns into around it. [label, x, y, tone] */
const OUTPUTS: [string, number, number, string][] = [
  ['Show notes', 150, 150, 'v'],
  ['Newsletter', 76, 266, 'g'],
  ['Chapters', 880, 142, 'b'],
  ['Pull quotes', 944, 262, 'a'],
  ['Audiogram', 196, 440, 'b'],
  ['SEO blog post', 820, 428, 'v'],
]

export default function EchoPreview() {
  useFont(FONT)
  return (
    <div className="pv-echo">
      <style>{CSS}</style>
      <div className="pve-ripples"><i /><i /><i /><i /><i /></div>
      {OUTPUTS.map(([t, x, y, tone]) => (
        <span key={t} className={`pve-out pve-${tone}`} style={{ left: x, top: y }}><i />{t}</span>
      ))}
      <div className="pve-copy">
        <h1>Echo</h1>
        <p>Every episode, written up <em>and clipped.</em></p>
      </div>
      <div className="pve-wave">
        <span className="pve-ep"><b>Ep 87</b> The Bootstrapped Hour</span>
        <div className="pve-bars">
          {BARS.map((h, i) => (
            <i key={i} className={i >= CLIP[0] && i < CLIP[1] ? 'is-clip' : ''} style={{ height: `${Math.round(h * 100)}%` }} />
          ))}
          <span className="pve-clip" style={{ left: `${(CLIP[0] / BARS.length) * 100}%`, width: `${((CLIP[1] - CLIP[0]) / BARS.length) * 100}%` }}>
            <span className="pve-clip-tag">Clip 42:10</span>
          </span>
        </div>
      </div>
    </div>
  )
}

const CSS = `
.pv-echo { position: relative; overflow: hidden; width: 1200px; height: 750px; background: radial-gradient(ellipse 70% 60% at 50% 42%, #f5f1fd 0%, #faf8fe 55%, #ffffff 100%); font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #3c4149; -webkit-font-smoothing: antialiased; }
.pv-echo * { box-sizing: border-box; }
.pv-echo .pve-ripples { position: absolute; left: 600px; top: 292px; width: 0; height: 0; }
.pv-echo .pve-ripples i { position: absolute; left: 0; top: 0; border-radius: 50%; border: 2px solid #ddd2f7; transform: translate(-50%, -50%); transition: transform .8s cubic-bezier(0.16, 1, 0.3, 1); }
.pv-echo .pve-ripples i:nth-child(1) { width: 300px; height: 300px; opacity: 1; }
.pv-echo .pve-ripples i:nth-child(2) { width: 520px; height: 520px; opacity: .8; }
.pv-echo .pve-ripples i:nth-child(3) { width: 740px; height: 740px; opacity: .6; }
.pv-echo .pve-ripples i:nth-child(4) { width: 960px; height: 960px; opacity: .4; }
.pv-echo .pve-ripples i:nth-child(5) { width: 1180px; height: 1180px; opacity: .25; }
a.app-card:hover .pv-echo .pve-ripples i { transform: translate(-50%, -50%) scale(1.05); }
.pv-echo .pve-copy { position: absolute; left: 0; right: 0; top: 176px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.pv-echo h1 { margin: 0; font-family: Fraunces, Georgia, serif; font-variation-settings: 'SOFT' 100, 'WONK' 1; font-optical-sizing: auto; font-weight: 560; font-size: 180px; line-height: .86; letter-spacing: -0.06em; color: #08090a; }
.pv-echo .pve-copy p { margin: 0; font-size: 42px; line-height: 1.1; letter-spacing: -0.035em; color: #3c4149; font-weight: 500; }
.pv-echo .pve-copy em { font-family: Fraunces, Georgia, serif; font-style: italic; font-weight: 440; color: #5b3fc0; letter-spacing: -0.03em; font-variation-settings: 'SOFT' 100, 'WONK' 1; }
.pv-echo .pve-out { position: absolute; display: inline-flex; align-items: center; gap: 12px; padding: 12px 20px; border-radius: 8px; font-size: 26px; line-height: 1; font-weight: 500; letter-spacing: -0.02em; background: #ffffff; border: 2px solid; box-shadow: 0 10px 24px -14px rgba(91,63,192,.35); white-space: nowrap; }
.pv-echo .pve-out i { width: 12px; height: 12px; border-radius: 3px; }
.pv-echo .pve-v { border-color: #d9cdf6; color: #5b3fc0; } .pv-echo .pve-v i { background: #8a6be0; }
.pv-echo .pve-b { border-color: #c4d4f5; color: #3a5fb8; } .pv-echo .pve-b i { background: #5f86e0; }
.pv-echo .pve-a { border-color: #f0d9a8; color: #8f5d05; } .pv-echo .pve-a i { background: #d18b0f; }
.pv-echo .pve-g { border-color: #bfe3c9; color: #1d7a35; } .pv-echo .pve-g i { background: #27a644; }
.pv-echo .pve-wave { position: absolute; left: 80px; right: 80px; bottom: 54px; display: flex; flex-direction: column; gap: 16px; }
.pv-echo .pve-ep { font-size: 22px; color: #62666d; letter-spacing: -0.015em; }
.pv-echo .pve-ep b { color: #08090a; font-weight: 600; margin-right: 8px; }
.pv-echo .pve-bars { position: relative; height: 112px; display: flex; align-items: center; justify-content: space-between; gap: 4px; }
.pv-echo .pve-bars i { flex: 1; border-radius: 4px; background: #ddd5f3; }
.pv-echo .pve-bars i.is-clip { background: #8a6be0; }
.pv-echo .pve-clip { position: absolute; top: -14px; bottom: -14px; border: 2px solid #8a6be0; border-radius: 8px; background: rgba(138,107,224,.08); }
.pv-echo .pve-clip-tag { position: absolute; right: -2px; top: -46px; padding: 6px 12px; border-radius: 6px; background: #f5f1fd; border: 2px solid #d9cdf6; color: #5b3fc0; font-size: 20px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
`
