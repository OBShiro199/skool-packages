import type { EdgeFunctionDef } from '../../types'
import {
  promptCheckPrompt,
  promptFreeAudit,
  promptGeneratePrompts,
  promptRecheck,
  promptRecommendations,
  promptRunChecks,
  promptScoreDay,
  promptScrapeSite,
  promptSendDigest,
} from './edgePrompts'

export const edgeFunctions: EdgeFunctionDef[] = [
  {
    name: 'scrape-site',
    purpose: 'Maps the customer\'s website with Firecrawl, reads up to 12 key pages into markdown, and has Claude Sonnet write the brand summary and suggested competitors. Pages stream into onboarding over Realtime.',
    trigger: 'Browser, onboarding step 1 "Continue" (user JWT). Max 3 per brand per day',
    secrets: ['FIRECRAWL_API_KEY', 'ANTHROPIC_API_KEY', 'SITE_URL', 'FOUNDER_EMAIL'],
    prompt: promptScrapeSite,
  },
  {
    name: 'generate-prompts',
    purpose: 'Writes 20 buyer-style prompts ("best X for Y", "X alternatives") from the brand summary, filters out any that name the brand or repeat, and saves them unapproved for the user to edit.',
    trigger: 'Browser, onboarding step 4 and the Prompts page "Regenerate" (user JWT). Max 3 per brand per day',
    secrets: ['ANTHROPIC_API_KEY', 'SITE_URL'],
    prompt: promptGeneratePrompts,
  },
  {
    name: 'run-checks',
    purpose: 'The scheduler and queue drainer: creates due runs (with the spend cap checked first), claims up to 40 jobs, fans them out to check-prompt 8 at a time, then finishes and scores completed runs.',
    trigger: 'pg_cron every minute via pg_net (x-cron-secret header), and once straight after a recheck',
    secrets: ['CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL'],
    prompt: promptRunChecks,
  },
  {
    name: 'check-prompt',
    purpose: 'Runs one job: asks one engine one prompt through OpenRouter, saves the raw answer and cost, then parses it (regex plus Claude Haiku) for mention, position, sentiment, sources and competitors.',
    trigger: 'Called by run-checks only (x-cron-secret header), one POST per job',
    secrets: ['OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'CRON_SECRET', 'SITE_URL', 'RESEND_API_KEY', 'EMAIL_FROM', 'FOUNDER_EMAIL'],
    prompt: promptCheckPrompt,
  },
  {
    name: 'score-day',
    purpose: 'Turns answers into visibility, share of voice, average position and mention rate per engine per day (idempotent SQL), then sends at most one alert email per brand per day.',
    trigger: 'pg_cron hourly at minute 15 (x-cron-secret header); also after each finished run',
    secrets: ['CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL'],
    prompt: promptScoreDay,
  },
  {
    name: 'send-digest',
    purpose: 'Sends each user\'s daily digest at their chosen local hour: visibility by engine, rank changes, new competitor mentions, top cited sources and one recommended action. Exactly once per day.',
    trigger: 'pg_cron hourly at minute 5 (x-cron-secret header)',
    secrets: ['CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL', 'DIGEST_SIGNING_SECRET'],
    prompt: promptSendDigest,
  },
  {
    name: 'recheck',
    purpose: 'On-demand "Recheck now" for one prompt (or the free first run for a new brand), with a 10 minute cooldown, a daily limit per plan and the spend cap checked before any job is queued.',
    trigger: 'Browser, "Recheck now" on a prompt and onboarding step 6 (user JWT)',
    secrets: ['CRON_SECRET', 'SITE_URL'],
    prompt: promptRecheck,
  },
  {
    name: 'generate-recommendations',
    purpose: 'Has Claude Sonnet propose the 5 highest-impact pages to write, pages to improve and third-party sites to appear on, using only prompt ids and URLs that exist in the data.',
    trigger: 'pg_cron daily at 03:30 UTC for brands due a weekly refresh (x-cron-secret), and the Growth "Refresh recommendations" button (user JWT, 1 per day)',
    secrets: ['ANTHROPIC_API_KEY', 'FIRECRAWL_API_KEY', 'CRON_SECRET', 'SITE_URL'],
    prompt: promptRecommendations,
  },
  {
    name: 'free-audit',
    purpose: 'The lead magnet: a public form runs 5 buyer prompts on 3 engines for any work-email domain, shows a score page and emails the link. Bot traps, per-domain, per-IP and daily caps keep it cheap.',
    trigger: 'Public /audit form (no login), the /audit/[token] page polling, and run-checks every minute to drain queued audits',
    secrets: ['OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL', 'DIGEST_SIGNING_SECRET'],
    prompt: promptFreeAudit,
  },
]
