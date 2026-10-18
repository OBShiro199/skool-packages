# Harvest: LinkedIn post engagers turned into a warm, enriched lead list every morning.
slug `harvest`, category `sales`, art `{ motif: 'mail', tone: 'green' }`, status `full`, difficulty 2 or 3 (your call), buildHours your estimate, 3-letter id prefix of your choice (unique, not used by another kit). No price given: compute per-customer cost from researched API prices and set 2 to 3 plans at 75%+ gross margin at each plan's cap, monthly + annual (10x), 7-day trial; maths in costs.notes.

- User connects the LinkedIn posts or creators they want to mine (their own posts, competitors', influencers in their niche).
- Every morning a job collects people who liked/commented (research compliant data sources: Apify LinkedIn actors, the GetLeads/Proxycurl-style enrichment APIs; be honest about LinkedIn ToS risk and pick the safest legal route, e.g. user-supplied post URLs + a scraping API that takes on the compliance risk, marked [verify]).
- Enrich each person (role, company, size, email via a finder + verifier), score against the user's ICP with Claude (`claude-haiku-5-5`), dedupe across days, suppress existing customers.
- Daily digest email (Resend) with the top 20 warm leads and a suggested opener referencing what they engaged with.
- Lists, CSV export, push to HubSpot/Pipedrive via webhook, or send to Outbounder-style sequences (export only in v1).
- Costs: usage = engagers processed per month. Price for 75%+ margin.
- Marketing: B2B founders, agencies, recruiters who post on LinkedIn.
- Sidebar: core pages, then Documentation, Help, Billing, Settings.
- Everything else per KIT_BRIEF.md.
