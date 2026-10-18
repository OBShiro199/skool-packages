// Small block and task builders for the Bookwell kit, so the content files stay readable.
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

/** Checklist item with an explicit id. Bookwell keeps its original ids because user progress is stored by id. */
export const ck = (id: string, label: string, trigger?: ChecklistItem['trigger']): ChecklistItem =>
  trigger ? { id, label, trigger } : { id, label }

export const task = (t: Task): Task => t
