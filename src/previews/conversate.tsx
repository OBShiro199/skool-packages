import { useEffect } from 'react'
import { BookOpen, CornerDownRight, CreditCard, Package, RotateCcw, Ruler } from 'lucide-react'

/**
 * Conversate hero: a lavender to lagoon wash, a centred title, and the product rising from the bottom edge:
 * a help centre drafted from the shop's own site, with the chat widget answering from it.
 */

const FONT = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&display=swap'

const ARTICLES: { t: string; n: string; Icon: typeof Package }[] = [
  { t: 'Shipping and delivery', n: '6 articles', Icon: Package },
  { t: 'Returns and refunds', n: '4 articles', Icon: RotateCcw },
  { t: 'Sizing and fit', n: '3 articles', Icon: Ruler },
  { t: 'Payments', n: '5 articles', Icon: CreditCard },
]

const CSS = `
.pv-conversate { --ink:#08090a; --body:#3c4149; --muted:#62666d; --faint:#6f747c; --hair:#e6e6e9;
  --accent:#3c8fb0; --accent-soft:#eef6f9; --accent-edge:#bcdce8; --accent-ink:#1f5d75; --lav:#f2f0fd; --lav-edge:#dcd7f6; --lav-ink:#5b4fb8;
  --display:'Space Grotesk', Geist, sans-serif;
  position:relative; width:1200px; height:750px; overflow:hidden; color:var(--body);
  background:radial-gradient(70% 60% at 18% 8%, #ebe7fc 0%, transparent 70%), radial-gradient(60% 60% at 90% 20%, #e3f1f7 0%, transparent 70%), linear-gradient(180deg, #f4f2fd 0%, #f7fbfd 60%, #ffffff 100%);
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-conversate *, .pv-conversate *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-conversate .pc-top { position:absolute; left:0; right:0; top:86px; text-align:center; }
.pv-conversate h1 { font-family:var(--display); font-weight:500; font-size:132px; line-height:.92; letter-spacing:-.055em; color:var(--ink); }
.pv-conversate .pc-promise { margin-top:20px; font-size:36px; letter-spacing:-.03em; color:var(--muted); }
.pv-conversate .pc-promise b { font-weight:500; color:var(--ink); }

.pv-conversate .pc-browser { position:absolute; left:150px; top:376px; width:720px; height:420px; background:#fff; border-radius:18px;
  box-shadow:0 30px 70px rgba(40,52,110,.16), 0 0 0 1px rgba(8,9,10,.06); overflow:hidden; }
.pv-conversate .pc-chrome { height:56px; display:flex; align-items:center; gap:10px; padding:0 20px; border-bottom:1px solid var(--hair); background:#fbfbfc; }
.pv-conversate .pc-chrome i { width:12px; height:12px; border-radius:50%; background:#e6e6e9; }
.pv-conversate .pc-url { margin-left:14px; flex:1; height:34px; border-radius:8px; background:#fff; border:1px solid var(--hair); display:flex; align-items:center; padding:0 14px; font-size:17px; color:var(--faint); }
.pv-conversate .pc-url b { color:var(--ink); font-weight:500; }
.pv-conversate .pc-page { padding:26px 30px; }
.pv-conversate .pc-ph { display:flex; align-items:center; gap:14px; }
.pv-conversate .pc-ph strong { font-family:var(--display); font-weight:500; font-size:32px; letter-spacing:-.035em; color:var(--ink); }
.pv-conversate .pc-chip { display:inline-flex; align-items:center; gap:8px; height:32px; padding:0 12px; border-radius:6px; background:var(--lav); border:1px solid var(--lav-edge); color:var(--lav-ink); font-size:16px; font-weight:500; }
.pv-conversate .pc-arts { margin-top:22px; display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.pv-conversate .pc-art { display:flex; align-items:center; gap:14px; padding:16px; border:1px solid var(--hair); border-radius:12px; }
.pv-conversate .pc-art i { width:44px; height:44px; flex:none; display:grid; place-items:center; border-radius:10px; background:var(--accent-soft); border:1px solid var(--accent-edge); color:var(--accent-ink); }
.pv-conversate .pc-art b { display:block; font-size:19px; font-weight:500; color:var(--ink); letter-spacing:-.015em; }
.pv-conversate .pc-art span { font-size:15px; color:var(--faint); }

.pv-conversate .pc-widget { position:absolute; left:742px; top:316px; width:350px; background:#fff; border-radius:20px; padding:20px;
  box-shadow:0 30px 70px rgba(40,52,110,.20), 0 0 0 1px rgba(8,9,10,.06); transition:transform .5s cubic-bezier(.16,1,.3,1); }
.pv-conversate .pc-wh { display:flex; align-items:center; gap:10px; padding-bottom:14px; border-bottom:1px solid var(--hair); font-size:18px; font-weight:500; color:var(--ink); }
.pv-conversate .pc-wh i { width:10px; height:10px; border-radius:50%; background:#27a644; box-shadow:0 0 0 4px rgba(39,166,68,.15); }
.pv-conversate .pc-q { margin:16px 0 0 auto; width:max-content; max-width:260px; padding:11px 16px; border-radius:16px 16px 4px 16px; background:var(--accent-soft); border:1px solid var(--accent-edge); color:var(--accent-ink); font-size:19px; }
.pv-conversate .pc-a { margin-top:12px; padding:14px 16px; border-radius:16px 16px 16px 4px; background:#f6f6f8; color:var(--ink); font-size:19px; line-height:1.35; letter-spacing:-.01em; }
.pv-conversate .pc-src { margin-top:12px; display:flex; flex-wrap:wrap; gap:8px; }
.pv-conversate .pc-src span { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 10px; border-radius:6px; border:1px solid var(--hair); background:#fff; font-size:15px; color:var(--body); }
.pv-conversate .pc-human { margin-top:14px; display:flex; align-items:center; gap:8px; font-size:16px; color:var(--faint); }
.pv-conversate .pc-launch { position:absolute; left:1042px; top:676px; width:72px; height:72px; border-radius:50%; background:#fff; border:1px solid var(--accent-edge); box-shadow:0 12px 30px rgba(31,93,117,.20); display:grid; place-items:center; }
a.app-card:hover .app-card-art .pv-conversate svg { transform:none; }
a.app-card:hover .pv-conversate .pc-widget { transform:translateY(-8px); }
`

