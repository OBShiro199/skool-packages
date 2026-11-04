// Filter definitions, display rules and the browser → server filter form (PRD sections 3, 4.2, 10).
export type DatasetId = 'uk-eu' | 'us'
export type Filters = Record<string, unknown>

export const DATASETS: Record<DatasetId, { id: DatasetId; label: string; hasMobiles: boolean; defaultFilters: Filters; companyEg: string; cityEg: string }> = {
  'uk-eu': { id: 'uk-eu', label: 'UK & EU', hasMobiles: true, defaultFilters: { hasMobile: true }, companyEg: 'Barclays, Ocado…', cityEg: 'London, Manchester…' },
  us: { id: 'us', label: 'US', hasMobiles: false, defaultFilters: {}, companyEg: 'Acme, Globex…', cityEg: 'Austin, Chicago…' },
}
export const isDataset = (v: unknown): v is DatasetId => v === 'uk-eu' || v === 'us'

export type Kind = 'pills' | 'multi' | 'bool' | 'range'
export interface FilterDef {
  key: string
  keys?: [string, string] // range: [min, max]
  label: string
  group: 'Person' | 'Company' | 'Location' | 'Contact data' | 'Signals'
  kind: Kind
  facet?: string
  order?: string[]
  placeholder?: string | ((d: DatasetId) => string)
  hint?: string
  bool?: [string, string] // yes, no wording
  unit?: string
  presets?: { label: string; min?: number; max?: number }[]
  mobileOnly?: boolean
}

export const SIZE_ORDER = ['1 to 10', '11 to 50', '51 to 200', '201 to 500', '501 to 1000', '1001 to 5000', '5001 to 10000', '10001+']
export const REVENUE_ORDER = ['<$1M', '$1M to <$10M', '$10M to <$50M', '$50M to <$100M', '$100M to <$1B', '$1B+']
export const SENIORITY_ORDER = ['c-level', 'vp', 'director', 'manager', 'senior', 'junior', 'unknown']
const year = new Date().getFullYear()

