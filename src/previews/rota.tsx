import { useEffect } from 'react'

const FONT = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap'

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

const DAYS = ['Mon 20', 'Tue 21', 'Wed 22', 'Thu 23', 'Fri 24', 'Sat 25', 'Sun 26']
type Shift = [string, string] | null // [time, role]
const ROWS: [string, string, Shift[]][] = [
  ['Maya', 'Barista', [['06–14', 'barista'], null, ['09–17', 'barista'], ['06–14', 'barista'], null, ['08–16', 'barista'], null]],
  ['Leo', 'Kitchen', [['07–15', 'kitchen'], ['07–15', 'kitchen'], null, ['11–19', 'kitchen'], ['07–15', 'kitchen'], null, ['09–17', 'kitchen']]],
  ['Ines', 'Floor', [null, ['10–18', 'floor'], ['10–18', 'floor'], null, ['12–20', 'floor'], ['10–18', 'floor'], ['10–16', 'floor']]],
  ['Sam', 'Bar', [['14–22', 'bar'], null, ['14–22', 'bar'], ['14–22', 'bar'], ['16–23', 'warn'], ['16–23', 'bar'], null]],
  ['Open', '', [null, ['06–14', 'open'], null, null, null, ['12–20', 'open'], null]],
]

export default function RotaPreview() {
  useFont(FONT)
  return (
    <div className="pv-rota">
      <style>{CSS}</style>
      <div className="pvr-grid">
        <div className="pvr-bar"><b>Cafe Luna · w/c 20 Oct</b><span className="pvr-pub"><i />Published</span></div>
        <div className="pvr-table">
          <span className="pvr-corner" />
          {DAYS.map((d) => <span key={d} className="pvr-day">{d}</span>)}
          {ROWS.map(([n, role, shifts]) => (
            <div key={n} className="pvr-row">
              <span className={`pvr-who${n === 'Open' ? ' is-open' : ''}`}><b>{n === 'Open' ? 'Open shifts' : n}</b>{role && <small>{role}</small>}</span>
              {shifts.map((s, i) => (
                <span key={i} className="pvr-cell">
                  {s && <span className={`pvr-shift r-${s[1]}`}>{s[0]}{s[1] === 'warn' && <em>Overtime</em>}</span>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="pvr-foot">
        <h1>Rota</h1>
        <p>Next week's rota, done before your coffee goes cold.</p>
      </div>
    </div>
  )
}

const CSS = `
.pv-rota { position: relative; overflow: hidden; width: 1200px; height: 750px; font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #33403e; -webkit-font-smoothing: antialiased;
  background-color: #e6edeb;
  background-image: linear-gradient(to right, rgba(31,95,90,.07) 2px, transparent 2px), linear-gradient(to bottom, rgba(31,95,90,.07) 2px, transparent 2px);
  background-size: 48px 48px; }
.pv-rota * { box-sizing: border-box; }
.pv-rota .pvr-grid { position: absolute; left: 56px; right: -24px; top: 100px; background: #fafcfb; border: 2px solid #d3dedb; border-radius: 12px; box-shadow: 0 30px 60px -36px rgba(12,22,21,.35); overflow: hidden; transition: transform .45s cubic-bezier(0.16, 1, 0.3, 1); }
a.app-card:hover .pv-rota .pvr-grid { transform: translateY(-8px); }
.pv-rota .pvr-bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 2px solid #dfe7e5; font-size: 22px; color: #0c1615; letter-spacing: -0.02em; }
.pv-rota .pvr-bar b { font-weight: 600; }
.pv-rota .pvr-pub { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 6px; background: #e2f1ef; border: 2px solid #b6dbd7; color: #1f5f5a; font-size: 19px; font-weight: 600; margin-right: 24px; }
.pv-rota .pvr-pub i { width: 9px; height: 9px; border-radius: 50%; background: #3f9c96; }
.pv-rota .pvr-table { display: grid; grid-template-columns: 150px repeat(7, 1fr); }
.pv-rota .pvr-corner, .pv-rota .pvr-day { height: 46px; border-bottom: 2px solid #dfe7e5; }
.pv-rota .pvr-day { display: flex; align-items: center; padding-left: 14px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 17px; color: #53605d; border-left: 2px solid #dfe7e5; }
.pv-rota .pvr-row { display: contents; }
.pv-rota .pvr-who, .pv-rota .pvr-cell { height: 60px; border-bottom: 2px solid #dfe7e5; }
.pv-rota .pvr-who { display: flex; flex-direction: column; justify-content: center; padding-left: 22px; gap: 0; }
.pv-rota .pvr-who b { font-size: 21px; font-weight: 600; color: #0c1615; letter-spacing: -0.02em; line-height: 1.1; }
.pv-rota .pvr-who small { font-size: 16px; color: #5b6866; }
.pv-rota .pvr-who.is-open b { color: #53605d; font-weight: 500; }
.pv-rota .pvr-cell { border-left: 2px solid #dfe7e5; padding: 8px 8px; }
.pv-rota .pvr-shift { position: relative; display: flex; align-items: center; height: 100%; padding: 0 12px; border-radius: 6px; border: 2px solid; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 19px; font-weight: 500; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.pv-rota .r-barista { background: #eef7f6; border-color: #bfe1de; color: #1f5f5a; }
.pv-rota .r-kitchen { background: #eef8f0; border-color: #c3e6cb; color: #1e6b33; }
.pv-rota .r-floor { background: #fdf6ea; border-color: #f0d9a8; color: #7a520a; }
.pv-rota .r-bar { background: #fdf0ee; border-color: #f4c7bf; color: #8f3426; }
.pv-rota .r-warn { background: #fdf3e1; border-color: #d18b0f; color: #7a520a; box-shadow: 0 0 0 4px rgba(209,139,15,.15); }
.pv-rota .r-warn em { position: absolute; left: 50%; bottom: -44px; transform: translateX(-50%); font-style: normal; font-family: Geist, sans-serif; font-size: 17px; font-weight: 600; padding: 4px 10px; border-radius: 6px; background: #fff; border: 2px solid #f0d9a8; color: #7a520a; white-space: nowrap; box-shadow: 0 6px 14px -6px rgba(12,22,21,.25); }
.pv-rota .r-open { background: transparent; border-style: dashed; border-color: #a7b3b0; color: #53605d; }
.pv-rota .pvr-foot { position: absolute; left: 72px; right: 72px; bottom: 54px; display: flex; align-items: flex-end; justify-content: space-between; gap: 48px; }
.pv-rota h1 { margin: 0; font-weight: 600; font-size: 168px; line-height: .78; letter-spacing: -0.065em; color: #0c1615; }
.pv-rota .pvr-foot p { margin: 0 0 4px; max-width: 560px; font-size: 42px; line-height: 1.08; letter-spacing: -0.04em; font-weight: 500; color: #33403e; text-wrap: balance; }
`
