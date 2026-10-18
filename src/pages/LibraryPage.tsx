import { useState } from 'react'
import { Lock, Search } from 'lucide-react'
import { APPS } from '../content/apps'
import { CATEGORIES, COMING_SOON } from '../content/catalog'
import type { CategoryId } from '../content/types'
import { useUser } from '../lib/store'
import { appStats } from '../lib/progress'
import { AppCard, kitEconomics } from '../components/AppCard'

export default function LibraryPage() {
  const user = useUser()!
  const [cat, setCat] = useState<CategoryId | 'all'>('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'match' | 'easiest' | 'fastest' | 'profit' | 'price'>('match')
  const needle = q.trim().toLowerCase()
  const matches = (s: string) => !needle || s.toLowerCase().includes(needle)

  const live = APPS.filter((a) => (cat === 'all' || a.category === cat) && matches(`${a.name} ${a.oneLiner} ${a.apis.map((x) => x.name).join(' ')}`))
  const soon = COMING_SOON.filter((a) => (cat === 'all' || a.category === cat) && matches(`${a.name} ${a.oneLiner}`))
  const total = APPS.length + COMING_SOON.length
  const rec = user.onboarding?.recommended
  // Your match first, then the rest in catalogue order.
  const ordered = [...live].sort((a, b) => {
    switch (sort) {
      case 'easiest': return a.difficulty - b.difficulty || a.buildHours - b.buildHours
      case 'fastest': return a.buildHours - b.buildHours
      case 'profit': return kitEconomics(b).profit - kitEconomics(a).profit
      case 'price': return b.price.monthly - a.price.monthly
      default: return (b.slug === rec ? 1 : 0) - (a.slug === rec ? 1 : 0)
    }
  })

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">Clone a Software App</span>
        <h1>Pick the app you will build and sell.</h1>
        <p>Each kit is a SaaS people already pay for every month. Open one to see what it does, what it costs to run and every step of the build.</p>
      </header>

      <div className="lib-filters">
        <div className="row wrap" style={{ gap: 6 }}>
          <button className={`pill ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>All kits</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={`pill ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>
        <div className="input-icon lib-search"><Search size={16} /><input className="input" placeholder="Search by name or API" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <section className="lib-section">
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 20 }}>Ready to build</h2>
            <span className="label">{live.length} of {total} kits</span>
          </div>
          <label className="row" style={{ gap: 8, fontSize: 14 }}>
            <span className="muted">Sort by</span>
            <select className="input sort-select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="match">Best match for you</option>
              <option value="easiest">Easiest to build</option>
              <option value="fastest">Fastest to build</option>
              <option value="profit">Most profit at 100 customers</option>
              <option value="price">Highest price</option>
            </select>
          </label>
        </div>
        {ordered.length ? (
          <div className="grid cols-3">
            {ordered.map((a, i) => (
              <AppCard key={a.slug} app={a} index={i} match={rec === a.slug}
                progress={user.commitments[a.slug] ? appStats(a, user.progress[a.slug]?.checked ?? {}).pct : undefined} />
            ))}
          </div>
        ) : (
          <p className="muted">No ready kits match. Try another category.</p>
        )}
      </section>

      {soon.length > 0 && (
        <section className="lib-section">
          <div className="row between" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 20 }}>Dropping soon</h2>
            <span className="label">New kits land in the Skool community first</span>
          </div>
          <div className="soon-list">
            {soon.map((a) => (
              <div key={a.name} className="soon-row">
                <Lock size={14} className="muted" />
                <b>{a.name}</b>
                <span className="muted">{a.oneLiner}</span>
                <span className="label">{CATEGORIES.find((c) => c.id === a.category)?.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
