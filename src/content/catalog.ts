import type { CategoryId } from './types'

export const CATEGORIES: { id: CategoryId; label: string; blurb: string }[] = [
  { id: 'sales', label: 'Sales & Outreach', blurb: 'Tools that book meetings and close deals' },
  { id: 'content', label: 'Content & Social', blurb: 'Tools creators pay for every month' },
  { id: 'business', label: 'Business Tools', blurb: 'CRMs, ops and admin for small teams' },
  { id: 'productivity', label: 'Productivity & Booking', blurb: 'Scheduling and workflow for local businesses' },
  { id: 'ai-agents', label: 'AI Agents', blurb: 'Agents that do a job end to end' },
]

/** Kits announced but not yet released. Shown locked in the library. */
export const COMING_SOON: { name: string; oneLiner: string; category: CategoryId }[] = [
  { name: 'Retain', oneLiner: 'Spots Stripe customers about to cancel and wins them back.', category: 'business' },
  { name: 'Quotient', oneLiner: 'Instant online quotes for tradespeople, turned into booked jobs.', category: 'productivity' },
]

export const CORE_STACK = [
  { name: 'Claude Code', job: 'writes the code' },
  { name: 'Supabase', job: 'auth, database, storage' },
  { name: 'GitHub', job: 'stores the code' },
  { name: 'Vercel', job: 'hosts the app' },
  { name: 'Stripe', job: 'trial then monthly billing' },
  { name: 'Resend', job: 'sends app emails' },
]
