import { useEffect } from 'react'

const FONT = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'

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

const COLS = 22
const ROWS = 19
/* Deterministic pseudo-random so the field never changes between renders. */
const rnd = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const r = rnd(i)
  return r > 0.965 ? 'hot' : r > 0.9 ? 'warm' : r > 0.62 ? 'seen' : 'dim'
})
const ANCHOR = 8 * COLS + 11

export default function HarvestPreview() {
  useFont(FONT)
  return (
    <div className="pv-harvest">
      <style>{CSS}</style>
      <div className="pvh-field">
        {CELLS.map((c, i) => <i key={i} className={i === ANCHOR ? 'is-anchor' : `is-${c}`} />)}
      </div>
      <div className="pvh-card">
        <div className="pvh-card-top">
          <span className="pvh-av">SL</span>
          <span className="pvh-who"><b>Sam Lee</b><span>Head of Growth · Loopwise</span></span>
          <span className="pvh-tier">Hot</span>
        </div>
        <p className="pvh-opener">“Your point about churn in week two matched what we see too.”</p>
        <div className="pvh-card-foot"><span className="pvh-ok">Email verified</span><span className="pvh-mono">Reacted to your post</span></div>
      </div>
      <div className="pvh-copy">
        <span className="pvh-time"><i />Ready <b>07:00</b></span>
        <h1>Harvest</h1>
        <p>Everyone who liked your post, sorted into warm leads.</p>
      </div>
      <span className="pvh-legend"><i className="l-dim" />Engaged <i className="l-warm" />Fits your buyer <i className="l-hot" />Hot</span>
    </div>
  )
}

const CSS = `
.pv-harvest { position: relative; overflow: hidden; width: 1200px; height: 750px; background: #f6fbf9; font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #3c4149; -webkit-font-smoothing: antialiased; }
.pv-harvest * { box-sizing: border-box; }
.pv-harvest .pvh-field { position: absolute; right: -40px; top: -30px; display: grid; grid-template-columns: repeat(${COLS}, 30px); grid-auto-rows: 30px; gap: 10px; -webkit-mask-image: linear-gradient(90deg, transparent 8%, #000 48%); mask-image: linear-gradient(90deg, transparent 8%, #000 48%); }
.pv-harvest .pvh-field i { display: block; width: 30px; height: 30px; border-radius: 50%; }
.pv-harvest .pvh-field .is-dim { background: #e3ebe8; }
.pv-harvest .pvh-field .is-seen { background: #d2e0db; }
.pv-harvest .pvh-field .is-warm { background: #c3e2d8; box-shadow: inset 0 0 0 2px #4f9d8a; }
.pv-harvest .pvh-field .is-hot { background: #fdf0ef; box-shadow: inset 0 0 0 2px #e0857c; }
.pv-harvest .pvh-field .is-anchor { background: #4f9d8a; box-shadow: 0 0 0 8px rgba(79,157,138,.22), 0 0 0 18px rgba(79,157,138,.1); }
.pv-harvest .pvh-card { position: absolute; left: 690px; top: 392px; width: 470px; padding: 26px 28px 24px; background: #fff; border: 1px solid #e6e6e9; border-radius: 10px; box-shadow: 0 24px 56px -20px rgba(47,110,95,.35), 0 0 0 1px rgba(8,9,10,.03); display: flex; flex-direction: column; gap: 18px; transition: transform .4s cubic-bezier(0.16, 1, 0.3, 1); }
.pv-harvest .pvh-card::before { content: ''; position: absolute; left: 134px; top: -72px; width: 2px; height: 72px; background: linear-gradient(#4f9d8a, rgba(79,157,138,.2)); }
a.app-card:hover .pv-harvest .pvh-card { transform: translateY(-8px); }
.pv-harvest .pvh-card-top { display: flex; align-items: center; gap: 16px; }
.pv-harvest .pvh-av { width: 60px; height: 60px; border-radius: 50%; background: #eff7f4; border: 2px solid #c3e2d8; color: #2f6e5f; display: grid; place-items: center; font-weight: 600; font-size: 22px; letter-spacing: -0.02em; flex: none; }
.pv-harvest .pvh-who { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.pv-harvest .pvh-who b { font-size: 30px; line-height: 1.05; font-weight: 600; color: #08090a; letter-spacing: -0.03em; }
.pv-harvest .pvh-who span { font-size: 22px; line-height: 1.1; color: #62666d; letter-spacing: -0.02em; white-space: nowrap; }
.pv-harvest .pvh-tier { padding: 8px 14px; border-radius: 6px; background: #fdf0ef; border: 2px solid #f4c7c3; color: #b23b31; font-weight: 600; font-size: 22px; line-height: 1; }
.pv-harvest .pvh-opener { margin: 0; font-size: 24px; line-height: 1.32; color: #3c4149; letter-spacing: -0.02em; padding: 16px 18px; background: #fafafb; border-left: 3px solid #4f9d8a; border-radius: 0 6px 6px 0; }
.pv-harvest .pvh-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pv-harvest .pvh-ok { display: inline-flex; align-items: center; gap: 8px; color: #1e7a34; font-size: 20px; font-weight: 500; }
.pv-harvest .pvh-ok::before { content: ''; width: 10px; height: 10px; border-radius: 50%; background: #27a644; }
.pv-harvest .pvh-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 17px; color: #6f747c; letter-spacing: -0.02em; }
.pv-harvest .pvh-copy { position: absolute; left: 72px; top: 168px; display: flex; flex-direction: column; align-items: flex-start; gap: 22px; width: 580px; }
.pv-harvest .pvh-time { display: inline-flex; align-items: center; gap: 12px; padding: 10px 18px; background: #fff; border: 2px solid #c3e2d8; border-radius: 8px; color: #2f6e5f; font-size: 26px; line-height: 1; font-weight: 500; letter-spacing: -0.02em; }
.pv-harvest .pvh-time b { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 500; font-size: 24px; }
.pv-harvest .pvh-time i { width: 12px; height: 12px; border-radius: 50%; background: #4f9d8a; box-shadow: 0 0 0 5px rgba(79,157,138,.18); }
.pv-harvest h1 { margin: 0; font-weight: 600; font-size: 144px; line-height: .86; letter-spacing: -0.06em; color: #08090a; }
.pv-harvest .pvh-copy p { margin: 0; font-size: 44px; line-height: 1.08; letter-spacing: -0.04em; color: #3c4149; font-weight: 500; text-wrap: balance; }
.pv-harvest .pvh-legend { position: absolute; left: 76px; bottom: 64px; display: flex; align-items: center; gap: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 20px; color: #62666d; letter-spacing: -0.02em; }
.pv-harvest .pvh-legend i { width: 18px; height: 18px; border-radius: 50%; margin-left: 14px; }
.pv-harvest .pvh-legend i:first-child { margin-left: 0; }
.pv-harvest .l-dim { background: #d2e0db; } .pv-harvest .l-warm { background: #c3e2d8; box-shadow: inset 0 0 0 2px #4f9d8a; } .pv-harvest .l-hot { background: #fdf0ef; box-shadow: inset 0 0 0 2px #e0857c; }
`
