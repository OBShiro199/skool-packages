import { Check } from 'lucide-react'

/**
 * Ethereel hero: creator paper with the blue exercise-book grid. The name splits around a 9:16 phone
 * playing an edited reel, with the raw take tucked behind it and the edits listed beside.
 * Instrument Serif is already loaded globally.
 */

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

const CSS = `
.pv-ethereel { --paper:#f7f4ee; --hair:#e3ddd2; --ink:#08090a; --body:#3c4149; --muted:#5d6168; --faint:#6c7078;
  --accent:#c2412d; --accent-soft:#fbede8; --accent-edge:#ecc3b7; --accent-ink:#9a3120; --serif:'Instrument Serif', Georgia, serif;
  position:relative; width:1200px; height:750px; overflow:hidden; background:var(--paper); color:var(--body);
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-ethereel *, .pv-ethereel *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-ethereel .pr-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(110,145,200,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(110,145,200,.16) 1px, transparent 1px); background-size:30px 30px; background-position:-1px 14px; }
.pv-ethereel .pr-margin { position:absolute; top:0; bottom:0; left:96px; width:2px; background:rgba(194,65,45,.22); }
.pv-ethereel .pr-grain { position:absolute; inset:0; background-image:${GRAIN}; opacity:.07; mix-blend-mode:multiply; pointer-events:none; }

.pv-ethereel .pr-word { position:absolute; top:226px; font-size:184px; line-height:1; color:var(--ink); }
.pv-ethereel .pr-w1 { right:784px; font-weight:600; letter-spacing:-.065em; }
.pv-ethereel .pr-w2 { left:792px; font-family:var(--serif); font-style:italic; font-weight:400; letter-spacing:-.025em; color:var(--accent); font-size:206px; top:214px; }

.pv-ethereel .pr-raw { position:absolute; left:420px; top:118px; width:270px; height:480px; border-radius:22px; background:#e9e4da; border:1px solid var(--hair); transform:rotate(-9deg);
  box-shadow:0 10px 30px -14px rgba(60,40,20,.25); overflow:hidden; }
.pv-ethereel .pr-raw::after { content:''; position:absolute; left:50%; top:150px; width:120px; height:120px; margin-left:-60px; border-radius:50%; background:#d8d1c4; box-shadow:0 150px 0 50px #d8d1c4; }
.pv-ethereel .pr-raw span { position:absolute; left:16px; top:16px; font-family:'Geist Mono', ui-monospace, monospace; font-size:15px; color:#8a8378; background:rgba(255,255,255,.6); padding:3px 8px; border-radius:4px; }

.pv-ethereel .pr-phone { position:absolute; left:462px; top:70px; width:316px; height:620px; border-radius:44px; padding:10px; background:#24262b;
  box-shadow:0 2px 0 rgba(255,255,255,.08) inset, 0 40px 80px -30px rgba(60,30,15,.45), 0 0 0 1px rgba(8,9,10,.2); transform:rotate(3deg); transition:transform .6s cubic-bezier(.16,1,.3,1); }
.pv-ethereel .pr-screen { position:relative; width:100%; height:100%; border-radius:35px; overflow:hidden;
  background:radial-gradient(120% 70% at 50% 30%, #f3d9c4 0%, #e3b69a 45%, #b9785c 100%); }
.pv-ethereel .pr-bars { position:absolute; left:18px; right:18px; top:20px; display:flex; gap:5px; }
.pv-ethereel .pr-bars i { flex:1; height:4px; border-radius:2px; background:rgba(255,255,255,.45); }
.pv-ethereel .pr-bars i:first-child { background:#fff; }
.pv-ethereel .pr-head { position:absolute; left:50%; top:150px; width:150px; height:170px; margin-left:-75px; border-radius:50% 50% 46% 46%; background:linear-gradient(180deg, #8a5a44, #6f4433); }
.pv-ethereel .pr-face { position:absolute; left:50%; top:188px; width:118px; height:138px; margin-left:-59px; border-radius:48%; background:linear-gradient(180deg, #f0c8ad, #dfa98a); }
.pv-ethereel .pr-body { position:absolute; left:50%; top:318px; width:290px; height:320px; margin-left:-145px; border-radius:140px 140px 0 0; background:linear-gradient(180deg, #4a5a7a, #34405a); }
.pv-ethereel .pr-features { position:absolute; left:50%; top:188px; width:118px; height:138px; margin-left:-59px; }
.pv-ethereel .pr-doodle { position:absolute; left:30px; top:96px; width:240px; height:110px; }
.pv-ethereel .pr-cap { position:absolute; left:16px; right:16px; top:388px; text-align:center; font-weight:800; font-size:40px; line-height:1.08; letter-spacing:-.025em; color:#fff;
  text-shadow:0 2px 0 rgba(0,0,0,.25), 0 4px 18px rgba(0,0,0,.35); }
.pv-ethereel .pr-cap mark { background:var(--accent-soft); color:var(--accent-ink); padding:0 10px; border-radius:6px; text-shadow:none; box-decoration-break:clone; -webkit-box-decoration-break:clone; }
.pv-ethereel .pr-time { position:absolute; left:20px; bottom:22px; font-family:'Geist Mono', ui-monospace, monospace; font-size:15px; color:rgba(255,255,255,.85); }

.pv-ethereel .pr-promise { position:absolute; left:132px; top:470px; width:300px; font-size:38px; line-height:1.12; letter-spacing:-.03em; color:var(--ink); font-weight:500; }
.pv-ethereel .pr-promise span { color:var(--muted); font-weight:400; }
.pv-ethereel .pr-edits { position:absolute; left:836px; top:476px; display:grid; gap:12px; }
.pv-ethereel .pr-edit { display:flex; align-items:center; gap:12px; font-size:23px; color:var(--ink); letter-spacing:-.015em; }
.pv-ethereel .pr-edit i { width:30px; height:30px; display:grid; place-items:center; border-radius:6px; background:var(--accent-soft); border:1px solid var(--accent-edge); color:var(--accent-ink); }
.pv-ethereel .pr-edit em { font-style:normal; color:var(--faint); font-size:19px; }
a.app-card:hover .app-card-art .pv-ethereel svg { transform:none; }
a.app-card:hover .pv-ethereel .pr-phone { transform:rotate(0deg) translateY(-6px); }
`

