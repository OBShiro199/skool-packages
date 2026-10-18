import type { EdgeFunctionDef } from '../../types'
import {
  promptAgentmailWebhook,
  promptEnrichLeads,
  promptFindLeads,
  promptPersonalise,
  promptSendDueEmails,
  promptSetupDomain,
  promptVerifyEmails,
} from './edgePrompts'

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'find-leads',
    purpose: 'Queues a "find N leads" job from the browser, then (as a cron worker) pulls Prospeo search pages, reveals verified work emails, dedupes against existing leads and the suppression list, meters every credit and inserts new leads as "found".',
    trigger: 'Browser "Find leads" button (enqueue, returns a job id in under 2 seconds) and pg_cron every minute (worker, x-cron-secret header)',
    secrets: ['PROSPEO_API_KEY', 'CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'FOUNDER_EMAIL'],
    prompt: promptFindLeads,
  },
  {
    name: 'verify-emails',
    purpose: 'Checks every found email with MillionVerifier and only lets "ok" results through. Catch-all, unknown and invalid emails are rejected before they can burn your domain.',
    trigger: 'pg_cron every 2 minutes (x-cron-secret header)',
    secrets: ['MILLIONVERIFIER_API_KEY', 'CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'FOUNDER_EMAIL'],
    prompt: promptVerifyEmails,
  },
  {
    name: 'enrich-leads',
    purpose: 'Scrapes each lead\'s company homepage and about page with Firecrawl into clean markdown, with a 30-day cache per company domain and an SSRF guard.',
    trigger: 'pg_cron every 2 minutes (x-cron-secret header)',
    secrets: ['FIRECRAWL_API_KEY', 'CRON_SECRET'],
    prompt: promptEnrichLeads,
  },
  {
    name: 'personalise',
    purpose: 'Writes a subject, first line and step 1 email per lead with claude-sonnet-5-5 using structured JSON output and a prompt-injection guard, validates it, and sends it to the review queue. Also handles single-lead regenerate with a hint.',
    trigger: 'pg_cron every 2 minutes for batches; the browser "Regenerate" button with the user JWT',
    secrets: ['ANTHROPIC_API_KEY', 'CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'],
    prompt: promptPersonalise,
  },
  {
    name: 'send-due-emails',
    purpose: 'The scheduler. Sends queued emails through AgentMail inside each lead\'s send window, respects the 20-a-day ramp and per-inbox caps, adds the unsubscribe footer and List-Unsubscribe headers, meters every send and queues the next step.',
    trigger: 'pg_cron every 5 minutes (x-cron-secret header)',
    secrets: ['AGENTMAIL_API_KEY', 'APP_URL', 'CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM'],
    prompt: promptSendDueEmails,
  },
  {
    name: 'agentmail-webhook',
    purpose: 'Receives replies, bounces, rejects and complaints from AgentMail, verifies the Svix signature, de-duplicates by event id, stops the sequence on any reply, labels replies with claude-haiku-5-5 and alerts the user on "interested".',
    trigger: 'AgentMail webhook (message.received, message.bounced, message.complained, message.rejected, message.delivered)',
    secrets: ['AGENTMAIL_WEBHOOK_SECRET', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'],
    prompt: promptAgentmailWebhook,
  },
  {
    name: 'setup-domain',
    purpose: 'Creates the user\'s AgentMail pod, adds their outreach domain and returns the DNS records to copy into Porkbun, checks verification, and creates inboxes on the verified domain within plan limits.',
    trigger: 'Called by the browser from the domain setup wizard',
    secrets: ['AGENTMAIL_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM'],
    prompt: promptSetupDomain,
  },
]
