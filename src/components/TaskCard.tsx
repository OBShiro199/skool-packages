import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, ChevronDown, Lock } from 'lucide-react'
import type { Task } from '../content/types'
import type { Checked } from '../lib/progress'
import { taskStats, fmtMinutes } from '../lib/progress'
import { BlockView } from './Blocks'

export function Tick({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <span className={`tick ${on ? 'on' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size - 6} height={size - 6}>
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square"
          initial={false} animate={{ pathLength: on ? 1 : 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.1, 1] }} />
      </svg>
    </span>
  )
}

export type StepState = 'done' | 'current' | 'locked'

/**
 * One step of the journey. Done steps collapse to a ticked row (click to reopen),
 * the current step is open with its instructions and checklist, locked steps are dimmed.
 */
export function TaskCard({ task, index, total, state, checked, open, onOpen, onToggle, isFirstEver, prevTitle }: {
  task: Task; index: number; total: number; state: StepState; checked: Checked; open: boolean
  onOpen: () => void; onToggle: (itemId: string) => void; isFirstEver?: boolean; prevTitle?: string
}) {
  const s = taskStats(task, checked)
  const locked = state === 'locked'
  return (
    <motion.article layout="position" className={`step ${state} ${open ? 'open' : ''}`} id={`task-${task.id}`}>
      <button className="step-head" onClick={locked ? undefined : onOpen} aria-expanded={open} disabled={locked}>
        <span className="step-num">
          {state === 'done' ? <Tick on size={28} /> : locked ? <Lock size={14} /> : index + 1}
        </span>
        <span className="step-title">
          {state === 'current' && (
            <span className="step-badge">{isFirstEver ? 'Start here' : `Step ${index + 1} of ${total}`}</span>
          )}
          <b>{task.title}</b>
          <span>{locked ? `Unlocks when you finish “${prevTitle}”` : task.outcome}</span>
        </span>
        {!locked && (
          <span className="step-meta">
            {state !== 'done' && <span className="muted">{fmtMinutes(task.minutes)}</span>}
            {state === 'done' ? <span className="money">Done</span> : <span className="muted">{s.done}/{s.total}</span>}
            <ChevronDown size={18} className="chev" />
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && !locked && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.1, 1] }} style={{ overflow: 'hidden' }}>
            <div className="step-body">
              {task.blocks.map((b, i) => <BlockView key={i} b={b} />)}

              <div className="checklist">
                <div className="checklist-head">
                  <b>Tick these off to finish this step</b>
                  <span className="muted">{s.done} of {s.total}</span>
                </div>
                {task.checklist.map((item) => {
                  const on = !!checked[item.id]
                  return (
                    <button key={item.id} className={`check ${on ? 'on' : ''}`} onClick={() => onToggle(item.id)}>
                      <Tick on={on} />
                      <span className="check-label">
                        {item.label}
                        <motion.i className="strike" initial={false} animate={{ scaleX: on ? 1 : 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.1, 1] }} />
                      </span>
                    </button>
                  )
                })}
                {s.complete && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="task-done-note">
                    <Check size={15} /> Step done. +{task.xp} XP. {index + 1 < total ? <>Next step unlocked <ArrowRight size={14} /></> : 'Phase complete.'}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
