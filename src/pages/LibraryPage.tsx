import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { APPS } from '../content/apps'
import { CATEGORIES, COMING_SOON, CORE_STACK } from '../content/catalog'
import type { CategoryId } from '../content/types'
import { useUser } from '../lib/store'
import { appStats } from '../lib/progress'
import { AppCard, LockedCard } from '../components/AppCard'

export default function LibraryPage() {
  const user = useUser()!
  const [cat, setCat] = useState<CategoryId | 'all'>('all')
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()

  const matches = (s: string) => !needle || s.toLowerCase().includes(needle)
  const apps = useMemo(
    () => APPS.filter((a) => (cat === 'all' || a.category === cat) && matches(`${a.name} ${a.oneLiner} ${a.apis.map((x) => x.name).join(' ')}`)),
    [cat, needle], // eslint-disable-line
  )
  const soon = COMING_SOON.filter((a) => (cat === 'all' || a.category === cat) && matches(`${a.name} ${a.oneLiner}`))
  const total = APPS.length + COMING_SOON.length

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">Clone a Software App · {total} kits</span>
        <h1>Pick the app you will build and sell.</h1>
        <p>Every kit is a SaaS people already pay for monthly. You get the build PRD, the design PRD, the SQL, every API key step and a marketing plan written for that one app. Claude Code writes the code.</p>
        <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
          <span className="label" style={{ marginRight: 4 }}>Every kit uses</span>
          {CORE_STACK.map((t) => <span key={t.name} className="chip">{t.name} · {t.job}</span>)}
        </div>
      </header>

      <div className="lib-filters">
        <div className="row wrap" style={{ gap: 6 }}>
          <button className={`pill ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>All <span className="mono">{total}</span></button>
          {CATEGORIES.map((c) => {
            const n = APPS.filter((a) => a.category === c.id).length + COMING_SOON.filter((a) => a.category === c.id).length
            return <button key={c.id} className={`pill ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label} <span className="mono">{n}</span></button>
          })}
        </div>
        <div className="input-icon lib-search"><Search size={16} /><input className="input" placeholder="Search apps or APIs (Firecrawl, Stripe…)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      {CATEGORIES.filter((c) => cat === 'all' || c.id === cat).map((c) => {
        const live = apps.filter((a) => a.category === c.id)
        const locked = soon.filter((a) => a.category === c.id)
        if (!live.length && !locked.length) return null
        return (
          <section key={c.id} className="lib-section">
            <div className="row between wrap" style={{ marginBottom: 14 }}>
              <div><h2 style={{ fontSize: 20 }}>{c.label}</h2><p className="muted" style={{ fontSize: 14 }}>{c.blurb}</p></div>
              <span className="label">{live.length} live · {locked.length} soon</span>
            </div>
            <div className="grid cols-3">
              {live.map((a, i) => (
                <AppCard key={a.slug} app={a} index={i} match={user.onboarding?.recommended === a.slug}
                  progress={user.commitments[a.slug] ? appStats(a, user.progress[a.slug]?.checked ?? {}).pct : undefined} />
              ))}
              {locked.map((a) => <LockedCard key={a.name} name={a.name} oneLiner={a.oneLiner} label={c.label} />)}
            </div>
          </section>
        )
      })}
      {!apps.length && !soon.length && <p className="muted">Nothing matches “{q}”.</p>}
    </div>
  )
}
