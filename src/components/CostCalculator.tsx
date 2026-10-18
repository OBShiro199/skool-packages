import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Info } from 'lucide-react'
import type { AppDef, CostLine, CostModel } from '../content/types'

// Stripe standard card pricing + Stripe Billing, applied per charge.
const STRIPE_PCT = 0.029
const STRIPE_FIXED = 0.3
const BILLING_PCT = 0.007

const money = (n: number, dp = 0) =>
  `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`

/** Fallback model for kits without researched costs yet: core stack only. */
export function fallbackModel(app: AppDef): CostModel {
  return {
    usage: { label: 'Usage per customer', unit: 'units', default: 1, min: 0, max: 10, step: 1 },
    plans: [{ id: 'monthly', name: 'Monthly', price: app.price.monthly, interval: 'month', includes: 'Everything' }],
    lines: [
      { name: 'Supabase Pro', vendor: 'Supabase', kind: 'fixed', amount: 25, freeTier: 'Free plan: 500 MB DB, 50,000 MAU, pauses after 1 week idle', note: 'Upgrade at your first paying customer so the project never pauses.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, freeTier: 'Hobby: $0', note: '$20 per member per month including $20 usage credit.', url: 'https://vercel.com/pricing' },
      { name: 'Resend', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 300, amount: 20 }], freeTier: '3,000 emails a month, 100 a day', note: 'Pro at $20/mo for 50,000 emails once you pass the free tier.', url: 'https://resend.com/pricing' },
    ],
    notes: ['Researched API costs for this kit are on the way. These are the core stack costs only.'],
  }
}

function lineCost(l: CostLine, customers: number, usage: number) {
  if (l.kind === 'fixed') {
    let amt = l.amount
    for (const s of l.steps ?? []) if (customers >= s.fromCustomers) amt = s.amount
    return amt
  }
  if (l.kind === 'perCustomer') return l.amount * customers
  return l.amount * usage * customers
}

export function compute(model: CostModel, customers: number, usage: number, annualShare: number, planId: string) {
  const monthly = model.plans.filter((p) => p.interval === 'month')
  const annual = model.plans.filter((p) => p.interval === 'year')
  const mPlan = monthly.find((p) => p.id === planId) ?? monthly[0] ?? model.plans[0]
  // Pair an annual plan with the chosen monthly plan by position.
  const aPlan = annual[Math.max(0, monthly.indexOf(mPlan))] ?? annual[0]
  const share = aPlan ? annualShare : 0
  const mrrPer = (1 - share) * mPlan.price + share * (aPlan ? aPlan.price / 12 : 0)
  const mrr = mrrPer * customers
  const stripe =
    customers * (1 - share) * (mPlan.price * (STRIPE_PCT + BILLING_PCT) + STRIPE_FIXED) +
    (aPlan ? (customers * share * (aPlan.price * (STRIPE_PCT + BILLING_PCT) + STRIPE_FIXED)) / 12 : 0)
  const lines = model.lines.map((l) => ({ l, cost: lineCost(l, customers, usage) }))
  const tools = lines.reduce((n, x) => n + x.cost, 0)
  const costs = tools + stripe
  return { mrr, stripe, lines, tools, costs, profit: mrr - costs, margin: mrr > 0 ? (mrr - costs) / mrr : 0, perCustomer: customers ? costs / customers : 0, mPlan, aPlan }
}

const CUSTOMER_STOPS = [0, 1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000]

