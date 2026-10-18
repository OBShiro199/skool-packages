import { useEffect } from 'react'
import { Grid3x3, Mic, Phone, PhoneOff } from 'lucide-react'

/** Etcher hero: sage CRM on a square grid. A deals board bleeds off the right edge while a live call docks over it. */

const FONT = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600&display=swap'

const COLS: { label: string; hue: string; total: string; cards: [string, string, string][] }[] = [
  { label: 'Qualified', hue: 'blue', total: '$26.9k', cards: [['Senior hires retainer', 'Northwind Hiring', '$12,000'], ['Site rebuild', 'Acme Studio', '$8,400'], ['Wholesale portal', 'Halden Supply', '$6,500']] },
  { label: 'Proposal', hue: 'amber', total: '$34.8k', cards: [['Annual licence', 'Brightline', '$18,000'], ['Paid search retainer', 'Kestrel Agency', '$9,600'], ['App audit', 'Orchard Dev', '$7,200']] },
  { label: 'Negotiation', hue: 'violet', total: '$36.5k', cards: [['Sales playbook', 'Fenwick Consulting', '$22,000'], ['Contract recruiters', 'Marlow Recruit', '$14,500']] },
]

const CSS = `
.pv-etcher { --ink:#0f1623; --body:#3a4352; --muted:#5b6472; --faint:#6f7682; --hair:#e6e6e9; --div:#efeff1;
  --accent:#3f9a6e; --accent-soft:#eef7f2; --accent-edge:#bfe0cd; --accent-ink:#1f5a3e; --num:'Inter Tight', Geist, sans-serif;
  position:relative; width:1200px; height:750px; overflow:hidden; background:#fff; color:var(--body);
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-etcher *, .pv-etcher *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-etcher .pe-grid { position:absolute; inset:0;
  background-image:linear-gradient(to right, rgba(15,22,35,.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,22,35,.055) 1px, transparent 1px);
  background-size:32px 32px; -webkit-mask-image:radial-gradient(120% 90% at 85% 40%, #000 30%, transparent 85%); mask-image:radial-gradient(120% 90% at 85% 40%, #000 30%, transparent 85%); }
.pv-etcher .pe-copy { position:absolute; left:72px; top:190px; width:470px; }
.pv-etcher .pe-pill { display:inline-flex; align-items:center; gap:10px; height:40px; padding:0 16px; border:1px solid var(--accent-edge); background:var(--accent-soft); color:var(--accent-ink); border-radius:6px; font-size:20px; font-weight:500; letter-spacing:-.01em; }
.pv-etcher .pe-dot { width:10px; height:10px; border-radius:50%; background:var(--accent); box-shadow:0 0 0 4px rgba(63,154,110,.18); }
.pv-etcher h1 { margin-top:28px; font-family:var(--num); font-weight:600; font-size:150px; line-height:.9; letter-spacing:-.06em; color:var(--ink); }
.pv-etcher .pe-promise { margin-top:26px; font-size:38px; line-height:1.15; letter-spacing:-.03em; color:var(--muted); font-weight:400; text-wrap:balance; }
.pv-etcher .pe-promise b { color:var(--ink); font-weight:500; }

.pv-etcher .pe-board { position:absolute; left:560px; top:84px; width:780px; height:720px; background:#fff; border:1px solid var(--hair); border-radius:12px;
  box-shadow:0 1px 2px rgba(15,22,35,.04), 0 24px 60px -24px rgba(15,22,35,.18); }
.pv-etcher .pe-bar { height:72px; display:flex; align-items:center; gap:14px; padding:0 24px; border-bottom:1px solid var(--hair); }
.pv-etcher .pe-bar strong { font-size:22px; font-weight:500; color:var(--ink); letter-spacing:-.02em; }
.pv-etcher .pe-seg { display:flex; border:1px solid var(--hair); border-radius:6px; overflow:hidden; font-size:17px; color:var(--faint); }
.pv-etcher .pe-seg i { font-style:normal; padding:5px 12px; }
.pv-etcher .pe-seg i.pe-on { background:#f5f5f6; color:var(--ink); }
.pv-etcher .pe-cols { display:grid; grid-template-columns:repeat(3, 236px); gap:16px; padding:20px 24px; }
.pv-etcher .pe-head { display:flex; align-items:center; gap:10px; height:36px; margin-bottom:12px; }
.pv-etcher .pe-stage { font-size:17px; font-weight:500; padding:3px 10px; border-radius:4px; border:1px solid; }
.pv-etcher .pe-h-blue { background:#f1f5fd; border-color:#c4d4f5; color:#3a5fc4; }
.pv-etcher .pe-h-amber { background:#fdf6e9; border-color:#f1d9a8; color:#85570a; }
.pv-etcher .pe-h-violet { background:#f4f1fd; border-color:#d8d0f5; color:#5b4fb8; }
.pv-etcher .pe-total { margin-left:auto; font-family:var(--num); font-size:18px; color:var(--faint); font-variant-numeric:tabular-nums; }
.pv-etcher .pe-card { border:1px solid var(--hair); border-radius:8px; padding:14px 16px; margin-bottom:12px; background:#fff; }
.pv-etcher .pe-card b { display:block; font-size:19px; font-weight:500; color:var(--ink); letter-spacing:-.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pv-etcher .pe-card span { display:block; font-size:16px; color:var(--faint); margin-top:2px; }
.pv-etcher .pe-card em { display:block; margin-top:10px; font-style:normal; font-family:var(--num); font-size:20px; font-weight:500; color:var(--ink); font-variant-numeric:tabular-nums; }
.pv-etcher .pe-card.pe-live { border-color:var(--accent-edge); box-shadow:0 0 0 4px var(--accent-soft); }
.pv-etcher .pe-card.pe-live em { display:flex; align-items:center; justify-content:space-between; }
.pv-etcher .pe-card.pe-live small { display:inline-flex; align-items:center; gap:6px; font-family:Geist, sans-serif; font-size:15px; font-weight:500; color:var(--accent-ink); }

.pv-etcher .pe-dock { position:absolute; left:476px; top:486px; width:420px; padding:24px 26px; background:#fff; border:1px solid var(--accent-edge); border-radius:14px;
  box-shadow:0 4px 16px rgba(8,9,10,.08), 0 30px 60px -20px rgba(31,90,62,.28); transition:transform .5s cubic-bezier(.16,1,.3,1); }
.pv-etcher .pe-dock-top { display:flex; align-items:center; gap:10px; font-size:18px; font-weight:500; color:var(--accent-ink); }
.pv-etcher .pe-rec { margin-left:auto; display:inline-flex; align-items:center; gap:8px; color:#b23c3c; font-size:16px; }
.pv-etcher .pe-rec i { width:8px; height:8px; border-radius:50%; background:#eb5757; }
.pv-etcher .pe-who { display:flex; align-items:center; gap:14px; margin-top:18px; }
.pv-etcher .pe-ava { width:52px; height:52px; border-radius:50%; display:grid; place-items:center; background:#f1f5fd; border:1px solid #c4d4f5; color:#3a5fc4; font-weight:500; font-size:19px; }
.pv-etcher .pe-who b { display:block; font-size:24px; font-weight:500; color:var(--ink); letter-spacing:-.02em; }
.pv-etcher .pe-who em { display:block; font-style:normal; font-size:17px; color:var(--faint); }
.pv-etcher .pe-timer { margin-left:auto; font-family:var(--num); font-size:52px; font-weight:500; letter-spacing:-.04em; color:var(--ink); font-variant-numeric:tabular-nums; }
.pv-etcher .pe-acts { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:20px; }
.pv-etcher .pe-acts span { height:46px; display:flex; align-items:center; justify-content:center; gap:8px; border:1px solid #dcdde0; border-radius:8px; font-size:17px; color:var(--body); }
.pv-etcher .pe-acts .pe-end { border-color:#f5c6c6; background:#fdf0f0; color:#b23c3c; }
a.app-card:hover .app-card-art .pv-etcher svg { transform:none; }
a.app-card:hover .pv-etcher .pe-dock { transform:translateY(-8px); }
`

