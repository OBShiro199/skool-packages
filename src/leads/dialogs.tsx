import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { api, ApiError, type LeadRow, type SavedSearch } from './api'
import { chipParts, DATASETS, FILTERS, isSet, type DatasetId, type Filters } from './defs'
import { downloadCsv, toCsv } from './csv'
import { toast } from '../components/Toasts'

export function Dialog({ title, onClose, children, width = 440 }: { title: string; onClose?: () => void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  return createPortal(
    <div className="ld-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <motion.div className="ld-dialog" role="dialog" aria-modal="true" aria-label={title} style={{ width }}
        initial={{ opacity: 0, y: 8, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
        <div className="ld-dialog-head">
          <h2>{title}</h2>
          {onClose && <button type="button" className="ld-x" onClick={onClose} aria-label="Close"><X size={16} /></button>}
        </div>
        {children}
      </motion.div>
    </div>,
    document.body,
  )
}

/** "Save search" (PRD 13.2). With an open saved search: update it or save as new. */
export function SaveDialog({ dataset, search, current, onClose, onSaved }: { dataset: DatasetId; search: Filters; current: SavedSearch | null; onClose: () => void; onSaved: (s: SavedSearch) => void }) {
  const [mode, setMode] = useState<'update' | 'new'>(current ? 'update' : 'new')
  const [name, setName] = useState(current ? `${current.name} (copy)` : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'new' && !name.trim()) return setError('Give the search a name.')
    setBusy(true)
    try {
      const r = mode === 'update' && current
        ? await api.save({ id: current.id, dataset, search })
        : await api.save({ name: name.trim(), dataset, search })
      toast(`Saved “${r.search.name}”`)
      onSaved(r.search)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'duplicate' ? err.message : 'That did not save. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog title="Save search" onClose={onClose}>
      <form className="ld-dialog-body" onSubmit={save}>
        {current && (
          <div className="ld-seg" role="radiogroup" aria-label="How to save">
            <button type="button" role="radio" aria-checked={mode === 'update'} className={mode === 'update' ? 'on' : ''} onClick={() => setMode('update')}>Update this search</button>
            <button type="button" role="radio" aria-checked={mode === 'new'} className={mode === 'new' ? 'on' : ''} onClick={() => setMode('new')}>Save as new</button>
          </div>
        )}
        {mode === 'new' && (
          <label className="ld-field">Name
            <input className="ld-input" autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="UK IT directors" />
          </label>
        )}
        <p className="ld-muted">Saves these filters. Open it any time to run the search again with the latest data.</p>
        <p className="ld-error" role="alert">{error}</p>
        <div className="ld-dialog-actions">
          <button type="button" className="ld-btn" onClick={onClose}>Cancel</button>
          <button className="ld-btn ld-btn-primary" disabled={busy}>{mode === 'update' ? 'Update' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  )
}

/** Saved searches: name, dataset and filters, with Open and Delete (PRD 13.2). */
export function SavedList({ onOpen, onClose }: { onOpen: (s: SavedSearch) => void; onClose: () => void }) {
  const [list, setList] = useState<SavedSearch[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.saved().then((r) => setList(r.searches)).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your saved searches.'))
  }, [])
  const remove = async (s: SavedSearch) => {
    await api.deleteSaved(s.id).catch(() => toast('That did not delete. Try again.'))
    setList((l) => l?.filter((x) => x.id !== s.id) ?? null)
  }
  return (
    <Dialog title="Saved searches" onClose={onClose} width={560}>
      <div className="ld-dialog-body">
        {error && <p className="ld-error">{error}</p>}
        {!list && !error && <p className="ld-muted">Loading…</p>}
        {list && !list.length && <p className="ld-muted">No saved searches yet. Set some filters, then press "Save search".</p>}
        <div className="ld-saved">
          {list?.map((s) => {
            const f = { ...s.search }
            delete f.v
            delete f.q
            const chips = FILTERS.filter((d) => isSet(f, d)).slice(0, 4)
            return (
              <div key={s.id} className="ld-saved-row">
                <div className="ld-saved-main">
                  <b>{s.name}</b>
                  <div className="ld-saved-chips">
                    <span className="ld-pill ld-pill-blue">{DATASETS[s.dataset]?.label ?? s.dataset}</span>
                    {s.search.q && <span className="ld-pill">“{s.search.q}”</span>}
                    {chips.map((d) => {
                      const { first, more } = chipParts(f, d)
                      return <span key={d.key} className="ld-pill">{d.label}: {first}{more ? ` +${more}` : ''}</span>
                    })}
                  </div>
                </div>
                <button type="button" className="ld-btn" onClick={() => onOpen(s)}>Open</button>
                <button type="button" className="ld-link" onClick={() => remove(s)} aria-label={`Delete ${s.name}`}>Delete</button>
              </div>
            )
          })}
        </div>
      </div>
    </Dialog>
  )
}

/**
 * "Export all matching leads" (PRD 14.2): 1,000 at a time with a 250 ms pause, up to the member's
 * monthly allowance. Stopping still downloads what is ready.
 */
export function ExportAllDialog({ dataset, filters, total, onClose }: { dataset: DatasetId; filters: Filters; total: number; onClose: () => void }) {
  const [done, setDone] = useState(0)
  const [target, setTarget] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)
  const stop = useRef(false)
  const rows = useRef<LeadRow[]>([])

  useEffect(() => {
    let alive = true
    const finish = (stopped: boolean) => {
      if (!alive) return
      setFinished(true)
      if (rows.current.length) {
        downloadCsv(toCsv(rows.current, dataset), dataset)
        toast(`${stopped ? 'Stopped early: ' : ''}${rows.current.length.toLocaleString('en-GB')} leads exported`)
      }
      onClose()
    }
    ;(async () => {
      let allowance: number
      try {
        allowance = (await api.allowance()).remaining
      } catch (e) {
        return setError(e instanceof ApiError ? e.message : 'Export is unavailable right now. Try again in a moment.')
      }
      const goal = Math.min(total, allowance)
      setTarget(goal)
      if (goal === 0) return setError('You have used all your exports for this month. They reset on the 1st.')
      let offset = 0
      while (alive && !stop.current && rows.current.length < goal) {
        try {
          const r = await api.exportBatch({ dataset, filters, offset })
          rows.current.push(...r.rows.slice(0, goal - rows.current.length))
          setDone(rows.current.length)
          offset += r.fetched
          if (r.fetched === 0 || r.remaining === 0) break
        } catch (e) {
          if (!alive) return
          if (rows.current.length) break
          return setError(e instanceof ApiError ? e.message : 'Export is unavailable right now. Try again in a moment.')
        }
        await new Promise((res) => setTimeout(res, 250))
      }
      finish(stop.current)
    })()
    return () => {
      alive = false
    }
    // runs once for this dialog
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pct = target ? Math.round((done / target) * 100) : 0
  return (
    <Dialog title="Exporting matching leads" onClose={error ? onClose : undefined}>
      <div className="ld-dialog-body">
        {error ? (
          <>
            <p className="ld-error" role="alert">{error}</p>
            <div className="ld-dialog-actions"><button type="button" className="ld-btn" onClick={onClose}>Close</button></div>
          </>
        ) : (
          <>
            <div className="ld-progress-head num">
              <span>{done.toLocaleString('en-GB')} of {target === null ? '…' : target.toLocaleString('en-GB')} leads</span>
              <span>{pct}%</span>
            </div>
            <div className="ld-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div style={{ width: `${pct}%` }} />
            </div>
            <p className="ld-muted">Keep this tab open until the download starts.</p>
            <div className="ld-dialog-actions">
              <button type="button" className="ld-btn" disabled={finished} onClick={() => (stop.current = true)}>Stop and download what's ready</button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
