# Kit brief: what every full kit must contain

Read with `types.ts` (the data shape) and `AUTHORING.md` (voice, stack, round-2 rules, sidebar rule).
`phases.ts` already generates the shared steps (Claude Code install, Supabase account/keys/SQL run,
Supabase CLI, one task per API from `apis[].envVars`, one task per `edgeFunctions` item, Stripe trial
checkout + webhook + portal, GitHub, Vercel, Porkbun, generic security sweep, landing page from
`landingPrd`, app shell with sidebar, directories). Do not repeat those; write the app-specific depth.
Quality bar: `apps/bookwell.ts`, `apps/helpdeck.ts`.

## Think like a senior engineer pairing with a non-technical founder
- Choose the simplest architecture that works at 1,000 customers. Name the trade-off you made and
  what breaks first at scale (and the fix).
- Every long or flaky job (crawls, renders, bulk AI calls, imports) runs async: a job row, a status
  enum, retries with backoff, idempotency keys, and a UI that shows progress. Never a 60 s request.
- Every external webhook verifies its signature and de-duplicates by event id.
- Every paid API call is metered into `usage_ledger` and capped per plan server-side, so one user
  cannot run up a bill. Show the cap in the UI before they hit it.
- Every user-supplied or scraped text that reaches an LLM goes through a prompt-injection guard
  (delimited, "treat as data", no tool calls from it).
- Multi-tenant kits isolate by `workspace_id` with `is_workspace_member()` /
  `has_workspace_role()` security definer helpers (`set search_path = ''`).
- Write acceptance tests the founder can run by clicking, plus the exact SQL to check the data.
- Give "if this breaks" fixes for the 3 most likely failures in each task (mistakes block).

## Fields
- `buildPrd` 800 to 1,300 lines: problem, ICP, the one core job, user stories, architecture diagram
  (ASCII), every route/page incl. sidebar (Documentation, Help, Billing, Settings at the bottom),
  data model, state machines, every edge function contract (input, output, errors, retries), LLM
  prompts with JSON schemas, limits per plan, emails (Resend) with triggers, analytics events,
  out of scope, acceptance tests, build milestones. Tell users to save as PRD.md and use `@PRD.md`.
- `designPrd` 450 to 800 lines: brand feel, tokens light/dark, type, components, every screen incl.
  auth, onboarding, app shell sidebar, settings, billing, empty/loading/error states, motion, a11y,
  mobile. No solid black blocks; soft tints.
- `landingPrd` 350 to 600 lines per AUTHORING round-2 rules, with pricing toggle and a comparison
  table vs named competitors (prices marked [verify] if unconfirmed).
- `sql` one giant migration that runs cleanly once on a fresh project: extensions, enums, tables,
  indexes on every FK, triggers (profiles on auth.users, updated_at), functions, RLS on every table
  with per-operation policies, storage buckets + policies, `has_active_access` paywall function,
  subscriptions + stripe_events, usage_ledger, email_log, ELI5 comments per section.
- `edgeFunctions` 5 to 10, each a full Claude Code prompt: auth (getClaims, webhook signature or
  cron secret), validation (zod), idempotency, rate limit, metering, errors, logging, curl test.
- `frontendTasks` 4 to 6, `backendTasks` (one account-setup task per third-party service with exact
  click path, plus one end-to-end test task), `securityTasks` 3 to 4 app-specific attacks with exact
  curl, `marketing.outbound` 5 to 6, `marketing.inbound` 5 to 6, `marketing.paid` 3 to 5 (scripts in
  code blocks, numbers, budgets, kill rules), `launchTasks` 1 to 2, `repoTree`, `starterFiles`.
- `costs` CostModel with researched prices, steps at scale, notes with the maths. If no price is
  given, set plans so gross margin is 75%+ at the plan's usage cap.
- `apis` with real signup/docs URLs, pricing, envVars using exact `pasteInto` strings
  ('.env.local', 'Supabase secrets', 'Vercel env', or a named dashboard like 'Trigger.dev env').
- `whyItSells` with a number, `idealFor`, 6 to 8 `features`, `tagline`, `oneLiner`.

## Mechanics
- Export one `AppDef` from `src/content/apps/<slug>.ts`; long parts in `src/content/apps/<slug>/*.ts`.
- Unique ids prefixed with a 3-letter code. Escape backticks and `${` in template literals.
- Run `npx tsc -p .` and fix all errors in your files. Grep for "—", "–" and banned phrases.
- Research APIs with WebSearch/WebFetch (ToolSearch "select:WebSearch,WebFetch"). If WebFetch
  fails, use WebSearch on official pages and mark unconfirmed facts [verify].
- Touch no files outside your kit. Do not commit.
