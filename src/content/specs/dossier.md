# Dossier: Answers security questionnaires and RFPs from your own documents, with sources.
slug `dossier`, category `ai-agents`, art `{ motif: 'chat', tone: 'ink' }`, status `full`, difficulty 2 or 3 (your call), buildHours your estimate, 3-letter id prefix of your choice (unique, not used by another kit). No price given: compute per-customer cost from researched API prices and set 2 to 3 plans at 75%+ gross margin at each plan's cap, monthly + annual (10x), 7-day trial; maths in costs.notes.

- B2B SaaS teams upload their source docs (security policies, SOC 2 report summary, past questionnaires, product docs) to private Storage; chunk + embed (pgvector; Voyage or Supabase gte-small, choose).
- Upload a questionnaire (XLSX, DOCX, PDF, or paste); parse questions (research parsing libs/APIs; keep XLSX structure); Claude (`claude-sonnet-5-5`) drafts each answer with citations and a confidence score; low confidence flagged for a human.
- Answer library: approved answers reused next time (exact and semantic match), owner per answer, expiry dates for stale answers.
- Review workflow: assign questions to teammates, comments, approve, export back into the original file format.
- Workspaces and roles; strict tenant isolation; audit log; data never used for training (state it).
- Costs: usage = questions answered per month; plans at 75%+ margin (this is a premium B2B tool, likely $199+).
- Marketing: SaaS founders selling to mid-market and enterprise, sales engineers.
- Sidebar: core pages, then Documentation, Help, Billing, Settings.
- Everything else per KIT_BRIEF.md.
