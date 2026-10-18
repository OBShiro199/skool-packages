import { CalendarCheck, Check, MessageSquare } from 'lucide-react'

/**
 * Bookwell hero: warm cream, mirror split. A phone on the left shows a barber's booking page with a slot
 * picked and a deposit due; the copy sits right with one Instrument Serif italic accent and the SMS reminder.
 * Instrument Serif is already loaded globally.
 */

const DAYS: [string, string, boolean][] = [['Mon', '14', false], ['Tue', '15', false], ['Wed', '16', true], ['Thu', '17', false], ['Fri', '18', false]]
const SLOTS: [string, 'free' | 'busy' | 'on'][] = [['9:00', 'free'], ['9:45', 'busy'], ['10:30', 'on'], ['11:15', 'free'], ['1:00', 'free'], ['1:45', 'busy']]

const CSS = `
.pv-bookwell { --bg:#fffbf3; --ink:#221c14; --body:#4a3f31; --muted:#6e6355; --faint:#8c8170; --line:#eae2d6; --div:#f1eadf;
  --brand:#c7801a; --brand-text:#93560a; --brand-soft:#fbebd2; --brand-edge:#e8c48a; --ok:#2f7d4f; --ok-soft:#e8f3eb; --ok-edge:#bfdcc8; --busy:#efe9e0;
  --serif:'Instrument Serif', Georgia, serif;
  position:relative; width:1200px; height:750px; overflow:hidden; color:var(--body); background:var(--bg);
  font-family:Geist, ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
.pv-bookwell *, .pv-bookwell *::before { box-sizing:border-box; margin:0; padding:0; }
.pv-bookwell .pb-sun { position:absolute; left:-60px; top:120px; width:640px; height:640px; border-radius:50%; background:radial-gradient(closest-side, #fbe9cc 0%, #fcefd9 55%, rgba(252,239,217,0) 100%); }
.pv-bookwell .pb-ring { position:absolute; left:40px; top:210px; width:460px; height:460px; border-radius:50%; border:1px dashed #ead6b4; }

.pv-bookwell .pb-phone { position:absolute; left:120px; top:96px; width:340px; height:700px; border-radius:50px; padding:12px; background:#fff;
  box-shadow:0 0 0 1px #eadfcd, 0 40px 80px -30px rgba(58,38,8,.30); transform:rotate(-5deg); transition:transform .6s cubic-bezier(.16,1,.3,1); }
.pv-bookwell .pb-screen { height:100%; border-radius:40px; background:var(--bg); border:1px solid var(--div); padding:26px 22px; overflow:hidden; }
.pv-bookwell .pb-notch { width:96px; height:26px; border-radius:14px; background:#f1eadf; margin:-12px auto 18px; }
.pv-bookwell .pb-biz { display:flex; align-items:center; gap:12px; }
.pv-bookwell .pb-biz i { width:48px; height:48px; border-radius:50%; background:var(--brand-soft); border:1px solid var(--brand-edge); display:grid; place-items:center; font-style:normal; font-weight:600; font-size:18px; color:var(--brand-text); }
.pv-bookwell .pb-biz b { display:block; font-size:20px; font-weight:600; color:var(--ink); letter-spacing:-.02em; }
.pv-bookwell .pb-biz span { font-size:15px; color:var(--faint); }
.pv-bookwell .pb-svc { margin-top:18px; padding:14px 16px; border-radius:14px; background:#fff; border:1px solid var(--line); display:flex; justify-content:space-between; font-size:17px; }
.pv-bookwell .pb-svc b { font-weight:600; color:var(--ink); }
.pv-bookwell .pb-svc span { color:var(--faint); }
.pv-bookwell .pb-lab { margin-top:20px; font-size:14px; font-weight:500; color:var(--faint); }
.pv-bookwell .pb-days { margin-top:8px; display:grid; grid-template-columns:repeat(5, 1fr); gap:6px; }
.pv-bookwell .pb-day { height:62px; border-radius:12px; border:1px solid var(--line); background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:13px; color:var(--faint); }
.pv-bookwell .pb-day b { font-size:20px; font-weight:600; color:var(--ink); }
.pv-bookwell .pb-day.pb-on { background:var(--brand-soft); border-color:var(--brand-edge); color:var(--brand-text); }
.pv-bookwell .pb-day.pb-on b { color:var(--brand-text); }
.pv-bookwell .pb-slots { margin-top:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
.pv-bookwell .pb-slot { height:46px; border-radius:12px; border:1px solid var(--line); background:#fff; display:grid; place-items:center; font-size:17px; font-weight:500; color:var(--ink); font-variant-numeric:tabular-nums; }
.pv-bookwell .pb-slot.pb-busy { background:var(--busy); color:#b5ab9c; text-decoration:line-through; border-color:transparent; }
.pv-bookwell .pb-slot.pb-on { background:var(--brand-soft); border:1.5px solid var(--brand); color:var(--brand-text); }
.pv-bookwell .pb-pay { margin-top:20px; height:58px; border-radius:16px; border:1.5px solid var(--brand); background:#fff; display:flex; align-items:center; justify-content:center; gap:10px; font-size:18px; font-weight:600; color:var(--brand-text); }
.pv-bookwell .pb-fine { margin-top:10px; text-align:center; font-size:13px; color:var(--faint); }

.pv-bookwell .pb-copy { position:absolute; left:580px; top:150px; width:560px; }
.pv-bookwell h1 { font-size:138px; line-height:.88; letter-spacing:-.06em; font-weight:600; color:var(--ink); }
.pv-bookwell .pb-promise { margin-top:26px; font-size:42px; line-height:1.08; letter-spacing:-.03em; color:var(--body); }
.pv-bookwell .pb-promise em { font-family:var(--serif); font-style:italic; font-size:52px; letter-spacing:-.01em; color:var(--brand-text); white-space:nowrap; }
.pv-bookwell .pb-sms { margin-top:44px; width:470px; padding:18px 20px; border-radius:20px; background:#fff; border:1px solid var(--line); box-shadow:0 4px 16px rgba(58,38,8,.08), 0 0 0 1px rgba(58,38,8,.03); }
.pv-bookwell .pb-sms-h { display:flex; align-items:center; gap:10px; font-size:15px; color:var(--faint); }
.pv-bookwell .pb-sms-h i { width:30px; height:30px; border-radius:8px; display:grid; place-items:center; background:var(--ok-soft); border:1px solid var(--ok-edge); color:var(--ok); }
.pv-bookwell .pb-sms-h em { margin-left:auto; font-style:normal; }
.pv-bookwell .pb-sms p { margin-top:10px; font-size:20px; line-height:1.4; color:var(--ink); letter-spacing:-.01em; }
.pv-bookwell .pb-chips { margin-top:16px; display:flex; gap:10px; }
.pv-bookwell .pb-chips span { display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 12px; border-radius:999px; background:#fff; border:1px solid var(--line); font-size:16px; color:var(--body); }
.pv-bookwell .pb-chips svg { color:var(--ok); }
a.app-card:hover .app-card-art .pv-bookwell svg { transform:none; }
a.app-card:hover .pv-bookwell .pb-phone { transform:rotate(-2deg) translateY(-6px); }
`

