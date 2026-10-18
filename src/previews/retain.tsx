import { useEffect } from 'react'

const FONT = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap'

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

const SCORE = 78
const R = 300
const C = 340
const arc = `M ${C - R} ${C} A ${R} ${R} 0 0 1 ${C + R} ${C}`
const SIGNALS: [string, string][] = [
  ['Card expires before renewal', 'high'],
  ['Seats cut from 6 to 4', 'watch'],
  ['Usage down 20% this month', 'watch'],
]

export default function RetainPreview() {
  useFont(FONT)
  return (
    <div className="pv-retain">
      <style>{CSS}</style>
      <span className="pvn-x pvn-x1">+</span><span className="pvn-x pvn-x2">+</span><span className="pvn-x pvn-x3">+</span>
      <div className="pvn-gauge">
        <svg viewBox={`0 0 ${C * 2} ${C + 10}`} aria-hidden="true">
          <defs>
            <linearGradient id="pvn-g" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#8fd3a3" />
              <stop offset=".5" stopColor="#ecd2a0" />
              <stop offset="1" stopColor="#f2a3a3" />
            </linearGradient>
          </defs>
          <path d={arc} fill="none" stroke="rgba(217,211,246,.1)" strokeWidth="40" strokeLinecap="round" />
          <path d={arc} fill="none" stroke="url(#pvn-g)" strokeWidth="40" strokeLinecap="round" pathLength={100} strokeDasharray={`${SCORE} 100`} />
        </svg>
        <div className="pvn-read">
          <span className="pvn-cust">Acme Ltd <span>· example</span></span>
          <b>{SCORE}</b>
          <span className="pvn-band">High risk</span>
        </div>
      </div>
      <div className="pvn-copy">
        <h1>Retain</h1>
        <p>Save customers before they cancel.</p>
        <ul>
          {SIGNALS.map(([s, t]) => <li key={s}><i className={`t-${t}`} />{s}</li>)}
        </ul>
      </div>
    </div>
  )
}

const CSS = `
.pv-retain { position: relative; overflow: hidden; width: 1200px; height: 750px; font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #c9c6dc; -webkit-font-smoothing: antialiased;
  background-color: #1a1830;
  background-image: radial-gradient(ellipse 60% 70% at 30% 100%, rgba(139,127,214,.28) 0%, rgba(26,24,48,0) 70%), linear-gradient(to right, rgba(217,211,246,.06) 2px, transparent 2px), linear-gradient(to bottom, rgba(217,211,246,.06) 2px, transparent 2px);
  background-size: 100% 100%, 60px 60px, 60px 60px; }
.pv-retain * { box-sizing: border-box; }
.pv-retain svg { transform: none !important; }
.pv-retain .pvn-x { position: absolute; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 34px; line-height: 1; color: rgba(217,211,246,.45); }
.pv-retain .pvn-x1 { right: 30px; top: 26px; } .pv-retain .pvn-x2 { right: 30px; bottom: 26px; } .pv-retain .pvn-x3 { left: 30px; bottom: 26px; }
.pv-retain .pvn-gauge { position: absolute; left: 30px; bottom: 56px; width: 680px; height: 350px; }
.pv-retain .pvn-gauge svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.pv-retain .pvn-read { position: absolute; left: 0; right: 0; bottom: -10px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pv-retain .pvn-cust { font-size: 24px; color: #e9e7f5; font-weight: 500; letter-spacing: -0.02em; }
.pv-retain .pvn-cust span { color: rgba(201,198,220,.6); font-weight: 400; }
.pv-retain .pvn-read b { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-weight: 500; font-size: 168px; line-height: .9; letter-spacing: -0.05em; color: #ffffff; font-variant-numeric: tabular-nums; transition: transform .45s cubic-bezier(0.16, 1, 0.3, 1); }
a.app-card:hover .pv-retain .pvn-read b { transform: translateY(-6px); }
.pv-retain .pvn-band { padding: 8px 16px; border-radius: 6px; background: rgba(235,87,87,.14); border: 2px solid rgba(242,163,163,.5); color: #f6c1c1; font-size: 22px; font-weight: 600; letter-spacing: -0.015em; }
.pv-retain .pvn-copy { position: absolute; left: 740px; right: 60px; top: 150px; display: flex; flex-direction: column; gap: 22px; }
.pv-retain h1 { margin: 0; font-weight: 600; font-size: 132px; line-height: .84; letter-spacing: -0.06em; color: #f6f5fc; }
.pv-retain .pvn-copy p { margin: 0; font-size: 42px; line-height: 1.08; letter-spacing: -0.04em; font-weight: 500; color: #d9d3f6; text-wrap: balance; }
.pv-retain ul { list-style: none; margin: 34px 0 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.pv-retain li { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: rgba(255,255,255,.05); border: 2px solid rgba(217,211,246,.14); border-radius: 8px; font-size: 22px; color: #e9e7f5; letter-spacing: -0.02em; }
.pv-retain li i { width: 12px; height: 12px; border-radius: 50%; flex: none; }
.pv-retain .t-high { background: #f2a3a3; box-shadow: 0 0 0 5px rgba(242,163,163,.15); }
.pv-retain .t-watch { background: #ecd2a0; box-shadow: 0 0 0 5px rgba(236,210,160,.15); }
`
