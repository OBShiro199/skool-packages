import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ChevronDown, Grid3x3, Mic, PhoneOff, Play, Plus, Search } from 'lucide-react'
import { EASE, LiveDot, TrialButton, mmss, scrollToId, track, useCount, useTimer, usdK } from './shared'

type Deal = { id: string; name: string; co: string; value: number; owner: string; due: string; late?: boolean }
type StageKey = 'qualified' | 'proposal' | 'negotiation' | 'won'

const STAGES: { key: StageKey; label: string; hue: string; prob: number }[] = [
  { key: 'qualified', label: 'Qualified', hue: 'blue', prob: 0.2 },
  { key: 'proposal', label: 'Proposal', hue: 'amber', prob: 0.4 },
  { key: 'negotiation', label: 'Negotiation', hue: 'violet', prob: 0.6 },
  { key: 'won', label: 'Won', hue: 'green', prob: 1 },
]

const START: Record<StageKey, Deal[]> = {
  qualified: [
    { id: 'd1', name: 'Senior hires retainer', co: 'Northwind Hiring', value: 12000, owner: 'SJ', due: 'Nov 14' },
    { id: 'd2', name: 'Site rebuild', co: 'Acme Studio', value: 8400, owner: 'OR', due: 'Nov 20' },
    { id: 'd3', name: 'Wholesale portal', co: 'Halden Supply', value: 6500, owner: 'MK', due: 'Dec 2' },
  ],
  proposal: [
    { id: 'd4', name: 'Annual licence', co: 'Brightline', value: 18000, owner: 'OR', due: 'Oct 31' },
    { id: 'd5', name: 'Paid search retainer', co: 'Kestrel Agency', value: 9600, owner: 'SJ', due: 'Nov 7' },
    { id: 'd6', name: 'App audit', co: 'Orchard Dev', value: 7200, owner: 'MK', due: 'Oct 16', late: true },
  ],
  negotiation: [
    { id: 'd7', name: 'Sales playbook', co: 'Fenwick Consulting', value: 22000, owner: 'OR', due: 'Oct 28' },
    { id: 'd8', name: 'Contract recruiters', co: 'Marlow Recruit', value: 14500, owner: 'SJ', due: 'Nov 3' },
  ],
  won: [
    { id: 'd9', name: 'Brand refresh', co: 'Pike & Co', value: 11200, owner: 'MK', due: 'Oct 9' },
    { id: 'd10', name: 'Q4 hiring sprint', co: 'Tallis Media', value: 5800, owner: 'OR', due: 'Oct 4' },
  ],
}

function moved(): Record<StageKey, Deal[]> {
  const kestrel = START.proposal[1]
  return {
    ...START,
    proposal: START.proposal.filter((d) => d.id !== kestrel.id),
    negotiation: [kestrel, ...START.negotiation],
  }
}

const sum = (ds: Deal[]) => ds.reduce((a, d) => a + d.value, 0)

function ColumnTotal({ value }: { value: number }) {
  const v = useCount(value, 400, true, value)
  return <span className="et-num et-col-total">{usdK(v)}</span>
}

function Forecast({ cols }: { cols: Record<StageKey, Deal[]> }) {
  const open = sum(cols.qualified) + sum(cols.proposal) + sum(cols.negotiation)
  const weighted = Math.round(STAGES.slice(0, 3).reduce((a, s) => a + sum(cols[s.key]) * s.prob, 0))
  const o = useCount(open, 400, true, open)
  const w = useCount(weighted, 400, true, weighted)
  return (
    <div className="et-forecast" aria-label="Forecast">
      <span><em>Open</em><b className="et-num">${o.toLocaleString('en-US')}</b></span>
      <span><em>Weighted</em><b className="et-num">${w.toLocaleString('en-US')}</b></span>
      <span><em>Won this month</em><b className="et-num">$17,000</b></span>
      <span className="et-hide-sm"><em>Win rate</em><b className="et-num">31%</b></span>
    </div>
  )
}

