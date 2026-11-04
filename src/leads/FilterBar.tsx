import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, Plus, Search, X } from 'lucide-react'
import type { Facets } from './api'
import { Popover } from './Popover'
import { Editor, MultiEditor, set } from './editors'
import { chipParts, DATASETS, defsFor, displayValue, filterKeys, FILTERS, isSet, QUICK_KEYS, type DatasetId, type FilterDef, type Filters } from './defs'
import { flagFor } from './flags'

type Props = { dataset: DatasetId; filters: Filters; setFilters: (f: Filters) => void; facets: Facets | null }

const def = (key: string) => FILTERS.find((f) => f.key === key)!

/** Chips, "Add filter", quick filters and "Clear all" (PRD 10.2, 10.3, 11.1). */
export function FilterBar({ dataset, filters, setFilters, facets }: Props) {
  const defs = defsFor(dataset)
  const chips = defs.filter((d) => !QUICK_KEYS.includes(d.key) && isSet(filters, d))
  const anySet = defs.some((d) => isSet(filters, d))

  return (
    <div className="ld-filterbar" role="toolbar" aria-label="Filters">
      {chips.map((d) => (
        <Chip key={d.key} def={d} {...{ dataset, filters, setFilters, facets }} />
      ))}
      <AddFilter {...{ dataset, filters, setFilters, facets }} />
      <span className="ld-divider" aria-hidden />
      <Quick k="countries" width={288} {...{ dataset, filters, setFilters, facets }} />
      <Quick k="sizes" {...{ dataset, filters, setFilters, facets }} />
      <Quick k="revenues" {...{ dataset, filters, setFilters, facets }} />
      {DATASETS[dataset].hasMobiles && <QuickBool k="hasMobile" noun="mobile" {...{ filters, setFilters }} />}
      <QuickBool k="hasEmail" noun="email" {...{ filters, setFilters }} />
      <QuickBool k="hasLinkedin" noun="LinkedIn" {...{ filters, setFilters }} />
      <QuickBool k="hasWebsite" noun="website" {...{ filters, setFilters }} />
      <span className="ld-grow" />
      <button type="button" className="ld-link ld-clear" style={{ visibility: anySet ? 'visible' : 'hidden' }} onClick={() => setFilters({})}>
        Clear all
      </button>
    </div>
  )
}

function Chip({ def, dataset, filters, setFilters, facets }: Props & { def: FilterDef }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const { first, more } = chipParts(filters, def)
  const remove = () => {
    let next = filters
    for (const k of filterKeys(def)) next = set(next, k, undefined)
    setFilters(next)
  }
  return (
    <span className="ld-chip">
      <button ref={ref} type="button" className="ld-chip-main" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="ld-chip-label">{def.label}:</span>
        <span className="ld-chip-val">{first}</span>
        {more > 0 && <span className="ld-chip-more">+{more}</span>}
      </button>
      <button type="button" className="ld-chip-x" aria-label={`Remove ${def.label} filter`} onClick={remove}>
        <X size={12} />
      </button>
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} label={def.label}>
          <p className="ld-pop-title">{def.label}</p>
          <Editor {...{ def, filters, setFilters, facets, dataset }} onDone={() => setOpen(false)} />
        </Popover>
      )}
    </span>
  )
}

function AddFilter({ dataset, filters, setFilters, facets }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<FilterDef | null>(null)
  const close = () => {
    setOpen(false)
    setEditing(null)
    setQ('')
  }
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const unset = defsFor(dataset).filter((d) => !QUICK_KEYS.includes(d.key) && !isSet(filters, d))
    const hits = needle ? unset.filter((d) => d.label.toLowerCase().includes(needle) || d.group.toLowerCase().includes(needle)) : unset
    const out: Record<string, FilterDef[]> = {}
    for (const d of hits) (out[d.group] ??= []).push(d)
    return out
  }, [dataset, filters, q])

  const pick = (d: FilterDef) => {
    if (d.kind === 'bool') {
      setFilters(set(filters, d.key, true))
      close()
    } else setEditing(d)
  }

  return (
    <>
      <button ref={ref} type="button" className="ld-add" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Plus size={13} /> Add filter
      </button>
      {open && (
        <Popover anchor={ref.current} onClose={close} label="Add filter" width={300}>
          {editing ? (
            <>
              <p className="ld-pop-title">
                <button type="button" className="ld-back" onClick={() => setEditing(null)} aria-label="Back to filters">
                  <ArrowLeft size={14} />
                </button>
                {editing.label}
              </p>
              <Editor def={editing} {...{ filters, setFilters, facets, dataset }} onDone={close} />
            </>
          ) : (
            <div className="ld-editor">
              <div className="ld-search-in">
                <Search size={13} aria-hidden />
                <input autoFocus placeholder="Find a filter" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a filter" />
              </div>
              <div className="ld-options">
                {Object.keys(groups).length === 0 && <p className="ld-muted">No matches.</p>}
                {Object.entries(groups).map(([g, list]) => (
                  <div key={g}>
                    <p className="ld-group">{g}</p>
                    {list.map((d) => (
                      <button key={d.key} type="button" className="ld-option" onClick={() => pick(d)}>
                        <span className="ld-option-label">{d.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Popover>
      )}
    </>
  )
}

/** Multi-select quick filter: country (with flags), company size, revenue. */
function Quick({ k, width = 260, dataset, filters, setFilters, facets }: Props & { k: string; width?: number }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const d = def(k)
  const vals = (filters[k] as string[] | undefined) ?? []
  const label = vals.length ? displayValue(d.facet, vals[0]).replace(' employees', '') : d.key === 'countries' ? 'Country' : d.label
  return (
    <>
      <button ref={ref} type="button" className={`ld-quick ${vals.length ? 'on' : ''}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {k === 'countries' && vals.length > 0 && <span aria-hidden>{flagFor(vals[0])}</span>}
        <span className="ld-quick-val">{label}</span>
        {vals.length > 1 && <span className="ld-chip-more">+{vals.length - 1}</span>}
        <ChevronDown size={13} aria-hidden />
      </button>
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} label={d.label} width={width}>
          <MultiEditor def={d} {...{ filters, setFilters, facets, dataset }} />
        </Popover>
      )}
    </>
  )
}

/** Any / with / without (Mobile, Email, LinkedIn, Website). */
function QuickBool({ k, noun, filters, setFilters }: { k: string; noun: string; filters: Filters; setFilters: (f: Filters) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const v = filters[k]
  const cap = noun.charAt(0).toUpperCase() + noun.slice(1)
  const label = v === true ? `Has ${noun}` : v === false ? `No ${noun}` : cap
  const choose = (x: boolean | undefined) => {
    setFilters(set(filters, k, x))
    setOpen(false)
  }
  return (
    <>
      <button ref={ref} type="button" className={`ld-quick ${typeof v === 'boolean' ? 'on' : ''}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="ld-quick-val">{label}</span>
        <ChevronDown size={13} aria-hidden />
      </button>
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} label={cap} width={200}>
          <div className="ld-editor">
            <div className="ld-options">
              {([['Any', undefined], [`With ${noun}`, true], [`Without ${noun}`, false]] as const).map(([text, x]) => (
                <button key={text} type="button" className={`ld-option ${v === x ? 'on' : ''}`} onClick={() => choose(x)}>
                  <span className="ld-option-label">{text}</span>
                </button>
              ))}
            </div>
          </div>
        </Popover>
      )}
    </>
  )
}

