// The design library lives in public/designs: index.json (the list) and one <slug>.json per design,
// written by scripts/designs. Loaded on demand so the Vault bundle stays small.
export interface Swatch { name: string; hex: string; var: string; role: string }
export interface FontDef { family: string; fallback: string; weights: number[]; role: string }
export interface TypeStep { name: string; size: string; weight: number; line_height: string; letter_spacing: string }
export interface DesignSummary {
  slug: string
  name: string
  url: string
  refero_url?: string
  vibe: string
  tags: string[]
  category: string
  theme: 'light' | 'dark'
  logo?: string
  preview_h: number
  palette: Swatch[]
  added: string
}
export interface DesignFull extends DesignSummary {
  compact_md: string
  extended_md: string
  /** The :root block and the Tailwind @theme block from the document's Quick Start. */
  css: string
  tailwind: string
}

const base = import.meta.env.BASE_URL
export const asset = (p: string) => `${base}designs/${p}`

let index: Promise<DesignSummary[]> | null = null
export function loadIndex() {
  index ??= fetch(asset('index.json')).then((r) => {
    if (!r.ok) throw new Error('Could not load designs')
    return r.json()
  })
  index.catch(() => (index = null))
  return index
}
const full = new Map<string, Promise<DesignFull>>()
export function loadDesign(slug: string) {
  if (!full.has(slug)) {
    const p = fetch(asset(`${slug}.json`)).then((r) => {
      if (!r.ok) throw new Error('Design not found')
      return r.json()
    })
    p.catch(() => full.delete(slug))
    full.set(slug, p)
  }
  return full.get(slug)!
}

/** Design tokens as JSON, read from the :root block. */
export function tokens(d: DesignFull) {
  const out: Record<string, Record<string, string>> = {}
  let group = 'other'
  for (const line of d.css.split('\n')) {
    const g = line.match(/\/\*\s*(.+?)\s*\*\//)
    if (g) { group = g[1]; continue }
    const m = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);?\s*$/)
    if (m) (out[group] ??= {})[m[1]] = m[2].replace(/;$/, '')
  }
  return JSON.stringify({ name: d.name, theme: d.theme, tokens: out }, null, 2)
}
