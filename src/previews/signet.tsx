import { useEffect } from 'react'

/**
 * Signet hero: editorial ivory. A Fraunces name on the left, the call that started it underneath,
 * and a proposal sheet laid on the diagonal: three priced options, a signature in pen and the seal.
 */

const FONT = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&display=swap'

// Example proposal options.
const OPTIONS: [string, string, string, boolean][] = [
  ['Starter', 'Brand audit and one landing page', '$1,800', false],
  ['Growth', 'Site rebuild with three campaign pages', '$3,600', true],
  ['Full', 'Rebuild, campaigns and three months of care', '$6,400', false],
]

const WAVE = Array.from({ length: 34 }, (_, i) => 10 + Math.round(Math.abs(Math.sin(i * 1.7) * 16 + Math.sin(i * 0.6) * 10)))

const CSS = `
.pv-signet { --ivory:#fbfaf6; --band:#f6f4ee; --hair:#e7e4dc; --div:#efede7; --ink:#08090a; --body:#3c4149; --muted:#62666d; --faint:#7d828b; --pen:#2c2870;
  --accent:#7f72d9; --accent-soft:#f4f2fd; --accent-edge:#d5cff5; --accent-ink:#5446b8; --serif:Fraunces, 'Iowan Old Style', Georgia, serif;
  position:relative; width:1200px; height:750px; overflow:hidden; background:var(--ivory); color:var(--body);
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-signet *, .pv-signet *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-signet .ps-desk { position:absolute; right:-120px; top:-80px; width:820px; height:960px; background:radial-gradient(closest-side, #f1eef9 0%, rgba(241,238,249,0) 100%); }

.pv-signet .ps-copy { position:absolute; left:72px; top:178px; width:520px; }
.pv-signet h1 { font-family:var(--serif); font-weight:400; font-size:168px; line-height:.88; letter-spacing:-.045em; color:var(--ink); font-variation-settings:'opsz' 144; }
.pv-signet .ps-promise { margin-top:26px; font-family:var(--serif); font-style:italic; font-size:40px; line-height:1.15; letter-spacing:-.02em; color:var(--muted); }
.pv-signet .ps-call { margin-top:46px; display:inline-flex; align-items:center; gap:16px; height:64px; padding:0 20px; background:#fff; border:1px solid var(--hair); }
.pv-signet .ps-call b { font-size:19px; font-weight:500; color:var(--ink); letter-spacing:-.015em; }
.pv-signet .ps-call em { font-style:normal; font-size:17px; color:var(--faint); }
.pv-signet .ps-wave { display:flex; align-items:center; gap:3px; height:40px; }
.pv-signet .ps-wave i { width:3px; border-radius:2px; background:var(--accent); opacity:.55; }

.pv-signet .ps-sheet { position:absolute; left:640px; top:62px; width:520px; height:720px; background:#fff; border:1px solid var(--hair);
  box-shadow:0 1px 0 rgba(8,9,10,.03), 0 40px 80px -30px rgba(40,32,90,.28); transform:rotate(6deg); transform-origin:50% 40%; transition:transform .6s cubic-bezier(.16,1,.3,1); padding:44px 44px 0; }
.pv-signet .ps-under { position:absolute; left:650px; top:76px; width:520px; height:720px; background:#fff; border:1px solid var(--hair); transform:rotate(1.5deg); box-shadow:0 20px 40px -30px rgba(40,32,90,.25); }
.pv-signet .ps-kicker { font-size:15px; color:var(--faint); display:flex; justify-content:space-between; }
.pv-signet .ps-title { margin-top:12px; font-family:var(--serif); font-size:40px; line-height:1.05; letter-spacing:-.03em; color:var(--ink); }
.pv-signet .ps-opts { margin-top:26px; border-top:1px solid var(--div); }
.pv-signet .ps-opt { display:grid; grid-template-columns:1fr auto; gap:4px 16px; padding:16px 14px; border-bottom:1px solid var(--div); }
.pv-signet .ps-opt b { font-size:21px; font-weight:500; color:var(--ink); display:flex; align-items:center; gap:10px; letter-spacing:-.015em; }
.pv-signet .ps-opt span { grid-column:1; font-size:16px; color:var(--faint); }
.pv-signet .ps-opt strong { grid-row:1 / 3; grid-column:2; align-self:center; font-family:var(--serif); font-weight:400; font-size:30px; color:var(--ink); letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.pv-signet .ps-opt.ps-rec { background:var(--accent-soft); border:1px solid var(--accent-edge); margin:-1px -1px 0; }
.pv-signet .ps-opt small { font-size:13px; font-weight:500; color:var(--accent-ink); border:1px solid var(--accent-edge); background:#fff; padding:1px 8px; border-radius:4px; }
.pv-signet .ps-sign { margin-top:34px; position:relative; height:120px; }
.pv-signet .ps-sign svg.ps-sig { position:absolute; left:6px; top:0; }
.pv-signet .ps-line { position:absolute; left:0; right:120px; top:92px; height:1px; background:#c9c5bb; }
.pv-signet .ps-by { position:absolute; left:0; top:102px; font-size:15px; color:var(--faint); }
.pv-signet .ps-seal { position:absolute; right:-4px; top:-6px; transform:rotate(-12deg); }
a.app-card:hover .app-card-art .pv-signet svg { transform:none; }
a.app-card:hover .app-card-art .pv-signet .ps-seal { transform:rotate(-12deg); }
a.app-card:hover .pv-signet .ps-sheet { transform:rotate(3.5deg); }
`

