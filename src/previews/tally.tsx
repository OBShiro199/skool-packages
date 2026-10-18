import { useEffect } from 'react'

const FONT = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap'

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

/* The reminder sequence: two sent, paid on the third step, the rest cancelled. */
const STEPS: [string, 'sent' | 'paid' | 'off'][] = [['−3 days', 'sent'], ['Due', 'sent'], ['+3', 'paid'], ['+7', 'off'], ['+14', 'off']]

export default function TallyPreview() {
  useFont(FONT)
  return (
    <div className="pv-tally">
      <style>{CSS}</style>
      <span className="pvt-x pvt-x1">+</span><span className="pvt-x pvt-x2">+</span><span className="pvt-x pvt-x3">+</span>
      <div className="pvt-inv">
        <div className="pvt-inv-top">
          <span className="pvt-brand"><i />Moss Studio</span>
          <span className="pvt-mono pvt-no">INV-0042</span>
        </div>
        <div className="pvt-billed"><span>Billed to</span><b>Northwind Coffee</b></div>
        <div className="pvt-amt">
          <span>Amount due</span>
          <b className="pvt-mono">$2,400.00</b>
        </div>
        <div className="pvt-seq">
          <span className="pvt-seq-k">Reminders</span>
          <ol>
            {STEPS.map(([l, s]) => (
              <li key={l} className={`is-${s}`}><i>{s === 'paid' ? '✓' : ''}</i><span>{s === 'paid' ? 'Paid' : l}</span></li>
            ))}
          </ol>
          <span className="pvt-seq-note">Paid. Remaining reminders cancelled.</span>
        </div>
        <span className="pvt-stamp">Paid</span>
      </div>
      <div className="pvt-copy">
        <h1>Tally</h1>
        <p>Invoices that chase themselves.</p>
        <span className="pvt-line pvt-mono">and stop the moment they pay</span>
      </div>
    </div>
  )
}

const CSS = `
.pv-tally { position: relative; overflow: hidden; width: 1200px; height: 750px; font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #3c4149; -webkit-font-smoothing: antialiased;
  background-color: #f6fbfa;
  background-image: linear-gradient(to right, rgba(63,154,144,.13) 2px, transparent 2px), linear-gradient(to bottom, rgba(8,9,10,.05) 2px, transparent 2px);
  background-size: 100px 100%, 100% 50px; }
.pv-tally * { box-sizing: border-box; }
.pv-tally .pvt-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.pv-tally .pvt-x { position: absolute; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 36px; line-height: 1; color: #3f9a90; }
.pv-tally .pvt-x1 { right: 28px; top: 24px; } .pv-tally .pvt-x2 { right: 28px; bottom: 24px; } .pv-tally .pvt-x3 { left: 28px; bottom: 24px; }
.pv-tally .pvt-inv { position: absolute; left: 100px; top: 120px; width: 540px; height: 680px; background: #fff; border: 2px solid #e6e6e9; border-radius: 4px 4px 0 0; box-shadow: 0 30px 60px -30px rgba(43,111,104,.35); padding: 40px 44px; display: flex; flex-direction: column; gap: 34px; transition: transform .45s cubic-bezier(0.16, 1, 0.3, 1); }
a.app-card:hover .pv-tally .pvt-inv { transform: translateY(-10px); }
.pv-tally .pvt-inv-top { display: flex; align-items: center; justify-content: space-between; padding-bottom: 26px; border-bottom: 2px solid #efeff1; }
.pv-tally .pvt-brand { display: inline-flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 600; color: #08090a; letter-spacing: -0.03em; }
.pv-tally .pvt-brand i { width: 26px; height: 26px; border-radius: 6px; background: #eff7f6; border: 2px solid #c2e0dc; }
.pv-tally .pvt-no { font-size: 24px; color: #62666d; }
.pv-tally .pvt-billed { display: flex; flex-direction: column; gap: 6px; }
.pv-tally .pvt-billed span, .pv-tally .pvt-amt span, .pv-tally .pvt-seq-k { font-size: 22px; color: #6f747c; letter-spacing: -0.015em; }
.pv-tally .pvt-billed b { font-size: 32px; font-weight: 500; color: #08090a; letter-spacing: -0.03em; }
.pv-tally .pvt-amt { display: flex; flex-direction: column; gap: 4px; }
.pv-tally .pvt-amt b { font-size: 76px; line-height: 1; font-weight: 500; color: #08090a; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.pv-tally .pvt-seq { display: flex; flex-direction: column; gap: 18px; padding: 24px 24px 22px; background: #fafafb; border: 2px solid #efeff1; border-radius: 6px; }
.pv-tally .pvt-seq ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); position: relative; }
.pv-tally .pvt-seq ol::before { content: ''; position: absolute; left: 10%; right: 10%; top: 17px; height: 2px; background: #dcdde0; }
.pv-tally .pvt-seq li { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; font-size: 20px; color: #62666d; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pv-tally .pvt-seq li i { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-style: normal; font-size: 20px; font-weight: 600; background: #fff; border: 2px solid #dcdde0; z-index: 1; }
.pv-tally .pvt-seq li.is-sent i { background: #eff7f6; border-color: #3f9a90; }
.pv-tally .pvt-seq li.is-sent i::after { content: ''; width: 12px; height: 12px; border-radius: 50%; background: #3f9a90; }
.pv-tally .pvt-seq li.is-paid i { background: #eef8f1; border-color: #27a644; color: #1d7a35; }
.pv-tally .pvt-seq li.is-paid span { color: #1d7a35; font-weight: 600; }
.pv-tally .pvt-seq li.is-off i { border-style: dashed; }
.pv-tally .pvt-seq li.is-off span { text-decoration: line-through; color: #b4b8bf; }
.pv-tally .pvt-seq-note { font-size: 20px; color: #1d7a35; letter-spacing: -0.015em; }
.pv-tally .pvt-stamp { position: absolute; right: 36px; top: 190px; padding: 10px 26px; border: 4px solid #27a644; border-radius: 10px; color: #1d7a35; background: rgba(238,248,241,.85); font-size: 52px; line-height: 1; font-weight: 600; letter-spacing: -0.03em; transform: rotate(-9deg); }
.pv-tally .pvt-copy { position: absolute; left: 700px; right: 60px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; gap: 22px; }
.pv-tally h1 { margin: 0; font-weight: 600; font-size: 168px; line-height: .84; letter-spacing: -0.065em; color: #08090a; }
.pv-tally .pvt-copy p { margin: 0; font-size: 50px; line-height: 1.04; letter-spacing: -0.045em; color: #3c4149; font-weight: 500; text-wrap: balance; }
.pv-tally .pvt-line { font-size: 22px; color: #2b6f68; letter-spacing: -0.02em; margin-top: 8px; }
`
