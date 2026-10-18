import { useEffect } from 'react'

const FONT = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&display=swap'

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

type Col = { stage: string; tone: string; cards: [string, string][] }
const BOARD: Col[] = [
  { stage: 'Applied', tone: 'applied', cards: [['Tom Okafor', '2h ago'], ['Lena Fischer', '5h ago'], ['Sam Patel', 'Yesterday'], ['Grace Lin', 'Yesterday']] },
  { stage: 'Screen', tone: 'screen', cards: [['Ana Ruiz', 'Opened'], ['Joel Mensah', 'Note from JB']] },
  { stage: 'Interview', tone: 'interview', cards: [['Priya Nair', 'Thu 14:00'], ['Owen Hughes', 'Booking sent']] },
  { stage: 'Offer', tone: 'offer', cards: [['Marta Silva', 'Sent Mon']] },
  { stage: 'Hired', tone: 'hired', cards: [['Ben Carter', 'Starts 3 Nov']] },
]

const SUMMARY: [string, 'Meets' | 'Partly' | 'Not shown', string][] = [
  ['Shipped a B2B product', 'Meets', 'Led design for the invoicing app from first sketch to launch.'],
  ['Works from a design system', 'Meets', 'Built our Figma component library across three products.'],
]

export default function ShortlistPreview() {
  useFont(FONT)
  return (
    <div className="pv-shortlist">
      <style>{CSS}</style>
      <div className="pvs-head">
        <h1>Shortlist</h1>
        <p>Hiring for teams of ten. <span>Every candidate gets a reply.</span></p>
      </div>
      <div className="pvs-board">
        {BOARD.map((c) => (
          <div key={c.stage} className="pvs-col">
            <div className="pvs-col-head"><span className={`pvs-stage s-${c.tone}`}><i />{c.stage}</span><span className="pvs-n">{c.cards.length}</span></div>
            {c.cards.map(([n, m]) => (
              <div key={n} className={`pvs-card${n === 'Ana Ruiz' ? ' is-sel' : ''}`}><b>{n}</b><span>Product designer</span><small>{m}</small></div>
            ))}
          </div>
        ))}
      </div>
      <div className="pvs-sum">
        <div className="pvs-sum-top"><span className="pvs-av">AR</span><span><b>Ana Ruiz</b><small>Against your criteria, quoted from her CV</small></span></div>
        <ul>
          {SUMMARY.map(([c, v, q]) => (
            <li key={c}>
              <span className="pvs-row"><span>{c}</span><span className={`pvs-v v-${v === 'Meets' ? 'meets' : 'none'}`}>{v}</span></span>
              {q ? <mark>“{q}”</mark> : <em>Nothing in the CV mentions this.</em>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const CSS = `
.pv-shortlist { position: relative; overflow: hidden; width: 1200px; height: 750px; background: linear-gradient(180deg, #f9f9fe 0%, #f2f3fd 100%); font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #3c4149; -webkit-font-smoothing: antialiased; }
.pv-shortlist * { box-sizing: border-box; }
.pv-shortlist .pvs-head { position: absolute; left: 72px; right: 72px; top: 118px; display: flex; flex-direction: column; gap: 18px; }
.pv-shortlist h1 { margin: 0; font-family: 'Bricolage Grotesque', Geist, sans-serif; font-variation-settings: 'opsz' 96; font-weight: 650; font-size: 150px; line-height: .82; letter-spacing: -0.055em; color: #08090a; }
.pv-shortlist .pvs-head p { margin: 0; font-size: 42px; line-height: 1.1; letter-spacing: -0.035em; font-weight: 500; color: #3c4149; }
.pv-shortlist .pvs-head p span { background: linear-gradient(transparent 58%, #e4e7fb 58%, #e4e7fb 92%, transparent 92%); color: #4652b8; }
.pv-shortlist .pvs-board { position: absolute; left: 72px; top: 400px; display: grid; grid-template-columns: repeat(5, 236px); gap: 18px; }
.pv-shortlist .pvs-col { display: flex; flex-direction: column; gap: 12px; padding: 14px; background: rgba(255,255,255,.55); border: 2px solid #e6e6f3; border-radius: 10px; min-height: 420px; }
.pv-shortlist .pvs-col-head { display: flex; align-items: center; justify-content: space-between; }
.pv-shortlist .pvs-stage { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 6px; border: 2px solid; font-size: 19px; font-weight: 600; letter-spacing: -0.015em; }
.pv-shortlist .pvs-stage i { width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
.pv-shortlist .s-applied { background: #f3f4f6; border-color: #dfe1e6; color: #4a4f57; }
.pv-shortlist .s-screen { background: #f2f3fd; border-color: #cdd2f6; color: #4652b8; }
.pv-shortlist .s-interview { background: #f5f0fd; border-color: #ddd0f6; color: #6a46b8; }
.pv-shortlist .s-offer { background: #fdf6ea; border-color: #f1dcb0; color: #8a5a07; }
.pv-shortlist .s-hired { background: #eef8f0; border-color: #c4e6cb; color: #1d7a34; }
.pv-shortlist .pvs-n { font-size: 19px; color: #6f747c; font-variant-numeric: tabular-nums; }
.pv-shortlist .pvs-card { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; background: #fff; border: 2px solid #e6e6e9; border-radius: 8px; }
.pv-shortlist .pvs-card b { font-size: 21px; font-weight: 600; color: #08090a; letter-spacing: -0.02em; }
.pv-shortlist .pvs-card span { font-size: 17px; color: #62666d; }
.pv-shortlist .pvs-card small { font-size: 16px; color: #6f747c; margin-top: 6px; }
.pv-shortlist .pvs-card.is-sel { border-color: #6c7ae0; box-shadow: 0 0 0 4px #e4e7fb; }
.pv-shortlist .pvs-sum { position: absolute; left: 650px; top: 352px; width: 500px; padding: 26px 28px 28px; background: #fff; border: 2px solid #cdd2f6; border-radius: 12px; box-shadow: 0 40px 70px -30px rgba(70,82,184,.45), 0 0 0 1px rgba(8,9,10,.02); display: flex; flex-direction: column; gap: 20px; transform: rotate(-2deg); transition: transform .45s cubic-bezier(0.16, 1, 0.3, 1); }
a.app-card:hover .pv-shortlist .pvs-sum { transform: rotate(-2deg) translateY(-10px); }
.pv-shortlist .pvs-sum-top { display: flex; align-items: center; gap: 16px; }
.pv-shortlist .pvs-sum-top > span:last-child { display: flex; flex-direction: column; gap: 2px; }
.pv-shortlist .pvs-sum-top b { font-size: 30px; font-weight: 600; color: #08090a; letter-spacing: -0.03em; }
.pv-shortlist .pvs-sum-top small { font-size: 19px; color: #62666d; }
.pv-shortlist .pvs-av { width: 58px; height: 58px; border-radius: 50%; background: #f2f3fd; border: 2px solid #cdd2f6; color: #4652b8; display: grid; place-items: center; font-weight: 600; font-size: 21px; flex: none; }
.pv-shortlist ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.pv-shortlist li { display: flex; flex-direction: column; gap: 8px; padding-top: 16px; border-top: 2px solid #efeff1; }
.pv-shortlist .pvs-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 22px; font-weight: 500; color: #08090a; letter-spacing: -0.02em; }
.pv-shortlist .pvs-v { padding: 5px 12px; border-radius: 6px; border: 2px solid; font-size: 18px; font-weight: 600; white-space: nowrap; }
.pv-shortlist .v-meets { background: #eef8f0; border-color: #c4e6cb; color: #1d7a34; }
.pv-shortlist .v-none { background: #f3f4f6; border-color: #dfe1e6; color: #4a4f57; }
.pv-shortlist mark { background: #eceefc; color: #2f3a8f; font-size: 19px; line-height: 1.4; padding: 2px 6px; border-radius: 3px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.pv-shortlist em { font-style: normal; font-size: 19px; color: #6f747c; }
`
