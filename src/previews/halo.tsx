import { GoogleG } from '../landings/halo/phone'

function Star() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="#e2a93b" stroke="#c8952c" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

export default function HaloPreview() {
  return (
    <div className="pv-halo">
      <style>{CSS}</style>
      <div className="pvl-glow" />
      <div className="pvl-rings"><i /><i /><i /></div>
      <div className="pvl-copy">
        <h1>Halo</h1>
        <p>More Google reviews, <em>fewer surprises.</em></p>
      </div>
      <div className="pvl-phone">
        <div className="pvl-screen">
          <div className="pvl-status"><span>9:41</span><span className="pvl-sb"><i /><i /><i /></span></div>
          <div className="pvl-biz"><span className="pvl-logo">B</span>Brightside Dental</div>
          <p className="pvl-q">How was your visit today?</p>
          <div className="pvl-stars">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="pvl-star"><Star /></span>)}</div>
          <p className="pvl-thanks">Thank you. We would love it if you shared that on Google.</p>
          <div className="pvl-google"><span className="pvl-g"><GoogleG size={30} /></span>Post on Google</div>
        </div>
      </div>
      <div className="pvl-sms">
        <span className="pvl-sms-from"><b>Brightside Dental</b><span>now</span></span>
        <p>Thanks for coming in today, Jo. Got 10 seconds to rate your visit?</p>
      </div>
    </div>
  )
}

const CSS = `
.pv-halo { position: relative; overflow: hidden; width: 1200px; height: 750px; background: #fffcf5; font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #3c4149; -webkit-font-smoothing: antialiased; }
.pv-halo * { box-sizing: border-box; }
.pv-halo svg { transform: none !important; }
.pv-halo .pvl-glow { position: absolute; left: 860px; top: 420px; width: 900px; height: 900px; margin: -450px 0 0 -450px; border-radius: 50%; background: radial-gradient(circle, rgba(226,169,59,.22) 0%, rgba(226,169,59,.08) 38%, rgba(255,252,245,0) 66%); }
.pv-halo .pvl-rings { position: absolute; left: 860px; top: 420px; }
.pv-halo .pvl-rings i { position: absolute; left: 0; top: 0; border-radius: 50%; border: 2px solid #efdaab; transform: translate(-50%, -50%); }
.pv-halo .pvl-rings i:nth-child(1) { width: 560px; height: 560px; }
.pv-halo .pvl-rings i:nth-child(2) { width: 760px; height: 760px; opacity: .6; }
.pv-halo .pvl-rings i:nth-child(3) { width: 960px; height: 960px; opacity: .35; }
.pv-halo .pvl-copy { position: absolute; left: 72px; top: 196px; width: 520px; display: flex; flex-direction: column; gap: 24px; }
.pv-halo h1 { margin: 0; font-weight: 600; font-size: 176px; line-height: .84; letter-spacing: -0.06em; color: #08090a; }
.pv-halo .pvl-copy p { margin: 0; font-size: 50px; line-height: 1.04; letter-spacing: -0.045em; font-weight: 500; color: #3c4149; text-wrap: balance; }
.pv-halo .pvl-copy em { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; font-size: 1.14em; letter-spacing: -0.02em; color: #7a5710; }
.pv-halo .pvl-phone { position: absolute; left: 676px; top: 92px; width: 368px; height: 760px; padding: 14px; border-radius: 56px; background: #fff; border: 2px solid #e6e6e9; box-shadow: 0 40px 80px -30px rgba(122,87,16,.35), 0 0 0 10px rgba(255,255,255,.6); transition: transform .45s cubic-bezier(0.16, 1, 0.3, 1); }
a.app-card:hover .pv-halo .pvl-phone { transform: translateY(-10px); }
.pv-halo .pvl-screen { height: 100%; border-radius: 44px; background: #fff; border: 2px solid #efeff1; padding: 22px 28px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.pv-halo .pvl-status { width: 100%; display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; color: #08090a; padding: 0 8px; }
.pv-halo .pvl-sb { display: inline-flex; gap: 5px; align-items: center; }
.pv-halo .pvl-sb i { width: 18px; height: 10px; border-radius: 3px; background: #08090a; opacity: .75; }
.pv-halo .pvl-biz { margin-top: 44px; display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 22px; font-weight: 600; color: #08090a; letter-spacing: -0.02em; }
.pv-halo .pvl-logo { width: 64px; height: 64px; border-radius: 16px; background: #fdf8ec; border: 2px solid #efdaab; color: #7a5710; display: grid; place-items: center; font-size: 30px; font-weight: 600; }
.pv-halo .pvl-q { margin: 26px 0 0; font-size: 32px; line-height: 1.12; font-weight: 600; color: #08090a; letter-spacing: -0.035em; }
.pv-halo .pvl-stars { margin-top: 26px; display: flex; gap: 6px; }
.pv-halo .pvl-star { width: 54px; height: 54px; display: block; }
.pv-halo .pvl-star svg { width: 100%; height: 100%; display: block; }
.pv-halo .pvl-thanks { margin: 26px 0 0; font-size: 20px; line-height: 1.35; color: #62666d; letter-spacing: -0.015em; }
.pv-halo .pvl-google { margin-top: 24px; width: 100%; height: 64px; display: flex; align-items: center; justify-content: center; gap: 12px; border-radius: 10px; border: 2px solid #dcdde0; background: #fff; font-size: 22px; font-weight: 600; color: #08090a; letter-spacing: -0.02em; }
.pv-halo .pvl-g { display: inline-flex; width: 30px; height: 30px; }
.pv-halo .pvl-sms { position: absolute; left: 470px; top: 560px; width: 330px; padding: 18px 22px; background: #fff; border: 2px solid #e6e6e9; border-radius: 22px 22px 22px 6px; box-shadow: 0 18px 40px -18px rgba(8,9,10,.25); display: flex; flex-direction: column; gap: 8px; }
.pv-halo .pvl-sms-from { display: flex; justify-content: space-between; font-size: 18px; color: #6f747c; }
.pv-halo .pvl-sms-from b { color: #08090a; font-weight: 600; }
.pv-halo .pvl-sms p { margin: 0; font-size: 21px; line-height: 1.3; color: #3c4149; letter-spacing: -0.015em; }
`
