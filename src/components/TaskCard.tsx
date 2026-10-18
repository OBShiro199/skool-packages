import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Clock, Sparkles } from 'lucide-react'
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

export function TaskCard({ task, index, checked, open, onOpen, onToggle }: {
  task: Task; index: number; checked: Checked; open: boolean; onOpen: () => void; onToggle: (itemId: string) => void
}) {
  const s = taskStats(task, checked)
  return (
    <motion.article layout="position" className={`task ${open ? 'open' : ''} ${s.complete ? 'complete' : ''}`} id={`task-${task.id}`}>
      <button className="task-head" onClick={onOpen} aria-expanded={open}>
        <span className="task-idx mono">{s.complete ? <Tick on size={26} /> : String(index + 1).padStart(2, '0')}</span>
        <span className="task-title">
          <b>{task.title}</b>
          <span>{task.outcome}</span>
        </span>
        <span className="task-meta">
          <span className="chip"><Clock size={12} /> {fmtMinutes(task.minutes)}</span>
          <span className={`chip ${s.complete ? 'chip-money' : ''}`}><Sparkles size={12} /> {s.complete ? `${task.xp} XP` : `${s.xp}/${task.xp}`}</span>
          <span className="task-mini mono">{s.done}/{s.total}</span>
          <ChevronDown size={18} className="chev" />
        </span>
      </button>
      <div className="task-progress"><i style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }} /></div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.1, 1] }} style={{ overflow: 'hidden' }}>
            <div className="task-body">
              <div className="task-blocks">
                {task.blocks.map((b, i) => <BlockView key={i} b={b} />)}
              </div>
              <div className="checklist">
                <div className="row between">
                  <span className="label">Checklist · tick as you go</span>
                  <span className="label">{s.done} of {s.total}</span>
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
                      {item.trigger && !on && <span className="label auto">auto-ticks on {item.trigger.split(':')[0]}</span>}
                    </button>
                  )
                })}
                {s.complete && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="task-done-note">
                    <Check size={15} /> Step complete. +{task.xp} XP banked.
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
