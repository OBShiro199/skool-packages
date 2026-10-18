# Conversate: AI help desk (a Ferndesk clone)
slug `conversate`, category `ai-agents`, art `{ motif: 'chat', tone: 'blue' }`, status `full`, difficulty 3, buildHours ~38, prefix `con-`. No price given: compute per-customer cost and set 2 to 3 plans at 75%+ margin, monthly + annual, 7-day trial.

- Onboarding: company, website, support email, what they sell, tone of voice, top questions. Firecrawl + Claude crawl the site, draft help articles into a public help centre at /<workspace>/help (categories, search, article pages) and chunk + embed into pgvector.
- Branding: widget icon upload (Storage), colour, greeting, position, launcher label, avatar, office hours message, live preview.
- Embed: one-line `<script>` in `<head>` with steps for plain HTML, Webflow, WordPress, Shopify, Framer, Next.js. Tiny vanilla JS loader → iframe or shadow DOM, postMessage API.
- Each visitor question gets an AI answer from the knowledge base (`claude-haiku-5-5`), with sources, confidence score, "Talk to a human". Every conversation lands in an in-app shared Inbox (assign, open/pending/snoozed/closed, notes, flag, tags, canned replies). Low-confidence answers and flags notify the team via Resend. Agent replies stream to the widget via Realtime; email fallback if the visitor left.
- Multi-tenant teams: invite agents by email (owner/admin/agent), `is_workspace_member` helpers, same as a CRM.
- AI suggested replies, content-gaps report (unanswered questions → one-click draft article), analytics (volume, AI resolution rate, first response time, CSAT).
- Widget security: public workspace key + allowed domains (Origin check), visitor JWT per session, rate limits; widget only calls public edge functions; prompt-injection guard.
- Edge functions: onboard-crawl, build-knowledge, draft-articles, widget-config, widget-session, widget-message, agent-reply, notify, invite-member, suggest-reply.
- SQL: workspaces, members, invitations, profiles, widget_settings, allowed_domains, kb_sources, kb_categories, kb_articles, kb_chunks (vector, HNSW), match_chunks(), visitors, conversations, messages, notes, tags, assignments, canned_replies, flags, notifications, csat, content_gaps, usage_ledger, email_log, subscriptions, stripe_events; buckets widget-assets (public read), attachments (private).
- Embeddings: Voyage `voyage-3.5` or Supabase `gte-small`; choose and justify.
- Costs: usage = AI answers per customer per month (default 1,500).
- Marketing: SaaS founders, Shopify stores, agencies; "we built your help centre from your site in 5 minutes" demo; comparison vs Ferndesk, Intercom, Crisp, Help Scout.
- Sidebar: Inbox, Help Centre, Knowledge, Widget, Analytics, Team, then Documentation, Help, Billing, Settings.
