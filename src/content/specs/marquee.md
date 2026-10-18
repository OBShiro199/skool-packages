# Marquee: YouTube thumbnails generated from your face and title, then A/B tested on real views.
slug `marquee`, category `content`, art `{ motif: 'chart', tone: 'amber' }`, status `full`, difficulty 2 or 3 (your call), buildHours your estimate, 3-letter id prefix of your choice (unique, not used by another kit). No price given: compute per-customer cost from researched API prices and set 2 to 3 plans at 75%+ gross margin at each plan's cap, monthly + annual (10x), 7-day trial; maths in costs.notes.

- Creator uploads 5 to 10 photos of their face once (stored privately), brand colours and fonts.
- For each video: title + topic in, the app generates 6 thumbnail concepts (research image models via API: e.g. Google Imagen/Gemini image, Ideogram, Recraft, or fal.ai-hosted FLUX; pick on price and text rendering, [verify]) composited with the creator's cut-out face (background removal API) and bold text layers in a canvas editor.
- Editor: move/scale layers, swap expression photo, text presets, export 1280x720 under 2 MB.
- A/B testing: connect YouTube via OAuth (YouTube Data API), rotate thumbnails on a schedule via thumbnails.set, read impressions/CTR from the YouTube Analytics API where available ([verify] which metrics are exposed), declare a winner.
- Metering per generation; plans priced for 75%+ margin.
- Marketing: YouTubers 10k to 500k subs, agencies that run channels.
- Sidebar: core pages, then Documentation, Help, Billing, Settings.
- Everything else per KIT_BRIEF.md.
