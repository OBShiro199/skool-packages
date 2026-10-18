import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Clock, Package, Sparkles, Trophy } from 'lucide-react'
import { getApp, getPhases } from '../content/apps'
import type { Task } from '../content/types'
import { useStore, useUser } from '../lib/store'
import { appStats, fmtMinutes, phaseStats, taskStats } from '../lib/progress'
import { AppArt } from '../components/AppArt'
import { Bar, Ring } from '../components/Ring'
import { PhaseIcon } from '../components/PhaseIcon'
import { TaskCard } from '../components/TaskCard'
import { TriggerContext } from '../components/Blocks'
import { DownloadCodeModal } from '../components/DownloadCodeModal'
import { toast } from '../components/Toasts'
import { burst, celebrate } from '../lib/confetti'

function useCountUp(value: number) {
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = value
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700)
      setV(Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return v
}

export default function BuildPage() {
  const { slug } = useParams()
  const app = getApp(slug)
  const user = useUser()!
  const toggle = useStore((s) => s.toggleItem)
  const setLastTab = useStore((s) => s.setLastTab)
  const setActive = useStore((s) => s.setActiveApp)
  const [params, setParams] = useSearchParams()
  const [zipOpen, setZipOpen] = useState(false)
  const [openTask, setOpenTask] = useState<string | null>(null)
  const [phaseDone, setPhaseDone] = useState<string | null>(null)

  const phases = useMemo(() => (app ? getPhases(app) : []), [app])
  const checked = (app && user.progress[app.slug]?.checked) || {}
  const stats = app ? appStats(app, checked) : null
  const tabId = params.get('tab') ?? (app && user.progress[app.slug]?.lastTab) ?? phases[stats?.currentPhase ?? 0]?.id
  const phaseIndex = Math.max(0, phases.findIndex((p) => p.id === tabId))
  const phase = phases[phaseIndex]

  useEffect(() => { if (app) { setLastTab(app.slug, phase.id); setActive(app.slug) } }, [app, phase?.id]) // eslint-disable-line

  // Open the first unfinished task when a tab opens.
  useEffect(() => {
    if (!phase) return
    const first = phase.tasks.find((t) => !taskStats(t, checked).complete)
    setOpenTask(first?.id ?? null)
  }, [phase?.id]) // eslint-disable-line

  const allItems = useMemo(() => {
    const m = new Map<string, { task: Task; phaseId: string }>()
    for (const p of phases) for (const t of p.tasks) for (const i of t.checklist) m.set(i.id, { task: t, phaseId: p.id })
    return m
  }, [phases])

  const onToggle = useCallback((itemId: string, value?: boolean) => {
    if (!app) return
    const ref = allItems.get(itemId)
    if (!ref) return
    const before = useStore.getState().users[useStore.getState().session!]?.progress[app.slug]?.checked ?? {}
    const wasTask = taskStats(ref.task, before).complete
    const ph = phases.find((p) => p.id === ref.phaseId)!
    const wasPhase = phaseStats(ph, before).complete
    toggle(app.slug, itemId, value)
    const after = useStore.getState().users[useStore.getState().session!]?.progress[app.slug]?.checked ?? {}
    if (!wasTask && taskStats(ref.task, after).complete) {
      toast(`${ref.task.title}`, ref.task.xp)
      const el = document.getElementById(`task-${ref.task.id}`)
      const r = el?.getBoundingClientRect()
      burst(r ? { x: (r.left + 40) / window.innerWidth, y: (r.top + 30) / window.innerHeight } : undefined)
      // Advance to the next unfinished task in this phase.
      const next = ph.tasks.find((t) => !taskStats(t, after).complete)
      setTimeout(() => setOpenTask(next?.id ?? null), 700)
    }
    if (!wasPhase && phaseStats(ph, after).complete) {
      setTimeout(() => { celebrate(); setPhaseDone(ph.id) }, 500)
    }
  }, [app, allItems, phases, toggle])

  const fire = useCallback((trigger: string) => {
    for (const [id, ref] of allItems) {
      if (ref.task.checklist.find((i) => i.id === id)?.trigger === trigger && !checked[id]) onToggle(id, true)
    }
  }, [allItems, checked, onToggle])

  const pctDisplay = useCountUp(Math.round((stats?.pct ?? 0) * 100))
  const xpDisplay = useCountUp(stats?.xp ?? 0)

  if (!app || !stats) return <Navigate to="/app/library" replace />
  if (!user.commitments[app.slug]) return <Navigate to={`/app/library/${app.slug}`} replace />

  const ps = stats.perPhase[phaseIndex]
  const goTab = (id: string) => { setParams({ tab: id }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const next = phases[phaseIndex + 1]
  const prev = phases[phaseIndex - 1]
  const donePhase = phases.find((p) => p.id === phaseDone)

  return (
    <TriggerContext.Provider value={fire}>
      <div className="page build">
        <header className="build-head">
          <div className="build-art"><AppArt app={app} height={96} /></div>
          <div className="build-title">
            <span className="label">Building</span>
            <h1>{app.name}</h1>
            <p className="muted">{app.tagline}</p>
          </div>
          <div className="build-meter">
            <div className="row between">
              <span className="label">Overall progress</span>
              <span className="mono build-pct">{pctDisplay}%</span>
            </div>
            <Bar pct={stats.pct} lg />
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="chip chip-signal"><Sparkles size={11} /> {xpDisplay} / {stats.xpTotal} XP</span>
              <span className="chip"><Check size={11} /> {stats.done}/{stats.total} ticks</span>
              <span className="chip"><Clock size={11} /> {fmtMinutes(stats.minutesLeft)} left</span>
            </div>
          </div>
          <div className="build-actions">
            <button className="btn btn-primary" onClick={() => setZipOpen(true)}><Package size={15} /> Download all code</button>
            <Link className="btn" to={`/app/library/${app.slug}`}>Kit overview</Link>
          </div>
        </header>

        <nav className="phase-tabs" aria-label="Build phases">
          {phases.map((p, i) => {
            const s = stats.perPhase[i]
            const active = i === phaseIndex
            return (
              <button key={p.id} className={`phase-tab ${active ? 'active' : ''} ${s.complete ? 'complete' : ''}`} onClick={() => goTab(p.id)}>
                <Ring pct={s.pct} size={34} stroke={3} tone={s.complete ? 'money' : 'signal'}>
                  {s.complete ? <Check size={14} color="var(--money)" /> : <PhaseIcon icon={p.icon} size={14} />}
                </Ring>
                <span className="phase-tab-text">
                  <span className="label">{String(i + 1).padStart(2, '0')}{i === stats.currentPhase && !s.complete ? ' · up next' : ''}</span>
                  <b>{p.label}</b>
                </span>
                {active && <motion.span layoutId="tab-underline" className="phase-underline" />}
              </button>
            )
          })}
        </nav>

        <AnimatePresence mode="wait">
          <motion.section key={phase.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <div className="phase-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="label">Phase {phaseIndex + 1} of {phases.length}</span>
                <h2>{phase.title}</h2>
                <p className="muted">{phase.goal}</p>
              </div>
              <div className="phase-score">
                <Ring pct={ps.pct} size={76} stroke={6} tone={ps.complete ? 'money' : 'signal'}>
                  <span className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{Math.round(ps.pct * 100)}%</span>
                </Ring>
                <div className="stack" style={{ gap: 2 }}>
                  <span className="mono" style={{ fontSize: 13 }}><b>{ps.tasksDone}</b>/{ps.tasks} steps</span>
                  <span className="mono muted" style={{ fontSize: 12 }}>{ps.xp}/{ps.xpTotal} XP</span>
                  <span className="mono muted" style={{ fontSize: 12 }}>{fmtMinutes(phase.tasks.reduce((m, t) => m + t.minutes, 0))}</span>
                </div>
              </div>
            </div>

            {app.status === 'preview' && ['foundations', 'backend', 'outbound', 'inbound', 'paid'].includes(phase.id) && (
              <div className="preview-note">
                <b>Preview kit.</b> The shared steps are complete. The {app.name}-specific PRDs and marketing plan are shorter than the flagship kits and get expanded in the next drop.
              </div>
            )}

            <div className="task-list">
              {phase.tasks.map((t, i) => (
                <TaskCard key={t.id} task={t} index={i} checked={checked} open={openTask === t.id}
                  onOpen={() => setOpenTask(openTask === t.id ? null : t.id)} onToggle={(id) => onToggle(id)} />
              ))}
            </div>

            <div className="phase-nav">
              {prev ? <button className="btn" onClick={() => goTab(prev.id)}><ArrowLeft size={15} /> {prev.label}</button> : <span />}
              {next && <button className={`btn ${ps.complete ? 'btn-primary' : ''}`} onClick={() => goTab(next.id)}>Next: {next.label} <ArrowRight size={15} /></button>}
            </div>
          </motion.section>
        </AnimatePresence>

        <AnimatePresence>
          {donePhase && (
            <motion.div className="phase-done" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}>
              <Trophy size={22} />
              <div style={{ flex: 1 }}>
                <b>{donePhase.label} complete.</b>
                <span> {phases.indexOf(donePhase) + 1} of {phases.length} phases done on {app.name}.</span>
              </div>
              {phases[phases.indexOf(donePhase) + 1] && (
                <button className="btn btn-sm" style={{ background: '#fff', color: '#0F0F0F' }} onClick={() => { goTab(phases[phases.indexOf(donePhase) + 1].id); setPhaseDone(null) }}>
                  Start {phases[phases.indexOf(donePhase) + 1].label} <ArrowRight size={14} />
                </button>
              )}
              <button className="btn btn-sm btn-ghost" style={{ color: '#fff' }} onClick={() => setPhaseDone(null)}>Close</button>
            </motion.div>
          )}
        </AnimatePresence>

        <DownloadCodeModal app={app} open={zipOpen} onClose={() => setZipOpen(false)} />
      </div>
    </TriggerContext.Provider>
  )
}
