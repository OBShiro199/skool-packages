import type { AppDef, Phase, Task } from '../content/types'
import { getPhases } from '../content/apps'

export type Checked = Record<string, string>

export function taskStats(task: Task, checked: Checked) {
  const total = task.checklist.length
  const done = task.checklist.filter((i) => checked[i.id]).length
  return { total, done, complete: total > 0 && done === total, xp: total ? Math.round((task.xp * done) / total) : 0 }
}

export function phaseStats(phase: Phase, checked: Checked) {
  let total = 0, done = 0, xp = 0, xpTotal = 0, tasksDone = 0
  for (const t of phase.tasks) {
    const s = taskStats(t, checked)
    total += s.total; done += s.done; xp += s.xp; xpTotal += t.xp
    if (s.complete) tasksDone++
  }
  return { total, done, xp, xpTotal, tasksDone, tasks: phase.tasks.length, pct: total ? done / total : 0, complete: total > 0 && done === total }
}

export function appStats(app: AppDef, checked: Checked) {
  const phases = getPhases(app)
  let total = 0, done = 0, xp = 0, xpTotal = 0, minutesLeft = 0
  const perPhase = phases.map((p) => {
    const s = phaseStats(p, checked)
    total += s.total; done += s.done; xp += s.xp; xpTotal += s.xpTotal
    for (const t of p.tasks) if (!taskStats(t, checked).complete) minutesLeft += t.minutes
    return s
  })
  const current = phases.findIndex((_, i) => !perPhase[i].complete)
  return { total, done, xp, xpTotal, pct: total ? done / total : 0, perPhase, phases, currentPhase: current === -1 ? phases.length - 1 : current, minutesLeft }
}

export const LEVELS = [
  { name: 'Idea', xp: 0 },
  { name: 'Builder', xp: 150 },
  { name: 'Shipper', xp: 500 },
  { name: 'Seller', xp: 1000 },
  { name: 'Founder', xp: 1800 },
  { name: 'Operator', xp: 2800 },
]

export function levelFor(xp: number) {
  let i = 0
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++
  const cur = LEVELS[i]
  const next = LEVELS[i + 1]
  return { index: i, name: cur.name, next: next?.name, floor: cur.xp, ceil: next?.xp ?? cur.xp, pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 }
}

export function fmtMinutes(m: number) {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}
