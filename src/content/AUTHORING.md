# Content authoring rules (for whoever writes app/phase content)

Audience: solo founders, mostly non-technical, who want to copy-paste their way to a paid SaaS.
They open Claude Code in a blank folder and follow these steps. Spoon-feed them.

## Voice
- No em dashes (—) or en dashes used as dashes. Use full stops, commas, colons, brackets.
- Banned: "here's the kicker", "here's the thing", "let's dive in", "it's not X, it's Y", "game-changer",
  "unlock", "supercharge", "leverage" (verb), "seamless", "robust", "delve", "at the end of the day",
  "the truth is", "insane", "crazy", "10x", "massive", "literally", "simply", "obviously", "just" as softener.
- No legal or admin fluff: never tell them to set up an LLC, talk to a lawyer, write terms, or
  warn about plan restrictions. Pure build-and-sell steps.
- Every step has an exact click path, exact text to paste, or an exact command. ELI5 callouts
  explain the concept in 2 to 4 short sentences like you're talking to a smart 12 year old.
- British spelling (optimise, colour), US dollar prices.

## Fixed stack (always)
- Claude Code in a blank folder builds everything. Next.js (App Router, TypeScript), Tailwind, shadcn/ui.
- Supabase cloud (supabase.com, never self-hosted): auth, Postgres + RLS, storage, edge functions.
  New key names: publishable key `sb_publishable_...` (browser), secret key `sb_secret_...` (server only).
  Server checks the user with `supabase.auth.getClaims()`. Turn off "Confirm email" for fast signup.
  Supabase MCP: `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<ref>"` then `/mcp` to authenticate.
- GitHub: assume they have NO account yet. Sign up, create empty private repo, push from Claude Code.
- Vercel: free account, sign up with GitHub, import repo, add env vars, deploy. Redeploy after env changes.
- Porkbun: buy domain, add to Vercel (A record 76.76.21.21 for apex, CNAME cname.vercel-dns.com for www).
- Resend: transactional email (welcome, trial ending), and Supabase custom SMTP via Resend.
- Stripe: 7-day free trial then monthly at the app's price. Checkout (mode subscription,
  subscription_data.trial_period_days), Customer Portal, webhook into a Supabase edge function or
  Next.js route that verifies the signature on the raw body and writes `public.subscriptions`.
  App access = status in ('trialing','active'). Never grant access from success_url.
- Analytics: DataFast (datafa.st) or PostHog.

## Mechanics
- Content lives in TypeScript template literals. Escape every backtick inside content as \` and
  every `${` as `\${`. Run `npx tsc -p .` from the repo root and fix all errors before finishing.
- Every Task, ChecklistItem and code/prompt/doc block `id` must be unique within an app.
  Prefix ids with the phase or app slug, e.g. `eth-be-sql`.
- Checklist items: 2 to 6 per task, start with a verb, things a user physically does. Use
  `trigger: 'copy:<blockId>'` or `'download:<blockId>'` to auto-tick when they copy/download that block.
- xp: 10 to 80 by effort. minutes: realistic.
