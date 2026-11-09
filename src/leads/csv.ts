import type { DatasetId } from './defs'
import type { LeadRow } from './api'

// CSV export format (PRD 14.3).
export function toCsv(rows: LeadRow[], dataset: DatasetId): string {
  const out = rows.map((r) => {
    const o: Record<string, string> = {
      name: r.full_name ?? [r.first_name, r.last_name].filter(Boolean).join(' '),
      first_name: r.first_name ?? '',
      last_name: r.last_name ?? '',
      title: r.current_title ?? '',
      seniority: r.seniority_level ?? '',
      department: r.department ?? '',
      company: r.company_name ?? '',
      company_domain: r.company_domain ?? '',
      industry: r.main_industry ?? r.company_industry ?? '',
      company_size: r.employee_count_range ?? '',
      employees: r.employee_count == null ? '' : String(r.employee_count),
      revenue: r.revenue_range ?? '',
      hq_country: r.company_hq_country ?? '',
      country: r.contact_country ?? '',
      city: r.contact_city ?? '',
      location: r.contact_location ?? '',
      linkedin: r.linkedin_url ?? '',
    }
    o.mobile = r.mobile_phone ?? ''
    Object.assign(o, {
      work_email: r.work_email ?? '',
      email_status: r.email_status ?? '',
      personal_emails: r.personal_emails ?? '',
      hiring: r.is_hiring ? 'yes' : '',
      open_to_work: r.open_to_work ? 'yes' : '',
      dataset,
    })
    return o
  })
  if (!out.length) return ''
  const keys = Object.keys(out[0])
  const cell = (k: string, v: string) => {
    let s = v
    if (k !== 'mobile' && /^[=+\-@]/.test(s)) s = `'${s}` // formula injection guard
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...out.map((o) => keys.map((k) => cell(k, o[k])).join(','))].join('\n')
}

export function downloadCsv(csv: string, dataset: DatasetId, name?: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) : ''
  a.download = `leads-${slug ? `${slug}-` : ''}${dataset}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
