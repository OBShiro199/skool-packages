import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, RotateCcw, Save } from 'lucide-react'
import { api, ApiError } from '../leads/api'
import { cloudEnabled } from '../lib/cloud'
import { handle, useStore, useUser } from '../lib/store'
import { getApp } from '../content/apps'
import { appStats } from '../lib/progress'
import { useTotals } from '../components/Shell'
import { Bar } from '../components/Ring'
import { toast } from '../components/Toasts'

export default function AboutPage() {
  const user = useUser()!
  const update = useStore((s) => s.updateProfile)
  const resetApp = useStore((s) => s.resetApp)
  const setTourDone = useStore((s) => s.setTourDone)
  const { xp, level, streak } = useTotals()
  const nav = useNavigate()
  const [name, setName] = useState(user.profile.name)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const changePw = () => {
    if (pw.next.length < 8) return toast('Choose a new password of at least 8 characters.')
    setPwBusy(true)
    api.changePassword(pw.current, pw.next)
      .then(() => { setPw({ current: '', next: '' }); toast('Password changed') })
      .catch((e) => toast(e instanceof ApiError ? e.message : 'Could not change your password.'))
      .finally(() => setPwBusy(false))
  }

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
            <label className="field"><span>Skool handle</span><input className="input" value={handle(user.profile)} readOnly /></label>
            {user.profile.email && <label className="field"><span>Email (your login)</span><input className="input" value={user.profile.email} readOnly /></label>}
            <button className="btn btn-primary" style={{ justifySelf: 'start' }} onClick={() => { update({ name }); toast('Profile saved') }}><Save size={15} /> Save</button>
          </div>
        </section>

        {cloudEnabled && (
          <section className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>Password</h2>
            <div className="stack" style={{ gap: 14 }}>
              <label className="field"><span>Current password</span><input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
              <label className="field"><span>New password</span><input className="input" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
              <button className="btn" style={{ justifySelf: 'start' }} disabled={pwBusy || !pw.current || !pw.next} onClick={changePw}><KeyRound size={15} /> Change password</button>
            </div>
          </section>
        )}

        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Dashboard tour</h2>
          <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>A quick walk through everything the vault can do.</p>
          <button className="btn btn-sm" onClick={() => { setTourDone(false); nav('/app') }}><RotateCcw size={13} /> Replay the tour</button>
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
