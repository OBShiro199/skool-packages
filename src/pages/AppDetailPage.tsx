import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Clock, ExternalLink, Lock, Sparkles } from 'lucide-react'
import { getApp, getPhases } from '../content/apps'
import { CATEGORIES, CORE_STACK } from '../content/catalog'
import { useUser } from '../lib/store'
import { fmtMinutes } from '../lib/progress'
import { AppArt } from '../components/AppArt'
import { Difficulty } from '../components/AppCard'
import { CommitModal } from '../components/CommitModal'
import { PhaseIcon } from '../components/PhaseIcon'
import { CostCalculator } from '../components/CostCalculator'

export default function AppDetailPage() {
  const { slug } = useParams()
  const app = getApp(slug)
  const user = useUser()!
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  if (!app) return <Navigate to="/app/library" replace />
  const phases = getPhases(app)
  const committed = !!user.commitments[app.slug]
  const cat = CATEGORIES.find((c) => c.id === app.category)
  const totalTasks = phases.reduce((n, p) => n + p.tasks.length, 0)
  const totalMin = phases.reduce((n, p) => n + p.tasks.reduce((m, t) => m + t.minutes, 0), 0)
  const prds = phases.flatMap((p) => p.tasks.flatMap((t) => t.blocks)).filter((b) => b.type === 'doc').length
  const prompts = phases.flatMap((p) => p.tasks.flatMap((t) => t.blocks)).filter((b) => b.type === 'prompt').length

  const start = () => (committed ? nav(`/app/build/${app.slug}`) : setOpen(true))

  return (
    <div className="page">
      <Link to="/app/library" className="btn btn-sm btn-ghost" style={{ marginBottom: 16 }}><ArrowLeft size={14} /> All kits</Link>

      <section className="detail-hero">
        <motion.div className="detail-art" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <AppArt app={app} height={300} />
        </motion.div>
        <div className="detail-info">
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="chip">{cat?.label}</span>
            {app.status === 'full' ? <span className="chip chip-money">Full playbook</span> : <span className="chip">Preview playbook</span>}
            {user.onboarding?.recommended === app.slug && <span className="chip chip-signal"><Sparkles size={11} /> Your match</span>}
          </div>
          <h1 className="detail-title">{app.name}</h1>
          <p className="detail-tag">{app.tagline}</p>
          <p className="muted" style={{ fontSize: 16 }}>{app.oneLiner}</p>
          <div className="detail-stats">
            <div><span className="label">Price you charge</span><b className="mono">${app.price.monthly}/mo</b><small>{app.price.trialDays}-day free trial</small></div>
            <div><span className="label">Build time</span><b className="mono">~{app.buildHours}h</b><small>{fmtMinutes(totalMin)} of steps</small></div>
            <div><span className="label">Playbook</span><b className="mono">{totalTasks} steps</b><small>{prds} docs · {prompts} prompts</small></div>
          </div>
          <Difficulty n={app.difficulty} />
          <div className="row wrap" style={{ gap: 10, marginTop: 6 }}>
            <button className="btn btn-primary btn-lg" onClick={start}>
              {committed ? <>Continue building <ArrowRight size={16} /></> : <><Lock size={15} /> Unlock and start building</>}
            </button>
          </div>
          {!committed && <p className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>You sign a short pledge to market and sell it before the playbook opens.</p>}
        </div>
      </section>

      <div className="detail-grid">
        <section className="card detail-sec">
          <span className="label">Why it sells</span>
          <p style={{ fontSize: 16 }}>{app.whyItSells}</p>
          <span className="label" style={{ marginTop: 10 }}>Ideal for</span>
          <p className="muted">{app.idealFor}</p>
          <span className="label" style={{ marginTop: 10 }}>What it does</span>
          <ul className="feat-list">
            {app.features.map((f) => <li key={f}><Check size={14} /> {f}</li>)}
          </ul>
        </section>

        <section className="card detail-sec">
          <span className="label">Tech stack</span>
          <div className="stack-list">
            {CORE_STACK.map((t) => (
              <div key={t.name} className="stack-row"><b>{t.name}</b><span className="muted">{t.job}</span><span className="chip">core</span></div>
            ))}
            {app.apis.map((a) => (
              <div key={a.name} className="stack-row">
                <b>{a.name}</b><span className="muted">{a.job}</span>
                <a href={a.signupUrl} target="_blank" rel="noreferrer" className="chip chip-signal">API <ExternalLink size={10} /></a>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ marginTop: 32 }}>
        <div className="row between wrap" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 22 }}>The playbook</h2>
          <span className="label">{phases.length} phases · {totalTasks} steps</span>
        </div>
        <div className="roadmap">
          {phases.map((p, i) => (
            <motion.div key={p.id} className="roadmap-item" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
              <span className="roadmap-n mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="roadmap-icon"><PhaseIcon icon={p.icon} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{p.title}</b>
                <p className="muted" style={{ fontSize: 13.5 }}>{p.goal}</p>
              </div>
              <span className="label row" style={{ gap: 4 }}><Clock size={12} /> {fmtMinutes(p.tasks.reduce((m, t) => m + t.minutes, 0))}</span>
              <span className="chip">{p.tasks.length} steps</span>
              {!committed && <Lock size={14} className="muted" />}
            </motion.div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <div className="row between wrap" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 22 }}>The numbers</h2>
          <span className="label">Running costs, profit and margin</span>
        </div>
        <CostCalculator app={app} />
      </section>

      <CommitModal app={app} open={open} onClose={() => setOpen(false)} onDone={() => nav(`/app/build/${app.slug}`)} />
    </div>
  )
}
