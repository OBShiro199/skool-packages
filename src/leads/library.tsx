import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import { api, ApiError, type ExportRecord, type LeadList, type LeadRow } from './api'
import { DATASETS, type DatasetId } from './defs'
import { downloadCsv, toCsv } from './csv'
import { Dialog } from './dialogs'
import { toast } from '../components/Toasts'

const msg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d)
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Save the selected leads into a new or existing list. */
export function AddToListDialog({ dataset, ids, onClose, onDone }: { dataset: DatasetId; ids: string[]; onClose: () => void; onDone: () => void }) {
  const [lists, setLists] = useState<LeadList[] | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.lists().then((r) => setLists(r.lists.filter((l) => l.dataset === dataset))).catch((e) => setError(msg(e, 'Could not load your lists.'))) }, [dataset])
  const run = async (fn: () => Promise<{ added: number; count: number }>, label: string) => {
    setBusy(true); setError('')
    try {
      const r = await fn()
      toast(`${r.added.toLocaleString('en-GB')} added to “${label}” (${r.count.toLocaleString('en-GB')} leads)`)
      onDone(); onClose()
    } catch (e) { setError(msg(e, 'That did not save. Try again.')) } finally { setBusy(false) }
  }
  return (
    <Dialog title={`Add ${ids.length.toLocaleString('en-GB')} leads to a list`} onClose={onClose} width={480}>
      <div className="ld-dialog-body">
        <form className="ld-inline-form" onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(() => api.createList(name.trim(), dataset, ids), name.trim()) }}>
          <input className="ld-input" placeholder="New list name, e.g. London agencies" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
          <button className="ld-btn ld-btn-primary" disabled={busy || !name.trim()}>Create list</button>
        </form>
        {error && <p className="ld-error">{error}</p>}
        {lists === null && !error && <p className="ld-muted">Loading your lists…</p>}
        {lists && lists.length > 0 && <p className="ld-muted" style={{ margin: '4px 0 0' }}>Or add to an existing {DATASETS[dataset].label} list</p>}
        <div className="ld-saved">
          {lists?.map((l) => (
            <div key={l.id} className="ld-saved-row">
              <div className="ld-saved-main"><b>{l.name}</b><span className="ld-muted">{l.count.toLocaleString('en-GB')} leads</span></div>
              <button type="button" className="ld-btn" disabled={busy} onClick={() => run(() => api.addToList(l.id, ids), l.name)}>Add</button>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  )
}

function ListView({ list, onBack, onChanged }: { list: LeadList; onBack: () => void; onChanged: () => void }) {
  const [rows, setRows] = useState<LeadRow[] | null>(null)
  const [total, setTotal] = useState(list.count)
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const PER = 20
  const load = (o: number) => { setRows(null); api.list(list.id, o, PER).then((r) => { setRows(r.rows); setTotal(r.total) }).catch((e) => toast(msg(e, 'Could not load that list.'))) }
  useEffect(() => { load(offset) }, [offset]) // eslint-disable-line react-hooks/exhaustive-deps
  const exportList = async () => {
    setBusy(true)
    try {
      const { ids } = await api.listIds(list.id)
      const out: LeadRow[] = []
      for (let i = 0; i < ids.length; i += 500) {
        const r = await api.exportBatch({ dataset: list.dataset, ids: ids.slice(i, i + 500), kind: 'list', label: list.name })
        out.push(...r.rows)
        if (r.remaining <= 0) break
      }
      if (!out.length) return toast('Nothing to export')
      downloadCsv(toCsv(out, list.dataset), list.dataset, list.name)
      toast(`${out.length.toLocaleString('en-GB')} leads exported from “${list.name}”`)
    } catch (e) { toast(msg(e, 'Export is unavailable right now.')) } finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    await api.removeFromList(list.id, [id]).then(() => { setRows((r) => r?.filter((x) => x.lead_id !== id) ?? null); setTotal((t) => t - 1); onChanged() }).catch((e) => toast(msg(e, 'Could not remove it.')))
  }
  return (
    <div className="ld-dialog-body">
      <div className="ld-inline-form" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="ld-link" onClick={onBack}><ArrowLeft size={14} /> All lists</button>
        <button type="button" className="ld-btn ld-btn-primary" disabled={busy || !total} onClick={exportList}><Download size={14} /> {busy ? 'Exporting…' : `Export ${total.toLocaleString('en-GB')} as CSV`}</button>
      </div>
      <p className="ld-muted" style={{ margin: 0 }}>{DATASETS[list.dataset].label} · {total.toLocaleString('en-GB')} leads · exporting counts toward your monthly allowance</p>
      <div className="ld-saved">
        {rows === null && <p className="ld-muted">Loading…</p>}
        {rows?.map((r) => (
          <div key={r.lead_id} className="ld-saved-row">
            <div className="ld-saved-main"><b>{r.full_name ?? 'Unnamed'}</b><span className="ld-muted">{[r.current_title, r.company_name].filter(Boolean).join(' · ')}</span></div>
            <button type="button" className="ld-link" aria-label={`Remove ${r.full_name ?? 'lead'}`} onClick={() => remove(r.lead_id)}><Trash2 size={14} /></button>
          </div>
        ))}
        {rows && !rows.length && <p className="ld-muted">This list is empty.</p>}
      </div>
      {total > PER && (
        <div className="ld-inline-form" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="ld-btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PER))}>Previous</button>
          <span className="ld-muted">{offset + 1}–{Math.min(total, offset + PER)} of {total.toLocaleString('en-GB')}</span>
          <button type="button" className="ld-btn" disabled={offset + PER >= total} onClick={() => setOffset(offset + PER)}>Next</button>
        </div>
      )}
    </div>
  )
}

/** The member's lead lists: open one to see, prune or export it. */
export function ListsDialog({ onClose }: { onClose: () => void }) {
  const [lists, setLists] = useState<LeadList[] | null>(null)
  const [open, setOpen] = useState<LeadList | null>(null)
  const [error, setError] = useState('')
  const load = () => api.lists().then((r) => setLists(r.lists)).catch((e) => setError(msg(e, 'Could not load your lists.')))
  useEffect(() => { load() }, [])
  const del = async (l: LeadList) => {
    if (!confirm(`Delete the list “${l.name}”? The leads stay in the database; only the list goes.`)) return
    await api.deleteList(l.id).then(() => setLists((x) => x?.filter((y) => y.id !== l.id) ?? null)).catch((e) => toast(msg(e, 'Could not delete it.')))
  }
  const rename = async (l: LeadList) => {
    const name = prompt('Rename list', l.name)?.trim()
    if (!name || name === l.name) return
    await api.renameList(l.id, name).then(() => setLists((x) => x?.map((y) => (y.id === l.id ? { ...y, name } : y)) ?? null)).catch((e) => toast(msg(e, 'Could not rename it.')))
  }
  return (
    <Dialog title={open ? open.name : 'Your lead lists'} onClose={onClose} width={620}>
      {open ? <ListView list={open} onBack={() => { setOpen(null); load() }} onChanged={() => {}} /> : (
        <div className="ld-dialog-body">
          {error && <p className="ld-error">{error}</p>}
          {!lists && !error && <p className="ld-muted">Loading…</p>}
          {lists && !lists.length && <p className="ld-muted">No lists yet. Tick some leads in the table, then press “Add to list”.</p>}
          <div className="ld-saved">
            {lists?.map((l) => (
              <div key={l.id} className="ld-saved-row">
                <div className="ld-saved-main">
                  <b>{l.name}</b>
                  <div className="ld-saved-chips"><span className="ld-pill ld-pill-blue">{DATASETS[l.dataset].label}</span><span className="ld-pill">{l.count.toLocaleString('en-GB')} leads</span><span className="ld-muted">Updated {when(l.updated_at)}</span></div>
                </div>
                <button type="button" className="ld-btn" onClick={() => setOpen(l)}>Open</button>
                <button type="button" className="ld-link" onClick={() => rename(l)}>Rename</button>
                <button type="button" className="ld-link" onClick={() => del(l)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  )
}

const KIND: Record<ExportRecord['kind'], string> = { selected: 'Selected leads', all: 'Search export', list: 'List export' }

/** Every export the member has made. Downloading one again is free. */
export function ExportsDialog({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ExportRecord[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  useEffect(() => { api.exports().then((r) => setItems(r.exports)).catch((e) => setError(msg(e, 'Could not load your exports.'))) }, [])
  const again = async (x: ExportRecord) => {
    setBusy(x.id)
    try {
      const r = await api.exportAgain(x.id)
      downloadCsv(toCsv(r.rows, r.dataset), r.dataset, x.label ?? KIND[x.kind])
      toast(`${r.rows.length.toLocaleString('en-GB')} leads downloaded again (free)`)
    } catch (e) { toast(msg(e, 'Could not download that export.')) } finally { setBusy(null) }
  }
  return (
    <Dialog title="Your exports" onClose={onClose} width={600}>
      <div className="ld-dialog-body">
        <p className="ld-muted" style={{ margin: 0 }}>Every batch you've exported. Downloading one again doesn't use your allowance.</p>
        {error && <p className="ld-error">{error}</p>}
        {!items && !error && <p className="ld-muted">Loading…</p>}
        {items && !items.length && <p className="ld-muted">No exports yet.</p>}
        <div className="ld-saved">
          {items?.map((x) => (
            <div key={x.id} className="ld-saved-row">
              <div className="ld-saved-main">
                <b>{x.label ?? KIND[x.kind]}</b>
                <div className="ld-saved-chips"><span className="ld-pill ld-pill-blue">{DATASETS[x.dataset]?.label ?? x.dataset}</span><span className="ld-pill">{x.rows.toLocaleString('en-GB')} leads</span><span className="ld-muted">{when(x.created_at)}</span></div>
              </div>
              {x.redownload
                ? <button type="button" className="ld-btn" disabled={busy !== null} onClick={() => again(x)}><Download size={14} /> {busy === x.id ? 'Preparing…' : 'Download again'}</button>
                : <span className="ld-muted">Before history</span>}
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
