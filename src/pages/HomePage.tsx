import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Flame, Sparkles, Target, Trophy } from 'lucide-react'
import { useUser } from '../lib/store'
import { getApp } from '../content/apps'
import { LEVELS, fmtMinutes, taskStats } from '../lib/progress'
import { useTotals } from '../components/Shell'
import { AppArt } from '../components/AppArt'
import { AppCard } from '../components/AppCard'
import { Bar, Ring } from '../components/Ring'
import { PhaseIcon } from '../components/PhaseIcon'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
}

export default function HomePage() {
  const user = useUser()!
  const { xp, builds, level, streak } = useTotals()
  const active = builds.find((b) => b.app.slug === user.activeApp) ?? builds[0]
  const rec = getApp(user.onboarding?.recommended)
  const goal = Number(user.onboarding?.answers.goal ?? 10000)

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
  const customers = active ? Math.ceil(goal / active.app.price.monthly) : Math.ceil(goal / 49)

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h1>{greeting()}, {user.profile.name}.</h1>
        <p>{active ? `${active.app.name} is ${Math.round(active.s.pct * 100)}% built. One step today keeps the streak alive.` : 'Pick a kit and sign your pledge. The first phase takes about an hour.'}</p>
      </header>

      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <span className="label">Level</span>
          <div className="row"><Ring pct={level.pct} size={44} stroke={4}><Trophy size={15} /></Ring><div><div className="v" style={{ fontSize: 20 }}>{level.name}</div><span className="muted mono" style={{ fontSize: 12 }}>L{level.index + 1} of {LEVELS.length}</span></div></div>
        </div>
        <div className="card stat"><span className="label">XP earned</span><div className="v">{xp.toLocaleString()}</div><span className="muted mono" style={{ fontSize: 12 }}>{level.next ? `${level.ceil - xp} XP to ${level.next}` : 'Max level'}</span></div>
        <div className="card stat"><span className="label">Streak</span><div className="v row" style={{ gap: 8 }}><Flame size={22} color={streak ? 'var(--amber)' : 'var(--muted)'} />{streak} days</div><span className="muted mono" style={{ fontSize: 12 }}>{user.activeDays.length} active days total</span></div>
        <div className="card stat"><span className="label">MRR target</span><div className="v money">${goal.toLocaleString()}</div><span className="muted mono" style={{ fontSize: 12 }}>≈ {customers} customers{active ? ` at $${active.app.price.monthly}` : ''}</span></div>
      </div>

      {active ? (
        <motion.section className="card continue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="continue-art"><AppArt app={active.app} height="auto" /></div>
          <div className="continue-body">
            <span className="label">Continue building</span>
            <h2>{active.app.name}</h2>
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
          <div className="continue-art"><AppArt app={rec} height="auto" /></div>
          <div className="continue-body">
            <span className="label" style={{ color: 'var(--signal)' }}><Sparkles size={12} style={{ verticalAlign: -1 }} /> Your match from onboarding</span>
            <h2>{rec.name}</h2>
            <p className="muted">{rec.oneLiner}</p>
            <p style={{ fontSize: 14 }}>{rec.whyItSells}</p>
            <Link to={`/app/library/${rec.slug}`} className="btn btn-primary" style={{ justifySelf: 'start' }}>See the kit <ArrowRight size={15} /></Link>
          </div>
        </section>
      ) : null}

      <div className="grid cols-2" style={{ marginTop: 20 }}>
        <section className="card" style={{ padding: 18 }}>
          <div className="row between" style={{ marginBottom: 12 }}><span className="label">Activity · last 5 weeks</span><span className="label">{days.filter((d) => activeSet.has(d)).length} days</span></div>
          <div className="heat">
            {days.map((d) => <i key={d} title={d} className={activeSet.has(d) ? 'on' : ''} />)}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>A day counts when you tick at least one item. Founders who tick something 5 days a week finish the build in under a month.</p>
        </section>
        <section className="card" style={{ padding: 18 }}>
          <div className="row" style={{ marginBottom: 12, gap: 8 }}><Target size={15} /><span className="label">Your weekly targets once live</span></div>
          <table className="mini-ledger">
            <tbody>
              <tr><td>Customers needed for ${goal.toLocaleString()} MRR</td><td className="mono">{customers}</td></tr>
              <tr><td>Trials at 25% trial to paid</td><td className="mono">{customers * 4}</td></tr>
              <tr><td>Demos at 40% demo to trial</td><td className="mono">{customers * 10}</td></tr>
              <tr><td>Outreach touches at 3% reply</td><td className="mono">{(customers * 10 * 34).toLocaleString()}</td></tr>
              <tr className="total"><td>Touches per day over 12 months</td><td className="mono">{Math.ceil((customers * 10 * 34) / 365)}</td></tr>
            </tbody>
          </table>
        </section>
      </div>

      {builds.length === 0 && rec && (
        <section style={{ marginTop: 28 }}>
          <div className="row between" style={{ marginBottom: 12 }}><h2 style={{ fontSize: 20 }}>Start here</h2><Link to="/app/library">All kits <ArrowRight size={13} style={{ verticalAlign: -2 }} /></Link></div>
          <div className="grid cols-3"><AppCard app={rec} match /></div>
        </section>
      )}
    </div>
  )
}