export function Board({ animate = true, prefix = 'hero' }: { animate?: boolean; prefix?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduce = useReducedMotion()
  const [cols, setCols] = useState(START)
  useEffect(() => {
    if (!animate || !inView || reduce) return
    const id = window.setTimeout(() => setCols(moved()), 2400)
    return () => window.clearTimeout(id)
  }, [animate, inView, reduce])

  return (
    <div className="et-app" ref={ref}>
      <div className="et-app-bar">
        <span className="et-select">Agency pipeline <ChevronDown size={12} aria-hidden="true" /></span>
        <span className="et-seg"><i className="on">Board</i><i>Table</i></span>
        <span className="et-search et-hide-sm"><Search size={12} aria-hidden="true" /> Search deals</span>
        <span className="et-mini-btn"><Plus size={12} aria-hidden="true" /> Add deal</span>
      </div>
      <Forecast cols={cols} />
      <div className="et-board">
        {STAGES.map((s, ci) => (
          <div key={s.key} className={`et-col ${s.key === 'won' ? 'et-col-won' : ''}`}>
            <div className="et-col-head">
              <span className={`et-stage et-hue-${s.hue}`}>{s.label}</span>
              <span className="et-col-count et-num">{cols[s.key].length}</span>
              <ColumnTotal value={sum(cols[s.key])} />
            </div>
            <div className="et-col-body">
              {cols[s.key].map((d, i) => (
                <motion.div
                  key={d.id}
                  layout={!reduce}
                  layoutId={`${prefix}-${d.id}`}
                  className={`et-card et-edge-${s.hue}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.36, delay: 0.24 + Math.min(ci * 3 + i, 10) * 0.025, ease: EASE, layout: { duration: 0.3, ease: [0.2, 0, 0, 1] } }}
                >
                  <strong>{d.name}</strong>
                  <span className="et-card-co">{d.co}</span>
                  {s.key !== 'won' && (
                    <span className="et-card-foot">
                      <i className="et-ava">{d.owner}</i>
                      <span className={d.late ? 'et-late' : ''}>{d.due}</span>
                      <b className="et-num">${d.value.toLocaleString('en-US')}</b>
                    </span>
                  )}
                  {s.key === 'won' && <b className="et-num et-card-won">${d.value.toLocaleString('en-US')}</b>}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InCallDock() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.1 })
  const reduce = useReducedMotion()
  const [s] = useTimer(247, inView && !reduce)
  return (
    <div className="et-dock et-dock-call" ref={ref} role="group" aria-label="Softphone dock, in call with Sarah Jones">
      <div className="et-dock-top">
        <span className="et-dock-state"><LiveDot /> In call</span>
        <span className="et-rec"><LiveDot tone="danger" /> Recording</span>
      </div>
      <div className="et-dock-who">
        <i className="et-ava et-ava-lg">SJ</i>
        <span><strong>Sarah Jones</strong><em>Northwind Hiring</em></span>
        <span className="et-timer et-num" aria-label={`Call time ${reduce ? '04:12' : mmss(s)}`}>{reduce ? '04:12' : mmss(s)}</span>
      </div>
      <div className="et-dock-actions">
        <span className="et-dock-btn"><Mic size={14} aria-hidden="true" /> Mute</span>
        <span className="et-dock-btn"><Grid3x3 size={14} aria-hidden="true" /> Keypad</span>
        <span className="et-dock-btn et-danger"><PhoneOff size={14} aria-hidden="true" /> Hang up</span>
      </div>
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const rise = (i: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.36, delay: reduce ? 0 : i * 0.04, ease: EASE },
  })
  return (
    <section className="et-hero" id="top" aria-labelledby="et-h1">
      <div className="et-wrap et-hero-grid">
        <div className="et-hero-copy">
          <motion.span className="et-eyebrow" {...rise(0)}><LiveDot /> CRM with a phone built in</motion.span>
          <motion.h1 id="et-h1" className="et-display" {...rise(1)}>The CRM your team calls from.</motion.h1>
          <motion.p className="et-lead" {...rise(2)}>
            People, companies and pipelines in one quiet, fast workspace. Click any number to call from the browser.
            Every call, recording and outcome lands on the right record by itself.
          </motion.p>
          <motion.div className="et-cta-row" {...rise(3)}>
            <TrialButton location="hero" />
            <a href="#demo" className="et-btn et-btn-secondary et-btn-lg" onClick={(e) => { e.preventDefault(); scrollToId('demo') }}>
              <Play size={14} aria-hidden="true" /> Watch the 90 second demo
            </a>
          </motion.div>
          <motion.p className="et-micro" {...rise(4)}>7 days free · Unlimited seats · $149/month for the whole team</motion.p>
        </div>

        <div className="et-hero-visual" role="img" aria-label="Etcher deals board with four stages, a call in progress with Sarah Jones at Northwind Hiring, and a logged call on the timeline">
          <motion.div
            className="et-board-wrap"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.12, ease: EASE }}
          >
            <Board />
          </motion.div>
          <motion.div
            className="et-float-timeline"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.5, ease: EASE }}
          >
            <button type="button" className="et-play" aria-label="Play call recording" onClick={() => track('recording_play', { location: 'hero' })}><Play size={11} fill="currentColor" aria-hidden="true" /></button>
            <span><strong>Call · 4:12</strong> · <span className="et-pill et-pill-green">Meeting booked</span></span>
          </motion.div>
          <motion.div
            className="et-float-dock"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.62, ease: EASE }}
          >
            <InCallDock />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
