# Retain: Spots Stripe customers about to cancel and wins them back before they go.
slug `retain`, category `business`, art `{ motif: 'chart', tone: 'violet' }`, status `full`, difficulty 2 or 3 (your call), buildHours your estimate, 3-letter id prefix of your choice (unique, not used by another kit). No price given: compute per-customer cost from researched API prices and set 2 to 3 plans at 75%+ gross margin at each plan's cap, monthly + annual (10x), 7-day trial; maths in costs.notes.

- SaaS founders connect Stripe (OAuth via Stripe Connect or a restricted read key, research and pick the safest) and optionally their product's usage events (JS snippet or webhook).
- Churn risk score per customer from Stripe signals (failed payments, downgrades, seat reductions, card expiring, trial ending) and usage drops; explain each score in plain words.
- Dunning: smart retries guidance plus branded failed-payment emails and an in-app update-card page.
- Cancel flow: an embeddable cancel page (script) with reasons survey, tailored save offers (pause, discount, downgrade) applied via the Stripe API, and an exit interview.
- Win-back sequences via Resend for cancelled customers; Claude drafts personalised emails from usage history.
- Dashboard: MRR at risk, saved MRR, churn reasons.
- Costs: usage = active customers tracked; price on MRR bands at 75%+ margin.
- Marketing: SaaS founders between $5k and $100k MRR.
- Sidebar: core pages, then Documentation, Help, Billing, Settings.
- Everything else per KIT_BRIEF.md.
