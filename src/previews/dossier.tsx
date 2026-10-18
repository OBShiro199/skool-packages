import { useEffect } from 'react'

const FONT = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap'

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

export default function DossierPreview() {
  useFont(FONT)
  return (
    <div className="pv-dossier">
      <style>{CSS}</style>
      <aside className="pvd-margin">
        <span className="pvd-clause">§ 4.1</span>
        <span className="pvd-note">Data protection</span>
      </aside>
      <div className="pvd-head">
        <h1>Dossier</h1>
        <p>Security questionnaires, answered <em>with sources.</em></p>
      </div>
      <div className="pvd-answer">
        <div className="pvd-q"><span>Question 4.1</span><span className="pvd-conf">High · 92</span></div>
        <p className="pvd-qtext">Is customer data encrypted at rest?</p>
        <p className="pvd-atext">Yes. All customer data is encrypted at rest with AES-256, using keys held in AWS KMS.<sup>1</sup></p>
      </div>
      <svg className="pvd-link" viewBox="0 0 120 120" aria-hidden="true"><path d="M2 40 C 60 40, 60 92, 118 92" fill="none" stroke="#3f9a9c" strokeWidth="2.5" strokeDasharray="6 7" /></svg>
      <div className="pvd-source">
        <span className="pvd-src-k"><sup>1</sup> Information Security Policy, p. 7</span>
        <p>8.2 Storage. <mark>Customer data is encrypted at rest using AES-256.</mark> Keys are held in AWS KMS and rotated annually.</p>
      </div>
    </div>
  )
}

const CSS = `
.pv-dossier { position: relative; overflow: hidden; width: 1200px; height: 750px; background: #ffffff; font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: #3c4149; -webkit-font-smoothing: antialiased; }
.pv-dossier * { box-sizing: border-box; }
.pv-dossier svg { transform: none !important; }
.pv-dossier::before { content: ''; position: absolute; left: 168px; top: 0; bottom: 0; width: 8px; border-left: 2px solid #bfe0e0; border-right: 2px solid #bfe0e0; }
.pv-dossier::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 168px; background: #f6fbfb; }
.pv-dossier .pvd-margin { position: absolute; left: 0; width: 168px; top: 370px; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.pv-dossier .pvd-clause { font-family: 'Instrument Serif', Georgia, serif; font-size: 52px; line-height: 1; color: #24696b; letter-spacing: -0.01em; }
.pv-dossier .pvd-note { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 24px; color: #62666d; }
.pv-dossier .pvd-head { position: absolute; left: 230px; right: 60px; top: 92px; display: flex; flex-direction: column; gap: 14px; }
.pv-dossier h1 { margin: 0; font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 176px; line-height: .82; letter-spacing: -0.035em; color: #08090a; }
.pv-dossier .pvd-head p { margin: 0; font-size: 42px; line-height: 1.1; letter-spacing: -0.035em; font-weight: 500; color: #3c4149; }
.pv-dossier .pvd-head em { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; font-size: 1.2em; letter-spacing: -0.02em; color: #24696b; }
.pv-dossier .pvd-answer { position: absolute; left: 230px; top: 380px; width: 470px; padding: 26px 30px 30px; background: #fff; border: 2px solid #e6e6e9; border-radius: 8px; box-shadow: 0 30px 60px -36px rgba(36,105,107,.4); display: flex; flex-direction: column; gap: 14px; }
.pv-dossier .pvd-q { display: flex; align-items: center; justify-content: space-between; font-size: 20px; color: #6f747c; }
.pv-dossier .pvd-conf { padding: 6px 12px; border-radius: 6px; background: #eef8f1; border: 2px solid #bfe3c9; color: #1d7a35; font-weight: 600; font-size: 19px; font-variant-numeric: tabular-nums; }
.pv-dossier .pvd-qtext { margin: 0; font-family: 'Instrument Serif', Georgia, serif; font-size: 38px; line-height: 1.05; color: #08090a; letter-spacing: -0.015em; }
.pv-dossier .pvd-atext { margin: 0; font-size: 23px; line-height: 1.4; color: #3c4149; letter-spacing: -0.015em; }
.pv-dossier sup { font-size: .62em; color: #24696b; font-weight: 600; margin-left: 2px; }
.pv-dossier .pvd-link { position: absolute; left: 690px; top: 470px; width: 130px; height: 130px; overflow: visible; }
.pv-dossier .pvd-source { position: absolute; left: 790px; top: 500px; width: 380px; padding: 24px 26px; background: #f6fbfb; border: 2px solid #bfe0e0; border-radius: 8px; display: flex; flex-direction: column; gap: 12px; transform: rotate(1.5deg); transition: transform .45s cubic-bezier(0.16, 1, 0.3, 1); }
a.app-card:hover .pv-dossier .pvd-source { transform: rotate(0deg) translateY(-6px); }
.pv-dossier .pvd-src-k { font-size: 19px; font-weight: 600; color: #24696b; letter-spacing: -0.01em; }
.pv-dossier .pvd-source p { margin: 0; font-family: 'Instrument Serif', Georgia, serif; font-size: 27px; line-height: 1.3; color: #3c4149; }
.pv-dossier mark { background: linear-gradient(transparent 12%, #d5eeee 12%, #d5eeee 92%, transparent 92%); color: #08090a; padding: 0 2px; }
`
