// Small block and task builders for the Outbounder kit, so the content files stay readable.
import type { Block, ChecklistItem, Task } from '../../types'

type CodeLang = Extract<Block, { type: 'code' }>['lang']
type KeyRow = Extract<Block, { type: 'keys' }>['rows'][number]

export const p = (text: string): Block => ({ type: 'p', text })
export const eli5 = (title: string, text: string): Block => ({ type: 'callout', tone: 'eli5', title, text })
export const tip = (title: string, text: string): Block => ({ type: 'callout', tone: 'tip', title, text })
export const warn = (title: string, text: string): Block => ({ type: 'callout', tone: 'warn', title, text })
export const steps = (...items: string[]): Block => ({ type: 'steps', items })
export const code = (id: string, filename: string, lang: CodeLang, src: string): Block => ({ type: 'code', id, filename, lang, code: src.trim() })
export const prompt = (id: string, title: string, src: string): Block => ({ type: 'prompt', id, title, code: src.trim() })
export const keys = (rows: KeyRow[]): Block => ({ type: 'keys', rows })
export const ascii = (src: string, caption: string): Block => ({ type: 'ascii', code: src.replace(/^\n+|\s+$/g, ''), caption })
export const table = (head: string[], rows: string[][]): Block => ({ type: 'table', head, rows })
export const links = (items: { label: string; url: string }[]): Block => ({ type: 'links', items })
export const mistakes = (items: { mistake: string; fix: string }[]): Block => ({ type: 'mistakes', items })

type CheckSpec = string | [string, ChecklistItem['trigger']]

export interface TaskSpec {
  id: string
  title: string
  outcome: string
  minutes: number
  xp: number
  blocks: Block[]
  checklist: CheckSpec[]
}

/** Checklist ids become `<taskId>-c1`, `<taskId>-c2`... so they stay unique. */
export const task = (t: TaskSpec): Task => ({
  ...t,
  checklist: t.checklist.map((item, i) => {
    const [label, trigger] = typeof item === 'string' ? [item, undefined] : item
    const out: ChecklistItem = { id: `${t.id}-c${i + 1}`, label }
    if (trigger) out.trigger = trigger
    return out
  }),
})
