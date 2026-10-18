# Tally: Invoices that chase themselves with polite, escalating reminders until they are paid.
slug `tally`, category `business`, art `{ motif: 'kanban', tone: 'green' }`, status `full`, difficulty 2 or 3 (your call), buildHours your estimate, 3-letter id prefix of your choice (unique, not used by another kit). No price given: compute per-customer cost from researched API prices and set 2 to 3 plans at 75%+ gross margin at each plan's cap, monthly + annual (10x), 7-day trial; maths in costs.notes.

- Freelancers and small agencies create clients, line items, tax, and send branded invoices (PDF + hosted pay page) with Stripe payment links (card + bank transfer where supported; Stripe Connect Standard so money goes to the user).
- Automatic reminder sequences: before due, on due, +3, +7, +14 days, tone escalates; pauses on reply or payment; per-client overrides. Sent via Resend from the user's verified domain.
- Recurring invoices, deposits, partial payments, late fees (optional), multi-currency.
- Dashboard: outstanding, overdue, average days to pay, cash forecast.
- Import clients from CSV; export to accountant (CSV); Xero/QuickBooks export as a later milestone.
- Webhooks from Stripe mark invoices paid.
- Costs: usage = invoices per month; plans at 75%+ margin.
- Marketing: freelancers, agencies, consultants; "get paid 9 days faster" style claims must be backed by the user's own data or framed as goals.
- Sidebar: core pages, then Documentation, Help, Billing, Settings.
- Everything else per KIT_BRIEF.md.