export default function BookwellPreview() {
  return (
    <div className="pv-bookwell">
      <style>{CSS}</style>
      <div className="pb-sun" />
      <div className="pb-ring" />
      <div className="pb-phone">
        <div className="pb-screen">
          <div className="pb-notch" />
          <div className="pb-biz"><i>JB</i><span><b>Jordan's Barbers</b><span>bookwell.app/jordan</span></span></div>
          <div className="pb-svc"><b>Skin fade</b><span>45 min · $32</span></div>
          <p className="pb-lab">October</p>
          <div className="pb-days">
            {DAYS.map(([d, n, on]) => <span key={n} className={`pb-day ${on ? 'pb-on' : ''}`}>{d}<b>{n}</b></span>)}
          </div>
          <p className="pb-lab">Wednesday</p>
          <div className="pb-slots">
            {SLOTS.map(([t, st]) => <span key={t} className={`pb-slot ${st === 'free' ? '' : `pb-${st}`}`}>{t}</span>)}
          </div>
          <div className="pb-pay"><CalendarCheck size={19} /> Book 10:30 · $10 deposit</div>
          <p className="pb-fine">Rest paid in the shop</p>
        </div>
      </div>
      <div className="pb-copy">
        <h1>Bookwell</h1>
        <p className="pb-promise">Bookings, deposits,<br /><em>no no-shows.</em></p>
        <div className="pb-sms">
          <div className="pb-sms-h"><i><MessageSquare size={16} /></i>Text reminder<em>day before</em></div>
          <p>Skin fade with Jordan tomorrow at 10:30. Reply C to cancel.</p>
        </div>
        <div className="pb-chips">
          <span><Check size={16} strokeWidth={2.4} /> Google Calendar synced</span>
          <span><Check size={16} strokeWidth={2.4} /> Deposit paid</span>
        </div>
      </div>
    </div>
  )
}