export const FILTERS: FilterDef[] = [
  { key: 'titles', label: 'Job title', group: 'Person', kind: 'pills', placeholder: 'CEO, Head of Sales, IT Manager…', hint: 'Matches any title containing a word you add. CEO also finds Chief Executive.' },
  { key: 'titlesNot', label: 'Exclude titles', group: 'Person', kind: 'pills', placeholder: 'Intern, Assistant…' },
  { key: 'seniorities', label: 'Seniority', group: 'Person', kind: 'multi', facet: 'seniority', order: SENIORITY_ORDER },
  { key: 'departments', label: 'Department', group: 'Person', kind: 'multi', facet: 'department' },
  {
    key: 'tenure', keys: ['tenureMin', 'tenureMax'], label: 'Time in role', group: 'Person', kind: 'range', unit: 'months',
    presets: [{ label: 'New in role (under 6 months)', max: 6 }, { label: '6 to 12 months', min: 6, max: 12 }, { label: '1 to 3 years', min: 12, max: 36 }, { label: 'Over 3 years', min: 36 }],
  },
  { key: 'skills', label: 'Skills', group: 'Person', kind: 'pills', placeholder: 'Salesforce, Cyber security…' },
  { key: 'languages', label: 'Languages', group: 'Person', kind: 'pills', placeholder: 'German, French…' },
  { key: 'openToWork', label: 'Open to work', group: 'Person', kind: 'bool', bool: ['Open to work', 'Not open to work'] },
  { key: 'companies', label: 'Company name', group: 'Company', kind: 'pills', placeholder: (d) => DATASETS[d].companyEg },
  { key: 'companiesNot', label: 'Exclude companies', group: 'Company', kind: 'pills', placeholder: 'Competitors, current customers…' },
  { key: 'domains', label: 'Company domain', group: 'Company', kind: 'pills', placeholder: 'acme.co.uk' },
  { key: 'industries', label: 'Industry', group: 'Company', kind: 'multi', facet: 'industry' },
  { key: 'industriesNot', label: 'Exclude industries', group: 'Company', kind: 'multi', facet: 'industry' },
  { key: 'sizes', label: 'Company size', group: 'Company', kind: 'multi', facet: 'size', order: SIZE_ORDER },
  {
    key: 'employees', keys: ['employeesMin', 'employeesMax'], label: 'Exact employee count', group: 'Company', kind: 'range', unit: 'employees',
    presets: [{ label: '7 to 15', min: 7, max: 15 }, { label: '20 to 100', min: 20, max: 100 }, { label: '100 to 500', min: 100, max: 500 }],
    hint: 'Uses the exact LinkedIn headcount where we have it.',
  },
  { key: 'revenues', label: 'Revenue', group: 'Company', kind: 'multi', facet: 'revenue', order: REVENUE_ORDER },
  {
    key: 'founded', keys: ['foundedMin', 'foundedMax'], label: 'Year founded', group: 'Company', kind: 'range',
    presets: [{ label: 'Last 5 years', min: year - 5 }, { label: '2010 to 2020', min: 2010, max: 2020 }, { label: 'Before 2000', max: 1999 }],
  },
  { key: 'hqCountries', label: 'Company HQ country', group: 'Company', kind: 'multi', facet: 'hq_country' },
  { key: 'isHiring', label: 'Hiring now', group: 'Company', kind: 'bool', bool: ['Hiring', 'Not hiring'] },
  { key: 'funding', label: 'Funding stage', group: 'Company', kind: 'multi', facet: 'funding' },
  { key: 'hasFunding', label: 'Has raised funding', group: 'Company', kind: 'bool', bool: ['Has funding', 'No funding'] },
  { key: 'tech', label: 'Tech stack', group: 'Company', kind: 'pills', placeholder: 'HubSpot, Azure, Shopify…' },
  { key: 'hasWebsite', label: 'Has company website', group: 'Company', kind: 'bool', bool: ['Has website', 'No website'] },
  { key: 'countries', label: 'Country', group: 'Location', kind: 'multi', facet: 'country' },
  { key: 'cities', label: 'City or region', group: 'Location', kind: 'pills', placeholder: (d) => DATASETS[d].cityEg },
  { key: 'hasMobile', label: 'Has mobile', group: 'Contact data', kind: 'bool', bool: ['Has mobile', 'No mobile'], mobileOnly: true },
  { key: 'mobileCodes', label: 'Mobile country code', group: 'Contact data', kind: 'multi', facet: 'mobile_code', mobileOnly: true },
  { key: 'hasEmail', label: 'Has work email', group: 'Contact data', kind: 'bool', bool: ['Has email', 'No email'] },
  { key: 'emailStatus', label: 'Email status', group: 'Contact data', kind: 'multi', facet: 'email_status' },
  { key: 'hasPersonalEmail', label: 'Has personal email', group: 'Contact data', kind: 'bool', bool: ['Has personal email', 'No personal email'] },
  { key: 'hasLinkedin', label: 'Has LinkedIn', group: 'Contact data', kind: 'bool', bool: ['Has LinkedIn', 'No LinkedIn'] },
  { key: 'tags', label: 'Signals', group: 'Signals', kind: 'multi', facet: 'tag', hint: 'Career and company signals, such as one year at the company.' },
]

/** Keys with their own quick control instead of a chip (PRD 10.3). */
export const QUICK_KEYS = ['countries', 'sizes', 'revenues', 'hasMobile', 'hasEmail', 'hasLinkedin', 'hasWebsite']

export const defsFor = (d: DatasetId) => FILTERS.filter((f) => !f.mobileOnly || DATASETS[d].hasMobiles)
export const filterKeys = (def: FilterDef) => def.keys ?? [def.key]

export function isSet(f: Filters, def: FilterDef): boolean {
  if (def.kind === 'range') return filterKeys(def).some((k) => typeof f[k] === 'number')
  const v = f[def.key]
  if (def.kind === 'bool') return typeof v === 'boolean'
  return Array.isArray(v) && v.length > 0
}

