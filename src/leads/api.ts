import type { DatasetId, Filters } from './defs'
import { useStore, type ServerState } from '../lib/store'

export type LeadRow = {
  lead_id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  current_title: string | null
  seniority_level: string | null
  department: string | null
  company_name: string | null
  company_domain: string | null
  company_industry: string | null
  main_industry: string | null
  employee_count_range: string | null
  employee_count: number | null
  revenue_range: string | null
  company_hq_country: string | null
  contact_country: string | null
  contact_city: string | null
  contact_location: string | null
  linkedin_url: string | null
  mobile_phone: string | null
  work_email: string | null
  email_status: string | null
  personal_emails: string | null
  open_to_work: boolean
  is_hiring: boolean
  last_funding_type: string | null
}
export type Facets = Record<string, { value: string; n: number | null }[]>
export type SavedSearch = { id: string; name: string; dataset: DatasetId; search: Filters & { v?: number; q?: string }; updated_at: string }

export type ExportRecord = { id: number; dataset: DatasetId; rows: number; kind: 'selected' | 'all' | 'list'; label: string | null; created_at: string; redownload: boolean }
export type LeadList = { id: string; name: string; dataset: DatasetId; created_at: string; updated_at: string; count: number }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public body?: Record<string, unknown>) {
    super(message)
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.')
  }
  const body = await res.json().catch(() => ({}))
  // An ended server session (expired, password or secret changed) sends the member back to the login page.
  if (res.status === 401 && !/\/vault\/(login|signup|password)$/.test(path)) useStore.getState().signOut()
  if (!res.ok) {
    const msg =
      body.message ??
      (res.status === 401 ? 'Your session has ended. Sign in again.' : res.status === 429 ? 'Too many searches at once. Wait a moment and try again.' : res.status === 503 ? 'Lead search is not switched on yet.' : 'Something went wrong. Try again.')
    throw new ApiError(res.status, body.error ?? 'error', msg, body)
  }
  return body as T
}

const BASE = '/api'
export const api = {
  signup: (b: { handle: string; name: string; email: string; password: string; code: string; import?: unknown }) =>
    call<{ handle: string }>(`${BASE}/vault/signup`, { method: 'POST', body: JSON.stringify(b) }),
  login: (email: string, password: string) => call<{ handle: string }>(`${BASE}/vault/login`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => call<ServerState>(`${BASE}/vault/me`),
  changePassword: (current: string, next: string) => call<{ ok: true }>(`${BASE}/vault/password`, { method: 'POST', body: JSON.stringify({ current, next }) }),
  logout: () => call<{ ok: true }>(`${BASE}/vault/logout`, { method: 'POST' }),
  search: (dataset: DatasetId, filters: Filters, offset: number, limit: number, signal?: AbortSignal) =>
    call<{ rows: LeadRow[]; count: { n: number }; notice?: 'no_mobiles' }>(`${BASE}/leads/search`, { method: 'POST', body: JSON.stringify({ dataset, filters, offset, limit }), signal }),
  facets: (dataset: DatasetId) => call<{ facets: Facets; counts: boolean }>(`${BASE}/leads/facets?dataset=${dataset}`),
  exportBatch: (body: { dataset: DatasetId; filters?: Filters; offset?: number; ids?: string[]; kind?: 'list'; label?: string }) =>
    call<{ rows: LeadRow[]; fetched: number; remaining: number; resets: string }>(`${BASE}/leads/export`, { method: 'POST', body: JSON.stringify(body) }),
  allowance: () => call<{ used: number; limit: number; remaining: number; resets: string }>(`${BASE}/leads/export`),
  saved: () => call<{ searches: SavedSearch[] }>(`${BASE}/leads/saved`),
  save: (body: { id?: string; name?: string; dataset: DatasetId; search: Filters }) =>
    call<{ search: SavedSearch }>(`${BASE}/leads/saved`, { method: 'POST', body: JSON.stringify(body) }),
  exports: () => call<{ exports: ExportRecord[] }>(`${BASE}/leads/exports`),
  exportAgain: (id: number) => call<{ dataset: DatasetId; rows: LeadRow[] }>(`${BASE}/leads/exports?id=${id}`),
  lists: () => call<{ lists: LeadList[] }>(`${BASE}/leads/lists`),
  list: (id: string, offset: number, limit: number) => call<{ list: { id: string; name: string; dataset: DatasetId }; rows: LeadRow[]; total: number }>(`${BASE}/leads/lists?id=${id}&offset=${offset}&limit=${limit}`),
  listIds: (id: string) => call<{ ids: string[]; total: number }>(`${BASE}/leads/lists?id=${id}&ids=1`),
  createList: (name: string, dataset: DatasetId, ids: string[]) => call<{ list: LeadList; added: number; count: number }>(`${BASE}/leads/lists`, { method: 'POST', body: JSON.stringify({ name, dataset, ids }) }),
  addToList: (id: string, ids: string[]) => call<{ added: number; count: number }>(`${BASE}/leads/lists`, { method: 'POST', body: JSON.stringify({ id, ids }) }),
  removeFromList: (id: string, ids: string[]) => call<{ ok: boolean }>(`${BASE}/leads/lists`, { method: 'PATCH', body: JSON.stringify({ id, remove: ids }) }),
  renameList: (id: string, name: string) => call<{ ok: boolean }>(`${BASE}/leads/lists`, { method: 'PATCH', body: JSON.stringify({ id, name }) }),
  deleteList: (id: string) => call<{ ok: true }>(`${BASE}/leads/lists?id=${id}`, { method: 'DELETE' }),
  deleteSaved: (id: string) => call<{ ok: true }>(`${BASE}/leads/saved?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
