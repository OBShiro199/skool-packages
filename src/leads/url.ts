import { isDataset, type DatasetId, type Filters } from './defs'

// URL state (PRD 13.1): dataset, f (base64url JSON of the raw filters), q, page, search.
export function encodeFilters(f: Filters): string {
  const bytes = new TextEncoder().encode(JSON.stringify(f))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeFilters(s: string | null): Filters | null {
  if (!s || s.length > 30_000) return null
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
    const v = JSON.parse(json)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Filters) : null
  } catch {
    return null
  }
}

export function readParams(p: URLSearchParams): { dataset: DatasetId; filters: Filters | null; q: string; page: number; search: string | null } {
  const d = p.get('dataset')
  const page = Math.max(1, Math.min(100, Math.floor(Number(p.get('page')) || 1)))
  return { dataset: isDataset(d) ? d : 'uk-eu', filters: decodeFilters(p.get('f')), q: (p.get('q') ?? '').slice(0, 80), page, search: p.get('search') }
}
