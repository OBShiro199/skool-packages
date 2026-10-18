// Ethereel edge functions: one full Claude Code prompt per function.
// Prompt bodies live in edgePrompts.ts (generated from markdown so nothing needs escaping).
import type { EdgeFunctionDef } from '../../types'
import { edgePrompts } from './edgePrompts'

const withShared = (name: string): string => `${edgePrompts._shared}\n\n${edgePrompts[name]}`

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'create-upload',
    purpose: 'Checks the plan before a single byte is sent, creates the video rows and returns a signed TUS upload token per clip.',
    trigger: 'Called by the browser when the creator drops clips into the upload sheet (user JWT)',
    secrets: ['SITE_URL'],
    prompt: withShared('create-upload'),
  },
  {
    name: 'start-pipeline',
    purpose: 'Bills the video once, then queues the Trigger.dev pipeline on the creator\'s own queue (Gentle 1 or Fast 2 at a time).',
    trigger: 'Called by the browser when a TUS upload finishes, or after Add assets / Skip (user JWT)',
    secrets: ['TRIGGER_SECRET_KEY', 'SITE_URL'],
    prompt: withShared('start-pipeline'),
  },
  {
    name: 'trigger-callback',
    purpose: 'Receives signed progress events from the Trigger.dev tasks, moves videos.status forward and writes the live job_events feed.',
    trigger: 'Called by Trigger.dev tasks after every pipeline step (HMAC signature, not a user token)',
    secrets: ['TRIGGER_CALLBACK_SECRET', 'RESEND_API_KEY', 'SITE_URL'],
    prompt: withShared('trigger-callback'),
  },
  {
    name: 'request-revision',
    purpose: 'Checks the revision limit and hands the creator\'s plain-language note to the revise-video task.',
    trigger: 'Called by the browser from the Request revision dialog (user JWT)',
    secrets: ['TRIGGER_SECRET_KEY', 'SITE_URL'],
    prompt: withShared('request-revision'),
  },
  {
    name: 'rewrite-caption',
    purpose: 'Writes a fresh post caption with Claude in the creator\'s voice, strips hashtags and dashes, checks AI-tell phrases and saves a new version.',
    trigger: 'Called by the browser when the creator presses Rewrite in Review (user JWT)',
    secrets: ['ANTHROPIC_API_KEY', 'SITE_URL'],
    prompt: withShared('rewrite-caption'),
  },
  {
    name: 'pass-video',
    purpose: 'Approves a reel and puts it in the next free posting slot under a lock (or a chosen slot), with TikTok consent recorded.',
    trigger: 'Called by the browser from the Pass dialog, a queue move or Unschedule (user JWT)',
    secrets: ['ZERNIO_API_KEY', 'SITE_URL'],
    prompt: withShared('pass-video'),
  },
  {
    name: 'zernio-sync',
    purpose: 'Hands posts to Zernio within 6 days of their slot, replaces files after a revision, and writes live links and failures back.',
    trigger: 'Supabase Cron (pg_cron + pg_net) every 10 minutes with the x-cron-secret header',
    secrets: ['ZERNIO_API_KEY', 'CRON_SECRET', 'RESEND_API_KEY', 'SITE_URL'],
    prompt: withShared('zernio-sync'),
  },
  {
    name: 'connect-social',
    purpose: 'Creates the creator\'s Zernio profile, returns the TikTok or Instagram connect link, and saves the connected accounts.',
    trigger: 'Called by the browser from onboarding or Settings > Socials, and by the /api/zernio/callback route (user JWT)',
    secrets: ['ZERNIO_API_KEY', 'SITE_URL'],
    prompt: withShared('connect-social'),
  },
]
