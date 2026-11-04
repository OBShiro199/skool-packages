import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import type { LeadRow } from './api'
import { DATASETS, displayValue, sizeLabel, type DatasetId } from './defs'

const Dash = () => <span className="ld-empty">–</span>

function Linkedin() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <rect width="16" height="16" rx="3" fill="#0a66c2" />
      <path fill="#fff" d="M4.3 6.4h1.9v5.9H4.3zM5.25 3.6a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM7.4 6.4h1.8v.8h.03c.25-.48.87-.98 1.8-.98 1.92 0 2.27 1.26 2.27 2.9v3.18h-1.9V9.5c0-.67-.01-1.53-.93-1.53-.93 0-1.07.73-1.07 1.48v2.83H7.4z" />
    </svg>
  )
}

const nameOf = (r: LeadRow) => r.full_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Unknown'
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
const href = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)

const COLS = [
  { key: 'sel', w: 44 },
  { key: 'Name', w: 210 },
  { key: 'Title', w: 240 },
  { key: 'Seniority', w: 110 },
  { key: 'Company', w: 210 },
  { key: 'Industry', w: 200 },
  { key: 'Size', w: 120 },
  { key: 'Revenue', w: 120 },
  { key: 'Location', w: 190 },
  { key: 'Mobile', w: 230, mobile: true },
  { key: 'Email', w: 240 },
  { key: 'Signals', w: 170 },
]

export function SkeletonRows({ rows = 12 }: { rows?: number }) {
  const widths = [62, 80, 54, 70, 88, 46, 74]
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="ld-skel-row">
          <td />
          {Array.from({ length: 8 }, (_, j) => (
            <td key={j}><span className="ld-skel" style={{ width: `${widths[(i + j) % widths.length]}%` }} /></td>
          ))}
          <td colSpan={3} />
        </tr>
      ))}
    </>
  )
}

/** The leads table (PRD 11.3): fixed widths, single-line cells, sideways scroll only. */
export function LeadsTable({ rows, dataset, selected, setSelected, stale, loading }: { rows: LeadRow[]; dataset: DatasetId; selected: Set<string>; setSelected: (s: Set<string>) => void; stale: boolean; loading: boolean }) {
  const cols = COLS.filter((c) => !c.mobile || DATASETS[dataset].hasMobiles)
  const all = rows.length > 0 && rows.every((r) => selected.has(r.lead_id))
  const some = rows.some((r) => selected.has(r.lead_id))
  const headBox = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headBox.current) headBox.current.indeterminate = some && !all
  }, [some, all])
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  const width = cols.reduce((n, c) => n + c.w, 0)

  return (
    <table className="ld-table" style={{ width, opacity: stale ? 0.6 : 1 }}>
      <colgroup>{cols.map((c) => <col key={c.key} style={{ width: c.w }} />)}</colgroup>
      <thead>
        <tr>
          {cols.map((c) =>
            c.key === 'sel' ? (
              <th key="sel">
                <input ref={headBox} type="checkbox" className="ld-cb" aria-label="Select every lead on this page" checked={all} disabled={!rows.length}
                  onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.lead_id)))} />
              </th>
            ) : (
              <th key={c.key}>{c.key}</th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <SkeletonRows />
        ) : (
          rows.map((r, i) => {
            const name = nameOf(r)
            const industry = r.main_industry ?? r.company_industry
            const city = [r.contact_city, r.contact_country].filter(Boolean).join(', ')
            const on = selected.has(r.lead_id)
            return (
              <motion.tr key={r.lead_id} data-selected={on || undefined} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: Math.min(i * 0.015, 0.2) }}>
                <td><input type="checkbox" className="ld-cb" checked={on} onChange={() => toggle(r.lead_id)} aria-label={`Select ${name}`} /></td>
                <td>
                  <div className="ld-name">
                    <span className="ld-li">
                      {r.linkedin_url && (
                        <a href={href(r.linkedin_url)} target="_blank" rel="noopener noreferrer" aria-label={`${name} on LinkedIn`}><Linkedin /></a>
                      )}
                    </span>
                    <span className="ld-initials" aria-hidden>{initials(name)}</span>
                    <span className="ld-cell">{name}</span>
                  </div>
                </td>
                <td><span className="ld-cell" title={r.current_title ?? undefined}>{r.current_title ?? <Dash />}</span></td>
                <td>{r.seniority_level ? <span className="ld-pill">{displayValue('seniority', r.seniority_level)}</span> : <Dash />}</td>
                <td>
                  <span className="ld-cell">{r.company_name ?? <Dash />}</span>
                  {r.company_domain && <span className="ld-cell ld-sub">{r.company_domain}</span>}
                </td>
                <td><span className="ld-cell" title={industry ?? undefined}>{industry ?? <Dash />}</span></td>
                <td><span className="ld-cell">{sizeLabel(r.employee_count_range) ?? <Dash />}</span></td>
                <td><span className="ld-cell">{r.revenue_range ?? <Dash />}</span></td>
                <td><span className="ld-cell" title={r.contact_location ?? undefined}>{city || <Dash />}</span></td>
                {DATASETS[dataset].hasMobiles && <td><span className="ld-cell ld-num">{r.mobile_phone ?? <Dash />}</span></td>}
                <td>
                  <div className="ld-email">
                    <span className="ld-cell">{r.work_email ?? <Dash />}</span>
                    {r.email_status === 'CATCH_ALL' && <span className="ld-pill ld-pill-amber">Accept-all</span>}
                  </div>
                </td>
                <td>
                  <div className="ld-signals">
                    {r.is_hiring && <span className="ld-pill ld-pill-green">Hiring</span>}
                    {r.open_to_work && <span className="ld-pill ld-pill-blue">Open to work</span>}
                    {r.last_funding_type && <span className="ld-pill ld-pill-grey ld-pill-cut">{r.last_funding_type}</span>}
                    {!r.is_hiring && !r.open_to_work && !r.last_funding_type && <Dash />}
                  </div>
                </td>
              </motion.tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