export default function EtcherPreview() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT}"]`)) return
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT; document.head.appendChild(l)
  }, [])
  return (
    <div className="pv-etcher">
      <style>{CSS}</style>
      <div className="pe-grid" />
      <div className="pe-copy">
        <span className="pe-pill"><i className="pe-dot" /> CRM with a phone built in</span>
        <h1>Etcher</h1>
        <p className="pe-promise"><b>The CRM your team</b> calls from.</p>
      </div>
      <div className="pe-board">
        <div className="pe-bar"><strong>Agency pipeline</strong><span className="pe-seg"><i className="pe-on">Board</i><i>Table</i></span></div>
        <div className="pe-cols">
          {COLS.map((c, ci) => (
            <div key={c.label}>
              <div className="pe-head"><span className={`pe-stage pe-h-${c.hue}`}>{c.label}</span><span className="pe-total">{c.total}</span></div>
              {c.cards.map(([n, co, v], i) => {
                const live = ci === 0 && i === 0
                return (
                  <div key={n} className={`pe-card ${live ? 'pe-live' : ''}`}>
                    <b>{n}</b><span>{co}</span>
                    <em>{v}{live && <small><Phone size={14} strokeWidth={2} /> Calling</small>}</em>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="pe-dock">
        <div className="pe-dock-top"><i className="pe-dot" /> In call<span className="pe-rec"><i /> Recording</span></div>
        <div className="pe-who">
          <span className="pe-ava">SJ</span>
          <span><b>Sarah Jones</b><em>Northwind Hiring</em></span>
          <span className="pe-timer">04:12</span>
        </div>
        <div className="pe-acts">
          <span><Mic size={17} /> Mute</span>
          <span><Grid3x3 size={17} /> Keypad</span>
          <span className="pe-end"><PhoneOff size={17} /> Hang up</span>
        </div>
      </div>
    </div>
  )
}
