import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Calculator, Check, Lock, Package, Trophy } from 'lucide-react'
import { getApp, getPhases } from '../content/apps'
import type { Task } from '../content/types'
import { useStore, useUser } from '../lib/store'
import { appStats, fmtMinutes, phaseStats, taskStats } from '../lib/progress'
import { Bar } from '../components/Ring'
import { PhaseIcon } from '../components/PhaseIcon'
import { TaskCard, type StepState } from '../components/TaskCard'
import { TriggerContext } from '../components/Blocks'
import { DownloadCodeModal } from '../components/DownloadCodeModal'
import { CostCalculator } from '../components/CostCalculator'
import { toast } from '../components/Toasts'
import { burst, celebrate } from '../lib/confetti'
import { LOCK_PROGRESSION } from '../lib/flags'

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

  /**
   * Open or close a step without the page jumping. When a step opens, the one above it may
   * collapse at the same time, which would push the clicked header up and leave the reader
   * part-way down. We pin the clicked header to where it was on screen while the
   * open/close animation runs, then stop.
   */
  const focusStep = useCallback((id: string | null, anchorId?: string) => {
    const el = anchorId ? document.getElementById(`task-${anchorId}`) : null
    const startTop = el?.getBoundingClientRect().top
    setOpenTask(id)
    if (!el || startTop === undefined) return
    const target = Math.max(80, startTop)
    const until = performance.now() + 450
    const pin = () => {
      const top = el.getBoundingClientRect().top
      if (Math.abs(top - target) > 1) window.scrollBy(0, top - target)
      if (performance.now() < until) requestAnimationFrame(pin)
    }
    requestAnimationFrame(pin)
  }, [])
  const [phaseDone, setPhaseDone] = useState<string | null>(null)

  const phases = useMemo(() => (app ? getPhases(app) : []), [app])
  const checked = (app && user.progress[app.slug]?.checked) || {}
  const stats = app ? appStats(app, checked) : null

  // A phase unlocks when every phase before it is complete.
  const unlockedUpTo = stats ? stats.currentPhase : 0
  const requested = params.get('tab')
  const showCosts = requested === 'costs'
  const reqIndex = phases.findIndex((p) => p.id === requested)
  const phaseIndex = reqIndex >= 0 ? reqIndex : unlockedUpTo
  const phase = phases[phaseIndex]
  const phaseLocked = LOCK_PROGRESSION && phaseIndex > unlockedUpTo

  // Within a phase, a step unlocks when every step before it is complete.
  const stepStates: StepState[] = useMemo(() => {
    if (!phase) return []
    let blocked = phaseLocked
    let currentSet = false
    return phase.tasks.map((t): StepState => {
      if (blocked) return 'locked'
      if (taskStats(t, checked).complete) return 'done'
      if (!currentSet) { currentSet = true; if (LOCK_PROGRESSION) blocked = true; return 'current' }
      return 'todo'
    })
  }, [phase, checked, phaseLocked])
  const currentTask = phase?.tasks[stepStates.indexOf('current')]

  useEffect(() => { if (app) { setLastTab(app.slug, showCosts ? 'costs' : phase.id); setActive(app.slug) } }, [app, phase?.id, showCosts]) // eslint-disable-line
  // Open the current step whenever the phase changes.
  useEffect(() => { setOpenTask(currentTask?.id ?? null) }, [phase?.id]) // eslint-disable-line

  const allItems = useMemo(() => {
    const m = new Map<string, { task: Task; phaseId: string; trigger?: string }>()
    for (const p of phases) for (const t of p.tasks) for (const i of t.checklist) m.set(i.id, { task: t, phaseId: p.id, trigger: i.trigger })
    return m
  }, [phases])

  const readChecked = () => {
    const st = useStore.getState()
    return (st.session && st.users[st.session]?.progress[app!.slug]?.checked) || {}
  }

  const onToggle = useCallback((itemId: string, value?: boolean) => {
    if (!app) return
    const ref = allItems.get(itemId)
    if (!ref) return
    const before = readChecked()
    const ph = phases.find((p) => p.id === ref.phaseId)!
    const wasTask = taskStats(ref.task, before).complete
    const wasPhase = phaseStats(ph, before).complete
    toggle(app.slug, itemId, value)
    const after = readChecked()
    if (!wasTask && taskStats(ref.task, after).complete) {
      toast(ref.task.title, ref.task.xp)
      const r = document.getElementById(`task-${ref.task.id}`)?.getBoundingClientRect()
      burst(r ? { x: (r.left + 40) / window.innerWidth, y: (r.top + 30) / window.innerHeight } : undefined)
      const next = ph.tasks.find((t) => !taskStats(t, after).complete)
      setTimeout(() => {
        setOpenTask(next?.id ?? null)
        if (next) setTimeout(() => document.getElementById(`task-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
      }, 900)
    }
    if (!wasPhase && phaseStats(ph, after).complete) setTimeout(() => { celebrate(); setPhaseDone(ph.id) }, 600)
  }, [app, allItems, phases, toggle]) // eslint-disable-line

  // Copy/download auto-ticks only count for steps that are unlocked.
  const fire = useCallback((trigger: string) => {
    const now = readChecked()
    for (const [id, ref] of allItems) {
      if (ref.trigger !== trigger || now[id]) continue
      if (!LOCK_PROGRESSION || ref.task.id === currentTask?.id) onToggle(id, true)
    }
  }, [allItems, currentTask?.id, onToggle]) // eslint-disable-line

  if (!app || !stats) return <Navigate to="/app/library" replace />
  if (!user.commitments[app.slug]) return <Navigate to={`/app/library/${app.slug}`} replace />

  const ps = stats.perPhase[phaseIndex]
  const goTab = (id: string) => { setParams({ tab: id }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const totalSteps = phases.reduce((n, p) => n + p.tasks.length, 0)
  const stepsDone = stats.perPhase.reduce((n, p) => n + p.tasksDone, 0)
  const donePhase = phases.find((p) => p.id === phaseDone)
  const nextAfterDone = donePhase ? phases[phases.indexOf(donePhase) + 1] : undefined
  const firstEver = stepsDone === 0

  return (
    <TriggerContext.Provider value={fire}>
      <div className="journey">
        <aside className="journey-rail">
          <div className="rail-app">
            <span className="label">You are building</span>
            <b>{app.name}</b>
            <Bar pct={stats.pct} />
            <span className="muted" style={{ fontSize: 13 }}>{stepsDone} of {totalSteps} steps · {Math.round(stats.pct * 100)}%</span>
          </div>
          <ol className="rail-list">
            {phases.map((p, i) => {
              const s = stats.perPhase[i]
              const locked = LOCK_PROGRESSION && i > unlockedUpTo
              const active = !showCosts && i === phaseIndex
              const state = s.complete ? 'done' : locked ? 'locked' : i === unlockedUpTo ? 'current' : 'todo'
              return (
                <li key={p.id}>
                  <button className={`rail-item ${state} ${active ? 'active' : ''}`} onClick={() => goTab(p.id)}>
                    <span className="rail-dot">{s.complete ? <Check size={13} /> : locked ? <Lock size={11} /> : i + 1}</span>
                    <span className="rail-text">
                      <b>{p.label}</b>
                      <span>{s.complete ? 'Complete' : locked ? 'Locked' : i > unlockedUpTo ? `${s.tasks} steps` : i === unlockedUpTo && s.tasksDone === 0 && i === 0 ? 'Start here' : `${s.tasksDone} of ${s.tasks} steps`}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="rail-extra">
            <button className={`rail-item ${showCosts ? 'active' : ''}`} onClick={() => goTab('costs')}>
              <span className="rail-dot plain"><Calculator size={13} /></span>
              <span className="rail-text"><b>Costs & running</b><span>Calculator</span></span>
            </button>
            <button className="rail-item" onClick={() => setZipOpen(true)}>
              <span className="rail-dot plain"><Package size={13} /></span>
              <span className="rail-text"><b>Download all code</b><span>Starter pack .zip</span></span>
            </button>
          </div>
        </aside>

        <main className="journey-main">
          <AnimatePresence mode="wait">
            {showCosts ? (
              <motion.section key="costs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <header className="phase-intro">
                  <span className="label">Costs & running</span>
                  <h1>What {app.name} costs to run, and what it makes</h1>
                  <p className="muted">Every tool in the kit at today’s prices. Drag the sliders to see costs, profit and margin at 10, 100 or 1,000 customers.</p>
                </header>
                <CostCalculator app={app} />
              </motion.section>
            ) : (
              <motion.section key={phase.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <header className="phase-intro">
                  <span className="label">Phase {phaseIndex + 1} of {phases.length}</span>
                  <h1><span className="phase-icon"><PhaseIcon icon={phase.icon} size={20} /></span>{phase.title}</h1>
                  <p className="muted">{phase.goal}</p>
                  {!phaseLocked && (
                    <div className="phase-progress">
                      <Bar pct={ps.pct} tone={ps.complete ? 'money' : undefined} />
                      <span className="muted">{ps.tasksDone} of {ps.tasks} steps · about {fmtMinutes(phase.tasks.filter((t) => !taskStats(t, checked).complete).reduce((m, t) => m + t.minutes, 0))} left</span>
                    </div>
                  )}
                </header>

                {phaseLocked && (
                  <div className="locked-panel">
                    <Lock size={20} />
                    <div style={{ flex: 1 }}>
                      <b>This phase is locked.</b>
                      <p className="muted">Finish <b>{phases[unlockedUpTo].label}</b> first. Each phase builds on the one before it, so the steps only work in order.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => goTab(phases[unlockedUpTo].id)}>Go to {phases[unlockedUpTo].label} <ArrowRight size={15} /></button>
                  </div>
                )}

                {app.status === 'preview' && !phaseLocked && ['foundations', 'backend', 'outbound', 'inbound', 'paid'].includes(phase.id) && (
                  <p className="preview-note">Preview kit: the {app.name}-specific parts of this phase are shorter than the flagship kits.</p>
                )}

                <div className="step-list">
                  {phase.tasks.map((t, i) => (
                    <TaskCard key={t.id} task={t} index={i} total={phase.tasks.length} state={stepStates[i]} checked={checked}
                      open={openTask === t.id} isFirstEver={firstEver && phaseIndex === 0 && i === 0}
                      prevTitle={i > 0 ? phase.tasks[i - 1].title : phases[unlockedUpTo]?.label}
                      onOpen={() => focusStep(openTask === t.id ? null : t.id, t.id)} onToggle={(id) => onToggle(id)} />
                  ))}
                </div>

                {ps.complete && phases[phaseIndex + 1] && (
                  <div className="next-phase">
                    <div style={{ flex: 1 }}>
                      <span className="label">Phase complete</span>
                      <b>Next: {phases[phaseIndex + 1].title}</b>
                    </div>
                    <button className="btn btn-primary" onClick={() => goTab(phases[phaseIndex + 1].id)}>Start {phases[phaseIndex + 1].label} <ArrowRight size={15} /></button>
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {donePhase && (
            <motion.div className="phase-done" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}>
              <Trophy size={22} />
              <div style={{ flex: 1 }}>
                <b>{donePhase.label} complete.</b>
                <span> {phases.indexOf(donePhase) + 1} of {phases.length} phases done.{nextAfterDone ? ` ${nextAfterDone.label} is unlocked.` : ''}</span>
              </div>
              {nextAfterDone && (
                <button className="btn btn-sm btn-primary" onClick={() => { goTab(nextAfterDone.id); setPhaseDone(null) }}>
                  Start {nextAfterDone.label} <ArrowRight size={14} />
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setPhaseDone(null)}>Close</button>
            </motion.div>
          )}
        </AnimatePresence>

        <DownloadCodeModal app={app} open={zipOpen} onClose={() => setZipOpen(false)} />
        <Link to="/app" className="sr-only">Back to dashboard</Link>
      </div>
    </TriggerContext.Provider>
  )
}
