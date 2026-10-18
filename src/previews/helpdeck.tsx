import { FileText, Mail, MessageSquare } from 'lucide-react'

/**
 * Helpdeck hero: the conversation is the picture. Blue dot grid, the name top left, and oversized chat
 * bubbles running down the stage: a customer question, an answer citing the doc it came from,
 * and the hand-off to a human when it is not sure.
 */

const CSS = `
.pv-helpdeck { --ink:#08090a; --body:#3c4149; --muted:#62666d; --faint:#7a7f88; --hair:#e6e6e9;
  --blue:#5f86e0; --blue-soft:#f1f5fd; --blue-edge:#c4d4f5; --blue-ink:#3a5fc4; --amber-soft:#fdf6e9; --amber-edge:#f1d9a8; --amber-ink:#85570a;
  position:relative; width:1200px; height:750px; overflow:hidden; color:var(--body); background:#f6f8fe;
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-helpdeck *, .pv-helpdeck *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-helpdeck .ph-dots { position:absolute; inset:0; background-image:radial-gradient(rgba(95,134,224,.30) 1.5px, transparent 1.7px); background-size:28px 28px;
  -webkit-mask-image:radial-gradient(90% 80% at 70% 60%, #000 20%, transparent 80%); mask-image:radial-gradient(90% 80% at 70% 60%, #000 20%, transparent 80%); }
.pv-helpdeck .ph-copy { position:absolute; left:72px; top:150px; }
.pv-helpdeck h1 { font-size:132px; line-height:.88; letter-spacing:-.06em; font-weight:600; color:var(--ink); }
.pv-helpdeck .ph-promise { margin-top:22px; width:440px; font-size:36px; line-height:1.14; letter-spacing:-.03em; color:var(--muted); text-wrap:balance; }
.pv-helpdeck .ph-promise b { color:var(--ink); font-weight:500; }

.pv-helpdeck .ph-q { position:absolute; right:72px; top:168px; max-width:440px; padding:20px 26px; border-radius:26px 26px 6px 26px; background:var(--blue-soft); border:1px solid var(--blue-edge);
  font-size:30px; line-height:1.2; letter-spacing:-.025em; color:#2b4a9e; }
.pv-helpdeck .ph-q small { display:block; margin-bottom:6px; font-size:16px; color:var(--blue-ink); opacity:.8; letter-spacing:-.01em; }

.pv-helpdeck .ph-a { position:absolute; left:330px; top:392px; width:800px; display:flex; gap:18px; align-items:flex-start; }
.pv-helpdeck .ph-av { flex:none; width:64px; height:64px; border-radius:18px; display:grid; place-items:center; background:#fff; border:1px solid var(--blue-edge); color:var(--blue-ink);
  box-shadow:0 8px 20px -8px rgba(58,95,196,.35); }
.pv-helpdeck .ph-bub { flex:1; padding:24px 28px; border-radius:6px 26px 26px 26px; background:#fff; box-shadow:0 18px 48px rgba(8,9,10,.10), 0 0 0 1px rgba(8,9,10,.04);
  transition:transform .5s cubic-bezier(.16,1,.3,1); }
.pv-helpdeck .ph-bub p { font-size:30px; line-height:1.28; letter-spacing:-.025em; color:var(--ink); }
.pv-helpdeck .ph-bub p b { font-weight:500; color:var(--blue-ink); }
.pv-helpdeck .ph-src { margin-top:20px; display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:12px; border:1px solid var(--hair); background:#fafafb; }
.pv-helpdeck .ph-src i { width:40px; height:40px; flex:none; display:grid; place-items:center; border-radius:10px; background:var(--blue-soft); border:1px solid var(--blue-edge); color:var(--blue-ink); }
.pv-helpdeck .ph-src b { display:block; font-size:19px; font-weight:500; color:var(--ink); letter-spacing:-.015em; }
.pv-helpdeck .ph-src span { font-size:16px; color:var(--faint); }
.pv-helpdeck .ph-src em { margin-left:auto; font-style:normal; font-size:15px; color:var(--blue-ink); border:1px solid var(--blue-edge); background:#fff; padding:3px 10px; border-radius:4px; }
.pv-helpdeck .ph-hand { position:absolute; left:412px; top:650px; display:inline-flex; align-items:center; gap:10px; height:46px; padding:0 18px; border-radius:999px;
  border:1px dashed var(--amber-edge); background:var(--amber-soft); color:var(--amber-ink); font-size:18px; }
a.app-card:hover .app-card-art .pv-helpdeck svg { transform:none; }
a.app-card:hover .pv-helpdeck .ph-bub { transform:translateY(-6px); }
`

export default function HelpdeckPreview() {
  return (
    <div className="pv-helpdeck">
      <style>{CSS}</style>
      <div className="ph-dots" />
      <div className="ph-copy">
        <h1>Helpdeck</h1>
        <p className="ph-promise"><b>AI support</b> trained on your docs.</p>
      </div>
      <div className="ph-q"><small>Customer · just now</small>How do I export my invoices?</div>
      <div className="ph-a">
        <span className="ph-av"><MessageSquare size={28} strokeWidth={2} /></span>
        <div className="ph-bub">
          <p>Open <b>Billing</b>, then <b>Invoices</b>, and choose Export CSV. You can pick a date range first.</p>
          <div className="ph-src">
            <i><FileText size={20} strokeWidth={1.8} /></i>
            <span><b>Exporting invoices</b><span>docs.yourapp.com/billing</span></span>
            <em>Source</em>
          </div>
        </div>
      </div>
      <span className="ph-hand"><Mail size={18} /> Not sure? It emails your team instead</span>
    </div>
  )
}
