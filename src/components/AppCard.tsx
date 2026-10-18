import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Clock, Lock, Sparkles } from 'lucide-react'
import type { AppDef } from '../content/types'
import { CATEGORIES } from '../content/catalog'
import { AppArt } from './AppArt'
import { Bar } from './Ring'
import { compute, fallbackModel } from './CostCalculator'

export function Difficulty({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="diff" title={['Starter', 'Intermediate', 'Advanced'][n - 1]}>
      {[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}
      <span className="label" style={{ marginLeft: 6 }}>{['Starter', 'Intermediate', 'Advanced'][n - 1]}</span>
    </span>
  )
}

export function AppCard({ app, match, progress, index = 0 }: { app: AppDef; match?: boolean; progress?: number; index?: number }) {
  const cat = CATEGORIES.find((c) => c.id === app.category)
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.35 }}>
      <Link to={`/app/library/${app.slug}`} className="app-card">
        <div className="app-card-art">
          <AppArt app={app} />
          <div className="app-card-badges">
            {match && <span className="chip chip-signal"><Sparkles size={11} /> Your match</span>}
            {app.status === 'full' ? <span className="chip chip-money">Full playbook</span> : <span className="chip">Preview</span>}
          </div>
        </div>
        <div className="app-card-body">
          <div className="row between">
            <span className="label">{cat?.label}</span>
            <span className="mono" style={{ fontSize: 13 }}><b>${app.price.monthly}</b><span className="muted">/mo</span></span>
          </div>
          <h3>{app.name}</h3>
          <p className="muted">{app.oneLiner}</p>
          <div className="row wrap" style={{ gap: 6 }}>
            {app.apis.slice(0, 4).map((a) => <span key={a.name} className="chip">{a.name}</span>)}
          </div>
          <Economics app={app} />
          <div className="row between" style={{ marginTop: 'auto' }}>
            <Difficulty n={app.difficulty} />
            <span className="label row" style={{ gap: 4 }}><Clock size={12} /> {app.buildHours}h</span>
          </div>
          {progress !== undefined && (
            <div className="stack" style={{ gap: 4 }}>
              <div className="row between"><span className="label">In progress</span><span className="mono" style={{ fontSize: 12 }}>{Math.round(progress * 100)}%</span></div>
              <Bar pct={progress} />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

export function LockedCard({ name, oneLiner, label }: { name: string; oneLiner: string; label: string }) {
  return (
    <div className="app-card locked">
      <div className="locked-art"><Lock size={18} /><span className="label">Dropping soon</span></div>
      <div className="app-card-body">
        <span className="label">{label}</span>
        <h3>{name}</h3>
        <p className="muted">{oneLiner}</p>
      </div>
    </div>
  )
}

/** At 100 customers: monthly profit and gross margin, from the kit's cost model. */
export function kitEconomics(app: AppDef) {
  const model = app.costs ?? fallbackModel(app)
  const plan = model.plans.find((p) => p.interval === 'month') ?? model.plans[0]
  const r = compute(model, 100, model.usage.default, 0, plan.id)
  return { profit: r.profit, margin: r.margin, perCustomer: r.perCustomer, researched: !!app.costs }
}

function Economics({ app }: { app: AppDef }) {
  const e = kitEconomics(app)
  return (
    <div className="econ">
      <div><span className="label">Profit at 100 customers</span><b className="money">${Math.round(e.profit).toLocaleString()}/mo</b></div>
      <div><span className="label">Margin</span><b>{Math.round(e.margin * 100)}%</b></div>
    </div>
  )
}
