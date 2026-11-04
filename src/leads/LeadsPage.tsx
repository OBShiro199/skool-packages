import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, FolderOpen, Search, X } from 'lucide-react'
import { api, ApiError, type Facets, type LeadRow, type SavedSearch } from './api'
import { DATASETS, defsFor, fitToDataset, toServer, type DatasetId, type Filters } from './defs'
import { encodeFilters, readParams } from './url'
import { FilterBar } from './FilterBar'
import { LeadsTable } from './LeadsTable'
import { Popover } from './Popover'
import { ExportAllDialog, SavedList, SaveDialog } from './dialogs'
import { downloadCsv, toCsv } from './csv'
import { toast } from '../components/Toasts'
import '../styles/leads.css'

const PER_PAGE = 20
const MAX_PAGES = 100

// Filter options per dataset, cached for 30 minutes (PRD 9).
const facetCache = new Map<DatasetId, { at: number; facets: Facets }>()
async function loadFacets(d: DatasetId): Promise<Facets> {
  const hit = facetCache.get(d)
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.facets
  const { facets } = await api.facets(d)
  facetCache.set(d, { at: Date.now(), facets })
  return facets
}
const valueSets = (f: Facets) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, new Set(v.map((o) => o.value))]))

type Page = { key: string; rows: LeadRow[]; count: number; notice?: 'no_mobiles' }

