import { useEffect } from 'react'

/**
 * Outbounder hero: square, white and technical. A banner wordmark, an ASCII pipeline in JetBrains Mono,
 * and one cold email whose first line was written from the prospect's own website.
 */

const FONT = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'

const STEPS = ['buyer', 'leads', 'verify', 'first line', 'send']

const CSS = `
.pv-outbounder { --ink:#08090a; --body:#3c4149; --muted:#62666d; --faint:#767b84; --ghost:#b4b8bf; --hair:#e6e6e9; --div:#efeff1;
  --accent:#6a7ee6; --accent-soft:#f2f4fe; --accent-edge:#c9d1f7; --accent-ink:#3d4fae; --green:#1f8a3a; --green-soft:#eef8f0; --green-edge:#bfe3c8;
  --mono:'JetBrains Mono', ui-monospace, Menlo, monospace;
  position:relative; width:1200px; height:750px; overflow:hidden; background:#fff; color:var(--body);
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-outbounder *, .pv-outbounder *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-outbounder .po-rail { position:absolute; top:0; bottom:0; width:1px; background:var(--hair); }
.pv-outbounder .po-hr { position:absolute; left:0; right:0; height:1px; background:var(--hair); }
.pv-outbounder .po-tick { position:absolute; width:9px; height:9px; border:1px solid #c9ccd2; background:#fff; }

.pv-outbounder h1 { position:absolute; left:64px; top:104px; font-size:156px; line-height:.86; letter-spacing:-.065em; font-weight:600; color:var(--ink); }
.pv-outbounder h1 span { color:var(--accent); }
.pv-outbounder .po-promise { position:absolute; left:72px; top:270px; font-size:38px; letter-spacing:-.03em; color:var(--muted); }
.pv-outbounder .po-promise b { color:var(--ink); font-weight:500; }
.pv-outbounder .po-pipe { position:absolute; right:72px; top:282px; font-family:var(--mono); font-size:18px; color:var(--faint); display:flex; align-items:center; gap:8px; white-space:pre; }
.pv-outbounder .po-pipe .po-on { color:var(--accent-ink); background:var(--accent-soft); border:1px solid var(--accent-edge); padding:2px 8px; }
.pv-outbounder .po-pipe .po-done { color:var(--body); }

.pv-outbounder .po-mail { position:absolute; left:72px; right:72px; top:356px; bottom:-2px; border:1px solid var(--hair); border-bottom:0; background:#fff;
  box-shadow:0 30px 60px -36px rgba(61,79,174,.35); }
.pv-outbounder .po-hd { display:grid; grid-template-columns:96px 1fr auto; align-items:center; column-gap:16px; row-gap:0; padding:0 32px; border-bottom:1px solid var(--div); }
.pv-outbounder .po-hd > * { height:54px; display:flex; align-items:center; }
.pv-outbounder .po-hd .po-k { font-family:var(--mono); font-size:17px; color:var(--faint); }
.pv-outbounder .po-hd .po-v { font-size:21px; color:var(--ink); letter-spacing:-.015em; }
.pv-outbounder .po-hd .po-v em { font-style:normal; color:var(--faint); margin-left:8px; }
.pv-outbounder .po-badge { justify-self:end; font-family:var(--mono); font-size:15px; }
.pv-outbounder .po-badge span { display:inline-flex; align-items:center; gap:7px; height:30px; padding:0 10px; border-radius:4px; border:1px solid var(--green-edge); background:var(--green-soft); color:var(--green); }
.pv-outbounder .po-badge i { width:7px; height:7px; border-radius:50%; background:var(--green); }
.pv-outbounder .po-sep { grid-column:1 / -1; height:1px !important; background:var(--div); margin:0 -32px; }
.pv-outbounder .po-body { position:relative; padding:30px 32px 0; }
.pv-outbounder .po-hi { position:relative; display:block; font-size:36px; line-height:1.22; letter-spacing:-.03em; color:var(--ink); font-weight:500; padding:14px 22px; margin-left:-22px; width:720px;
  background:var(--accent-soft); border-left:3px solid var(--accent); transition:background-color .3s; }
.pv-outbounder .po-rest { margin-top:18px; font-size:24px; line-height:1.45; letter-spacing:-.015em; color:var(--ghost); width:700px; }
.pv-outbounder .po-note { position:absolute; left:800px; top:34px; width:250px; font-family:var(--mono); font-size:16px; line-height:1.55; color:var(--accent-ink); }
.pv-outbounder .po-note b { display:block; font-weight:500; font-size:17px; }
.pv-outbounder .po-note span { color:var(--faint); }
.pv-outbounder .po-note svg { position:absolute; left:-58px; top:10px; }
a.app-card:hover .app-card-art .pv-outbounder svg { transform:none; }
a.app-card:hover .pv-outbounder .po-hi { background:#e9ecfd; }
`

export default function OutbounderPreview() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT}"]`)) return
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT; document.head.appendChild(l)
  }, [])
  return (
    <div className="pv-outbounder">
      <style>{CSS}</style>
      <span className="po-rail" style={{ left: 72 }} />
      <span className="po-rail" style={{ left: 1128 }} />
      <span className="po-hr" style={{ top: 72 }} />
      <span className="po-tick" style={{ left: 68, top: 68 }} />
      <span className="po-tick" style={{ left: 1124, top: 68 }} />
      <h1>outbounder<span>.</span></h1>
      <p className="po-promise"><b>Cold email</b> that reads human.</p>
      <div className="po-pipe">
        {STEPS.map((s, i) => (
          <span key={s} style={{ display: 'contents' }}>
            <span className={i === 3 ? 'po-on' : i < 3 ? 'po-done' : ''}>{s}</span>
            {i < STEPS.length - 1 && <span>{'→'}</span>}
          </span>
        ))}
      </div>
      <div className="po-mail">
        <div className="po-hd">
          <span className="po-k">to</span><span className="po-v">Maya Chen<em>maya@halden.co</em></span>
          <span className="po-badge"><span><i /> verified</span></span>
          <span className="po-sep" />
          <span className="po-k">subject</span><span className="po-v">Wholesale ordering for cafes</span><span />
        </div>
        <div className="po-body">
          <p className="po-hi">Saw Halden just opened wholesale ordering to independent cafes. Nice launch.</p>
          <p className="po-rest">We help supply teams answer trade enquiries without hiring. Worth a look next week?</p>
          <div className="po-note">
            <svg width="48" height="20" viewBox="0 0 48 20" fill="none" aria-hidden="true"><path d="M46 10H4M10 3 3 10l7 7" stroke="#6a7ee6" strokeWidth="1.6" /></svg>
            <b>first line</b>
            written from <span>halden.co/news</span>
          </div>
        </div>
      </div>
    </div>
  )
}