export default function SignetPreview() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT}"]`)) return
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT; document.head.appendChild(l)
  }, [])
  return (
    <div className="pv-signet">
      <style>{CSS}</style>
      <div className="ps-desk" />
      <div className="ps-copy">
        <h1>Signet</h1>
        <p className="ps-promise">Proposals from a sales call.</p>
        <div className="ps-call">
          <span className="ps-wave">{WAVE.map((h, i) => <i key={i} style={{ height: h }} />)}</span>
          <span><b>Discovery call</b> <em>· 32 min</em></span>
        </div>
      </div>
      <div className="ps-under" />
      <div className="ps-sheet">
        <p className="ps-kicker"><span>Proposal</span><span>Oct 14</span></p>
        <p className="ps-title">A new site for Northwind Coffee</p>
        <div className="ps-opts">
          {OPTIONS.map(([n, d, p, rec]) => (
            <div key={n} className={`ps-opt ${rec ? 'ps-rec' : ''}`}>
              <b>{n}{rec && <small>Recommended</small>}</b>
              <span>{d}</span>
              <strong>{p}</strong>
            </div>
          ))}
        </div>
        <div className="ps-sign">
          <svg className="ps-sig" width="300" height="96" viewBox="0 0 300 96" fill="none" aria-hidden="true">
            <path d="M14 70c10-30 22-52 30-54 9-2-6 52-2 56 6 6 16-30 26-30 8 0-2 22 6 22s12-16 20-16c6 0 2 12 8 12 10 0 14-24 24-24 8 0 0 18 8 18 12 0 20-10 30-14M150 50c14-6 34-6 52-2 20 4 38-2 58-12"
              stroke="#2c2870" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="ps-line" />
          <span className="ps-by">Signed by Jane Cole · Deposit paid</span>
          <svg className="ps-seal" width="118" height="118" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 1.6l2.1 1.5 2.6-.2 1.1 2.3 2.3 1.1-.2 2.6 1.5 2.1-1.5 2.1.2 2.6-2.3 1.1-1.1 2.3-2.6-.2L12 22.4l-2.1-1.5-2.6.2-1.1-2.3-2.3-1.1.2-2.6L2.6 13l1.5-2.1-.2-2.6 2.3-1.1 1.1-2.3 2.6.2z"
              fill="#f4f2fd" stroke="#7f72d9" strokeWidth=".7" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="6.6" fill="none" stroke="#7f72d9" strokeWidth=".5" opacity=".6" />
            <path d="M9 12.2l2.1 2.1L15.2 10" fill="none" stroke="#5446b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
