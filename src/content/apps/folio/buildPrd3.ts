// Folio build PRD, part 3: editor behaviour, onboarding, security model, env vars, working rules.

export const buildPrd3 = `
## 23. Editor behaviour (\`/app/carousels/[id]\`)
### 23.1 Layout of the page
- Left: slide rail with thumbnails (live DOM renders at 0.12 scale), drag handles, "+ Add slide" at the bottom.
- Centre: the selected slide at the largest size that fits, with inline editable text boxes.
- Right: inspector with three tabs: **Slide** (layout picker, fields, warnings), **AI** (presets and a custom
  instruction box), **Post** (caption, hashtags, character counter, export and schedule buttons).

### 23.2 Editing rules
- Click any text on the canvas to edit in place (contenteditable limited to plain text, Enter adds a line
  break only where the field allows it). The field's character counter shows "62/70" and turns amber at 90%.
- Autosave 800 ms after the last keystroke with an optimistic update. A small "Saved" tick appears in the top bar.
  Conflicts (two tabs) use \`updated_at\`: the second save gets 409 and the UI reloads the slide with a toast.
- Changing layout maps fields where it can (headline to title, body to context) and keeps the old content in a
  \`slide_revisions\` row so Undo can restore it.
- Undo and Redo: Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z, scoped to the selected slide, backed by \`slide_revisions\`
  (last 20 per slide).
- Add slide: inserts a \`statement\` slide after the selected one. Delete slide: allowed unless it would leave
  fewer than 3 slides. Hook must stay first and CTA last: dragging them is disabled, and body slides cannot be
  dropped before the hook or after the CTA.
- Reorder: dnd-kit sortable on the rail. On drop, call the \`reorder_slides(carousel_id, ordered_ids)\` RPC, which
  checks membership and rewrites positions in one transaction (the unique constraint is deferred).
- Keyboard: arrow up and down move between slides, Alt+arrow moves the selected slide, R opens AI rewrite.

### 23.3 AI rewrite popover
- Opens from the AI tab or the sparkle button on the canvas. Shows 7 presets as chips and a free text box.
- While running: the slide dims with a shimmer, buttons disabled, 25 s timeout.
- When done: new content replaces the old, toast "Shorter: cut 2 bullets" with an Undo button for 8 seconds.
- The remaining rewrites count shows under the box: "86 rewrites left this month".

### 23.4 Export panel
- Button "Export PNG + PDF". If nothing changed since the last export it says "Download" and skips rendering.
- While rendering: a progress bar driven by the job's \`progress\` column over Realtime.
- Done: three buttons: "Download PDF (LinkedIn)", "Download PNGs (ZIP)", "Schedule".

## 24. Onboarding flow (\`/onboarding\`)
1. **Your brand (60 seconds).** Display name, handle (pre-filled from the email name), upload headshot, upload
   logo (optional), pick one of 6 colour presets or a custom accent, pick a font pair (6 pairs). Live preview
   of a hook slide on the right.
2. **Your first source.** Four tabs (Blog URL, YouTube, Idea, Voice note) with an example link for each
   ("Try it with this post"). The generate call is held until step 3 is done.
3. **Start your 7-day free trial.** Plan cards (Creator, Pro, Agency) with a monthly/yearly toggle. Button goes
   to Stripe Checkout with \`trial_period_days: 7\`. On return, poll \`subscriptions\` every 2 seconds for up to
   60 seconds, then fire the held generate call and open the progress panel.
- Saving: every step writes to the database so a refresh never loses work.
- Skip link on step 2 ("I will do this later").
- When the first carousel is ready, confetti once, then the editor opens with a 3-tip coach mark tour
  (edit text, AI rewrite, export).

## 25. Security model summary
- RLS on every table. Members can select rows of their workspace. Editors can insert and update content rows
  (brands, sources, carousels, slides). Admins manage members, invites, social accounts and delete brands.
  Owners manage billing and can delete the workspace.
- These tables have no client write policies at all: \`jobs\`, \`renders\`, \`usage_ledger\`, \`scheduled_posts\`
  (written through functions), \`post_metrics\`, \`provider_events\`, \`subscriptions\`, \`stripe_events\`,
  \`email_log\`, \`plan_limits\`, \`plan_prices\`.
- Functions that change money or counters (\`try_consume_usage\`, \`claim_jobs\`, \`refund_usage\`) are executable by
  \`service_role\` only. Browser-callable RPCs (\`reorder_slides\`, \`replace_slides\` is service-only,
  \`usage_summary\`, \`accept_invite\`) check membership inside.
- Storage: \`brand-assets\` and \`voice-notes\` read and write by members, path must start with their workspace id.
  \`renders\` read by members, written only by the render worker with the secret key.
- Secrets: \`ANTHROPIC_API_KEY\`, \`FIRECRAWL_API_KEY\`, \`SUPADATA_API_KEY\`, \`DEEPGRAM_API_KEY\`, \`ZERNIO_API_KEY\`,
  \`ZERNIO_WEBHOOK_SECRET\`, \`RENDER_WORKER_SECRET\`, \`CRON_SECRET\` live only in Supabase secrets or Vercel env.
- SSRF: user URLs are only ever fetched by Firecrawl or Supadata, never by our own servers. We still block IP
  literals, localhost, \`.internal\`, \`.local\` and non-https URLs before sending them.
- Uploads: images max 5 MB (png, jpeg, webp, svg is not allowed because it can carry scripts), fonts max 2 MB
  (ttf, otf), audio max 25 MB (webm, mp4, mpeg, wav, m4a). Enforced by bucket settings and checked again server side.

## 26. Environment variables
| Name | Where it is used | Paste into |
|---|---|---|
| \`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\` | browser and server | .env.local, Vercel env |
| \`SUPABASE_SECRET_KEY\` | render worker, Stripe webhook | .env.local, Vercel env |
| \`NEXT_PUBLIC_SITE_URL\` | links, OG tags | .env.local, Vercel env |
| \`ANTHROPIC_API_KEY\` | fol-generate, fol-rewrite-slide | Supabase secrets |
| \`FIRECRAWL_API_KEY\` | fol-ingest | Supabase secrets |
| \`SUPADATA_API_KEY\` | fol-ingest | Supabase secrets |
| \`DEEPGRAM_API_KEY\` | fol-ingest | Supabase secrets |
| \`ZERNIO_API_KEY\` | connect, schedule, webhook, analytics, sweeper | Supabase secrets |
| \`ZERNIO_WEBHOOK_SECRET\` | fol-zernio-webhook | Supabase secrets |
| \`RENDER_WORKER_URL\` | fol-render-enqueue, fol-sweeper | Supabase secrets |
| \`RENDER_WORKER_SECRET\` | edge functions and \`/api/render/run\` | Supabase secrets and Vercel env |
| \`CRON_SECRET\` | fol-sweeper, fol-analytics-sync | Supabase secrets (and Vault for pg_cron) |
| \`APP_URL\` | email links, Zernio redirect | Supabase secrets |
| \`RESEND_API_KEY\`, \`EMAIL_FROM\` | emails | Supabase secrets and Vercel env |
| \`STRIPE_*\` | billing (shared kit steps), six price ids from section 16 | .env.local, Vercel env |

## 27. Working rules for Claude Code on this project
- Read this PRD section before building each part. Plan first, wait for the founder's OK on anything that
  touches payments, RLS or deletes.
- Keep the template components pure: props in, JSX out, no hooks, no fetches, no Tailwind classes (Satori
  ignores them). Tailwind is fine everywhere else.
- All money and counters go through \`try_consume_usage\`. Never update usage in the browser.
- Every new table: RLS on and one policy per operation in the same migration. No \`for all\` policies.
- Never put source text, captions or keys in logs.
- After each milestone: run \`npm run build\`, click through the acceptance test for it (section 21), commit.
`
