import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RotateCcw, Save } from 'lucide-react'
import { useStore, useUser } from '../lib/store'
import { getApp } from '../content/apps'
import { appStats } from '../lib/progress'
import { useTotals } from '../components/Shell'
import { Bar } from '../components/Ring'
import { toast } from '../components/Toasts'

const LABELS: Record<string, string> = { background: 'Background', enjoy: 'Would do daily', hours: 'Hours a week', claude: 'Claude Code experience', goal: 'MRR goal (12 months)' }
const VALUES: Record<string, string> = {
  sales: 'Sales or business development', content: 'Content, social or marketing', agency: 'Agency or freelance', ops: 'Operations, admin or finance', local: 'Ran a local business', other: 'Something else',
  post: 'Post content', talk: 'Message and call strangers', systems: 'Build systems', ai: 'Play with AI tools',
  never: 'Never opened a terminal', some: 'Tried it a few times', daily: 'Every day',
}

export default function AboutPage() {
  const user = useUser()!
  const update = useStore((s) => s.updateProfile)
  const resetApp = useStore((s) => s.resetApp)
  const resetOnb = useStore((s) => s.resetOnboarding)
  const { xp, level, streak } = useTotals()
  const nav = useNavigate()
  const [name, setName] = useState(user.profile.name)
  const a = user.onboarding?.answers ?? {}
  const fmt = (k: string, v: string) => (k === 'goal' ? `$${Number(v).toLocaleString()}/mo` : k === 'hours' ? `${v === '40' ? '20+' : `up to ${v}`} hours` : VALUES[v] ?? v)

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">About you</span>
        <h1>{user.profile.name}</h1>
        <p>Member since {new Date(user.profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {xp} XP · {level.name} · {streak} day streak</p>
      </header>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Profile</h2>
          <div className="stack" style={{ gap: 14 }}>
            <label className="field"><span>Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="field"><span>Skool email</span><input className="input" value={user.profile.email} readOnly /></label>
            <button className="btn btn-primary" style={{ justifySelf: 'start' }} onClick={() => { update({ name }); toast('Profile saved') }}><Save size={15} /> Save</button>
          </div>
        </section>

        <section className="card" style={{ padding: 20 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 18 }}>Your onboarding answers</h2>
            <button className="btn btn-sm" onClick={() => { resetOnb(); nav('/onboarding') }}><RotateCcw size={13} /> Retake</button>
          </div>
          <table className="mini-ledger">
            <tbody>
              {Object.keys(LABELS).map((k) => <tr key={k}><td>{LABELS[k]}</td><td>{a[k] ? fmt(k, a[k]) : '–'}</td></tr>)}
              <tr className="total"><td>Matched kit</td><td>{getApp(user.onboarding?.recommended)?.name ?? '–'}</td></tr>
            </tbody>
          </table>
        </section>
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Signed pledges</h2>
        {Object.keys(user.commitments).length === 0 && <p className="muted">No pledges yet. <Link to="/app/library">Pick a kit</Link>.</p>}
        <div className="grid cols-2">
          {Object.entries(user.commitments).map(([slug, c]) => {
            const app = getApp(slug)
            if (!app) return null
            const s = appStats(app, user.progress[slug]?.checked ?? {})
            return (
              <div key={slug} className="card pledge-card">
                <div className="row between"><b>{app.name}</b><span className="label">{new Date(c.signedAt).toLocaleDateString('en-GB')}</span></div>
                <div className="pledge-sig"><img src={c.signature} alt={`Signature of ${c.typedName}`} /></div>
                <span className="label">{c.typedName}</span>
                <div className="row between"><span className="muted" style={{ fontSize: 13 }}>{Math.round(s.pct * 100)}% built</span><Link to={`/app/build/${slug}`}>Open build</Link></div>
                <Bar pct={s.pct} />
                <button className="btn btn-sm btn-ghost" style={{ justifySelf: 'start', color: 'var(--loss)' }} onClick={() => { if (confirm(`Reset all ${app.name} progress? This clears every tick.`)) { resetApp(slug); toast('Progress reset') } }}>
                  <RotateCcw size={13} /> Reset progress
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
