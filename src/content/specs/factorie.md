# Factorie: AEO tracker (a Searchable.com clone)
slug `factorie`, category `ai-agents`, art `{ motif: 'chart', tone: 'violet' }`, status `full`, difficulty 3, buildHours ~30, price `{ monthly: 99, trialDays: 7 }`, prefix `fac-`.
Plans: Starter $99/mo (25 tracked prompts, 5 engines, weekly checks), Unlimited $199/mo (unlimited prompts, all engines, daily checks, unlimited competitors); annual = 10x monthly. Verify 75%+ margin; adjust limits if not and say so.

- Deep onboarding: website, brand, category, ICP, 3 to 5 competitors, regions, problem solved.
- Firecrawl maps + scrapes key pages; Claude summarises the brand and writes 20 buyer-style prompts ("best X for Y"); user edits/approves.
- Scheduled checks (pg_cron + pg_net → edge function, cron secret header) send each prompt to each engine via OpenRouter (Perplexity Sonar, ChatGPT with web search, Gemini, Claude, DeepSeek, Grok); parse answers for brand mention, list position, sentiment, cited URLs, competitor mentions (deterministic regex + Claude structured extraction); store; compute visibility score per engine, share of voice, average position, trend.
- On-demand rechecks (rate-limited). Daily Resend digest: visibility by engine, rank changes, new competitor mentions, top cited sources, one recommended action.
- Dashboards: overview, per-prompt drilldown with raw answers highlighted, competitor dashboard, sources/citations, recommendations (Claude suggests content to write), settings with sliders (frequency, engines, thresholds).
- Edge functions: scrape-site, generate-prompts, run-checks (fan-out, batches), check-prompt, score-day, send-digest, recheck, generate-recommendations.
- SQL: profiles, brands, competitors, tracked_prompts, engines (seeded with OpenRouter slugs), check_runs, check_results (raw answer, mentioned, position, sentiment, cited_urls, competitor_mentions jsonb, cost_usd), daily_scores, recommendations, email_log, usage_ledger, subscriptions, stripe_events, plan_limits(uid).
- Costs: usage = tracked prompts per customer (default 25); per-check token maths across engines and frequency.
- Marketing: SaaS founders, agencies, ecommerce; free "AI visibility audit" lead magnet; comparison vs Searchable, Profound, Otterly, Peec.
- Partial files already in `src/content/apps/factorie/` (buildPrd1-3.ts, designPrd.ts, landingPrd.ts): review, keep what's good, finish.