/** Find Leads (PRD 11): dataset switch, stackable filters, exact counts, 20 rows a page, export. */
export default function LeadsPage() {
  const [params, setParams] = useSearchParams()
  const initial = useMemo(() => readParams(params), []) // eslint-disable-line react-hooks/exhaustive-deps

  const [dataset, setDataset] = useState<DatasetId>(initial.dataset)
  const [filters, setFiltersRaw] = useState<Filters>(() => fitToDataset(initial.filters ?? (initial.search ? {} : DATASETS[initial.dataset].defaultFilters), initial.dataset).filters)
  const [text, setText] = useState(initial.q)
  const [q, setQ] = useState(initial.q)
  const [page, setPage] = useState(initial.page)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [facets, setFacets] = useState<Facets | null>(null)
  const [current, setCurrent] = useState<SavedSearch | null>(null)
  const [openingSaved, setOpeningSaved] = useState(!!initial.search)

  const [data, setData] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  const [saving, setSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [exportingAll, setExportingAll] = useState(false)
  const [exportMenu, setExportMenu] = useState(false)
  const exportBtn = useRef<HTMLButtonElement>(null)

  const serverFilters = useMemo(() => toServer(filters, q), [filters, q])
  const queryKey = JSON.stringify([dataset, serverFilters, page])

  // any filter, text or dataset change: back to page 1, selection cleared
  const setFilters = useCallback((f: Filters) => {
    setFiltersRaw(f)
    setPage(1)
    setSelected(new Set())
  }, [])

  // debounce the search box (300 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== q) {
        setQ(text)
        setPage(1)
        setSelected(new Set())
      }
    }, 300)
    return () => clearTimeout(t)
  }, [text, q])

  // facets for the active dataset
  useEffect(() => {
    let alive = true
    setFacets(null)
    loadFacets(dataset).then((f) => alive && setFacets(f)).catch(() => alive && setFacets({}))
    return () => {
      alive = false
    }
  }, [dataset])

  // open a saved search from ?search=<id>
  useEffect(() => {
    if (!initial.search) return
    api
      .saved()
      .then(({ searches }) => {
        const s = searches.find((x) => x.id === initial.search)
        if (!s) return toast('That saved search no longer exists')
        applySaved(s)
      })
      .catch(() => toast('Could not open that saved search'))
      .finally(() => setOpeningSaved(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep the URL in step (no history entry per change)
  useEffect(() => {
    const p: Record<string, string> = { dataset }
    p.f = encodeFilters(filters) // always, so a cleared search reloads cleared rather than with the defaults
    if (q) p.q = q
    if (page > 1) p.page = String(page)
    if (current) p.search = current.id
    setParams(p, { replace: true })
  }, [dataset, filters, q, page, current, setParams])

  // the page: one request returns the rows and the exact count
  useEffect(() => {
    if (openingSaved) return
    const ctl = new AbortController()
    setLoading(true)
    setError('')
    api
      .search(dataset, serverFilters, (page - 1) * PER_PAGE, PER_PAGE, ctl.signal)
      .then((r) => setData({ key: queryKey, rows: r.rows, count: r.count.n, notice: r.notice }))
      .catch((e) => {
        if (ctl.signal.aborted) return
        setError(e instanceof ApiError ? e.message : 'Search is unavailable right now. Try again in a moment.')
      })
      .finally(() => !ctl.signal.aborted && setLoading(false))
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, retry, openingSaved])

  function applySaved(s: SavedSearch) {
    const raw = { ...s.search }
    const sq = typeof raw.q === 'string' ? raw.q : ''
    delete raw.v
    delete raw.q
    setDataset(s.dataset)
    setFiltersRaw(fitToDataset(raw, s.dataset).filters)
    setText(sq)
    setQ(sq)
    setPage(1)
    setSelected(new Set())
    setCurrent(s)
  }

  async function switchDataset(d: DatasetId) {
    if (d === dataset) return
    let sets: Record<string, Set<string>> | undefined
    try {
      sets = valueSets(await loadFacets(d))
    } catch {
      sets = undefined
    }
    const empty = !defsFor(dataset).some((def) => def.key in filters || (def.keys ?? []).some((k) => k in filters))
    const { filters: kept, dropped } = empty ? { filters: { ...DATASETS[d].defaultFilters }, dropped: 0 } : fitToDataset(filters, d, sets)
    setDataset(d)
    setFilters(Object.keys(kept).length ? kept : { ...DATASETS[d].defaultFilters })
    if (dropped) toast(`Removed ${dropped} ${dropped === 1 ? "filter that doesn't" : "filters that don't"} apply to ${DATASETS[d].label} leads`)
  }

  const rows = data?.rows ?? []
  const count = data?.count ?? null
  const firstLoad = loading && !data
  const stale = loading && !!data && data.key !== queryKey
  const pages = count === null ? MAX_PAGES : Math.min(MAX_PAGES, Math.max(1, Math.ceil(count / PER_PAGE)))
  const from = count ? (page - 1) * PER_PAGE + 1 : 0
  const to = count ? Math.min(count, (page - 1) * PER_PAGE + rows.length) : 0

  const exportSelected = async () => {
    try {
      const r = await api.exportBatch({ dataset, ids: [...selected] })
      if (!r.rows.length) return toast('Nothing to export')
      downloadCsv(toCsv(r.rows, dataset), dataset)
      toast(`${r.rows.length.toLocaleString('en-GB')} leads exported`)
      setSelected(new Set())
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Export is unavailable right now. Try again in a moment.')
    }
  }

  if (openingSaved) {
    return (
      <div className="ld-page">
        <div className="ld-toolbar"><span className="ld-skel" style={{ width: 280 }} /></div>
        <div className="ld-filterbar"><span className="ld-skel" style={{ width: 120 }} /><span className="ld-skel" style={{ width: 140 }} /></div>
        <div className="ld-results"><table className="ld-table"><tbody>{Array.from({ length: 12 }, (_, i) => <tr key={i}><td><span className="ld-skel" style={{ width: `${50 + ((i * 13) % 40)}%` }} /></td></tr>)}</tbody></table></div>
      </div>
    )
  }

  return (
    <div className="ld-page">
      <div className="ld-toolbar">
        <div className="ld-seg" role="radiogroup" aria-label="Dataset">
          {(Object.keys(DATASETS) as DatasetId[]).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={dataset === d} className={dataset === d ? 'on' : ''} onClick={() => switchDataset(d)}>
              {DATASETS[d].label}
            </button>
          ))}
        </div>
        <label className="ld-search">
          <Search size={14} aria-hidden />
          <span className="sr-only">Search the database</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name, title or company" maxLength={80} />
          {text && <button type="button" aria-label="Clear search" onClick={() => setText('')}><X size={13} /></button>}
        </label>
        <span className="ld-count num">{count === null ? '…' : count.toLocaleString('en-GB')} leads</span>
        {current && (
          <span className="ld-pill ld-pill-blue ld-saved-pill">
            {current.name}
            <button type="button" aria-label="Close saved search" onClick={() => setCurrent(null)}><X size={11} /></button>
          </span>
        )}
        <span className="ld-grow" />
        <button type="button" className="ld-btn" onClick={() => setShowSaved(true)}><FolderOpen size={14} /> Saved</button>
        <button type="button" className="ld-btn" onClick={() => setSaving(true)}>{current ? 'Save' : 'Save search'}</button>
        <button ref={exportBtn} type="button" className="ld-btn" disabled={!rows.length} onClick={() => setExportMenu(true)} aria-haspopup="menu">
          <Download size={14} /> Export <ChevronDown size={13} />
        </button>
        {exportMenu && (
          <Popover anchor={exportBtn.current} onClose={() => setExportMenu(false)} width={280} label="Export">
            <div className="ld-editor">
              <button type="button" className="ld-option" onClick={() => { setExportMenu(false); setExportingAll(true) }}>
                <span className="ld-option-label">
                  Export all {count === null ? '' : count.toLocaleString('en-GB')} matching {DATASETS[dataset].label} leads
                </span>
              </button>
              <p className="ld-hint">Up to 5,000 leads a month. Larger searches export as much of your allowance as is left.</p>
            </div>
          </Popover>
        )}
      </div>

      <FilterBar dataset={dataset} filters={filters} setFilters={setFilters} facets={facets} />

      <div className="ld-results">
        {error ? (
          <div className="ld-state">
            <b>Search failed</b>
            <p>{error}</p>
            <button type="button" className="ld-btn" onClick={() => setRetry((n) => n + 1)}>Retry</button>
          </div>
        ) : !loading && data?.notice === 'no_mobiles' ? (
          <div className="ld-state">
            <b>The mobile filter is not ready for US leads yet.</b>
            <p>Mobile numbers still show in the results and exports. Remove the mobile filter to see them.</p>
            <button type="button" className="ld-btn" onClick={() => { const f = { ...filters }; delete f.hasMobile; delete f.mobileCodes; setFilters(f) }}>Remove mobile filter</button>
          </div>
        ) : !loading && data && !rows.length ? (
          <div className="ld-state">
            <b>No leads match</b>
            <p>Remove a filter or two to widen the search.</p>
            <button type="button" className="ld-btn" onClick={() => { setFilters({}); setText(''); setQ('') }}>Clear filters</button>
          </div>
        ) : (
          <LeadsTable rows={rows} dataset={dataset} selected={selected} setSelected={setSelected} stale={stale} loading={firstLoad} />
        )}
      </div>

      <div className="ld-footer">
        <span className="num">{firstLoad ? 'Loading' : count ? `Leads ${from.toLocaleString('en-GB')}–${to.toLocaleString('en-GB')} of ${count.toLocaleString('en-GB')}` : 'No leads'}</span>
        <span className="ld-grow" />
        {count !== null && count > PER_PAGE * MAX_PAGES && <span className="ld-muted">Browsing stops at {MAX_PAGES} pages. Export to get the rest.</span>}
        <button type="button" className="ld-btn" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelected(new Set()) }}><ChevronLeft size={14} /> Previous</button>
        <button type="button" className="ld-btn" disabled={page >= pages} onClick={() => { setPage(page + 1); setSelected(new Set()) }}>Next <ChevronRight size={14} /></button>
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div className="ld-selbar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.2 }}>
            <span className="num">{selected.size} selected</span>
            <button type="button" className="ld-x" aria-label="Clear selection" onClick={() => setSelected(new Set())}><X size={14} /></button>
            <button type="button" className="ld-btn ld-btn-primary" onClick={exportSelected}><Download size={14} /> Export CSV</button>
          </motion.div>
        )}
      </AnimatePresence>

      {saving && (
        <SaveDialog dataset={dataset} search={{ v: 2, ...filters, ...(q ? { q } : {}) }} current={current} onClose={() => setSaving(false)} onSaved={setCurrent} />
      )}
      {showSaved && <SavedList onClose={() => setShowSaved(false)} onOpen={(s) => { applySaved(s); setShowSaved(false) }} />}
      {exportingAll && count !== null && (
        <ExportAllDialog dataset={dataset} filters={serverFilters} total={count} onClose={() => { setExportingAll(false); setSelected(new Set()) }} />
      )}
    </div>
  )
}
