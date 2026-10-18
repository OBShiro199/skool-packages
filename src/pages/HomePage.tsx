import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useUser } from '../lib/store'
import { getApp } from '../content/apps'
import { fmtMinutes, taskStats } from '../lib/progress'
import { useTotals } from '../components/Shell'
import { AppCard } from '../components/AppCard'
import { Bar } from '../components/Ring'
import { PhaseIcon } from '../components/PhaseIcon'
import { KitLogo } from '../components/KitLogo'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
}

export default function HomePage() {
  const user = useUser()!
  const { builds } = useTotals()
  const active = builds.find((b) => b.app.slug === user.activeApp) ?? builds[0]
  const rec = getApp(user.onboarding?.recommended)

  const nextTask = active
    ? (() => {
        const p = active.s.phases[active.s.currentPhase]
        const t = p.tasks.find((x) => !taskStats(x, user.progress[active.app.slug]?.checked ?? {}).complete)
        return t ? { p, t } : null
      })()
    : null

  // Last 35 days activity grid.
  const days = Array.from({ length: 35 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (34 - i))
    return d.toISOString().slice(0, 10)
  })
  const activeSet = new Set(user.activeDays)
  const activeCount = days.filter((d) => activeSet.has(d)).length

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h1>{greeting()}, {user.profile.name}.</h1>
        <p>{active ? `${active.app.name} is ${Math.round(active.s.pct * 100)}% built.` : 'Pick a kit and sign your pledge. The first phase takes about an hour.'}</p>
      </header>

      {active ? (
        <motion.section className="card continue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="continue-body">
            <span className="label">Continue building</span>
            <h2 className="kit-name"><KitLogo app={active.app} size={24} />{active.app.name}</h2>
            <div className="row between"><span className="muted" style={{ fontSize: 14 }}>{active.s.done} of {active.s.total} ticks · {fmtMinutes(active.s.minutesLeft)} left</span><span className="mono" style={{ fontWeight: 600 }}>{Math.round(active.s.pct * 100)}%</span></div>
            <Bar pct={active.s.pct} lg />
            <div className="phase-dots">
              {active.s.phases.map((p, i) => (
                <span key={p.id} title={p.label} className={`pd ${active.s.perPhase[i].complete ? 'done' : i === active.s.currentPhase ? 'cur' : ''}`}><PhaseIcon icon={p.icon} size={12} /></span>
              ))}
            </div>
            {nextTask && (
              <div className="next-up">
                <span className="label">Up next · {nextTask.p.label}</span>
                <b>{nextTask.t.title}</b>
                <span className="muted" style={{ fontSize: 13.5 }}>{nextTask.t.outcome} · {fmtMinutes(nextTask.t.minutes)} · +{nextTask.t.xp} XP</span>
              </div>
            )}
            <Link to={`/app/build/${active.app.slug}?tab=${active.s.phases[active.s.currentPhase].id}`} className="btn btn-primary" style={{ justifySelf: 'start' }}>Pick up where you left off <ArrowRight size={15} /></Link>
          </div>
        </motion.section>
      ) : rec ? (
        <section className="card continue">
          <div className="continue-body">
            <span className="label" style={{ color: 'var(--signal)' }}>Your match from onboarding</span>
            <h2 className="kit-name"><KitLogo app={rec} size={24} />{rec.name}</h2>
            <p className="muted">{rec.oneLiner}</p>
            <p style={{ fontSize: 14 }}>{rec.whyItSells}</p>
            <Link to={`/app/library/${rec.slug}`} className="btn btn-primary" style={{ justifySelf: 'start' }}>See the kit <ArrowRight size={15} /></Link>
          </div>
        </section>
      ) : null}

      <section className="card" style={{ padding: 18, marginTop: 20 }}>
        <div className="row between" style={{ marginBottom: 12 }}><span className="label">Activity · last 5 weeks</span><span className="label">{activeCount} active {activeCount === 1 ? 'day' : 'days'}</span></div>
        <div className="heat">
          {days.map((d, i) => <i key={d} title={new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} className={`${activeSet.has(d) ? 'on' : ''} ${i === days.length - 1 ? 'today' : ''}`} />)}
        </div>
        <div className="heat-axis"><span className="label">5 weeks ago</span><span className="label">Today</span></div>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>A day counts when you tick at least one item. Founders who tick something 5 days a week finish the build in under a month.</p>
      </section>

      {builds.length === 0 && rec && (
        <section style={{ marginTop: 28 }}>
          <div className="row between" style={{ marginBottom: 12 }}><h2 style={{ fontSize: 20 }}>Start here</h2><Link to="/app/library">All kits <ArrowRight size={13} style={{ verticalAlign: -2 }} /></Link></div>
          <div className="grid cols-3"><AppCard app={rec} match /></div>
        </section>
      )}
    </div>
  )
}