const EDITS: [string, string][] = [['Captions', 'word by word'], ['Zoom', 'on the punchline'], ['Diagram', 'drawn on'], ['Music', 'ducked under voice']]

export default function EthereelPreview() {
  return (
    <div className="pv-ethereel">
      <style>{CSS}</style>
      <div className="pr-grid" />
      <div className="pr-margin" />
      <span className="pr-word pr-w1">Ethe</span>
      <span className="pr-word pr-w2">reel</span>
      <div className="pr-raw"><span>raw_take_03.mov</span></div>
      <div className="pr-phone">
        <div className="pr-screen">
          <div className="pr-head" />
          <div className="pr-face" />
          <div className="pr-body" />
          <svg className="pr-features" viewBox="0 0 118 138" fill="none" aria-hidden="true">
            <path d="M30 58 q8 -6 16 0 M72 58 q8 -6 16 0" stroke="#6f4433" strokeWidth="4" strokeLinecap="round" />
            <path d="M40 92 q19 16 38 0" stroke="#a5523e" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
          <svg className="pr-doodle" viewBox="0 0 240 110" fill="none" aria-hidden="true">
            <path d="M14 70 C 40 20, 90 14, 120 40" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
            <path d="M108 26 L 122 41 L 102 47" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M150 30 C 185 12, 228 30, 222 62 C 216 92, 166 96, 152 72 C 142 56, 150 40, 168 34" stroke="#fbede8" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
          <div className="pr-bars"><i /><i /><i /></div>
          <p className="pr-cap">Nobody tells you <mark>this</mark> part</p>
          <span className="pr-time">0:14 / 0:38</span>
        </div>
      </div>
      <p className="pr-promise">Raw clips in, <span>edited reels out.</span></p>
      <div className="pr-edits">
        {EDITS.map(([a, b]) => (
          <span key={a} className="pr-edit"><i><Check size={17} strokeWidth={2.4} /></i>{a} <em>{b}</em></span>
        ))}
      </div>
      <div className="pr-grain" />
    </div>
  )
}
