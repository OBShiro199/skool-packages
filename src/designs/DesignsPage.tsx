import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { loadIndex, type DesignSummary } from './data'
import { ScrollPreview, SiteLogo } from './Preview'
import { SaveDesign } from './SaveButton'
import { useUser } from '../lib/store'
import '../styles/designs.css'

function Card({ d, i }: { d: DesignSummary; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}>
      <Link
        to={d.slug}
        className="dz-card"
      >
        <div className="dz-tile"><ScrollPreview slug={d.slug} height={d.preview_h} /><SaveDesign slug={d.slug} name={d.name} /></div>
        <div className="dz-meta">
          <SiteLogo name={d.name} logo={d.logo} />
          <div className="dz-meta-text">
            <b>{d.name}</b>
            <span>{d.vibe}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function DesignsPage() {
  const [all, setAll] = useState<DesignSummary[] | null>(null)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const cat = params.get('c') ?? 'All'
  const set = (k: string, v: string, dflt: string) => setParams((p) => { if (v === dflt) p.delete(k); else p.set(k, v); return p }, { replace: true })

  useEffect(() => { loadIndex().then(setAll).catch((e) => setError(e.message)) }, [])

  const savedSlugs = useUser()?.savedDesigns ?? []
  const cats = useMemo(() => ['All', 'Saved', ...[...new Set((all ?? []).map((d) => d.category))].sort()], [all])
  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    let l = (all ?? []).filter((d) => (cat === 'All' || (cat === 'Saved' ? savedSlugs.includes(d.slug) : d.category === cat)) && (!n || `${d.name} ${d.vibe} ${d.tags.join(' ')} ${d.category}`.toLowerCase().includes(n)))
    return l
  }, [all, q, cat, savedSlugs])

  return (
    <div className="page dz-page">
      <header className="page-head">
        <span className="label">Designs</span>
        <h1>Steal like a designer.</h1>
        <p>{all ? `${all.length} design systems` : 'Design systems'} measured from the best-looking sites on the web. Open one, copy its DESIGN.md into your project, and Claude Code builds in that style.</p>
      </header>

      <div className="dz-toolbar">
        <div className="input-icon dz-search"><Search size={15} /><input className="input" placeholder="Search: dark, editorial, fintech…" value={q} onChange={(e) => set('q', e.target.value, '')} /></div>
      </div>
      <div className="dz-cats">
        {cats.map((c) => <button key={c} className={`dz-cat ${cat === c ? 'on' : ''}`} onClick={() => set('c', c, 'All')}>{c}</button>)}
      </div>

      {error ? (
        <div className="dz-empty"><b>Designs did not load</b><p className="muted">{error}. Refresh to try again.</p></div>
      ) : !all ? (
        <div className="dz-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="dz-skel" />)}</div>
      ) : list.length ? (
        <div className="dz-grid">{list.map((d, i) => <Card key={d.slug} d={d} i={i} />)}</div>
      ) : (
        <div className="dz-empty"><b>No designs match</b><p className="muted">Try another word or category.</p></div>
      )}
    </div>
  )
}
