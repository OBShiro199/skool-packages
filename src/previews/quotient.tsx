import { useEffect } from 'react'

const FONT = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&display=swap'

function useFont(href: string) {
  useEffect(() => {
    if (document.querySelector(`link[data-pv-font="${href}"]`)) return
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = href
    l.dataset.pvFont = href
    document.head.appendChild(l)
  }, [href])
}

export default function QuotientPreview() {
  useFont(FONT)
  return (
    <div className="pv-quotient">
      <style>{CSS}</style>
      <div className="pvq-copy">
        <h1>Quotient</h1>
        <p>Instant quotes that book the job.</p>
      </div>
      <div className="pvq-card">
        <i className="pvq-tape pvq-tape-l" /><i className="pvq-tape pvq-tape-r" />
        <div className="pvq-head"><span className="pvq-logo">S</span><span><b>Sparkle Cleaning</b><small>Instant quote</small></span></div>
        <div className="pvq-picks"><span>3 bedrooms</span><span>Deep clean</span><span>SW15</span></div>
        <div className="pvq-price">
          <small>Your price</small>
          <b>£180<span>to</span>£230</b>
        </div>
        <div className="pvq-range"><i /><em style={{ left: '30%' }} /><em style={{ left: '62%' }} /></div>
      </div>
      <div className="pvq-booked"><span className="pvq-tick">✓</span><span><b>Booked</b><small>Survey Thu 10:00</small></span></div>
    </div>
  )
}

const CSS = `
.pv-quotient { position: relative; overflow: hidden; width: 1200px; height: 750px; font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #3d3a33; -webkit-font-smoothing: antialiased;
  background-color: #fbf8f2;
  background-image: radial-gradient(rgba(20,19,15,.09) 1.6px, transparent 1.8px);
  background-size: 28px 28px; }
.pv-quotient * { box-sizing: border-box; }
.pv-quotient .pvq-copy { position: absolute; left: 72px; top: 132px; width: 600px; display: flex; flex-direction: column; gap: 22px; }
.pv-quotient h1 { margin: 0; font-family: 'Inter Tight', Geist, sans-serif; font-weight: 800; font-size: 150px; line-height: .84; letter-spacing: -0.06em; color: #14130f; }
.pv-quotient .pvq-copy p { margin: 0; font-size: 44px; line-height: 1.06; letter-spacing: -0.04em; font-weight: 500; color: #3d3a33; max-width: 11em; text-wrap: balance; }
.pv-quotient .pvq-card { position: absolute; left: 650px; top: 262px; width: 490px; padding: 30px 34px 34px; background: #fff; border: 2px solid #e9e6df; border-radius: 14px; box-shadow: 0 40px 70px -34px rgba(60,45,20,.38); transform: rotate(3deg); display: flex; flex-direction: column; gap: 22px; transition: transform .45s cubic-bezier(0.16, 1, 0.3, 1); }
a.app-card:hover .pv-quotient .pvq-card { transform: rotate(1.5deg) translateY(-8px); }
.pv-quotient .pvq-tape { position: absolute; top: -22px; width: 130px; height: 44px; background: rgba(231,201,143,.62); border-left: 2px dashed rgba(255,255,255,.5); border-right: 2px dashed rgba(255,255,255,.5); }
.pv-quotient .pvq-tape-l { left: -40px; top: -6px; transform: rotate(-36deg); }
.pv-quotient .pvq-tape-r { right: -30px; transform: rotate(28deg); }
.pv-quotient .pvq-head { display: flex; align-items: center; gap: 16px; }
.pv-quotient .pvq-head > span:last-child { display: flex; flex-direction: column; }
.pv-quotient .pvq-head b { font-size: 26px; font-weight: 600; color: #14130f; letter-spacing: -0.025em; }
.pv-quotient .pvq-head small { font-size: 19px; color: #716b60; }
.pv-quotient .pvq-logo { width: 56px; height: 56px; border-radius: 12px; background: #eef8f7; border: 2px solid #bfe3e0; color: #23756f; display: grid; place-items: center; font-weight: 700; font-size: 26px; }
.pv-quotient .pvq-picks { display: flex; gap: 10px; flex-wrap: wrap; }
.pv-quotient .pvq-picks span { padding: 10px 16px; border-radius: 8px; background: #eef8f7; border: 2px solid #bfe3e0; color: #23756f; font-size: 21px; font-weight: 600; letter-spacing: -0.015em; }
.pv-quotient .pvq-price { display: flex; flex-direction: column; gap: 6px; padding-top: 22px; border-top: 2px solid #f0ede7; }
.pv-quotient .pvq-price small { font-size: 21px; color: #716b60; }
.pv-quotient .pvq-price b { font-family: 'Inter Tight', Geist, sans-serif; font-weight: 700; font-size: 80px; line-height: .95; letter-spacing: -0.05em; color: #14130f; font-variant-numeric: tabular-nums; display: flex; align-items: baseline; gap: 14px; }
.pv-quotient .pvq-price b span { font-family: Geist, sans-serif; font-size: 30px; font-weight: 500; letter-spacing: -0.02em; color: #716b60; }
.pv-quotient .pvq-range { position: relative; height: 16px; border-radius: 8px; background: #f0ede7; }
.pv-quotient .pvq-range i { position: absolute; left: 30%; right: 38%; top: 0; bottom: 0; border-radius: 8px; background: #bfe3e0; }
.pv-quotient .pvq-range em { position: absolute; top: 50%; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: #fff; border: 3px solid #3fa6a0; }
.pv-quotient .pvq-booked { position: absolute; left: 404px; top: 616px; display: flex; align-items: center; gap: 16px; padding: 18px 24px 18px 18px; background: #fff; border: 2px solid #bfe3c9; border-radius: 12px; box-shadow: 0 18px 40px -18px rgba(29,122,53,.35); transform: rotate(-2deg); }
.pv-quotient .pvq-tick { width: 48px; height: 48px; border-radius: 50%; background: #eef8f1; border: 2px solid #bfe3c9; color: #1d7a35; display: grid; place-items: center; font-size: 24px; font-weight: 700; }
.pv-quotient .pvq-booked > span:last-child { display: flex; flex-direction: column; }
.pv-quotient .pvq-booked b { font-size: 26px; font-weight: 600; color: #1d7a35; letter-spacing: -0.02em; }
.pv-quotient .pvq-booked small { font-size: 19px; color: #645f55; }
`
