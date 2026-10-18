// Harvest: LinkedIn post engagers turned into a warm, enriched lead list every morning.
import type { AppDef } from '../types'
import { buildPrd1 } from './harvest/buildPrd1'
import { buildPrd2 } from './harvest/buildPrd2'
import { designPrd } from './harvest/designPrd'
import { landingPrd } from './harvest/landingPrd'
import { sql } from './harvest/sql'
import { edgeFunctions } from './harvest/edgeFunctions'
import { frontendTasks } from './harvest/frontendTasks'
import { backendTasks } from './harvest/backendTasks'
import { securityTasks } from './harvest/securityTasks'
import { outbound, inbound, paid } from './harvest/marketing'
import { launchTasks, repoTree, starterFiles } from './harvest/launch'

export const harvest: AppDef = {
  slug: 'harvest',
  name: 'Harvest',
  tagline: 'Warm leads from LinkedIn posts',
  oneLiner: 'Track the LinkedIn posts and creators you choose, and every morning get the people who engaged who fit your buyer, with role, company, a verified email and an opener about what they reacted to.',
  category: 'sales',
  art: { motif: 'mail', tone: 'green' },
  price: { monthly: 59, trialDays: 7 },
  difficulty: 3,
  buildHours: 32,
  apis: [
    {
      name: 'Apify (LinkedIn post actors)',
      job: 'collects the people who reacted to or commented on each tracked post, and each tracked creator\'s new posts, with no LinkedIn login, then calls Harvest back by webhook',
      signupUrl: 'https://console.apify.com/sign-up',
      docsUrl: 'https://docs.apify.com/api/v2',
      pricing: 'Checked Oct 2026: Free plan $5 of usage a month; Starter $29 a month of prepaid usage, Scale $199 [verify on apify.com/pricing]. The HarvestAPI actors are pay per result with no platform compute charge: post reactions $2 per 1,000, post comments $2 per 1,000, profile posts $2 per 1,000 [verify on each actor page]. Picked because they state they need no cookies or account, so customers\' LinkedIn accounts are never involved. Proxycurl, the old default LinkedIn API, shut down in July 2025 after LinkedIn sued.',
      envVars: [
        { name: 'APIFY_TOKEN', where: 'Apify Console > Settings > API & Integrations > Personal API tokens (apify_api_...) [verify menu name]', pasteInto: 'Supabase secrets', secret: true },
        { name: 'APIFY_WEBHOOK_SECRET', where: 'Make one: openssl rand -hex 32 (sent by Apify as the x-harvest-secret header)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'APIFY_REACTIONS_ACTOR', where: 'harvestapi~linkedin-post-reactions (swap here if the actor breaks)', pasteInto: 'Supabase secrets', secret: false },
        { name: 'APIFY_COMMENTS_ACTOR', where: 'harvestapi~linkedin-post-comments', pasteInto: 'Supabase secrets', secret: false },
        { name: 'APIFY_POSTS_ACTOR', where: 'harvestapi~linkedin-profile-posts', pasteInto: 'Supabase secrets', secret: false },
      ],
    },
    {
      name: 'Prospeo',
      job: 'turns a LinkedIn profile URL into a current title, seniority, company, headcount, industry and work email in one call, only for people who passed the ICP prefilter',
      signupUrl: 'https://app.prospeo.io/signup',
      docsUrl: 'https://prospeo.io/api-docs/enrich-person',
      pricing: 'Checked Oct 2026: Free 100 credits a month with no API access; Starter $49 (2,000 credits), Growth $99 (5,000), Pro $249 (15,000) a month [verify, third-party sources disagree on prices]. Enrich person costs 1 credit per match (person, company and email together), nothing when no match, re-enriching the same record is free [verify]. About $0.017 to $0.025 per enriched lead; the model uses $0.02.',
      envVars: [
        { name: 'PROSPEO_API_KEY', where: 'Prospeo dashboard > API > API key [verify menu name], sent as the X-KEY header', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'MillionVerifier',
      job: 'double-checks every email the enrichment returns so customers only see ok or catch-all addresses',
      signupUrl: 'https://app.millionverifier.com/signup',
      docsUrl: 'https://developer.millionverifier.com',
      pricing: 'Checked Oct 2026: pay as you go, credits never expire; about $37 to $39 per 10,000 checks, $89 per 50,000, $449 per 1,000,000 [verify, third-party sources]. Only ok, invalid and disposable results use a credit; catch-all and unknown are free [verify]. About $0.0039 per checked email on the smallest pack.',
      envVars: [
        { name: 'MILLIONVERIFIER_API_KEY', where: 'MillionVerifier > API > API key [verify menu name], sent as the api query parameter', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
    {
      name: 'Claude API (Anthropic)',
      job: 'drafts the ICP from a sentence, prefilters headlines in batches of 50, scores each enriched person and writes a guarded opener about what they engaged with, using claude-haiku-5-5 with structured JSON output',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.claude.com/en/api/overview',
      pricing: 'Checked Oct 2026: claude-haiku-5-5 is $0.10 per million input tokens and $0.50 per million output tokens. A 50-headline prefilter batch is about 3,200 in and 1,000 out ($0.0008, so $0.00002 per engager); a score with opener is about 1,900 in and 250 out ($0.0003 per lead). Prepaid credits; set a monthly spend limit in Settings > Limits.',
      envVars: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ANTHROPIC_API_KEY', where: 'Same key, for the onboarding ICP draft route', pasteInto: '.env.local', secret: true },
      ],
    },
    {
      name: 'HubSpot and Pipedrive (customer tokens)',
      job: 'receives pushed leads as contacts with a note about the engagement, using each customer\'s own private app token or API token, stored AES-GCM encrypted',
      signupUrl: 'https://www.hubspot.com/products/crm',
      docsUrl: 'https://developers.hubspot.com/docs/guides/apps/private-apps/overview',
      pricing: 'Free for Harvest (checked Oct 2026): customers use their own HubSpot (free CRM works) or Pipedrive account and token. No OAuth app review needed in v1. Pipedrive API docs: developers.pipedrive.com [verify the v2 persons endpoint and x-api-token header].',
      envVars: [
        { name: 'INTEGRATIONS_ENCRYPTION_KEY', where: 'Make one: openssl rand -base64 32 (never change it without re-encrypting stored tokens)', pasteInto: 'Supabase secrets', secret: true },
      ],
    },
  ],
  idealFor: 'People who want a first B2B SaaS sold to a market they already watch every day: B2B founders, small agency owners and recruiters who post on LinkedIn and know their competitors\' posts are full of buyers.',
  whyItSells: 'A founder whose posts get 300 reactions a week is ignoring about 1,200 warm people a month. Harvest turns them into about 20 scored, emailable leads every morning for $59, and one closed $3,000 deal pays for more than four years of Solo.',
  features: [
    'Track your own posts, competitors\' posts and whole creators: every new post is collected at 1, 3 and 7 days old',
    'Never logs in to LinkedIn as you: no cookies, no extension, no automated invites or DMs',
    'Plain-English ICP turned into titles, seniority, company size, industries and countries, with a tunable threshold',
    'Cheap headline prefilter first, so only likely buyers are enriched with role, company, size and a work email',
    'Every email double-checked by a verifier; invalid addresses removed, catch-all marked',
    'Score, reasons and an opener that mentions the post topic or their comment, guarded against prompt injection',
    '7am digest with the top 20 new warm leads, plus Today, Leads, Lists and live run status in the app',
    'CSV export, HubSpot and Pipedrive push, signed webhooks, customer suppression and one-click forget',
  ],
  status: 'full',
  costs: {
    usage: { label: 'Engagers collected per workspace per month (reactions and comments)', unit: 'engagers', default: 1500, min: 100, max: 10000, step: 100 },
    plans: [
      { id: 'solo-monthly', usageCap: 1500, name: 'Solo', price: 59, interval: 'month', includes: '1 seat, 15 sources, 1,500 engagers collected, 300 leads enriched, 1 ICP, daily digest, CSV and signed webhooks' },
      { id: 'solo-yearly', usageCap: 1500, name: 'Solo (yearly)', price: 590, interval: 'year', includes: 'Same as Solo, 2 months free' },
      { id: 'growth-monthly', usageCap: 4000, name: 'Growth', price: 129, interval: 'month', includes: '3 seats, 50 sources, 4,000 engagers, 600 leads enriched, 3 ICPs, HubSpot and Pipedrive push, 3 digest recipients' },
      { id: 'growth-yearly', usageCap: 4000, name: 'Growth (yearly)', price: 1290, interval: 'year', includes: 'Same as Growth, 2 months free' },
      { id: 'agency-monthly', usageCap: 10000, name: 'Agency', price: 249, interval: 'month', includes: '10 seats, 150 sources, 10,000 engagers, 950 leads enriched, 10 ICPs (one per client), everything in Growth' },
      { id: 'agency-yearly', usageCap: 10000, name: 'Agency (yearly)', price: 2490, interval: 'year', includes: 'Same as Agency, 2 months free' },
    ],
    lines: [
      { name: 'Engager collection (reactions, comments, creator posts)', vendor: 'Apify (HarvestAPI actors)', kind: 'perUnit', amount: 0.002, freeTier: '$5 of Apify usage a month on the Free plan (about 2,500 results).', note: '$2 per 1,000 results, pay per result, no compute charge. Every result Apify returns is metered, including people seen again on a later pass. Creator post discovery adds well under 1% (10 posts per creator per night at the same rate). Checked Oct 2026 [verify on the actor pages].', url: 'https://apify.com/harvestapi/linkedin-post-reactions' },
      { name: 'Headline prefilter', vendor: 'Anthropic (claude-haiku-5-5)', kind: 'perUnit', amount: 0.00002, note: 'Batches of 50 headlines: about 3,200 input tokens ($0.00032) and 1,000 output tokens ($0.0005) = $0.0008 per batch, $0.000016 per engager, rounded up. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Enrichment (role, company, size, email)', vendor: 'Prospeo', kind: 'perUnit', amount: 0.004, note: '$0.02 per match (Growth plan rate, $99 for 5,000 credits; Pro is $0.0166) x 20% of engagers enriched = $0.004 per engager. The plan caps hold the ratio at or under 20% (Solo 300 of 1,500, Growth 600 of 4,000 = 15%, Agency 950 of 10,000 = 9.5%). No charge when no match is found, so real cost is lower. Checked Oct 2026 [verify].', url: 'https://help.prospeo.io/en/article/plans-and-pricing-overview-cdloq9' },
      { name: 'Email verification', vendor: 'MillionVerifier', kind: 'perUnit', amount: 0.00078, note: '$0.0039 per check (smallest pack, $39 per 10,000) x 20% of engagers, assuming every enriched lead has an email to check (worst case). Catch-all and unknown results are not charged. Checked Oct 2026 [verify].', url: 'https://www.millionverifier.com' },
      { name: 'Lead scoring and opener', vendor: 'Anthropic (claude-haiku-5-5)', kind: 'perUnit', amount: 0.00006, note: 'About 1,900 input tokens and 250 output tokens per enriched lead = $0.0003, x 20% of engagers = $0.00006 per engager. Re-scored at most once a week per person. Checked Oct 2026.', url: 'https://www.anthropic.com/pricing' },
      { name: 'Vendor minimum plans (unused prepaid credit)', vendor: 'Apify + Prospeo', kind: 'fixed', amount: 70, steps: [{ fromCustomers: 0, amount: 49 }, { fromCustomers: 1, amount: 70 }, { fromCustomers: 10, amount: 40 }, { fromCustomers: 30, amount: 0 }], freeTier: 'Apify Free covers building. Prospeo has no API on its free plan, so Starter ($49) is needed from day one [verify].', note: 'Apify Starter ($29) and Prospeo Starter ($49) are prepaid usage. With 1 customer most of that credit goes unused (about $70); by about 10 customers usage fills Apify and most of a Prospeo Growth plan; by about 30 customers on Prospeo Pro the per-unit lines (priced at the higher Growth rate) already cover it. This line is the unused part only, so it does not double count.' },
      { name: 'Supabase', vendor: 'Supabase', kind: 'fixed', amount: 25, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 25 }, { fromCustomers: 250, amount: 40 }, { fromCustomers: 800, amount: 85 }], freeTier: 'Free plan for building (pauses after a week idle). Upgrade before the first paying customer.', note: 'Pro $25 a month with $10 compute credit and 8 GB database. Each workspace keeps about 3,000 to 10,000 people and engagement rows (purged after 90 to 180 days), roughly 10 to 30 MB. Small compute (+$15) from about 250 workspaces as nightly workers and realtime grow, Medium (+$60) from about 800. Checked Oct 2026.', url: 'https://supabase.com/pricing' },
      { name: 'Vercel Pro', vendor: 'Vercel', kind: 'fixed', amount: 20, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 1, amount: 20 }], freeTier: 'Hobby is free for non-commercial use only.', note: '$20 per member per month with $20 of usage credit. One member is enough; heavy work runs in Supabase, not Vercel. Checked Oct 2026.', url: 'https://vercel.com/pricing' },
      { name: 'Digest and transactional email', vendor: 'Resend', kind: 'fixed', amount: 0, steps: [{ fromCustomers: 0, amount: 0 }, { fromCustomers: 80, amount: 20 }, { fromCustomers: 1400, amount: 90 }], freeTier: '3,000 emails a month, 100 a day.', note: 'About 35 emails per workspace a month (30 digests plus a few alerts). The free 100 a day limit is hit first, at about 80 workspaces: Pro $20 for 50,000 a month covers up to about 1,400; then the 100,000 tier (about $90 [verify]). Checked Oct 2026.', url: 'https://resend.com/pricing' },
      { name: 'Product analytics', vendor: 'PostHog', kind: 'fixed', amount: 0, freeTier: '1 million events and 5,000 replays a month.', note: 'Free tier covers well past 1,000 workspaces at this event volume. Checked Oct 2026.', url: 'https://posthog.com/pricing' },
      { name: 'Domain', vendor: 'Porkbun', kind: 'fixed', amount: 1, note: 'A .com or .io about $10 to $40 a year, shown as about $1 a month [verify the exact TLD price].', url: 'https://porkbun.com' },
    ],
    notes: [
      'Per engager at the 20% enrichment ratio: $0.002 collection + $0.00002 prefilter + $0.004 enrichment + $0.00078 verification + $0.00006 scoring = $0.00686. At the default 1,500 engagers that is $10.29 a month.',
      'Solo at every cap (1,500 engagers, 300 enriched): $3.00 + $0.03 + $6.00 + $1.17 + $0.09 = $10.29. Stripe on $59 is about $2.42 (2.9% + $0.30 + 0.7%). Gross margin (59 - 10.29 - 2.42) / 59 = 78.5%. Yearly ($590, $49.17 a month, Stripe about $1.80 a month): 75.4%.',
      'Growth at every cap (4,000 engagers, 600 enriched): $8.00 + $0.08 + $12.00 + $2.34 + $0.18 = $22.60. Stripe on $129 is about $4.94. Margin 78.7% monthly; yearly ($107.50 a month, Stripe $3.90): 75.3%.',
      'Agency at every cap (10,000 engagers, 950 enriched): $20.00 + $0.20 + $19.00 + $3.71 + $0.29 = $43.19. Stripe on $249 is about $9.26. Margin 78.9% monthly; yearly ($207.50 a month, Stripe $7.50): 75.6%.',
      'Enrichment is the cost that matters: it is 10 times the price of collection. That is why caps limit enrichments separately, the headline prefilter runs first, and the daily budget is paced over the billing period.',
      'A 7 day trial is capped at 300 engagers and 40 enrichments, so a trial that never converts costs about $1.57 at most.',
      'Caps are enforced server-side from usage_ledger (remaining_engagements and remaining_enrichments) in hv-collect and hv-enrich, and Apify runs carry maxTotalChargeUsd, so no workspace can pass these numbers.',
      'Fixed costs at the first customer: Supabase $25 + Vercel $20 + domain $1 + vendor minimums $70 = about $116 a month. Two Growth customers cover it.',
      'Prices of the third-party Apify actors are set by their developers and can change. Re-check monthly in the first quarter. If the collection price doubled, yearly margins at cap would drop to about 65 to 70%: switch actor (one secret) or lower the engager caps.',
      'Stripe subscription fees are added by the calculator, not listed here.',
    ],
  },
  content: {
    buildPrd: buildPrd1 + buildPrd2,
    designPrd,
    landingPrd,
    sql,
    edgeFunctions,
    frontendTasks,
    backendTasks,
    securityTasks,
    marketing: { outbound, inbound, paid },
    launchTasks,
    repoTree,
    starterFiles,
  },
}