// ---- display labels (PRD 4.2) ----
const SENIORITY_LABEL: Record<string, string> = { 'c-level': 'C-level', vp: 'VP' }
export function displayValue(facet: string | undefined, v: string): string {
  if (facet === 'seniority') return SENIORITY_LABEL[v] ?? v.charAt(0).toUpperCase() + v.slice(1)
  if (facet === 'size') return v === '10001+' ? '10,001+ employees' : `${v.replace(' to ', '–')} employees`
  if (facet === 'email_status') return v === 'VALID' ? 'Valid' : v === 'CATCH_ALL' ? 'Accept-all domain' : v
  if (facet === 'country' || facet === 'hq_country') return v === 'GB' ? 'United Kingdom' : v === 'US' ? 'United States' : v
  if (facet === 'tag') return v.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
  return v
}
export const sizeLabel = (v: string | null) => (v ? (v === '10001+' ? '10,001+' : v.replace(' to ', '–')) : null)

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(n)
}

/** Chip text (PRD 10.2): "{label}: {first} +{n}", bool wording, or a range. */
export function chipParts(f: Filters, def: FilterDef): { first: string; more: number } {
  if (def.kind === 'bool') return { first: def.bool![f[def.key] ? 0 : 1], more: 0 }
  if (def.kind === 'range') {
    const [a, b] = filterKeys(def).map((k) => (typeof f[k] === 'number' ? (f[k] as number) : null))
    const u = def.unit ? ` ${def.unit}` : ''
    const fmt = (n: number) => (def.key === 'founded' ? String(n) : n.toLocaleString('en-GB'))
    const text = a !== null && b !== null ? `${fmt(a)}–${fmt(b)}${u}` : a !== null ? `${fmt(a)}+${u}` : `up to ${fmt(b!)}${u}`
    return { first: text, more: 0 }
  }
  const vals = f[def.key] as string[]
  return { first: displayValue(def.facet, vals[0]), more: vals.length - 1 }
}

// ---- browser → server (PRD 10.4) ----
const SYNONYMS: Record<string, string[]> = {
  ceo: ['chief executive'], cto: ['chief technology', 'chief technical'], cfo: ['chief financial', 'finance director'],
  coo: ['chief operating', 'operations director'], cmo: ['chief marketing'], cro: ['chief revenue'], cio: ['chief information'],
  ciso: ['chief information security'], md: ['managing director'], vp: ['vice president'], hr: ['human resources', 'people'],
  founder: ['co-founder', 'owner'],
}

export function toServer(f: Filters, q: string): Filters {
  const out: Filters = {}
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  if (Array.isArray(out.titles)) {
    const seen = new Set<string>()
    const titles: string[] = []
    for (const t of out.titles as string[]) {
      for (const x of [t, ...(SYNONYMS[t.trim().toLowerCase()] ?? [])]) {
        if (!seen.has(x.toLowerCase())) { seen.add(x.toLowerCase()); titles.push(x) }
      }
    }
    out.titles = titles
  }
  if (q.trim()) out.q = q.trim()
  return out
}

/** Keeps only filters that make sense in this dataset; reports how many were dropped (PRD 3). */
export function fitToDataset(f: Filters, d: DatasetId, facetValues?: Record<string, Set<string>>): { filters: Filters; dropped: number } {
  const out: Filters = {}
  let dropped = 0
  const allowed = new Set(defsFor(d).flatMap(filterKeys))
  for (const [k, v] of Object.entries(f)) {
    if (!allowed.has(k)) { dropped++; continue }
    const def = FILTERS.find((x) => filterKeys(x).includes(k))
    if (def?.kind === 'multi' && def.facet && facetValues?.[def.facet] && Array.isArray(v)) {
      const known = facetValues[def.facet]
      const kept = (v as string[]).filter((x) => known.has(x))
      if (kept.length !== v.length) dropped++
      if (kept.length) out[k] = kept
      continue
    }
    out[k] = v
  }
  return { filters: out, dropped }
}
