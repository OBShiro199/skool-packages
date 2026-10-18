import { useEffect } from 'react'

/** Factorie hero: the one dark kit. Navy dot matrix, one question asked of six engines, and where you rank in each answer. */

const FONT = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap'

// Example data: share of answers naming the brand, and its position in the answer (0 = not named).
const ROWS: { name: string; hue: string; pct: number; pos: number }[] = [
  { name: 'Perplexity', hue: '#6f95ec', pct: 0.72, pos: 1 },
  { name: 'ChatGPT', hue: '#2fbab5', pct: 0.61, pos: 2 },
  { name: 'Claude', hue: '#e07ab3', pct: 0.55, pos: 2 },
  { name: 'Gemini', hue: '#e0a43a', pct: 0.38, pos: 4 },
  { name: 'Grok', hue: '#8c93ad', pct: 0.22, pos: 5 },
  { name: 'DeepSeek', hue: '#5b6383', pct: 0, pos: 0 },
]

const CSS = `
.pv-factorie { --bg:#0b1020; --card:#121933; --raise:#182042; --hair:#1f2847; --line:#2c365c;
  --ink:#eef0f8; --body:#b9c0d6; --muted:#959db8; --faint:#7d86a6;
  --violet:#8a6fdf; --violet-ink:#c2b3ff; --violet-soft:rgba(138,111,223,.14); --violet-edge:rgba(166,145,240,.45);
  --cyan:#5fd4e6; --cyan-ink:#8fe6f2; --mono:'Geist Mono', ui-monospace, Menlo, monospace;
  position:relative; width:1200px; height:750px; overflow:hidden; color:var(--body); background:var(--bg);
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-factorie *, .pv-factorie *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-factorie .pf-dots { position:absolute; inset:0; background-image:radial-gradient(rgba(148,160,230,.22) 1.4px, transparent 1.6px); background-size:24px 24px;
  -webkit-mask-image:linear-gradient(115deg, transparent 10%, #000 70%); mask-image:linear-gradient(115deg, transparent 10%, #000 70%); }
.pv-factorie .pf-glow { position:absolute; width:900px; height:700px; right:-260px; top:-300px; background:radial-gradient(closest-side, rgba(138,111,223,.26), transparent); }
.pv-factorie .pf-glow2 { position:absolute; width:700px; height:500px; left:-200px; bottom:-260px; background:radial-gradient(closest-side, rgba(95,212,230,.10), transparent); }

.pv-factorie .pf-panel { position:absolute; left:604px; top:60px; width:524px; padding:26px 28px 28px; background:linear-gradient(180deg, #141c39, #10172f);
  border:1px solid var(--hair); border-radius:14px; box-shadow:0 30px 70px rgba(3,6,18,.55), 0 0 0 1px rgba(166,145,240,.10); }
.pv-factorie .pf-q { display:flex; justify-content:space-between; font-family:var(--mono); font-size:16px; color:var(--faint); letter-spacing:0; }
.pv-factorie .pf-ask { margin-top:10px; font-size:29px; line-height:1.15; letter-spacing:-.03em; color:var(--ink); font-weight:500; }
.pv-factorie .pf-ask span { color:var(--faint); }
.pv-factorie .pf-rows { margin-top:22px; display:grid; gap:12px; }
.pv-factorie .pf-row { display:grid; grid-template-columns:140px 1fr 60px; align-items:center; gap:16px; }
.pv-factorie .pf-eng { display:flex; align-items:center; gap:10px; font-size:21px; color:var(--ink); letter-spacing:-.015em; }
.pv-factorie .pf-eng i { width:12px; height:12px; border-radius:3px; }
.pv-factorie .pf-track { height:22px; border-radius:5px; background:var(--raise); overflow:hidden; }
.pv-factorie .pf-fill { height:100%; border-radius:5px; background:linear-gradient(90deg, rgba(138,111,223,.30), rgba(95,212,230,.42)); border:1px solid rgba(143,230,242,.38);
  transform-origin:left center; transition:transform .7s cubic-bezier(.2,0,0,1); }
.pv-factorie .pf-pos { justify-self:end; font-family:var(--mono); font-size:20px; padding:3px 10px; border-radius:5px; border:1px solid var(--violet-edge); background:var(--violet-soft); color:var(--violet-ink); }
.pv-factorie .pf-pos.pf-none { border-color:var(--line); background:transparent; color:var(--faint); }

.pv-factorie .pf-copy { position:absolute; left:72px; bottom:76px; }
.pv-factorie .pf-tag { font-family:var(--mono); font-size:19px; color:var(--cyan-ink); display:flex; align-items:center; gap:10px; }
.pv-factorie .pf-tag i { width:9px; height:9px; border-radius:50%; background:var(--cyan); box-shadow:0 0 0 5px rgba(95,212,230,.16); }
.pv-factorie h1 { margin-top:18px; font-size:140px; line-height:.88; letter-spacing:-.06em; font-weight:600; color:var(--ink); }
.pv-factorie .pf-promise { margin-top:26px; font-size:40px; line-height:1.1; letter-spacing:-.03em; color:var(--body); }
.pv-factorie .pf-promise em { font-style:normal; color:var(--violet-ink); }
a.app-card:hover .pv-factorie .pf-fill { transform:scaleX(1.06); }
`

export default function FactoriePreview() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT}"]`)) return
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT; document.head.appendChild(l)
  }, [])
  return (
    <div className="pv-factorie">
      <style>{CSS}</style>
      <div className="pf-glow" />
      <div className="pf-glow2" />
      <div className="pf-dots" />
      <div className="pf-panel">
        <p className="pf-q"><span>prompt · asked weekly</span><span>example data</span></p>
        <p className="pf-ask"><span>“</span>Best analytics tool for a small SaaS?<span>”</span></p>
        <div className="pf-rows">
          {ROWS.map((r) => (
            <div key={r.name} className="pf-row">
              <span className="pf-eng"><i style={{ background: r.hue }} />{r.name}</span>
              <span className="pf-track">{r.pct > 0 && <span className="pf-fill" style={{ display: 'block', width: `${r.pct * 100}%` }} />}</span>
              <span className={`pf-pos ${r.pos ? '' : 'pf-none'}`}>{r.pos ? `#${r.pos}` : 'n/a'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pf-copy">
        <span className="pf-tag"><i /> AI visibility · 6 engines</span>
        <h1>Factorie</h1>
        <p className="pf-promise">See where AI <em>recommends you.</em></p>
      </div>
    </div>
  )
}
