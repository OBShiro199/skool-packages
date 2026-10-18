// Factorie build PRD (PRD.md), part 3: appendices (function contracts, page data, settings, env, edge cases).

export const buildPrd3 = `
## Appendix A. Edge function contracts

All functions live in \`supabase/functions/<name>/index.ts\` and share helpers in \`supabase/functions/_shared/\`: \`supabase.ts\` (admin client), \`auth.ts\` (\`requireUser\`, \`requireCron\`, \`requireAccess\`), \`http.ts\` (json, cors, HttpError), \`retry.ts\` (\`withRetry\` with backoff and \`retry-after\`), \`pool.ts\` (\`runPool\` with a concurrency limit), \`openrouter.ts\` (\`askEngine\`), \`anthropic.ts\` (\`structured\` helper), \`parser.ts\` (pass 1 and merge), \`ledger.ts\` (\`recordCost\`, \`monthSpend\`), \`prompts.ts\` (all system prompts from section 14 and 11.2), \`log.ts\` (one JSON line per event).

| Function | Auth | Body in | Response out | Paid calls |
| --- | --- | --- | --- | --- |
| \`scrape-site\` | User JWT | \`{ brand_id }\` | \`{ ok, pages, summary }\` | Firecrawl map + scrape, Claude Sonnet |
| \`generate-prompts\` | User JWT | \`{ brand_id, replace?: boolean }\` | \`{ ok, prompts: [{ id, text, intent, region, why }] }\` | Claude Sonnet |
| \`run-checks\` | Cron secret | \`{}\` or \`{ run_id }\` (drain one run first) | \`{ ok, scheduled, claimed, done, failed, ms }\` | none directly |
| \`check-prompt\` | Cron secret | \`{ job_id }\` | \`{ ok, status, cost_usd }\` | OpenRouter, Claude Haiku |
| \`score-day\` | Cron secret | \`{ brand_id?, day? }\` | \`{ ok, brands_scored }\` | none |
| \`send-digest\` | Cron secret | \`{ user_id? }\` (test one user) | \`{ ok, sent, skipped }\` | Resend |
| \`recheck\` | User JWT | \`{ prompt_id }\` or \`{ brand_id, scope: 'all' }\` | \`{ ok, run_id, jobs }\` | none directly |
| \`generate-recommendations\` | User JWT or cron secret | \`{ brand_id }\` or \`{}\` (cron: all due brands) | \`{ ok, created }\` | Firecrawl (refresh 5 pages max), Claude Sonnet |
| \`free-audit\` | None (public) for submit; cron secret for \`{ drain: true }\` | \`{ email, website, brand_name, category, company_fax, rendered_at }\` | \`{ ok, token }\` | Claude Sonnet (5 prompts), OpenRouter (15 checks), Claude Haiku |

### A.1 Errors and retries per function

| Function | Most likely failures | Retry rule | What the user sees |
| --- | --- | --- | --- |
| \`scrape-site\` | Site blocks bots (403), map returns 0 links, Firecrawl 429/5xx, timeout | Firecrawl calls: 2 retries with 2s, 6s backoff. Whole function: no retry; the user can click "Try again" (counts toward 3 per day) | Onboarding step 2 opens with empty fields and the amber note. Never a dead end |
| \`generate-prompts\` | Claude 529/overloaded, schema mismatch, fewer than 20 valid after filters | SDK retries 2 times on 429/5xx. On fewer than 15 valid prompts, one more call asking for the missing intents only | "We wrote 17 prompts. Add a few of your own or regenerate" |
| \`run-checks\` | Overlapping invocations, wall-time limit, kill switch on | None needed: claim is \`skip locked\` and every step is idempotent, next minute picks up | Run status chip keeps counting |
| \`check-prompt\` | 429/5xx/timeout from OpenRouter, 402 out of credits, 400 bad slug, Claude parse failure | Job back to \`queued\` with \`30s x 2^attempts\` + up to 10s jitter, max 3 attempts. 402 and 401 stop the drain. Parse failure twice: save regex-only | Partial run banner with the count that worked |
| \`score-day\` | No results that day, divide by zero | None: SQL returns nulls, the next hourly run fills in | Cards show a dash and "No checks yet today" |
| \`send-digest\` | Resend 429/5xx, bad recipient address | Resend call: 2 retries. The \`email_log\` row is deleted on final failure so the next hourly run retries once more | Nothing (they get it an hour later) |
| \`recheck\` | Cooldown, daily limit, budget | No retry: returns 429/402 with \`retry_in_s\` or \`resets_at\` | "Rechecks reset at midnight (2 left today)" |
| \`generate-recommendations\` | Claude invents a URL or id, no data yet | Invalid items dropped; if 0 left, one retry with "use only these ids" restated | "Recommendations appear after your first full week" |
| \`free-audit\` | Abuse, any engine failing | Each engine check retried once; audit completes with what worked | "2 of 3 engines answered" on the result page |

Common rules:
- Every function logs exactly one summary line at the end: \`{ fn, user_id?, brand_id?, ms, cost_usd, outcome }\`. Never log API keys, page markdown or full answers.
- Every paid call goes through \`recordCost()\`, which inserts a \`usage_ledger\` row with \`on conflict (ref, operation) do nothing\`.
- HTTP errors return \`{ ok: false, code, message }\` with the right status (400, 401, 402, 403, 404, 409, 429, 500).
- Timeouts: OpenRouter 60 seconds, Anthropic 60 seconds, Firecrawl 45 seconds per scrape, Resend 15 seconds. Use \`AbortSignal.timeout(ms)\`.

## Appendix B. Page data contracts

Each \`/app\` page reads with the user's session (RLS applies) through views created \`with (security_invoker = true)\`.

### B.1 Overview (\`/app\`)
- Score cards: \`daily_scores\` where \`engine_key = 'all'\`, today and today minus 7, for the current brand.
- Line chart "Visibility by engine": \`daily_scores\` for the last 30, 90 or 180 days (range toggle), one series per enabled engine plus "All" (thicker line).
- Stacked bar "Who gets mentioned": \`competitor_daily\` and brand mentions for the latest day per engine: one bar per engine, segments = brand + each competitor + "Others", values = share of voice.
- Rank heatmap: view \`v_latest_positions\` (prompt x engine, latest position or null). Rows = prompts (sorted by average visibility ascending so problems show first), columns = engines.
- "Biggest moves" list: view \`v_rank_changes\` (last two results per prompt and engine), top 5 by absolute change.
- Alerts banner from \`v_alerts\`.

### B.2 Prompts (\`/app/prompts\`)
- Table from \`v_prompt_scores\`: prompt text, intent, region, pinned, per-engine latest position (badge), visibility 7-day average, mention rate, last checked, "Recheck" button. Filters: intent, engine, "Not mentioned anywhere", "Lost this week". Search by text.
- Bulk actions: activate, deactivate, pin (Growth), delete. Limits come back from the triggers as error messages shown in a toast.

### B.3 Prompt drilldown (\`/app/prompts/[id]\`)
- Header: prompt text (editable inline, which creates a new prompt version: old results stay linked to the old text via \`prompt_text_snapshot\` on each result), intent, pinned toggle, Recheck button with remaining count ("3 rechecks left today").
- Engine tabs. Each tab: latest answer rendered with highlights (\`highlights\` jsonb), side panel with position, sentiment, descriptor, recommended, cited URLs (favicon, domain, title), competitor mentions with positions.
- "History" strip: last 12 results for that engine as small chips (position or a dash), click to open that answer.
- "Compare engines" view: all engines side by side, answers collapsed to the list items only.

### B.4 Competitors (\`/app/competitors\`)
- Share of voice donut (all engines, last 7 days), centre label = brand SOV.
- Head-to-head table: competitor, SOV, mention rate, average position, prompts where they beat you (count, click to filter), trend sparkline.
- "Brands we keep seeing": aggregated \`other_brands\` counts over 14 days with "Track" button (respects limit).

### B.5 Sources (\`/app/sources\`)
- Top domains (view \`v_source_domains\`): domain, times cited (14 days), engines citing it, competitors mentioned in answers citing it, brand cited yes/no. Tag "Outreach target" when competitors appear and the brand does not.
- Top URLs: URL, title, times cited, prompts. Your own domain's URLs grouped at the top with a "Your pages" tag.
- Filters: engine, prompt intent, date range.

### B.6 Recommendations (\`/app/recommendations\`)
- Cards sorted by priority: kind icon, title, why, impact dots, effort tag, target prompts (chips), source URLs, outline (expand). Status: open, in progress, done, dismissed. "Mark done" asks "Recheck the target prompts now?" (uses rechecks).
- Button "Refresh recommendations" (Growth, 1 per day; Starter sees the next scheduled date).

### B.7 Runs (\`/app/runs\`)
- Table from \`check_runs\`: started, kind, status pill, jobs done/total, failed, cost (2 decimals), duration. Row opens a list of failed jobs with \`last_error\`.

## Appendix C. Settings spec

| Setting | Control | Range / options | Stored in | Notes |
| --- | --- | --- | --- | --- |
| Check frequency | Segmented control | Weekly (all plans); Daily for pinned prompts (Growth) | \`brands.check_frequency\` | Server enforces plan |
| Check day and hour | Select + slider | Mon to Sun, 0 to 23 in brand timezone | \`brands.check_dow\`, \`check_hour\` | Sets \`next_check_at\` |
| Engines | Toggle per engine | Locked with plan badge if not allowed | \`brands.engines_enabled text[]\` | Shows "Live web" or "Memory" tag and est. cost per run |
| Visibility drop alert | Slider | 0 (off) to 30 points, step 1, default 5 | \`brands.alert_visibility_drop\` | |
| Competitor overtakes alert | Toggle | on/off, default on | \`brands.alert_competitor_overtake\` | |
| Lost #1 on pinned prompt | Toggle | on/off, default on | \`brands.alert_lost_top\` | |
| Email me alerts | Toggle | on/off, default on | \`brands.alerts_email\` | Off still shows the banner in the app |
| Digest | Toggle + hour slider | 0 to 23, default 8 | \`profiles.digest_enabled\`, \`digest_hour\` | |
| Digest recipients | Email chips | Starter 1, Growth 5 | \`profiles.digest_recipients text[]\` | Each extra recipient gets a confirm email first [v1.1]; v1 sends to listed emails directly |
| Timezone | Combobox | IANA zones | \`profiles.timezone\` | Default from browser |
| Aliases | Chips | max 10 | \`brands.aliases\` | |
| Danger zone | Button | Delete brand (type the name to confirm) | cascade delete | |

Estimated monthly cost line under engines (for transparency, shown only to the user): "About 25 prompts x 5 engines x 4.3 runs = 538 checks a month". Never show dollar costs to customers; show check counts.

## Appendix D. Environment variables

| Name | Where it comes from | Paste into | Secret |
| --- | --- | --- | --- |
| \`NEXT_PUBLIC_SUPABASE_URL\` | Supabase > Project Settings > Data API | .env.local, Vercel env | No |
| \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\` | Supabase > Project Settings > API Keys (sb_publishable_...) | .env.local, Vercel env | No |
| \`SUPABASE_SECRET_KEY\` | Supabase > Project Settings > API Keys (sb_secret_...) | .env.local, Vercel env | Yes |
| \`NEXT_PUBLIC_SITE_URL\` | Your URL (http://localhost:3000 locally) | .env.local, Vercel env | No |
| \`OPENROUTER_API_KEY\` | openrouter.ai > Settings > API Keys (sk-or-v1-...) | Supabase secrets | Yes |
| \`ANTHROPIC_API_KEY\` | platform.claude.com > API Keys (sk-ant-...) | Supabase secrets | Yes |
| \`FIRECRAWL_API_KEY\` | firecrawl.dev > Dashboard > API Keys (fc-...) | Supabase secrets | Yes |
| \`RESEND_API_KEY\` | resend.com > API Keys (re_...) | Supabase secrets, Vercel env | Yes |
| \`EMAIL_FROM\` | e.g. \`Factorie <digest@yourdomain.com>\` | Supabase secrets, Vercel env | No |
| \`APP_URL\` | Same as NEXT_PUBLIC_SITE_URL | Supabase secrets | No |
| \`CRON_SECRET\` | You make it: \`openssl rand -hex 32\` | Supabase secrets and Supabase Vault | Yes |
| \`DIGEST_SIGNING_SECRET\` | You make it: \`openssl rand -hex 32\` | Supabase secrets | Yes |
| \`FOUNDER_EMAIL\` | Your own inbox for admin alerts (engine disabled, top up OpenRouter) | Supabase secrets | No |
| Stripe variables | See the Payments phase | .env.local, Vercel env | Mixed |

\`SUPABASE_URL\` and \`SUPABASE_SERVICE_ROLE_KEY\` exist in edge functions by default. Factorie's admin client prefers \`SUPABASE_SECRET_KEY\` if you set it as a secret, else falls back to \`SUPABASE_SERVICE_ROLE_KEY\`.

## Appendix E. Edge cases

| Case | Behaviour |
| --- | --- |
| Brand name is a common word ("Notion", "Front") | Stoplist forces Claude confirmation; user can add a "require domain or category nearby" flag per alias [v1.1] |
| Answer refuses ("I can't recommend specific products") | \`answer_type = 'refusal'\`, counts as not mentioned, shown with a grey "Refused" tag |
| Answer has two lists (e.g. "For startups" and "For enterprise") | Positions continue counting across lists in reading order; \`list_length\` = total items |
| Brand mentioned only as "unlike Factorie, X does..." | Mentioned true, sentiment from Claude, \`recommended\` false |
| Engine slug removed by OpenRouter | 400 mentioning the model: engine auto-disabled, admin emailed, user sees "Gemini paused: we're switching models" |
| User edits a prompt's text | Old results keep \`prompt_text_snapshot\`; scores use only results whose snapshot matches the current text from that day on |
| User deletes a competitor | Past \`competitor_mentions\` stay; scores from tomorrow exclude it; recompute last 30 days in background (score-day with a range) |
| Trial ends without payment | \`has_active_access\` false: runs stop being scheduled, dashboard shows read-only data behind the paywall banner for 30 days |
| Clock skew / DST | All schedule maths in UTC; user-facing hours converted with the brand timezone |
| Many brands due at once | Drain processes 40 per minute; runs finish in order; no run waits more than 2 hours at 1,000 customers (if it does, raise drain to 60 and concurrency to 12) |

## Appendix F. Glossary for the founder

- **AEO (answer engine optimisation):** getting AI assistants to mention and recommend your brand. The AI version of SEO.
- **Engine:** one AI assistant model (ChatGPT, Perplexity...). Factorie reaches all of them through OpenRouter, one API with one key.
- **Prompt:** one question a buyer would ask. Factorie asks every tracked prompt to every enabled engine on a schedule.
- **Run:** one batch of checks for a brand. **Job:** one prompt x one engine inside a run.
- **Visibility score:** 0 to 100, how often and how high you appear (section 12).
- **Share of voice:** your slice of all the brand mentions among you and your tracked competitors.
- **Citation / source:** a web page the engine says it used. The sources page shows which sites shape the answers in your category.
`