export function CostCalculator({ app }: { app: AppDef }) {
  const model = app.costs ?? fallbackModel(app)
  const monthlyPlans = model.plans.filter((p) => p.interval === 'month')
  const hasAnnual = model.plans.some((p) => p.interval === 'year')
  const [stop, setStop] = useState(CUSTOMER_STOPS.indexOf(100))
  const [usage, setUsage] = useState(model.usage.default)
  const [annualPct, setAnnualPct] = useState(hasAnnual ? 30 : 0)
  const [planId, setPlanId] = useState(monthlyPlans[0]?.id ?? model.plans[0].id)
  const customers = CUSTOMER_STOPS[stop]
  const cap = model.plans.find((p) => p.id === planId)?.usageCap
  const effUsage = cap !== undefined ? Math.min(usage, cap) : usage
  const r = compute(model, customers, effUsage, annualPct / 100, planId)

  const breakEven = useMemo(() => {
    for (let c = 1; c <= 5000; c++) if (compute(model, c, effUsage, annualPct / 100, planId).profit >= 0) return c
    return null
  }, [model, effUsage, annualPct, planId])

  return (
    <div className="costs">
      <div className="costs-controls card">
        <div className="slider-row">
          <div className="row between"><span className="label">Paying customers</span><b className="mono">{customers.toLocaleString()}</b></div>
          <input type="range" min={0} max={CUSTOMER_STOPS.length - 1} value={stop} onChange={(e) => setStop(+e.target.value)} aria-label="Paying customers" />
        </div>
        <div className="slider-row">
          <div className="row between"><span className="label">{model.usage.label}</span><b className="mono">{effUsage.toLocaleString()} {model.usage.unit}</b></div>
          <input type="range" min={model.usage.min} max={cap ?? model.usage.max} step={model.usage.step} value={effUsage} onChange={(e) => setUsage(+e.target.value)} aria-label={model.usage.label} />
          {cap !== undefined && <span className="muted" style={{ fontSize: 12.5 }}>This plan includes up to {cap.toLocaleString()} {model.usage.unit} a month.</span>}
        </div>
        {hasAnnual && (
          <div className="slider-row">
            <div className="row between"><span className="label">Customers on annual</span><b className="mono">{annualPct}%</b></div>
            <input type="range" min={0} max={100} step={5} value={annualPct} onChange={(e) => setAnnualPct(+e.target.value)} aria-label="Share of customers on annual plans" />
          </div>
        )}
        {monthlyPlans.length > 1 && (
          <div className="slider-row">
            <span className="label">Plan</span>
            <div className="row wrap" style={{ gap: 6 }}>
              {monthlyPlans.map((p) => (
                <button key={p.id} className={`pill ${planId === p.id ? 'on' : ''}`} onClick={() => setPlanId(p.id)}>{p.name} <span className="mono">${p.price}</span></button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid cols-4">
        <div className="card stat"><span className="label">MRR</span><div className="v">{money(r.mrr)}</div><span className="muted mono" style={{ fontSize: 12 }}>{money(r.mrr * 12)} a year</span></div>
        <div className="card stat"><span className="label">Running costs / mo</span><div className="v">{money(r.costs)}</div><span className="muted mono" style={{ fontSize: 12 }}>{money(r.perCustomer, 2)} per customer</span></div>
        <div className="card stat"><span className="label">Profit / mo</span><div className={`v ${r.profit >= 0 ? 'money' : 'loss'}`}>{money(r.profit)}</div><span className="muted mono" style={{ fontSize: 12 }}>{money(r.profit * 12)} a year</span></div>
        <div className="card stat"><span className="label">Gross margin</span><div className={`v ${r.margin >= 0.75 ? 'money' : r.margin < 0 ? 'loss' : ''}`}>{customers ? `${Math.round(r.margin * 100)}%` : '–'}</div><span className="muted mono" style={{ fontSize: 12 }}>{breakEven ? `Break-even at ${breakEven} customer${breakEven === 1 ? '' : 's'}` : 'No break-even under 5,000'}</span></div>
      </div>

      <ProfitChart model={model} usage={effUsage} annualShare={annualPct / 100} planId={planId} current={customers} />

      <div className="blk-table">
        <table>
          <thead><tr><th>Tool</th><th>How it is charged</th><th>Free tier</th><th style={{ textAlign: 'right' }}>At {customers.toLocaleString()} customers</th></tr></thead>
          <tbody>
            {r.lines.map(({ l, cost }, li) => (
              <tr key={`${l.name}-${li}`}>
                <td>
                  <b>{l.name}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>{l.vendor}{l.url && <> · <a href={l.url} target="_blank" rel="noreferrer">pricing <ExternalLink size={10} /></a></>}</div>
                </td>
                <td>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {l.kind === 'fixed' ? `${money(l.amount, l.amount % 1 ? 2 : 0)}/mo` : l.kind === 'perCustomer' ? `${money(l.amount, 2)} per customer/mo` : `${money(l.amount, l.amount < 0.1 ? 4 : 2)} per ${model.usage.unit.replace(/s$/, '')}`}
                  </span>
                  {l.steps?.length ? <div className="muted" style={{ fontSize: 12 }}>{l.steps.map((s) => `${money(s.amount)} from ${s.fromCustomers} customers`).join(' · ')}</div> : null}
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{l.note}</div>
                </td>
                <td style={{ fontSize: 13 }}>{l.freeTier ?? '–'}</td>
                <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{money(cost, cost < 10 && cost > 0 ? 2 : 0)}</td>
              </tr>
            ))}
            <tr>
              <td><b>Stripe fees</b><div className="muted" style={{ fontSize: 12.5 }}>Stripe</div></td>
              <td><span className="mono" style={{ fontSize: 13 }}>2.9% + $0.30 per charge, +0.7% Billing</span><div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>US card rates. Annual plans pay one fee a year, shown per month here.</div></td>
              <td style={{ fontSize: 13 }}>No monthly fee</td>
              <td className="mono" style={{ textAlign: 'right' }}>{money(r.stripe, r.stripe < 10 && r.stripe > 0 ? 2 : 0)}</td>
            </tr>
            <tr className="costs-total"><td colSpan={3}><b>Total running costs per month</b></td><td className="mono" style={{ textAlign: 'right' }}><b>{money(r.costs)}</b></td></tr>
          </tbody>
        </table>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 16 }}>
          <span className="label">Your pricing</span>
          <table className="mini-ledger" style={{ marginTop: 8 }}>
            <tbody>
              {model.plans.map((p) => (
                <tr key={p.id}><td><b>{p.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{p.includes}</div></td><td className="mono">{money(p.price)}/{p.interval === 'month' ? 'mo' : 'yr'}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Every plan starts with a {app.price.trialDays}-day free trial, card required.</p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <span className="label row" style={{ gap: 6 }}><Info size={12} /> How these numbers were worked out</span>
          <ul className="costs-notes">
            {model.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** Revenue vs running costs across customer counts. Two series, one $ axis, crosshair tooltip. */
function ProfitChart({ model, usage, annualShare, planId, current }: { model: CostModel; usage: number; annualShare: number; planId: string; current: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(720)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))))
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const max = Math.max(200, current * 1.5)
  const N = 60
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const c = Math.round((max * i) / N)
    const r = compute(model, c, usage, annualShare, planId)
    return { c, rev: r.mrr, cost: r.costs }
  })
  const H = 260, L = 56, R = 12, T = 12, B = 28
  const yMax = Math.max(...pts.map((p) => Math.max(p.rev, p.cost))) * 1.08 || 1
  const x = (c: number) => L + (c / max) * (W - L - R)
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B)
  const path = (k: 'rev' | 'cost') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.c).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ')
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMax * t)
  const h = hover !== null ? pts[hover] : null
  const last = pts[pts.length - 1]

  return (
    <figure className="card costs-chart">
      <div className="row between wrap" style={{ gap: 8 }}>
        <span className="label">Revenue vs running costs per month</span>
        <div className="row" style={{ gap: 14, fontSize: 12.5 }}>
          <span className="row" style={{ gap: 6 }}><i className="legend-swatch" style={{ background: 'var(--money)' }} />MRR</span>
          <span className="row" style={{ gap: 6 }}><i className="legend-swatch" style={{ background: 'var(--loss)' }} />Running costs</span>
        </div>
      </div>
      <div style={{ position: 'relative' }} ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }} role="img" aria-label="Line chart of monthly revenue and running costs by number of customers"
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
            const px = ((e.clientX - rect.left) / rect.width) * W
            const i = Math.round(((px - L) / (W - L - R)) * N)
            setHover(i >= 0 && i <= N ? i : null)
          }}
          onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="var(--mono)">{t >= 1000 ? `$${Math.round(t / 1000)}k` : `$${Math.round(t)}`}</text>
            </g>
          ))}
          {[0, 0.5, 1].map((t) => (
            <text key={t} x={x(max * t)} y={H - 8} textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'} fontSize="11" fill="var(--muted)" fontFamily="var(--mono)">{Math.round(max * t)} customers</text>
          ))}
          <path d={path('cost')} fill="none" stroke="var(--loss)" strokeWidth="2" />
          <path d={path('rev')} fill="none" stroke="var(--money)" strokeWidth="2" />
          {current <= max && <line x1={x(current)} x2={x(current)} y1={T} y2={H - B} stroke="var(--ink)" strokeDasharray="3 3" strokeOpacity=".5" />}
          <text x={x(last.c) - 4} y={y(last.rev) - 8} textAnchor="end" fontSize="11.5" fill="var(--ink-2)">MRR</text>
          <text x={x(last.c) - 4} y={y(last.cost) + 16} textAnchor="end" fontSize="11.5" fill="var(--ink-2)">Costs</text>
          {h && (
            <g>
              <line x1={x(h.c)} x2={x(h.c)} y1={T} y2={H - B} stroke="var(--muted)" />
              <circle cx={x(h.c)} cy={y(h.rev)} r="4.5" fill="var(--money)" stroke="var(--surface)" strokeWidth="2" />
              <circle cx={x(h.c)} cy={y(h.cost)} r="4.5" fill="var(--loss)" stroke="var(--surface)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {h && (
          <div className="chart-tip" style={{ left: `${(x(h.c) / W) * 100}%` }}>
            <b className="mono">{h.c} customers</b>
            <span><i className="legend-swatch" style={{ background: 'var(--money)' }} /> MRR <b className="mono">{money(h.rev)}</b></span>
            <span><i className="legend-swatch" style={{ background: 'var(--loss)' }} /> Costs <b className="mono">{money(h.cost)}</b></span>
            <span>Profit <b className="mono">{money(h.rev - h.cost)}</b></span>
          </div>
        )}
      </div>
    </figure>
  )
}
