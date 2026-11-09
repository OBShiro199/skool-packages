import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Copy, Download } from 'lucide-react'
import { DESIGNS, type Design } from '../content/designs'
import { Markdown } from '../lib/markdown'
import { toast } from '../components/Toasts'

function download(d: Design) {
  const url = URL.createObjectURL(new Blob([d.source], { type: 'text/markdown' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'DESIGN.md' })
  a.click()
  URL.revokeObjectURL(url)
}

function DesignCard({ d }: { d: Design }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(d.source)
      setCopied(true)
      toast(`${d.name} copied. Paste it into Claude Code as DESIGN.md.`)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast('Could not copy. Use Download instead.')
    }
  }
  const [bg, ...rest] = d.swatches
  return (
    <article className="card design-card">
      <div className="design-preview" style={{ background: bg }}>
        <span className="design-aa" style={{ fontFamily: `${d.font}, system-ui, sans-serif`, color: rest[rest.length - 2] }}>Aa</span>
        <div className="design-swatches">
          {d.swatches.map((c) => <i key={c} style={{ background: c }} title={c} />)}
        </div>
      </div>
      <div className="design-body">
        <div className="row between wrap"><h3>{d.name}</h3><span className="chip">{d.font}</span></div>
        <p className="muted">{d.tagline}</p>
        <div className="row wrap" style={{ gap: 6 }}>{d.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
        <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
          <button className="btn btn-sm btn-primary" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy for Claude Code'}</button>
          <button className="btn btn-sm" onClick={() => download(d)}><Download size={14} /> Download DESIGN.md</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} /> {open ? 'Hide' : 'Read it'}
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="design-doc"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="design-doc-inner"><Markdown source={d.source} /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

export default function DesignsPage() {
  return (
    <div className="page">
      <header className="page-head">
        <span className="label">Designs</span>
        <h1>Make your app look expensive.</h1>
        <p>Ready-made design systems for Claude Code. Copy one, save it in your project as DESIGN.md, and tell Claude to follow it on every screen.</p>
      </header>
      <section className="card design-how">
        <span className="label">How to use one</span>
        <ol>
          <li>Click <b>Copy for Claude Code</b> or <b>Download DESIGN.md</b>.</li>
          <li>Save it as <code>DESIGN.md</code> in the root of your app's folder.</li>
          <li>Add one line to <code>CLAUDE.md</code>: <code>Follow DESIGN.md for every screen.</code></li>
        </ol>
      </section>
      <div className="design-grid">
        {DESIGNS.map((d) => <DesignCard key={d.slug} d={d} />)}
        <article className="card design-soon">
          <span className="label">More on the way</span>
          <p className="muted">New design systems land here as they are released. Want a particular style? Ask in the Skool community.</p>
        </article>
      </div>
    </div>
  )
}
