# Quotient: Instant online quotes for tradespeople, turned into booked jobs.
slug `quotient`, category `productivity`, art `{ motif: 'calendar', tone: 'green' }`, status `full`, difficulty 2 or 3 (your call), buildHours your estimate, 3-letter id prefix of your choice (unique, not used by another kit). No price given: compute per-customer cost from researched API prices and set 2 to 3 plans at 75%+ gross margin at each plan's cap, monthly + annual (10x), 7-day trial; maths in costs.notes.

- Trades (cleaners, landscapers, painters, removals, window fitters) build a quote calculator: services, pricing rules (per room, per m2, per hour, minimum charge, extras, postcode zones), photos optional.
- Embeddable quote widget and hosted page; customer gets an instant price range, can upload photos, and books a survey or the job (calendar slots) with an optional deposit (Stripe Connect Standard).
- Claude (`claude-haiku-5-5`) reads customer photos/notes to flag jobs needing a site visit; never changes the price without the owner's rule.
- Leads inbox with status (new, quoted, booked, won, lost), follow-up reminders via SMS (Twilio) and email (Resend).
- Analytics: quote-to-booking rate, average job value, lead sources.
- Costs: usage = quotes per month and SMS; plans at 75%+ margin.
- Marketing: local trades businesses and the agencies that build their websites.
- Sidebar: core pages, then Documentation, Help, Billing, Settings.
- Everything else per KIT_BRIEF.md.
