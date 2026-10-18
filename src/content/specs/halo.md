# Halo: Asks happy customers for Google reviews at the right moment, and catches unhappy ones first.
slug `halo`, category `ai-agents`, art `{ motif: 'chat', tone: 'green' }`, status `full`, difficulty 2 or 3 (your call), buildHours your estimate, 3-letter id prefix of your choice (unique, not used by another kit). No price given: compute per-customer cost from researched API prices and set 2 to 3 plans at 75%+ gross margin at each plan's cap, monthly + annual (10x), 7-day trial; maths in costs.notes.

- Local businesses connect their Google Business Profile (Business Profile API access requirements: research honestly, [verify]) or paste their review link.
- Trigger review requests after a job/visit: via CSV upload, Zapier/webhook from their booking or POS tool, or manual send. Channels: SMS (Twilio) and email (Resend).
- Short private rating step first: 4 to 5 stars go to the Google review link; 1 to 3 go to a private feedback form that alerts the owner (no review gating dark patterns: research Google's policy on review gating and design to comply, explain in ELI5).
- Claude drafts replies to new Google reviews in the owner's tone; owner approves.
- Dashboard: requests sent, click rate, new reviews, average rating trend; multi-location.
- Costs: usage = review requests per month (SMS heavy); plans at 75%+ margin.
- Marketing: dentists, trades, salons, clinics, agencies that serve them.
- Sidebar: core pages, then Documentation, Help, Billing, Settings.
- Everything else per KIT_BRIEF.md.
