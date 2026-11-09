import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Check, Copy, Download } from 'lucide-react'
import { loadDesign, tokens, type DesignFull } from './data'
import { ScrollPreview, SiteLogo } from './Preview'
import { toast } from '../components/Toasts'
import '../styles/designs.css'

type Tab = 'md' | 'tailwind' | 'css' | 'tokens'
const TABS: [Tab, string][] = [['md', 'DESIGN.md'], ['tailwind', 'Tailwind v4'], ['css', 'CSS variables'], ['tokens', 'Design tokens']]

export default function DesignDetailPage() {
  const { slug = '' } = useParams()
  const [d, setD] = useState<DesignFull | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('md')
  const [extended, setExtended] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setD(null); setError(''); loadDesign(slug).then(setD).catch((e) => setError(e.message)) }, [slug])

  if (error) return <div className="page"><Link to=".." relative="path" className="dz-back"><ArrowLeft size={14} /> All designs</Link><div className="dz-empty"><b>{error}</b></div></div>
  if (!d) return <div className="page"><div className="dz-skel" style={{ height: 480 }} /></div>

  const text = tab === 'md' ? (extended ? d.extended_md : d.compact_md) : tab === 'tailwind' ? d.tailwind : tab === 'css' ? d.css : tokens(d)
  const file = tab === 'md' ? 'DESIGN.md' : tab === 'tailwind' ? 'theme.css' : tab === 'css' ? 'tokens.css' : 'tokens.json'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
      toast(tab === 'md' ? 'Copied. Save it as DESIGN.md in your project.' : 'Copied.')
    } catch { toast('Could not copy. Use download instead.') }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    Object.assign(document.createElement('a'), { href: url, download: file }).click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="dz-detail">
      <section className="dz-left">
        <Link to=".." relative="path" className="dz-back"><ArrowLeft size={14} /> All designs</Link>
        <ScrollPreview slug={d.slug} height={d.preview_h} auto />
        <div className="dz-title">
          <SiteLogo name={d.name} logo={d.logo} size={44} />
          <h1>{d.name}</h1>
        </div>
        <p className="dz-vibe">{d.vibe}</p>
        <div className="dz-swatches">
          {d.palette.slice(0, 8).map((c) => (
            <button key={c.var} className="dz-swatch" title={`${c.name}: ${c.role}`} onClick={() => { navigator.clipboard.writeText(c.hex).catch(() => {}); toast(`${c.hex} copied`) }}>
              <i style={{ background: c.hex }} /><span>{c.name}</span><code>{c.hex.toLowerCase()}</code>
            </button>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="chip">{d.category}</span>
          <span className="chip">{d.theme === 'dark' ? 'Dark' : 'Light'}</span>
          {d.tags.map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
        <div className="row wrap" style={{ gap: 14, marginTop: 4 }}>
          <a className="dz-link" href={d.url} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /> {d.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>
          {d.refero_url && <a className="dz-link" href={d.refero_url} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /> View on Refero</a>}
        </div>
      </section>

      <section className="dz-right">
        <div className="dz-tabs" role="tablist">
          {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>)}
        </div>
        <div className="dz-subbar">
          {tab === 'md' ? (
            <div className="dz-subtabs">
              <button className={!extended ? 'on' : ''} onClick={() => setExtended(false)}>Compact</button>
              <button className={extended ? 'on' : ''} onClick={() => setExtended(true)}>Extended</button>
            </div>
          ) : <span className="muted" style={{ fontSize: 13 }}>{file}</span>}
          <span style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button>
          <button className="btn btn-sm" onClick={download}><Download size={14} /> {file.split('.').pop() === 'md' ? '.md' : `.${file.split('.').pop()}`}</button>
        </div>
        <pre className="dz-code">{text}</pre>
      </section>
    </div>
  )
}
