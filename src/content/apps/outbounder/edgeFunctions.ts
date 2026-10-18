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
    purpose: 'Turns a campaign ICP into Apollo People Search filters, reveals work emails, dedupes against existing leads and the suppression list, and inserts new leads as "found".',
    trigger: 'Called by the browser when the user clicks "Find leads" in the campaign builder',
    secrets: ['APP_ENCRYPTION_KEY', 'APOLLO_API_KEY', 'ALLOW_SHARED_APOLLO'],
    prompt: promptFindLeads,
  },
  {
    name: 'verify-emails',
    purpose: 'Checks every found email with MillionVerifier and only lets "ok" results through. Catch-all, unknown and invalid emails are rejected before they can burn your domain.',
    trigger: 'pg_cron every 2 minutes (x-cron-secret header)',
    secrets: ['MILLIONVERIFIER_API_KEY', 'CRON_SECRET'],
    prompt: promptVerifyEmails,
  },
  {
    name: 'enrich-leads',
    purpose: 'Scrapes each lead\'s company homepage and about page with Firecrawl into clean markdown, with a 30-day cache per company domain.',
    trigger: 'pg_cron every 2 minutes (x-cron-secret header)',
    secrets: ['FIRECRAWL_API_KEY', 'CRON_SECRET'],
    prompt: promptEnrichLeads,
  },
  {
    name: 'personalise',
    purpose: 'Writes a subject, first line and step 1 email per lead with claude-sonnet-5-5 using structured JSON output, validates it, and sends it to the review queue. Also handles single-lead regenerate with a hint.',
    trigger: 'pg_cron every 2 minutes for batches; browser for "Regenerate" with the user JWT',
    secrets: ['ANTHROPIC_API_KEY', 'CRON_SECRET'],
    prompt: promptPersonalise,
  },
  {
    name: 'send-due-emails',
    purpose: 'The scheduler. Sends queued emails through AgentMail inside each lead\'s send window, respects per-inbox daily caps and the ramp, adds the unsubscribe footer and List-Unsubscribe headers, and queues the next step.',
    trigger: 'pg_cron every 5 minutes (x-cron-secret header)',
    secrets: ['AGENTMAIL_API_KEY', 'APP_URL', 'CRON_SECRET'],
    prompt: promptSendDueEmails,
  },
  {
    name: 'agentmail-webhook',
    purpose: 'Receives replies, bounces and complaints from AgentMail, verifies the Svix signature, stops the sequence on any reply, classifies replies with claude-haiku-5-5 and alerts the user on "interested".',
    trigger: 'AgentMail webhook (message.received plus bounce and complaint events)',
    secrets: ['AGENTMAIL_WEBHOOK_SECRET', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'APP_URL'],
    prompt: promptAgentmailWebhook,
  },
  {
    name: 'setup-domain',
    purpose: 'Adds the user\'s outreach domain to AgentMail and returns the DNS records to copy into Porkbun, checks verification, and creates inboxes on the verified domain.',
    trigger: 'Called by the browser from the domain setup wizard',
    secrets: ['AGENTMAIL_API_KEY'],
    prompt: promptSetupDomain,
  },
]
