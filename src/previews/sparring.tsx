import { useEffect } from 'react'

/**
 * Sparring hero: a sales-floor scoreboard. Name and promise top left, a big score ring top right, and
 * a full-bleed call timeline across the bottom: two waveforms with coaching notes pinned to the exact second.
 */

const FONT = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600&display=swap'

const N = 110
const amp = (i: number, seed: number) => Math.abs(Math.sin(i * 0.71 + seed) * 0.6 + Math.sin(i * 0.23 + seed * 2) * 0.4)
// Who is talking in each stretch (example call): 1 = you, 0 = prospect.
const talk = (i: number) => (i < 14 ? 1 : i < 30 ? 0 : i < 46 ? 1 : i < 64 ? 0 : i < 78 ? 1 : i < 84 ? 0 : i < 96 ? 1 : 0)
const at = (sec: number) => 72 + 1056 * (sec / 300)

const CSS = `
.pv-sparring { --ink:#08090a; --body:#3c4149; --muted:#62666d; --faint:#6f747c; --hair:#e6e6e9; --div:#efeff1;
  --accent:#3f95c9; --accent-soft:#eef6fb; --accent-edge:#c2dff0; --accent-ink:#1f5f86; --num:'Inter Tight', Geist, sans-serif;
  --ok-soft:#eef8f0; --ok-edge:#bfe3c8; --ok-ink:#1d7a33; --bad-soft:#fdf0f0; --bad-edge:#f5c6c6; --bad-ink:#b23c3c;
  position:relative; width:1200px; height:750px; overflow:hidden; color:var(--body);
  background:linear-gradient(180deg, #ffffff 0%, #ffffff 46%, #f3f8fc 100%);
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-sparring *, .pv-sparring *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-sparring .pp-copy { position:absolute; left:72px; top:140px; }
.pv-sparring h1 { font-family:var(--num); font-size:144px; line-height:.88; letter-spacing:-.06em; font-weight:600; color:var(--ink); }
.pv-sparring .pp-promise { margin-top:22px; font-size:38px; letter-spacing:-.03em; color:var(--muted); }
.pv-sparring .pp-promise b { font-weight:500; color:var(--ink); }

.pv-sparring .pp-score { position:absolute; right:72px; top:70px; width:270px; height:270px; }
.pv-sparring .pp-score svg { position:absolute; inset:0; }
.pv-sparring .pp-sv { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.pv-sparring .pp-sv b { font-family:var(--num); font-size:108px; line-height:.9; letter-spacing:-.05em; font-weight:600; color:var(--ink); font-variant-numeric:tabular-nums; }
.pv-sparring .pp-sv span { margin-top:6px; font-size:19px; color:var(--faint); }
.pv-sparring .pp-sv em { margin-top:10px; font-style:normal; font-size:16px; font-weight:500; color:var(--accent-ink); background:var(--accent-soft); border:1px solid var(--accent-edge); padding:2px 10px; border-radius:4px; }

.pv-sparring .pp-tl { position:absolute; left:0; right:0; top:440px; bottom:0; border-top:1px solid var(--hair); }
.pv-sparring .pp-tl-h { position:absolute; left:72px; right:72px; top:20px; display:flex; justify-content:space-between; font-size:17px; color:var(--faint); }
.pv-sparring .pp-tl-h b { font-weight:500; color:var(--ink); }
.pv-sparring .pp-wave { position:absolute; left:72px; right:72px; top:118px; height:150px; display:flex; align-items:center; gap:3px; }
.pv-sparring .pp-wave i { flex:1; border-radius:3px; transition:transform .6s cubic-bezier(.2,0,0,1); }
.pv-sparring .pp-wave i.pp-you { background:var(--accent); opacity:.55; }
.pv-sparring .pp-wave i.pp-them { background:#c9ccd3; }
.pv-sparring .pp-ticks { position:absolute; left:72px; right:72px; bottom:22px; display:flex; justify-content:space-between; font-family:var(--num); font-size:16px; color:var(--faint); font-variant-numeric:tabular-nums; }
.pv-sparring .pp-pin { position:absolute; top:60px; display:flex; flex-direction:column; align-items:flex-start; }
.pv-sparring .pp-pin::after { content:''; position:absolute; left:0; top:44px; width:2px; height:178px; background:currentColor; opacity:.5; }
.pv-sparring .pp-note { display:inline-flex; align-items:center; gap:10px; height:44px; padding:0 14px; border-radius:6px; border:1px solid; font-size:19px; white-space:nowrap; letter-spacing:-.01em; }
.pv-sparring .pp-note b { font-family:var(--num); font-weight:600; font-variant-numeric:tabular-nums; }
.pv-sparring .pp-bad { color:var(--bad-ink); }
.pv-sparring .pp-bad .pp-note { background:var(--bad-soft); border-color:var(--bad-edge); }
.pv-sparring .pp-good { color:var(--ok-ink); }
.pv-sparring .pp-good .pp-note { background:var(--ok-soft); border-color:var(--ok-edge); }
.pv-sparring .pp-legend { display:flex; gap:18px; }
.pv-sparring .pp-legend span { display:inline-flex; align-items:center; gap:8px; }
.pv-sparring .pp-legend i { width:12px; height:12px; border-radius:3px; }
a.app-card:hover .app-card-art .pv-sparring svg { transform:none; }
a.app-card:hover .pv-sparring .pp-wave i { transform:scaleY(1.12); }
`

export default function SparringPreview() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT}"]`)) return
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT; document.head.appendChild(l)
  }, [])
  const R = 120
  const C = 2 * Math.PI * R
  return (
    <div className="pv-sparring">
      <style>{CSS}</style>
      <div className="pp-copy">
        <h1>Sparring</h1>
        <p className="pp-promise"><b>Cold call practice</b> that hits back.</p>
      </div>
      <div className="pp-score">
        <svg width="270" height="270" viewBox="0 0 270 270" aria-hidden="true">
          <circle cx="135" cy="135" r={R} fill="#fff" stroke="#eef1f4" strokeWidth="16" />
          <circle cx="135" cy="135" r={R} fill="none" stroke="#3f95c9" strokeOpacity=".7" strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${C * 0.72} ${C}`} transform="rotate(-90 135 135)" />
        </svg>
        <div className="pp-sv"><b>72</b><span>out of 100</span><em>Solid</em></div>
      </div>
      <div className="pp-tl">
        <div className="pp-tl-h">
          <span><b>Practice call</b> · Margaret Okafor, CFO (AI prospect)</span>
          <span className="pp-legend"><span><i style={{ background: '#3f95c9', opacity: 0.55 }} />You</span><span><i style={{ background: '#c9ccd3' }} />Prospect</span></span>
        </div>
        <div className="pp-pin pp-bad" style={{ left: at(102) }}>
          <span className="pp-note"><b>1:42</b> Pitched before the pain</span>
        </div>
        <div className="pp-pin pp-good" style={{ left: at(230) }}>
          <span className="pp-note"><b>3:50</b> Asked for a time</span>
        </div>
        <div className="pp-wave">
          {Array.from({ length: N }, (_, i) => {
            const you = talk(i) === 1
            const h = 12 + amp(i, you ? 1.3 : 0.4) * (you ? 128 : 96)
            return <i key={i} className={you ? 'pp-you' : 'pp-them'} style={{ height: h }} />
          })}
        </div>
        <div className="pp-ticks"><span>0:00</span><span>1:00</span><span>2:00</span><span>3:00</span><span>4:00</span><span>5:00</span></div>
      </div>
    </div>
  )
}
