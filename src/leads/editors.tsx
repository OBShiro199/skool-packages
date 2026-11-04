import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Facets } from './api'
import { compact, displayValue, filterKeys, type DatasetId, type FilterDef, type Filters } from './defs'
import { flagFor } from './flags'

type Props = { def: FilterDef; filters: Filters; setFilters: (f: Filters) => void; facets: Facets | null; dataset: DatasetId; onDone?: () => void }

/** Pick from real values with counts (PRD 10.2, multi editor). */
export function MultiEditor({ def, filters, setFilters, facets }: Props) {
  const [q, setQ] = useState('')
  const selected = (filters[def.key] as string[] | undefined) ?? []
  const all = facets?.[def.facet!] ?? null
  const options = useMemo(() => {
    if (!all) return []
    let list = [...all]
    if (def.order) list.sort((a, b) => idx(def.order!, a.value) - idx(def.order!, b.value))
    for (const v of selected) if (!list.some((o) => o.value === v)) list.unshift({ value: v, n: null })
    const needle = q.trim().toLowerCase()
    if (needle) list = list.filter((o) => selected.includes(o.value) || displayValue(def.facet, o.value).toLowerCase().includes(needle))
    return list.slice(0, 250)
  }, [all, def, q, selected])
  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
    setFilters(set(filters, def.key, next.length ? next : undefined))
  }
  const withFlags = def.facet === 'country' || def.facet === 'hq_country'
  return (
    <div className="ld-editor">
      {(all?.length ?? 0) > 8 && <input className="ld-input" autoFocus placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${def.label}`} />}
      <div className="ld-options" role="listbox" aria-multiselectable>
        {!all && <p className="ld-muted">Loading options…</p>}
        {all && !options.length && <p className="ld-muted">No matches.</p>}
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button key={o.value} type="button" role="option" aria-selected={on} className={`ld-option ${on ? 'on' : ''}`} onClick={() => toggle(o.value)}>
              <span className="ld-check">{on && <Check size={12} strokeWidth={2.5} />}</span>
              {withFlags && <span aria-hidden>{flagFor(o.value)}</span>}
              <span className="ld-option-label">{displayValue(def.facet, o.value)}</span>
              {o.n !== null && <span className="ld-count">{compact(o.n)}</span>}
            </button>
          )
        })}
      </div>
      {def.hint && <p className="ld-hint">{def.hint}</p>}
      <div className="ld-editor-foot">
        <span>{selected.length} selected</span>
        <button type="button" className="ld-link" onClick={() => setFilters(set(filters, def.key, undefined))} disabled={!selected.length}>Clear</button>
      </div>
    </div>
  )
}

/** Type any values (PRD 10.2, pills editor). */
export function PillsEditor({ def, filters, setFilters, facets, dataset }: Props) {
  const [text, setText] = useState('')
  const vals = (filters[def.key] as string[] | undefined) ?? []
  const add = (raw: string) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...vals]
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p)
    setFilters(set(filters, def.key, next.slice(0, 50)))
    setText('')
  }
  const remove = (v: string) => {
    const next = vals.filter((x) => x !== v)
    setFilters(set(filters, def.key, next.length ? next : undefined))
  }
  const suggestions = def.facet && text.trim() ? (facets?.[def.facet] ?? []).filter((o) => o.value.toLowerCase().includes(text.trim().toLowerCase()) && !vals.includes(o.value)).slice(0, 6) : []
  const ph = typeof def.placeholder === 'function' ? def.placeholder(dataset) : def.placeholder
  return (
    <div className="ld-editor">
      <div className="ld-pills-input">
        {vals.map((v) => (
          <span key={v} className="ld-tag">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => remove(v)}><X size={11} /></button>
          </span>
        ))}
        <input
          autoFocus
          value={text}
          placeholder={vals.length ? '' : ph}
          aria-label={def.label}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(text) }
            if (e.key === 'Backspace' && !text && vals.length) remove(vals[vals.length - 1])
          }}
          onBlur={() => add(text)}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="ld-options">
          {suggestions.map((o) => (
            <button key={o.value} type="button" className="ld-option" onMouseDown={(e) => { e.preventDefault(); add(o.value) }}>
              <span className="ld-option-label">{o.value}</span>
              {o.n !== null && <span className="ld-count">{compact(o.n)}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="ld-hint">Press Enter or comma after each one.{def.hint ? ` ${def.hint}` : ''}</p>
    </div>
  )
}

/** Yes or no (PRD 10.2, bool editor). */
export function BoolEditor({ def, filters, setFilters, onDone }: Props) {
  const v = filters[def.key]
  return (
    <div className="ld-editor">
      <div className="ld-options">
        {[true, false].map((b, i) => (
          <button key={String(b)} type="button" className={`ld-option ${v === b ? 'on' : ''}`} onClick={() => { setFilters(set(filters, def.key, b)); onDone?.() }}>
            <span className="ld-check">{v === b && <Check size={12} strokeWidth={2.5} />}</span>
            <span className="ld-option-label">{def.bool![i]}</span>
          </button>
        ))}
      </div>
      {def.hint && <p className="ld-hint">{def.hint}</p>}
    </div>
  )
}

/** Presets, then from and to (PRD 10.2, range editor). */
export function RangeEditor({ def, filters, setFilters, onDone }: Props) {
  const [kMin, kMax] = filterKeys(def) as [string, string]
  const [lo, setLo] = useState(typeof filters[kMin] === 'number' ? String(filters[kMin]) : '')
  const [hi, setHi] = useState(typeof filters[kMax] === 'number' ? String(filters[kMax]) : '')
  const apply = (min?: number, max?: number) => {
    let next = set(set(filters, kMin, undefined), kMax, undefined)
    if (min !== undefined && Number.isFinite(min)) next = set(next, kMin, min)
    if (max !== undefined && Number.isFinite(max)) next = set(next, kMax, max)
    setFilters(next)
    onDone?.()
  }
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s))
  return (
    <div className="ld-editor">
      {def.presets && (
        <div className="ld-options">
          {def.presets.map((p) => (
            <button key={p.label} type="button" className="ld-option" onClick={() => apply(p.min, p.max)}>
              <span className="ld-option-label">{p.label}</span>
            </button>
          ))}
        </div>
      )}
      <form className="ld-range" onSubmit={(e) => { e.preventDefault(); apply(num(lo), num(hi)) }}>
        <label>From<input className="ld-input" inputMode="numeric" value={lo} onChange={(e) => setLo(e.target.value.replace(/[^0-9]/g, ''))} /></label>
        <label>To<input className="ld-input" inputMode="numeric" value={hi} onChange={(e) => setHi(e.target.value.replace(/[^0-9]/g, ''))} /></label>
        <button className="ld-btn" type="submit">Apply</button>
      </form>
      {def.hint && <p className="ld-hint">{def.hint}</p>}
    </div>
  )
}

export function Editor(p: Props) {
  if (p.def.kind === 'multi') return <MultiEditor {...p} />
  if (p.def.kind === 'pills') return <PillsEditor {...p} />
  if (p.def.kind === 'bool') return <BoolEditor {...p} />
  return <RangeEditor {...p} />
}

const idx = (order: string[], v: string) => {
  const i = order.indexOf(v)
  return i === -1 ? order.length : i
}

/** A new filters object with one key set (or removed when value is undefined). */
export function set(f: Filters, key: string, value: unknown): Filters {
  const next = { ...f }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}
