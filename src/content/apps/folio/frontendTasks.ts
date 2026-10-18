// Folio app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'
import { code, eli5, keys, links, mistakes, p, prompt, steps, table, task, tip, warn } from './helpers'

export const frontendTasks: Task[] = [
  task({
    id: 'fol-fe-brand',
    title: 'Build the brand kit and its live preview',
    outcome: 'Users set logo, colours, fonts, headshot, handle and voice once, and see a real slide update as they type.',
    minutes: 70,
    xp: 50,
    blocks: [
      eli5('What is a brand kit?', 'It is the "look" of every slide: colours, fonts, the logo, your face and your @handle. You set it once. Every carousel Folio writes is drawn with it, so posts look like yours and not like everyone else\'s.'),
      prompt('fol-fe-brand-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 10.3, 10.4, 24 and @DESIGN.md sections 5.10 and 6. Use @DESIGN_SYSTEM.md for all app UI.

Build the brand kit:
1. app/app/brand/page.tsx: base table of brands for the workspace (avatar, name, handle, accounts, updated). "Add brand kit" button only when the plan allows more (read plan_limits.brands via the usage_summary RPC). Creator plans with one brand go straight to its edit page.
2. app/app/brand/[id]/page.tsx: form sections Identity (name, display name, handle with @ prefix), Colours (6 colour rows: background, surface, ink, muted, accent, accentInk, each a swatch, hex input and a contrast tag), Fonts (heading and body selects from the 12 fonts in /fonts, each option rendered in its own face), Voice (600 char textarea), CTA (120 char default call to action), Footer (show slide counter switch).
3. Colour presets: the 6 presets from DESIGN.md 6.2 as swatch boxes at the top of Colours. Clicking one fills all six fields.
4. Contrast: a small lib/contrast.ts with WCAG relative luminance. Show "AA" (green tag) when ink on background and accentInk on accent are both 4.5:1 or more, else "Low contrast" (amber tag). Warn, never block.
5. Uploads: logo and headshot go to the brand-assets bucket at <workspace_id>/<brand_id>/logo.<ext> and headshot.<ext> with the browser Supabase client (RLS checks the path). Accept png, jpeg, webp up to 5 MB (no SVG). Resize in the browser to max 800px with a canvas before upload. Custom font upload (ttf or otf, 2 MB) only when plan_limits.custom_fonts is true.
6. Live preview on the right: render the real slide components from components/slides (the fol-fe-templates task) at 300px wide with a segmented control Hook / List / Stat / CTA and sample content. It updates on every keystroke without moving anything around it.
7. Autosave each field 800 ms after the last change with an optimistic update and a "Saved" status in the toolbar slot.
8. Reuse the same form (step 1 only: display name, handle, headshot, logo, preset, font pair) as onboarding step 1 at /onboarding.
Plan first, then wait for my OK.`),
      steps(
        'Run `npm run dev` and open http://localhost:3000/app/brand.',
        'Upload a headshot and a logo, pick the Violet preset, then change the accent to `#23824D`. The preview updates as you type.',
        'Set ink to `#BBBBBB` on a white background: the contrast tag turns amber "Low contrast". Change it back.',
        'Refresh the page. Everything you set is still there.',
      ),
      code('fol-fe-brand-sql', 'Check in Supabase SQL Editor', 'sql', `
select name, handle, colors->>'accent' as accent, font_heading, font_body,
       logo_path, headshot_path
from public.brands order by created_at desc limit 1;
-- logo_path looks like <workspace_id>/<brand_id>/logo.png`),
      mistakes([
        { mistake: 'Upload fails with "new row violates row-level security policy".', fix: 'The file path does not start with the workspace id. Ask Claude Code: "Upload brand files to `<workspace_id>/<brand_id>/<file>` exactly, the storage policy reads the first folder."' },
        { mistake: 'The preview font looks like Times New Roman.', fix: 'The font file is not loaded in the browser. Ask Claude Code to register each /fonts TTF with the FontFace API on the brand page before rendering the preview.' },
        { mistake: 'Adding a second brand on Creator throws "brand_limit".', fix: 'That is the database trigger doing its job. The button should be hidden on Creator: check the page reads plan_limits.brands from usage_summary.' },
      ]),
    ],
    checklist: [
      ['Copy the brand kit prompt into Claude Code', 'copy:fol-fe-brand-prompt'],
      'Upload a headshot and logo and pick colours and fonts',
      'See the contrast tag warn on a low contrast pair',
      ['Run the brand check SQL', 'copy:fol-fe-brand-sql'],
    ],
  }),
  task({
    id: 'fol-fe-templates',
    title: 'Build the 8 slide templates and the render worker',
    outcome: 'Eight React layouts that look the same in the editor and in the exported PNGs and PDF.',
    minutes: 120,
    xp: 80,
    blocks: [
      eli5('One drawing, two places', 'Each slide layout is one React component. In the editor the browser draws it. When you export, a server function called Satori draws the very same component into a picture, and resvg turns that picture into a PNG. Same code, so the export always matches the screen.'),
      table(['Option', 'Cost per 10 slides', 'Why not'], [
        ['Satori + resvg in a Vercel Node function (chosen)', 'About $0.0002 of CPU', 'Flexbox only, so templates follow strict rules'],
        ['Headless Chrome (Browserless)', 'About $0.004', '20x the cost, cold starts, a second vendor'],
        ['Draw in the browser', '$0', 'Fonts and emoji differ per device, phones run out of memory, and scheduled posts need server renders'],
      ]),
      prompt('fol-fe-templates-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 6.1, 10, 12.5 and 13, and @DESIGN.md section 6.

Part 1: templates (components/slides/)
- SlideFrame.tsx (background, 96px safe padding, footer band with headshot, display name, handle, counter, logo on hook and cta, "Made with Folio" mark when the plan does not remove it), and one file per layout: Hook, Statement, Bullets, Step, Quote, Stat, Compare, Cta. index.ts maps layout name to component.
- Satori rules, no exceptions: inline style objects only (no Tailwind, no className), flexbox only (no grid), every div with more than one child sets display: 'flex', no hooks, no fetch, no external CSS. Images come in as data URLs.
- lib/render/fitText.ts: pick the largest of 4 headline sizes (for hook 88, 76, 64, 56) that fits the box using a per-font average character width table, and return a warning when even the smallest overflows.
- components/editor/SlidePreview.tsx renders the same component in the DOM inside a fixed 1080 wide box scaled with transform: scale() to the container width.
- app/(marketing)/templates/page.tsx: gallery of the 8 layouts with sample content in 3 brand presets.

Part 2: render worker (Next.js route, Node runtime)
- npm install satori @resvg/resvg-js pdf-lib. Put 12 TTF fonts (400 and 700) from Google Fonts in /fonts: Inter, Manrope, DM Sans, Plus Jakarta Sans, Space Grotesk, Sora, Lora, Playfair Display, Fraunces, Bricolage Grotesque, IBM Plex Sans, Archivo. Add them to next.config outputFileTracingIncludes for the route.
- lib/render/fonts.ts loads them once at module scope. Emoji through satori's loadAdditionalAsset using Twemoji SVGs from cdn.jsdelivr.net (cache in memory).
- app/api/render/run/route.ts: export const runtime = 'nodejs' and export const maxDuration = 120. Check header x-render-secret against RENDER_WORKER_SECRET in constant time (401 otherwise). With the secret-key Supabase client call claim_jobs('render', 4). For each job: load carousel, slides, brand; download logo, headshot and custom font from brand-assets; render each slide with satori then new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } }).render().asPng(); upload to renders/<workspace_id>/<carousel_id>/<render_id>/slide-01.png ...; build carousel.pdf with pdf-lib (one 1080 x 1350 page per PNG, title metadata); upload it; update the job progress after every slide; set the render done with slide_paths, pdf_path and bytes; set carousel latest_render_id and status 'rendered'; job succeeded. On error call requeue_job and, if failed, refund_usage(payload.usage_key) and mark the render and carousel failed.
- Log ms per slide and total. Never log signed URLs.
Then render one test carousel and show me the time per slide.
Plan first, then wait for my OK.`),
      keys([
        { name: 'RENDER_WORKER_SECRET', where: 'Make one up: run `openssl rand -hex 32` in a terminal', pasteInto: '.env.local, Vercel env and Supabase secrets', secret: true },
        { name: 'RENDER_WORKER_URL', where: 'Your live URL + /api/render/run, e.g. https://getfolio.app/api/render/run (use an ngrok URL while testing locally)', pasteInto: 'Supabase secrets', secret: false },
      ]),
      code('fol-fe-templates-curl', 'Poke the worker by hand', 'bash', `
curl -i -X POST "http://localhost:3000/api/render/run" \\
  -H "x-render-secret: YOUR_RENDER_WORKER_SECRET" \\
  -H "content-type: application/json" -d '{}'
# Good: 200 {"claimed":0} when nothing is queued. Without the header: 401.`),
      tip('Test the hardest slide first', 'Ask Claude Code: "Render a hook slide with a 70 character headline, an emoji and the Fraunces font, and a compare slide with 3 long points each side." If those two look right, the rest will.'),
      mistakes([
        { mistake: 'Error: "Expected <div> to have explicit display: flex".', fix: 'A div has two children and no display set. Ask Claude Code: "Add display: \'flex\' to every div with more than one child in components/slides."' },
        { mistake: 'Emoji show as empty boxes in the PNG.', fix: 'loadAdditionalAsset is missing or not returning Twemoji SVG data URLs for the "emoji" code. Ask Claude Code to add it.' },
        { mistake: 'Works locally, 500 on Vercel with "font file not found".', fix: 'The fonts are not bundled with the function. Add /fonts to outputFileTracingIncludes for app/api/render/run in next.config and redeploy.' },
      ]),
      links([
        { label: 'Satori (vercel/satori)', url: 'https://github.com/vercel/satori' },
        { label: 'resvg-js', url: 'https://github.com/yisibl/resvg-js' },
        { label: 'pdf-lib', url: 'https://pdf-lib.js.org' },
        { label: 'Vercel functions limits', url: 'https://vercel.com/docs/functions/limitations' },
      ]),
    ],
    checklist: [
      ['Copy the templates and worker prompt', 'copy:fol-fe-templates-prompt'],
      'Add RENDER_WORKER_SECRET to .env.local, Vercel env and Supabase secrets',
      ['Poke the worker with curl and get a 401 without the secret', 'copy:fol-fe-templates-curl'],
      'Export one carousel and open the PDF',
    ],
  }),
  task({
    id: 'fol-fe-create',
    title: 'Build the Create page with the voice recorder',
    outcome: 'Users paste a blog or YouTube link, type an idea or record a voice note, and watch the carousel being written.',
    minutes: 75,
    xp: 55,
    blocks: [
      p('This is the page people use most. It calls **fol-ingest**, then **fol-generate**, and shows each step live by listening to the `jobs` row over Supabase Realtime.'),
      prompt('fol-fe-create-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 4, 12.1, 12.2, 19 and @DESIGN.md sections 3 and 5.3.

Build app/app/create/page.tsx:
1. SourceTabs (Blog URL, YouTube, Idea, Voice note) in one card with a fixed min-height. URL inputs trim and add https://.
2. VoiceRecorder (components/create/VoiceRecorder.tsx): MediaRecorder with audio/webm;codecs=opus, falling back to audio/mp4 on Safari. A level meter from an AnalyserNode, tabular timer with fixed width, auto stop at 10:00, Play back, Re-record, Use this note. Upload to voice-notes/<workspace_id>/<uuid>.<ext> with the browser client.
3. More options: body slides stepper 6 to 9 (default 7), angle input (200), format Portrait / Square.
4. Button "Write my carousel (N of LIMIT)" from the usage_summary RPC. Disabled at the limit with a tooltip and an Upgrade link.
5. On submit: crypto.randomUUID() idempotency keys, call supabase.functions.invoke('fol-ingest'), then subscribe to the job row with supabase.channel(...).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: 'id=eq.<job_id>' }). When ingest succeeds, invoke 'fol-generate' and subscribe to that job. When it succeeds, router.push('/app/carousels/<id>').
6. JobProgress shows the steps from DESIGN.md with live status. Errors show the PRD 19 message; for blog failures add "Paste as Idea" which switches to the Idea tab with the URL in the box.
7. If the tab is closed and reopened, look up running jobs for this user and resume showing them.
8. "Recent sources" table under the card (last 5) with "Use again" (re-runs generate only, no new scrape).
9. Unsubscribe from Realtime when leaving the page.
Plan first, then wait for my OK.`),
      steps(
        'Paste a real blog post URL and press Write my carousel. Watch the steps tick: Reading the page, Writing slides, Ready.',
        'Paste a YouTube link to a 10 to 20 minute video with captions. Same result.',
        'Record a 1 minute voice note on your phone (open the app on your laptop\'s local IP, e.g. http://192.168.1.20:3000). It works on Safari too.',
        'Press the button twice fast. Only one carousel appears (idempotency key).',
      ),
      code('fol-fe-create-sql', 'Check the jobs and the ledger', 'sql', `
select kind, status, attempts, progress, error, created_at
from public.jobs order by created_at desc limit 6;
select metric, quantity, idempotency_key, created_at
from public.usage_ledger order by created_at desc limit 6;`),
      mistakes([
        { mistake: 'Progress stays on "Reading the page" even though the job finished.', fix: 'Realtime is not enabled for the jobs table or the filter is wrong. The migration adds jobs to supabase_realtime; check Database > Publications. Also make sure you subscribe before invoking the function.' },
        { mistake: 'Voice notes from iPhone fail to transcribe.', fix: 'Safari records audio/mp4. Upload with that content type and file extension .m4a; the bucket allows audio/mp4 and audio/x-m4a.' },
        { mistake: 'Generate starts before the source is ready and returns 409.', fix: 'Only call fol-generate after the ingest job row reports status succeeded.' },
      ]),
    ],
    checklist: [
      ['Copy the Create page prompt', 'copy:fol-fe-create-prompt'],
      'Make one carousel from a blog URL and one from YouTube',
      'Record a voice note on your phone and turn it into a carousel',
      ['Check jobs and usage with the SQL', 'copy:fol-fe-create-sql'],
    ],
  }),
  task({
    id: 'fol-fe-editor',
    title: 'Build the editor: edit, AI rewrite, drag reorder, export',
    outcome: 'Users fix any slide in place, rewrite one with AI and undo it, drag slides into a new order and export.',
    minutes: 120,
    xp: 80,
    blocks: [
      eli5('Why undo needs the database', 'Each time AI rewrites a slide, the old version is saved first as a "revision". Undo puts that saved version back. Because it lives in the database, undo still works after a refresh or on another laptop.'),
      prompt('fol-fe-editor-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 9.3, 12.3, 12.4, 23 and @DESIGN.md sections 3, 5.4, 5.5, 14 and 15.

Build app/app/carousels/[id]/page.tsx:
1. Toolbar: back link, inline editable title, StatusTag, reserved "Saved" slot, "Export PNG and PDF (1 export)" and "Schedule post".
2. SlideRail with dnd-kit sortable (@dnd-kit/core, @dnd-kit/sortable) and the keyboard sensor. Hook and CTA rows are not draggable and body rows cannot drop before the hook or after the CTA. On drop call supabase.rpc('reorder_slides', { p_carousel, p_ids }) with an optimistic update; on error revert and toast.
3. Canvas: SlidePreview of the selected slide. Click text to edit in place (plain text only). CharCounter per field. Autosave 800 ms after typing with an optimistic update. Before saving a manual edit, insert a slide_revisions row (reason manual) at most once per 30 seconds per slide. Detect conflicts with updated_at and reload on mismatch.
4. Inspector tabs Slide (LayoutPicker, fields, warnings), AI (presets, instruction, remaining rewrites), Post (caption with LinkedIn and Instagram counters, hashtags, Copy caption).
5. AI rewrite: call supabase.functions.invoke('fol-rewrite-slide') with a new idempotency key. Dim the slide while waiting. On success replace the content and show a toast with Undo for 8 seconds. Undo restores the newest revision for that slide (update the slide, insert a revision with reason undo).
6. Add slide (statement after the selected one), delete slide (not below 3 slides, never the hook or CTA), duplicate slide.
7. Export: call fol-render-enqueue, open the Export dialog, follow the render row over Realtime, then show the three download rows. Downloads use 1 hour signed URLs; "PNGs (ZIP)" zips the PNGs in the browser with fflate.
8. Stale export line when the latest render's content_hash differs from the current slides (compute the same hash in lib/hash.ts as the edge function).
9. Keyboard: arrows move between slides, Alt+arrows move a slide, R opens rewrite, Cmd/Ctrl+Z undo.
Plan first, then wait for my OK.`),
      steps(
        'Open a carousel. Click the hook headline and change a word. Refresh: the change is saved.',
        'Select slide 3, choose Shorter. The text changes and a toast offers Undo. Press Undo.',
        'Drag slide 5 to position 2. Refresh: the order stays. Try dragging the CTA: it will not move.',
        'Press Export. Download the PDF and the ZIP. Press Export again without changes: it says Download export (free) instantly.',
      ),
      code('fol-fe-editor-sql', 'Check revisions and order', 'sql', `
select s.position, s.layout, r.reason, r.created_at
from public.slides s
left join public.slide_revisions r on r.slide_id = s.id
where s.carousel_id = '<carousel id>'
order by s.position, r.created_at desc;`),
      mistakes([
        { mistake: 'Reorder fails with "hook must be first and cta last".', fix: 'The UI let you drop a body slide before the hook. Ask Claude Code to lock the first and last rows in dnd-kit with a custom collision check.' },
        { mistake: 'Text typed on the canvas jumps the cursor to the start.', fix: 'The component re-renders the contenteditable on every keystroke. Keep the text in a ref while editing and only write state on blur or after the autosave debounce.' },
        { mistake: 'Undo restores the wrong text.', fix: 'Revisions are read by created_at across the whole carousel. Filter by slide_id and take the newest one.' },
      ]),
    ],
    checklist: [
      ['Copy the editor prompt', 'copy:fol-fe-editor-prompt'],
      'Edit a headline, rewrite a slide and undo it',
      'Drag a slide to a new position and refresh',
      'Export a PDF and the PNG ZIP',
      ['Run the revisions SQL', 'copy:fol-fe-editor-sql'],
    ],
  }),
  task({
    id: 'fol-fe-calendar',
    title: 'Build the content calendar and schedule dialog',
    outcome: 'Users connect LinkedIn or Instagram, schedule exports to a time slot, and drag posts to reschedule.',
    minutes: 90,
    xp: 60,
    blocks: [
      prompt('fol-fe-calendar-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 12.6, 12.7, 14 and @DESIGN.md sections 5.6, 5.7 and 5.10.

1. app/app/brand/[id]/accounts/page.tsx: three rows (LinkedIn profile, LinkedIn page, Instagram). Connect calls fol-zernio-connect action start and redirects to the returned url. On return with ?connected=1 call action sync and show the new account. Show "2 of 3 accounts used".
2. components/schedule/ScheduleDialog.tsx: one dialog with steps Account, Time, Caption that morphs height (width fixed). Suggested slot pills Tue 08:30, Wed 12:00, Thu 08:30 in the workspace timezone. Use date-fns-tz to turn the local time into UTC. "Schedule post" calls fol-schedule-post action schedule; "Post now" sends publish_now true.
3. app/app/calendar/page.tsx: month and week views built with date-fns (no heavy calendar library). Read scheduled_posts for the visible range plus the carousel title and slide 1 thumbnail. Filter chips for brand and platform. Realtime subscription on scheduled_posts so a chip turns green when it publishes.
4. Drag a chip to another day or time slot (dnd-kit) to call action reschedule. Published and past chips cannot be dragged. Clicking a chip opens the side panel with Open, Reschedule, Cancel post and View on LinkedIn.
5. Agenda list under 768px grouped by day.
Plan first, then wait for my OK.`),
      steps(
        'Go to Brand kit > Accounts and connect your own LinkedIn profile.',
        'Open a carousel, export it, press Schedule post, pick a time 10 minutes from now.',
        'Watch the calendar: the chip is blue (scheduled), then green (published) with a link to the post.',
        'Schedule another for next week and drag it to the day after. Check Zernio\'s dashboard shows the new time.',
      ),
      warn('This posts for real', 'Scheduling with a connected account publishes to your real LinkedIn. While testing, post at an hour few people see, then delete the post on LinkedIn, or cancel it in Folio before it goes out.'),
      mistakes([
        { mistake: 'Posts go out an hour off.', fix: 'The time was converted with the browser timezone. Ask Claude Code to use the workspace timezone from Settings with date-fns-tz fromZonedTime.' },
        { mistake: 'LinkedIn rejects the post: document title missing.', fix: 'Send platformSpecificData.documentTitle with the carousel title on LinkedIn posts (PRD 12.7).' },
      ]),
    ],
    checklist: [
      ['Copy the calendar prompt', 'copy:fol-fe-calendar-prompt'],
      'Connect your LinkedIn profile',
      'Schedule an export and see it publish',
      'Drag a scheduled post to a new day',
    ],
  }),
  task({
    id: 'fol-fe-library',
    title: 'Build the library, analytics panel and usage meter',
    outcome: 'Every carousel lives in a searchable library with post numbers, and users always see what they have left.',
    minutes: 60,
    xp: 45,
    blocks: [
      prompt('fol-fe-library-prompt', 'Paste into Claude Code', `
Read @PRD.md sections 15, 16 and @DESIGN.md sections 3, 5.8, 5.9 and 5.11.

1. app/app/library/page.tsx: toolbar (search with ilike on title, count, sort newest or most impressions), filter chips (brand, status, source kind, date), grid of cards with fixed heights and a table view toggle. Thumbnails from the latest render's slide 1 (signed URL, 1 hour, cached) or a live SlidePreview at small scale.
2. Card menu: Open, Duplicate (supabase.rpc('duplicate_carousel')), Archive (status archived), Download PDF. Multi-select with the floating SelectionBar.
3. Top performers row: the 3 carousels with the most impressions in the last 30 days (sum post_metrics.impressions), only when any exist.
4. components/analytics/PostAnalytics.tsx: 6 stat boxes and a 30 day line chart (Recharts) from post_metrics for one scheduled post. Locked state when the plan has no analytics.
5. components/shell/UsageMeter.tsx: reads supabase.rpc('usage_summary', { ws }) once on load and after any metered action (expose a refreshUsage() from a small context). Shows carousels; Billing shows all four metrics with "Resets on <date>".
Plan first, then wait for my OK.`),
      code('fol-fe-library-sql', 'Fake some analytics to test the panel', 'sql', `
insert into public.post_metrics (scheduled_post_id, workspace_id, captured_on, impressions, reach, reactions, comments, shares, clicks)
select id, workspace_id, (now() - (g || ' days')::interval)::date, 200 * (10 - g), 150 * (10 - g), 9 * (10 - g), 2, 1, 5
from public.scheduled_posts, generate_series(0, 9) g
where status = 'published'
on conflict do nothing;`),
      steps(
        'Open the library. Search for a word from one title. Filter by brand.',
        'Duplicate a carousel and open the copy.',
        'Run the SQL above on a published post and open its analytics panel: the chart shows 10 days.',
        'Check the sidebar meter says the right number, then make one more carousel and see it go up by one.',
      ),
    ],
    checklist: [
      ['Copy the library prompt', 'copy:fol-fe-library-prompt'],
      'Search, filter and duplicate a carousel',
      ['Seed test metrics and check the analytics panel', 'copy:fol-fe-library-sql'],
      'Watch the usage meter count up',
    ],
  }),
]

