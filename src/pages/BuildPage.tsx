import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Calculator, Check, Clock, FolderDown, Lock, Trophy } from 'lucide-react'
import { getApp, getPhases } from '../content/apps'
import type { Task } from '../content/types'
import { useStore, useUser } from '../lib/store'
import { appStats, fmtMinutes, phaseStats, taskStats } from '../lib/progress'
import { Bar } from '../components/Ring'
import { KitLogo } from '../components/KitLogo'
import { PhaseIcon } from '../components/PhaseIcon'
import { Tick } from '../components/TaskCard'
import { BlockView, TriggerContext } from '../components/Blocks'
import { DownloadCodeModal } from '../components/DownloadCodeModal'
import { CostCalculator } from '../components/CostCalculator'
import { DownloadsPanel } from '../components/DownloadsPanel'
import { toast } from '../components/Toasts'
import { burst, celebrate } from '../lib/confetti'
import { LOCK_PROGRESSION } from '../lib/flags'

const RISE = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] as const } } }
const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The build: one step per page. A phase strip across the top, the step in the middle,
 * Previous / Next at the bottom. Steps slide horizontally; nothing expands or collapses,
 * so the page never jumps.
 */
export default function BuildPage() {
  const { slug } = useParams()
  const app = getApp(slug)
  const user = useUser()!
  const toggle = useStore((s) => s.toggleItem)
  const setLastTab = useStore((s) => s.setLastTab)
  const setActive = useStore((s) => s.setActiveApp)
  const [params, setParams] = useSearchParams()
  const [zipOpen, setZipOpen] = useState(false)
  const [dir, setDir] = useState(1)
  const [phaseDone, setPhaseDone] = useState<string | null>(null)

  const phases = useMemo(() => (app ? getPhases(app) : []), [app])
  const checked = (app && user.progress[app.slug]?.checked) || {}
  const stats = app ? appStats(app, checked) : null

  // Where we are: ?tab=<phaseId>&step=<n>, else the saved position, else the first unfinished step.
  const view = params.get('tab')
  const showCosts = view === 'costs'
  const showDownloads = view === 'downloads'
  const extra = showCosts || showDownloads
  const saved = (app && user.progress[app.slug]?.lastTab) || ''
  const firstOpen = useMemo(() => {
    for (let i = 0; i < phases.length; i++) {
      const s = phases[i].tasks.findIndex((t) => !taskStats(t, checked).complete)
      if (s >= 0) return { pi: i, si: s }
    }
    return { pi: Math.max(0, phases.length - 1), si: 0 }
  }, [phases]) // eslint-disable-line
  const [savedPhase, savedStep] = saved.split('.')
  const phaseId = view && !extra ? view : savedPhase || phases[firstOpen.pi]?.id
  const pi = Math.max(0, phases.findIndex((p) => p.id === phaseId))
  const phase = phases[pi]
  const rawStep = params.get('step') ?? (phase?.id === savedPhase ? savedStep : undefined)
  const si = Math.min(Math.max(0, Number(rawStep ?? (pi === firstOpen.pi ? firstOpen.si : 0)) || 0), Math.max(0, (phase?.tasks.length ?? 1) - 1))
  const task = phase?.tasks[si]

  useEffect(() => {
    if (!app) return
    setActive(app.slug)
    if (!extra && phase) setLastTab(app.slug, `${phase.id}.${si}`)
  }, [app, phase?.id, si, extra]) // eslint-disable-line

  const allItems = useMemo(() => {
    const m = new Map<string, { task: Task; phaseId: string; trigger?: string }>()
    for (const p of phases) for (const t of p.tasks) for (const i of t.checklist) m.set(i.id, { task: t, phaseId: p.id, trigger: i.trigger })
    return m
  }, [phases])

  const readChecked = () => {
    const st = useStore.getState()
    return (st.session && st.users[st.session]?.progress[app!.slug]?.checked) || {}
  }

  const go = (toPhase: number, toStep: number, direction?: number) => {
    if (!phases[toPhase]) return
    setDir(direction ?? (toPhase > pi || (toPhase === pi && toStep > si) ? 1 : -1))
    setParams({ tab: phases[toPhase].id, step: String(toStep) })
    window.scrollTo({ top: 0 })
  }
  const next = () => {
    if (!phase || !task) return
    const t = taskStats(task, checked)
    if (!t.complete && t.total > 0) return
    if (si + 1 < phase.tasks.length) go(pi, si + 1, 1)
    else if (pi + 1 < phases.length) go(pi + 1, 0, 1)
  }
  const prev = () => {
    if (si > 0) go(pi, si - 1, -1)
    else if (pi > 0) go(pi - 1, phases[pi - 1].tasks.length - 1, -1)
  }
  const nextRef = useRef(next)
  nextRef.current = next
  const taskIdRef = useRef(task?.id)
  taskIdRef.current = task?.id
  const firstUnfinished = (i: number) => Math.max(0, phases[i].tasks.findIndex((t) => !taskStats(t, checked).complete))

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
      burst({ x: 0.5, y: 0.9 })
    }
    const phaseJustDone = !wasPhase && phaseStats(ph, after).complete
    if (phaseJustDone) setTimeout(() => { celebrate(); setPhaseDone(ph.id) }, 400)
    // Finishing a step moves on by itself, unless it also finished the phase (the banner takes over then).
    else if (!wasTask && taskStats(ref.task, after).complete) {
      const doneId = ref.task.id
      setTimeout(() => { if (taskIdRef.current === doneId) nextRef.current() }, 1100)
    }
  }, [app, allItems, phases, toggle]) // eslint-disable-line

  const fire = useCallback((trigger: string) => {
    const now = readChecked()
    for (const [id, ref] of allItems) if (ref.trigger === trigger && !now[id] && ref.task.id === task?.id) onToggle(id, true)
  }, [allItems, task?.id, onToggle]) // eslint-disable-line

  // Keep the active phase visible in the strip on narrow screens (horizontal scroll only).
  useEffect(() => {
    const strip = document.querySelector<HTMLElement>('.phase-strip')
    const el = strip?.querySelector<HTMLElement>('.ps-item.active')
    if (!strip || !el) return
    const left = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [pi, extra])

  // Arrow keys move between steps (not while typing or with a dialog open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (extra || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || document.querySelector('.modal-scrim')) return
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!app || !stats || !phase || !task) return <Navigate to="/app/library" replace />
  if (!user.commitments[app.slug]) return <Navigate to={`/app/library/${app.slug}`} replace />

  const ts = taskStats(task, checked)
  const totalSteps = phases.reduce((n, p) => n + p.tasks.length, 0)
  const stepsDone = stats.perPhase.reduce((n, p) => n + p.tasksDone, 0)
  const globalIndex = phases.slice(0, pi).reduce((n, p) => n + p.tasks.length, 0) + si + 1
  const isLast = pi === phases.length - 1 && si === phase.tasks.length - 1
  // Next unlocks once this step's checklist is ticked off.
  const lockedNext = !ts.complete && ts.total > 0
  const nextTask = si + 1 < phase.tasks.length ? phase.tasks[si + 1] : phases[pi + 1]?.tasks[0]
  const donePhase = phases.find((p) => p.id === phaseDone)
  const backToStep = { tab: phase.id, step: String(si) }

  return (
    <TriggerContext.Provider value={fire}>
      <div className="course">
        <header className="course-head">
          <div className="course-title">
            <span className="label">You are building</span>
            <b className="kit-name"><KitLogo app={app} size={20} />{app.name}</b>
          </div>
          <div className="course-meter">
            <div className="row between"><span className="label">{stepsDone} of {totalSteps} steps done</span><span className="course-pct">{Math.round(stats.pct * 100)}%</span></div>
            <Bar pct={stats.pct} />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className={`btn btn-sm ${showCosts ? 'btn-primary' : ''}`} onClick={() => setParams(showCosts ? backToStep : { tab: 'costs' })}><Calculator size={14} /> Costs</button>
            <button className={`btn btn-sm ${showDownloads ? 'btn-primary' : ''}`} onClick={() => setParams(showDownloads ? backToStep : { tab: 'downloads' })}><FolderDown size={14} /> Downloadables</button>
          </div>
        </header>

        <nav className="phase-strip" aria-label="Phases">
          {phases.map((p, i) => {
            const s = stats.perPhase[i]
            const active = !extra && i === pi
            const locked = LOCK_PROGRESSION && i > stats.currentPhase
            return (
              <button key={p.id} className={`ps-item ${active ? 'active' : ''} ${s.complete ? 'done' : ''}`} disabled={locked}
                onClick={() => go(i, i === pi && !extra ? si : firstUnfinished(i))} aria-current={active ? 'step' : undefined}>
                <span className="ps-top">
                  <span className="ps-num">{s.complete ? <Check size={11} /> : locked ? <Lock size={10} /> : i + 1}</span>
                  <span className="ps-label">{p.label}</span>
                </span>
                <span className="ps-bar"><i style={{ width: `${s.pct * 100}%` }} /></span>
              </button>
            )
          })}
        </nav>

        <div className="course-stage">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            {extra ? (
              <motion.main key={view} className="course-main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <header className="step-intro">
                  <span className="label">{showCosts ? 'Costs & running' : 'Downloadables'}</span>
                  <h1>{showCosts ? `What ${app.name} costs to run, and what it makes` : `Every ${app.name} file, ready to download`}</h1>
                  <p className="muted">{showCosts ? 'Every tool in the kit at today’s prices. Drag the sliders to see costs, profit and margin at any size.' : 'The PRDs, the database, every prompt, the env template and the marketing scripts. Each one is also inside the step that uses it.'}</p>
                </header>
                {showCosts ? <CostCalculator app={app} /> : <DownloadsPanel app={app} onZip={() => setZipOpen(true)} />}
              </motion.main>
            ) : (
              <motion.main key={task.id} className="course-main"
                initial={{ opacity: 0, x: dir * 56 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -56 }}
                transition={{ duration: 0.32, ease: EASE }}>
                <motion.header className="step-intro" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
                  <motion.div variants={RISE} className="step-top">
                    <div className="row wrap" style={{ gap: 10 }}>
                      <span className="phase-pill"><PhaseIcon icon={phase.icon} size={13} /> Phase {pi + 1} · {phase.label}</span>
                      <span className="label">Step {si + 1} of {phase.tasks.length}</span>
                      {globalIndex === 1 && stepsDone === 0 && <span className="chip chip-signal">Start here</span>}
                    </div>
                    <div className="step-top-nav">
                      <button className="btn btn-sm" onClick={prev} disabled={pi === 0 && si === 0}><ArrowLeft size={14} /> Previous</button>
                      <button className={`btn btn-sm ${ts.complete ? 'cn-ready' : ''}`} onClick={next} disabled={isLast || lockedNext}
                        title={lockedNext ? 'Tick the checklist below to continue' : undefined}>
                        {lockedNext && <Lock size={12} />} Next <ArrowRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                  <motion.h1 variants={RISE}>{task.title}</motion.h1>
                  <motion.p variants={RISE} className="muted">{task.outcome}</motion.p>
                  <motion.div variants={RISE} className="row wrap" style={{ gap: 16 }}>
                    <span className="meta"><Clock size={13} /> {fmtMinutes(task.minutes)}</span>
                    <span className="xp-tag">+{task.xp} XP</span>
                    <span className="meta money" style={{ visibility: ts.complete ? 'visible' : 'hidden' }}><Check size={13} /> Done</span>
                  </motion.div>
                  <motion.div variants={RISE} className="step-dots" aria-label={`Steps in ${phase.label}`}>
                    {phase.tasks.map((t, i) => (
                      <button key={t.id} title={`${i + 1}. ${t.title}`} aria-label={`Step ${i + 1}: ${t.title}`} aria-current={i === si ? 'step' : undefined}
                        className={`sd ${i === si ? 'active' : ''} ${taskStats(t, checked).complete ? 'done' : ''}`} onClick={() => go(pi, i)} />
                    ))}
                  </motion.div>
                </motion.header>

                {app.status === 'preview' && si === 0 && ['foundations', 'backend', 'outbound', 'inbound', 'paid'].includes(phase.id) && (
                  <p className="preview-note">Preview kit: the {app.name}-specific parts of this phase are shorter than the flagship kits.</p>
                )}

                <div className="step-content">
                  {task.blocks.map((b, i) => (
                    <motion.div key={i} className="step-block" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.36, ease: EASE, delay: 0.12 + Math.min(i * 0.05, 0.4) }}>
                      <BlockView b={b} />
                    </motion.div>
                  ))}
                </div>

                <motion.section className={`step-check ${ts.complete ? 'complete' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.36, ease: EASE, delay: 0.16 + Math.min(task.blocks.length * 0.05, 0.4) }}>
                  <div className="row between">
                    <b>{ts.complete ? 'Step complete' : 'Tick these off to finish this step'}</b>
                    <span className="muted">{ts.done} of {ts.total}</span>
                  </div>
                  <Bar pct={ts.total ? ts.done / ts.total : 0} tone={ts.complete ? 'money' : undefined} />
                  <div className="step-check-list">
                    {task.checklist.map((item) => {
                      const on = !!checked[item.id]
                      return (
                        <button key={item.id} className={`check ${on ? 'on' : ''}`} onClick={() => onToggle(item.id)}>
                          <Tick on={on} />
                          <span className="check-label">
                            {item.label}
                            <motion.i className="strike" initial={false} animate={{ scaleX: on ? 1 : 0 }} transition={{ duration: 0.35, ease: EASE }} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </motion.section>
              </motion.main>
            )}
          </AnimatePresence>
        </div>

        {!extra && (
          <footer className="course-nav"><div className="course-nav-inner">
            <button className="btn cn-btn" onClick={prev} disabled={pi === 0 && si === 0}>
              <ArrowLeft size={15} /> Previous
            </button>
            <div className="cn-mid">
              <span className="label">Step {globalIndex} of {totalSteps}</span>
              <span className="cn-next">{nextTask ? `Next: ${nextTask.title}` : 'Last step'}</span>
            </div>
            <button className={`btn cn-btn ${ts.complete ? 'ready' : ''}`} onClick={next} disabled={isLast || lockedNext}
              title={lockedNext ? 'Tick the checklist to continue' : undefined}>
              {lockedNext && <Lock size={13} />} Next <ArrowRight size={15} />
            </button>
          </div></footer>
        )}

        <AnimatePresence>
          {donePhase && (
            <motion.div className="phase-done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.24, ease: EASE }}>
              <Trophy size={20} />
              <div style={{ flex: 1 }}>
                <b>{donePhase.label} complete.</b>
                <span className="muted"> {phases.indexOf(donePhase) + 1} of {phases.length} phases done.</span>
              </div>
              {phases[phases.indexOf(donePhase) + 1] && (
                <button className="btn btn-sm btn-primary" onClick={() => { go(phases.indexOf(donePhase) + 1, 0, 1); setPhaseDone(null) }}>
                  Start {phases[phases.indexOf(donePhase) + 1].label} <ArrowRight size={14} />
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setPhaseDone(null)}>Close</button>
            </motion.div>
          )}
        </AnimatePresence>

        <DownloadCodeModal app={app} open={zipOpen} onClose={() => setZipOpen(false)} />
      </div>
    </TriggerContext.Provider>
  )
}