export default function ConversatePreview() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT}"]`)) return
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT; document.head.appendChild(l)
  }, [])
  return (
    <div className="pv-conversate">
      <style>{CSS}</style>
      <div className="pc-top">
        <h1>conversate</h1>
        <p className="pc-promise"><b>Your website,</b> turned into support.</p>
      </div>
      <div className="pc-browser">
        <div className="pc-chrome"><i /><i /><i /><span className="pc-url">yourshop.com<b>/help</b></span></div>
        <div className="pc-page">
          <div className="pc-ph"><strong>Help centre</strong><span className="pc-chip"><BookOpen size={15} /> Drafted from your site</span></div>
          <div className="pc-arts">
            {ARTICLES.map(({ t, n, Icon }) => (
              <div key={t} className="pc-art"><i><Icon size={20} strokeWidth={1.7} /></i><span><b>{t}</b><span>{n}</span></span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="pc-widget">
        <div className="pc-wh"><i /> Ask us anything</div>
        <p className="pc-q">Do you ship to Canada?</p>
        <p className="pc-a">Yes. Orders to Canada arrive in 5 to 8 working days.</p>
        <div className="pc-src"><span>Shipping</span><span>Delivery times</span></div>
        <p className="pc-human"><CornerDownRight size={16} /> Talk to a human</p>
      </div>
      <div className="pc-launch">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3.5 4.5h10a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H8l-3 2.5V14h-1.5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" stroke="#08090a" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10.5 9.5h10a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H19v2.5L16 19h-5.5a2 2 0 0 1-2-2v-5.5a2 2 0 0 1 2-2Z" fill="#eef6f9" stroke="#3c8fb0" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}
