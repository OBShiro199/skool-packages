import { useEffect } from 'react'

/**
 * Folio hero: white with violet and peach light. The name sits left in heavy Space Grotesk;
 * on the right a carousel fans out like a hand of cards, the hook slide in front.
 */

const FONT = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap'

type Slide = { n: number; bg: string; edge: string; ink: string; kicker: string; body: string; big?: boolean }

// Back to front: the hook (n = 1) is drawn last so it sits on top.
const FAN: { rot: number; s: Slide }[] = [
  { rot: 19, s: { n: 5, bg: '#eef8f1', edge: '#c2e6cc', ink: '#1d7f34', kicker: 'Save this', body: 'Follow for part two' } },
  { rot: 9.5, s: { n: 4, bg: '#f1f5fd', edge: '#c4d4f5', ink: '#3a5fc4', kicker: 'Fix', body: 'Price the outcome, not the hours' } },
  { rot: -19, s: { n: 2, bg: '#fff4ed', edge: '#f8d6c3', ink: '#9a4518', kicker: 'Mistake 1', body: 'Charging per seat too early' } },
  { rot: -9.5, s: { n: 3, bg: '#ffffff', edge: '#e6e6e9', ink: '#5a41c8', kicker: 'Mistake 2', body: 'One plan for everyone' } },
  { rot: 0, s: { n: 1, bg: '#f5f3fd', edge: '#d8cff6', ink: '#5a41c8', kicker: 'Pricing', body: '5 pricing mistakes founders make', big: true } },
]

const CSS = `
.pv-folio { --ink:#08090a; --body:#3c4149; --muted:#62666d; --faint:#767b84; --hair:#e6e6e9;
  --accent:#8b74e3; --accent-soft:#f5f3fd; --accent-edge:#d8cff6; --accent-ink:#5a41c8; --peach:#f2a37c; --peach-soft:#fff4ed; --peach-edge:#f8d6c3; --peach-ink:#9a4518;
  --head:'Space Grotesk', Geist, sans-serif;
  position:relative; width:1200px; height:750px; overflow:hidden; color:var(--body);
  background:radial-gradient(50% 60% at 78% 70%, #f1ecff 0%, rgba(241,236,255,0) 70%), radial-gradient(40% 50% at 98% 20%, #fff0e6 0%, rgba(255,240,230,0) 70%), #fff;
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-folio *, .pv-folio *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-folio .pl-copy { position:absolute; left:72px; top:206px; width:440px; }
.pv-folio h1 { font-family:var(--head); font-weight:700; font-size:172px; line-height:.84; letter-spacing:-.07em; color:var(--ink); }
.pv-folio .pl-promise { margin-top:30px; font-size:38px; line-height:1.14; letter-spacing:-.03em; color:var(--muted); text-wrap:balance; }
.pv-folio .pl-promise b { color:var(--ink); font-weight:500; }
.pv-folio .pl-chans { margin-top:30px; display:flex; gap:10px; }
.pv-folio .pl-chans span { height:38px; display:inline-flex; align-items:center; padding:0 14px; border-radius:4px; border:1px solid var(--hair); font-size:18px; color:var(--body); background:#fff; }

.pv-folio .pl-fan { position:absolute; left:892px; top:150px; width:0; height:0; }
.pv-folio .pl-slide { position:absolute; left:-155px; top:0; width:310px; height:390px; border-radius:14px; border:1px solid; padding:26px 26px 22px;
  display:flex; flex-direction:column; transform:rotate(calc(var(--r) * 1deg)); transform-origin:50% 200%; box-shadow:0 4px 16px rgba(8,9,10,.07), 0 24px 48px -24px rgba(60,40,120,.28); transition:transform .6s cubic-bezier(.16,1,.3,1); }
.pv-folio .pl-sh { display:flex; align-items:center; gap:10px; font-size:15px; color:var(--faint); }
.pv-folio .pl-sh i { width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, #d8cff6, #f8d6c3); }
.pv-folio .pl-sh em { margin-left:auto; font-style:normal; font-family:var(--head); font-weight:500; }
.pv-folio .pl-k { margin-top:auto; font-family:var(--head); font-size:18px; font-weight:600; letter-spacing:-.01em; }
.pv-folio .pl-b { margin-top:8px; font-family:var(--head); font-weight:700; font-size:34px; line-height:1.02; letter-spacing:-.045em; color:var(--ink); text-wrap:balance; }
.pv-folio .pl-big .pl-b { font-size:46px; }
.pv-folio .pl-dots { margin-top:20px; display:flex; gap:6px; }
.pv-folio .pl-dots i { width:7px; height:7px; border-radius:50%; background:rgba(8,9,10,.14); }
.pv-folio .pl-dots i.pl-on { width:22px; border-radius:4px; }
a.app-card:hover .app-card-art .pv-folio svg { transform:none; }
a.app-card:hover .pv-folio .pl-slide { transform:rotate(calc(var(--r) * 1.18deg)); }
`

export default function FolioPreview() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT}"]`)) return
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT; document.head.appendChild(l)
  }, [])
  return (
    <div className="pv-folio">
      <style>{CSS}</style>
      <div className="pl-copy">
        <h1>Folio</h1>
        <p className="pl-promise"><b>On-brand carousels</b> in minutes.</p>
        <div className="pl-chans"><span>LinkedIn</span><span>Instagram</span></div>
      </div>
      <div className="pl-fan">
        {FAN.map(({ rot, s }) => (
          <div key={s.n} className={`pl-slide ${s.big ? 'pl-big' : ''}`}
            style={{ background: s.bg, borderColor: s.edge, ['--r' as string]: rot }}>
            <div className="pl-sh"><i />@yourbrand<em>{s.n}/5</em></div>
            <p className="pl-k" style={{ color: s.ink }}>{s.kicker}</p>
            <p className="pl-b">{s.body}</p>
            <div className="pl-dots">{[1, 2, 3, 4, 5].map((d) => <i key={d} className={d === s.n ? 'pl-on' : ''} style={d === s.n ? { background: s.ink } : undefined} />)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
