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
  { name: 'Leadloop', oneLiner: 'LinkedIn post engagers turned into a warm lead list every morning.', category: 'sales' },
  { name: 'Callsmith', oneLiner: 'AI cold-call practice partner with scored transcripts.', category: 'sales' },
  { name: 'Thumbforge', oneLiner: 'YouTube thumbnails generated and A/B tested.', category: 'content' },
  { name: 'Podsnip', oneLiner: 'Podcast episodes to show notes, quotes and audiograms.', category: 'content' },
  { name: 'Invoicely', oneLiner: 'Invoices that chase themselves with polite reminders.', category: 'business' },
  { name: 'Hirelane', oneLiner: 'Applicant tracking for teams hiring under 10 people.', category: 'business' },
  { name: 'Shiftly', oneLiner: 'Staff rota builder with SMS shift swaps.', category: 'productivity' },
  { name: 'Reviewbee', oneLiner: 'Asks happy customers for Google reviews at the right moment.', category: 'ai-agents' },
  { name: 'Receptly', oneLiner: 'AI phone receptionist that books jobs for tradespeople.', category: 'ai-agents' },
  { name: 'Docbot', oneLiner: 'Answers RFP and security questionnaires from your docs.', category: 'ai-agents' },
  { name: 'Churnguard', oneLiner: 'Spots Stripe customers about to cancel and emails them.', category: 'business' },
]

export const CORE_STACK = [
  { name: 'Claude Code', job: 'writes the code' },
  { name: 'Supabase', job: 'auth, database, storage' },
  { name: 'GitHub', job: 'stores the code' },
  { name: 'Vercel', job: 'hosts the app' },
  { name: 'Stripe', job: 'trial then monthly billing' },
  { name: 'Resend', job: 'sends app emails' },
]
