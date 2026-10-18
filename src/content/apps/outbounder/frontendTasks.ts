import type { Task } from '../../types'
import { ascii, code, eli5, mistakes, p, prompt, steps, table, task, tip } from './helpers'

export const frontendTasks: Task[] = [
  task({
    id: 'out-fe-icp-wizard',
    title: 'Build the ICP wizard, live sample and plan picker',
    outcome: 'A 4-step onboarding wizard that saves the buyer profile, shows one real personalised first line, then sends the user to a Starter or Growth trial.',
    minutes: 80,
    xp: 55,
    blocks: [
      eli5('What is an ICP?', 'ICP means ideal customer profile: the exact type of person you want to email. Job title, country, company size, industry. Outbounder turns those answers into a search, so vague answers give you vague leads.'),
      p('This wizard is the first thing a new user sees. The live sample on step 4 is your trust moment: they see a real first line written from a real company website **before** they meet the plan picker and Stripe Checkout.'),
      prompt('out-fe-icp-prompt', 'Build the ICP wizard', `
Read @PRD.md sections 7.3, 13 and 16 and @DESIGN.md section 5.3. Build /app/onboarding as a full-screen wizard using the StepWizard component.

Steps:
1. Who: job titles chip input with suggestions (Founder, CEO, Head of Marketing, VP Sales, Head of Talent, Managing Director), seniority toggle chips, and "I run an agency" checkbox.
2. Where: country multi-select, optional city chips, "Company HQ in these countries" toggle.
3. Company: headcount toggle cards (1-10, 11-50, 51-200, 201-500), industry keyword chips, exclude keyword chips.
4. Offer: website URL (save the hostname to profiles.website_domain), one-sentence offer, optional proof line, sender name, company, physical address. Character counters.
4b. Plan picker: Starter and Growth cards with a monthly/annual toggle exactly as DESIGN.md 5.3. Growth preselected when "I run an agency" is ticked.
5. Domain prompt (after checkout).

Save to profiles (icp jsonb plus offer, proof, sender fields) on every Continue so a refresh never loses answers. Validate each step with zod before Continue is enabled. icp.titles, icp.countries and icp.keywords are string arrays, never comma strings.

Live sample on step 4: a route handler /api/onboarding/sample that:
- checks the user with supabase.auth.getClaims() (401 otherwise),
- allows 3 per user per day (count events rows with type 'sample_line', 429 after),
- calls Prospeo search-person for page 1 with the ICP filters using lib/leads/prospeo.ts and PROSPEO_API_KEY from the server env,
- scrapes the first company's homepage with Firecrawl,
- calls claude-sonnet-5-5 with the PRD 12.1 prompt and schema (same settings as the personalise function),
- returns { company, domain, first_line, signal }. Never returns an email address.
Show the loading steps from DESIGN.md while it runs. If anything fails: "We couldn't fetch a sample this time. You'll see real ones in a minute." and let them continue.

The plan picker calls /api/stripe/checkout with { plan, interval }. On return (?step=domain) poll the subscriptions row every 2 seconds for up to 60 seconds until status is trialing, then show step 5. Fire PostHog events icp_completed, sample_line_viewed and plan_selected.

Plan first, then wait for my OK.`),
      steps(
        'Paste the prompt into Claude Code and approve the plan.',
        'Run `npm run dev` and open http://localhost:3000/signup. Create a test account.',
        'Fill in the wizard as your own ICP: "Founder", "Managing Director", United Kingdom, 11-50 employees, keyword "marketing agency".',
        'On step 4 wait for the live sample. Read the first line out loud. Does it mention something real from that company\'s site?',
        'Refresh the page on step 3 and check your answers are still there.',
        'Pick Starter monthly and finish Stripe test checkout with card 4242 4242 4242 4242.',
      ),
      code('out-fe-icp-sql', 'Supabase SQL Editor: check the saved ICP', 'sql', `
select icp -> 'titles' as titles, icp -> 'countries' as countries, website_domain, offer
from public.profiles
order by updated_at desc limit 1;
-- titles must look like ["Founder", "Managing Director"], not "Founder, Managing Director"`),
      mistakes([
        { mistake: 'The sample route calls Prospeo and Claude with no auth check, so anyone can run up your bill.', fix: 'Ask Claude Code to add getClaims() and the 3 per day limit, then run `curl -X POST http://localhost:3000/api/onboarding/sample`. It must return 401.' },
        { mistake: 'Titles saved as one comma string, so Prospeo searches for a job title called "Founder, CEO".', fix: 'Run the SQL check above. If titles is a string, ask Claude Code to store string arrays and migrate the existing row.' },
        { mistake: 'The page shows "Checking your trial..." forever after Stripe.', fix: 'The webhook is not reaching your app. Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and check `select status, plan from subscriptions;` shows trialing.' },
      ]),
    ],
    checklist: [
      ['Copy the ICP wizard prompt into Claude Code', 'copy:out-fe-icp-prompt'],
      'Complete the wizard with your own ICP on localhost',
      'See a live sample first line on step 4',
      ['Run the SQL check on the saved ICP', 'copy:out-fe-icp-sql'],
      'Start a Starter trial with a Stripe test card',
    ],
  }),
  task({
    id: 'out-fe-leads-table',
    title: 'Build the leads table with job progress and live status',
    outcome: 'A leads table with a progress bar while leads are found, rows that move from found to ready in real time, a detail sheet, CSV import and bulk actions.',
    minutes: 90,
    xp: 60,
    blocks: [
      eli5('Why does each row change on its own?', 'Your edge functions update leads in the database every minute or two. Supabase Realtime pushes those changes to the browser like a group chat notification, so the table updates without anyone pressing refresh.'),
      ascii(`
found -> verifying -> verified -> enriching -> enriched -> personalising -> ready
             \\-> rejected                                          \\-> needs_review
ready -> approved -> sending -> completed
                        \\-> replied | bounced | unsubscribed`, 'Every lead_status the table must show with its own StatusPill tone.'),
      prompt('out-fe-leads-prompt', 'Build the leads table', `
Read @PRD.md sections 7.3, 10 and 15.2 and @DESIGN.md sections 4, 5.6 and 5.21. Build /app/campaigns/[id]/leads.

- Server component loads the campaign (getClaims + RLS) and the first 200 leads joined with lead_enrichment (ai_confidence, site_markdown is not null as has_site, source_urls).
- "Find leads" control: count segmented control (25, 50, 100, 250) with the UsageMeter for leads under it ("286 leads left this month" from usage_this_month and plan_limits). Options bigger than what is left are disabled with a tooltip. The button creates a uuid when it renders and sends it as the Idempotency-Key header to the find-leads edge function. 402 opens the limit dialog from DESIGN.md section 6; 409 shows "Already finding leads for this campaign".
- JobProgress above the table: subscribe to Realtime on lead_jobs for this campaign. Show "Finding leads: 64 of 100". Failed job card with Retry (creates a new job).
- Client table with TanStack Table + shadcn table. Columns as DESIGN.md 5.6. Local time column with Intl.DateTimeFormat from lead.timezone.
- Realtime: postgres_changes on public.leads filtered by campaign_id=eq.<id>. Merge updates and flash the row with --primary-soft for 600ms.
- PipelineBar on top with counts per status group, updating live.
- Filters in the URL query string: search, status multi-select, "Needs review" quick filter.
- Row click opens a Sheet: lead details, scraped summary with source links, AI fields with AiMark, message history, and actions Approve, Reject, Regenerate (personalise edge function with the user's JWT), Remove, Suppress (insert into suppression_list with reason manual).
- Bulk bar: Approve, Reject, Remove. Only rows in ready, needs_review or approved can change status; show a toast with how many were skipped.
- Upload CSV: the file goes to the private "imports" bucket at <user_id>/<timestamp>.csv, then the browser parses it (papaparse) and inserts rows with source 'csv' and status 'found' in batches of 50. Columns email, first_name, last_name, title, company_name, company_domain. If an insert fails with "limit_reached", stop and show how many were imported. Export CSV of the current filter.
- Virtualise rows over 200. Loading: 8 skeleton rows. Empty state from DESIGN.md.

Plan first, then wait for my OK.`),
      steps(
        'Approve the plan and let Claude Code build the page.',
        'Click "Find leads" with 25. Watch the progress bar move once the find-leads cron is running (or run the worker curl from the edge function task).',
        'In Supabase > Table Editor > leads, change one row\'s status to ready and watch the row flash without refreshing.',
        'Select two rows and click "Approve". Check the toast says how many changed.',
        'Upload a 3-row CSV and check the rows appear as found.',
      ),
      code('out-fe-leads-sql', 'Supabase SQL Editor: check jobs, leads and metering', 'sql', `
select status, requested, inserted, skipped_duplicates, last_error from public.lead_jobs order by created_at desc limit 3;
select status, source, count(*) from public.leads group by status, source order by 1;
select kind, used, cost_usd from public.usage_this_month;
-- lead_found "used" must equal Prospeo leads inserted plus CSV rows imported this month`),
      mistakes([
        { mistake: 'Realtime does nothing.', fix: 'The migration adds leads, lead_jobs and messages to the supabase_realtime publication. Check Database > Publications. Also confirm the filter uses campaign_id=eq.<uuid> and that you subscribe after the user session loads.' },
        { mistake: 'Bulk approve throws "Not allowed to move lead from found to approved".', fix: 'That is the leads_guard trigger doing its job. Filter the selection to ready, needs_review and approved rows before updating.' },
        { mistake: 'Double-clicking "Find leads" starts two jobs and spends twice.', fix: 'The Idempotency-Key must be created once per render of the button, not per click. Run `select count(*) from lead_jobs where campaign_id = \'<id>\';` after a double-click: it must be 1.' },
      ]),
    ],
    checklist: [
      ['Copy the leads table prompt', 'copy:out-fe-leads-prompt'],
      'Watch the job progress bar fill for 25 leads',
      'Watch a row update live after editing it in Table Editor',
      'Upload and export a CSV',
      ['Run the jobs and metering SQL check', 'copy:out-fe-leads-sql'],
    ],
  }),
  task({
    id: 'out-fe-sequence-editor',
    title: 'Build the sequence editor with live preview',
    outcome: 'A 3-step sequence editor where every keystroke renders a real lead\'s email on the right, with lint warnings.',
    minutes: 80,
    xp: 55,
    blocks: [
      eli5('Variables, not spintax', 'A variable like {{first_name}} gets swapped for real data about each lead. Spintax swaps random synonyms ("Hi | Hey | Hello"). Real data reads better to humans and to spam filters, so Outbounder only uses variables.'),
      table(['Variable', 'Comes from', 'Example'], [
        ['{{first_name}}', 'Prospeo', 'Sarah'],
        ['{{company}}', 'Prospeo', 'Northpeak Studio'],
        ['{{title}}', 'Prospeo', 'Founder'],
        ['{{city}}', 'Prospeo', 'Leeds'],
        ['{{ai_first_line}}', 'Claude, from the website', 'Northpeak\'s case studies are all outdoor brands on Shopify, which is a sharp niche.'],
        ['{{ai_pain}}', 'Claude', 'Agencies that niche this hard usually live off referrals.'],
        ['{{sender_name}}', 'Your profile', 'Olly'],
      ]),
      code('out-fe-seq-default', 'default-sequence.txt', 'txt', `
STEP 1 · day 0 · new thread
Subject: {{ai_subject}}
Hi {{first_name}},

{{ai_first_line}} {{ai_pain}}

Outbounder finds 100 leads like your best clients, writes a first line for each from their website and sends from safe inboxes. I can run 10 for {{company}} free so you can judge them.

Want me to send them over?

STEP 2 · day 3 · same thread
{{first_name}}, one number: a personalised first line takes most founders 3 to 5 minutes. Outbounder does 25 in about 2.

Happy to send the 10 sample emails for {{company}} either way.

STEP 3 · day 8 · new thread
Subject: close the loop?
Not sure outbound is on your list this quarter, {{first_name}}. Reply "later" and I'll check back in a couple of months. If it is, the samples are ready.`),
      prompt('out-fe-seq-prompt', 'Build the sequence editor', `
Read @PRD.md sections 8 (Sequence and review) and 14.3 and @DESIGN.md sections 4 (EmailPreview, VariableChip) and 5.7. Build /app/campaigns/[id]/sequence and reuse it inside step 3 of the campaign builder.

- Load or create the campaign's sequence and its steps. New campaigns get the 3 default steps from default-sequence.txt, which I will paste below.
- Left column: step cards with delay_days input, same/new thread toggle (step 1 is always a new thread and the toggle is hidden), subject input, auto-growing body textarea that highlights {{variables}} in mono, VariableChip row that inserts at the cursor.
- Lint under each body: word count; warnings for a link in step 1 (http or www.), over 120 words, spam words from PRD 14.3, any {{variable}} not in the allowed list, subject over 60 characters.
- Right column: sticky EmailPreview rendering the selected step for the selected lead (picker with prev/next across ready and approved leads, using lead + lead_enrichment). Unresolved variables show as red pills. Footer and unsubscribe line rendered greyed exactly as PRD 14.4.
- Autosave each step 1 second after typing stops, with a "Saved" indicator. Max 3 steps.
- Mobile: Edit / Preview segmented control.
- Put the renderer in lib/render.ts and keep it identical to supabase/functions/_shared/render.ts. Add 5 vitest tests (known variable, unknown variable stays, empty value, repeated variable, no variables) and run them.

Plan first, then wait for my OK.`),
      steps(
        'Paste the prompt, then paste the default sequence file contents when Claude Code asks.',
        'Open the sequence page for your test campaign.',
        'Type a link like www.example.com into step 1 and check the "Link in step 1" warning appears.',
        'Switch the preview lead with the arrows and check the first line changes per lead.',
        'Run `npx vitest run` and check the 5 render tests pass.',
      ),
      code('out-fe-seq-sql', 'Supabase SQL Editor: check the saved steps', 'sql', `
select s.step_number, s.delay_days, s.new_thread, left(s.subject_template, 40) as subject, length(s.body_template) as body_chars
from public.sequence_steps s
join public.sequences q on q.id = s.sequence_id
order by q.created_at desc, s.step_number limit 3;`),
      mistakes([
        { mistake: 'The preview and the sent email look different.', fix: 'There are two renderers. Ask Claude Code to diff lib/render.ts against supabase/functions/_shared/render.ts and make them identical, then redeploy send-due-emails.' },
        { mistake: 'Autosave fires on every keystroke and hammers the database.', fix: 'Debounce 1 second and only save when the text changed. Check Supabase > Logs > API: one PATCH per pause, not per letter.' },
        { mistake: 'Step 2 shows "{{ai_first_line}}" as a red pill.', fix: 'That variable is only filled for step 1. Use {{first_name}} and {{company}} in follow-ups; the lint should warn about AI variables outside step 1.' },
      ]),
    ],
    checklist: [
      ['Copy the default 3-step sequence', 'copy:out-fe-seq-default'],
      ['Copy the sequence editor prompt', 'copy:out-fe-seq-prompt'],
      'Trigger the link-in-step-1 warning on purpose',
      'Preview the same step for two different leads',
      ['Run the saved steps SQL check', 'copy:out-fe-seq-sql'],
    ],
  }),
  task({
    id: 'out-fe-review-queue',
    title: 'Build the review queue and launch',
    outcome: 'A keyboard-driven queue where you approve, edit, regenerate or reject each AI email in seconds, then a launch step that queues step 1.',
    minutes: 75,
    xp: 55,
    blocks: [
      p('Nothing sends without approval. This page is where users spend most of their time before launch, so it has to be fast: one email on screen, the reason for the first line next to it, and a single key for each action.'),
      prompt('out-fe-review-prompt', 'Build the review queue', `
Read @PRD.md sections 8 (Sequence and review), 10.4 and 12 and @DESIGN.md sections 5.5 (step 5), 5.8 and 7. Build /app/campaigns/[id]/review and the launch step.

- Load leads in ready and needs_review (filter: Ready, Needs review, All), needs_review first, then ai_confidence ascending, joined with lead_enrichment.
- Left 60%: EmailPreview in edit mode. Subject input and a body textarea styled like the mail body. First line highlighted with --violet-soft and AiMark. Edits save final_subject/final_body and set edited = true (the only enrichment columns the browser can update).
- Right 40%: "Why this line" panel: ai_signal quote, source_urls links, site_summary as 3 bullets, lead fields, ConfidenceMeter, ai_skip_reason in a warning Alert.
- Keys: A approve, X reject, E focus the body, R regenerate popover (hint input, calls personalise with { lead_id, hint } and the user's JWT; 429 regen_limit shows "No regenerations left for this lead"; 402 shows the limit dialog), J/K next/previous. KeyboardHint in the footer. Ignore shortcuts while typing.
- Slide animation on approve/reject as DESIGN.md 7, reduced motion respected.
- "Approve all above 0.8" enabled after 10 manual decisions in this campaign (events email_approved/email_rejected). Confirm dialog with the exact count.
- Write events email_approved (edited, confidence), email_rejected, email_regenerated; mirror to PostHog.
- Launch step: checklist (domain verified, at least 1 active inbox attached, at least 10 approved, sender name and physical address set), then "Launch campaign" calls supabase.rpc('launch_campaign', { p_campaign: id }). Map errors: no_verified_inbox, need_10_approved, missing_sender_details, campaign_limit, no_access to friendly messages. Success dialog: "64 emails queued. First ones go out at the next 08:00 in each lead's time zone."

Plan first, then wait for my OK.`),
      steps(
        'Approve the plan and build.',
        'Open the review queue with at least 12 ready leads (run the pipeline, or set statuses by hand in Table Editor).',
        'Approve 10 with the A key, reject 1 with X, edit 1 and approve it.',
        'Press R, type "mention their pricing page" and regenerate one email. Check the new first line respects the hint.',
        'Go to the launch step and click Launch.',
      ),
      code('out-fe-review-sql', 'Supabase SQL Editor: check approvals and the launch', 'sql', `
select status, count(*) from public.leads group by status;
select count(*) filter (where edited) as edited, count(*) as total from public.lead_enrichment;
select status, step_number, count(*) from public.messages where direction = 'outbound' group by 1, 2;
-- after launch: one queued step 1 message per approved lead`),
      tip('Review like a buyer', 'Read each first line as the person receiving it. If you would not reply, reject it. Your reject reasons are the best feedback for improving the system prompt in PRD section 12.1.'),
      mistakes([
        { mistake: 'Pressing A while typing in the body approves the email.', fix: 'Shortcuts must be ignored when the focus is inside an input or textarea. Ask Claude Code to check event.target before handling keys.' },
        { mistake: 'Launch says need_10_approved even though you approved 10.', fix: 'Approvals went to a different campaign or failed silently. Run the first SQL query above and check the approved count for this campaign_id.' },
        { mistake: 'Edits are lost when you move to the next email.', fix: 'Save on blur and before J/K moves. Check lead_enrichment.edited is true for the one you changed.' },
      ]),
    ],
    checklist: [
      ['Copy the review queue prompt', 'copy:out-fe-review-prompt'],
      'Approve, reject and edit leads using only the keyboard',
      'Regenerate one email with a hint',
      'Launch a test campaign',
      ['Run the approvals and launch SQL check', 'copy:out-fe-review-sql'],
    ],
  }),
  task({
    id: 'out-fe-domain-wizard',
    title: 'Build the domain wizard and inbox setup',
    outcome: 'A 4-step wizard that adds an outreach domain to AgentMail, shows every DNS record with copy buttons, checks them live and creates inboxes on the 20-a-day ramp.',
    minutes: 70,
    xp: 55,
    blocks: [
      eli5('Why a second domain?', 'Your main domain is like your home address. If you post 1,000 letters a day from it and people complain, the post office starts binning everything from that address, including your invoices. A lookalike domain (tryacme.com) takes that risk instead, and your home address stays clean.'),
      prompt('out-fe-domain-prompt', 'Build the domain wizard', `
Read @PRD.md sections 11.7 and 14.1 to 14.2 and @DESIGN.md section 5.9 (and DnsRecordRow, CapacityMeter in section 4). Build /app/domains, /app/domains/new and /app/domains/[id].

- Step 1, Buy: explanation card, suggested names from profiles.website_domain (try, get, use, hey, with prefixes) each with a "Check on Porkbun" link (https://porkbun.com/checkout/search?q=<name>), input "Domain you bought". Warning Alert if it matches the main domain. "Add domain" calls setup-domain { action: 'create' }. 402 shows "Starter includes 2 domains. Upgrade for 3."
- Step 2, DNS: a DnsRecordRow for every record returned (type badge, host, value, priority for MX, status chip). Porkbun tab (default) explains: "Porkbun > Domain Management > Details > DNS Records. Type, Host, Answer. Leave Host blank for the root." and shows the Host with the domain stripped, so users never paste tryacme.com twice. "Copy all as text" button.
- Step 3, Verify: calls setup-domain { action: 'verify' } every 30 seconds for 10 minutes, then a "Check again" button. Chips move Waiting > Checking > Verified or Failed with the record's reason as a tooltip (value_mismatch: "The value is different from ours. Paste it again." duplicate_records: "There are two records here. Delete the old one.").
- Step 4, Inboxes: 2 suggested inboxes from sender name (first@, first.last@), display name input, "Create 2 inboxes" calls create_inbox twice. Each card shows the email, an Active pill and the ramp bar "20/day for 2 weeks, 25/day for 2 weeks, then up to 30" plus today's cap from rpc inbox_effective_cap.
- Domains list and detail pages as DESIGN.md: health dot, inboxes table with CapacityMeter, daily cap slider (5 to 30; saves inboxes.daily_cap; the real cap stays the ramp), pause toggle.

Plan first, then wait for my OK.`),
      steps(
        'Buy a lookalike .com on Porkbun (about $11). Example: if your site is acme.com, buy tryacme.com.',
        'Open http://localhost:3000/app/domains/new and add it.',
        'In a second tab open Porkbun > Domain Management > your domain > Details > DNS Records. Delete Porkbun\'s default parking records (the ALIAS and CNAME for www) first.',
        'Add every record from the wizard: pick the Type, paste the Host part only, paste the Answer, add the priority for MX. Click Add after each one.',
        'Back in the wizard wait for the chips to turn green (5 to 30 minutes), then create 2 inboxes.',
        'Porkbun > your domain > URL Forwarding: forward the root to your main website with a 301.',
      ),
      code('out-fe-domain-sql', 'Supabase SQL Editor: check the domain and inboxes', 'sql', `
select domain, status, status_reason, verified_at, jsonb_array_length(dns_records) as records from public.sending_domains;
select email, status, daily_cap, sent_today, public.inbox_effective_cap(id) as cap_today from public.inboxes;
-- a new inbox shows cap_today = 20`),
      mistakes([
        { mistake: 'Records stay "Waiting" for hours.', fix: 'You pasted the full host (_dmarc.tryacme.com) and Porkbun added the domain again. Edit the record so Host is only _dmarc, then click Check again.' },
        { mistake: 'MX record shows INVALID with duplicate_records.', fix: 'Porkbun or a previous email host left an old MX record. Delete every MX that is not AgentMail\'s, then recheck.' },
        { mistake: 'You added your main domain and it went through.', fix: 'profiles.website_domain is empty, so the guard had nothing to compare. Fill in your website in Settings > Profile and delete the domain from AgentMail and the table.' },
      ]),
    ],
    checklist: [
      ['Copy the domain wizard prompt', 'copy:out-fe-domain-prompt'],
      'Buy a lookalike domain on Porkbun',
      'Add every DNS record and see them all turn green',
      'Create 2 inboxes and see a cap of 20 today',
      ['Run the domain SQL check', 'copy:out-fe-domain-sql'],
    ],
  }),
  task({
    id: 'out-fe-unified-inbox',
    title: 'Build the unified inbox',
    outcome: 'Every reply from every inbox in one three-pane view, labelled by Claude, with reply and relabel.',
    minutes: 80,
    xp: 55,
    blocks: [
      eli5('What is a thread?', 'A thread is one conversation: your email, their reply, your reply. AgentMail gives each thread an id. We store it on every message so replies stay together, the same way Gmail groups them.'),
      prompt('out-fe-inbox-prompt', 'Build the unified inbox', `
Read @PRD.md sections 7.3, 8 (Replies) and 12.3 and @DESIGN.md sections 4 (ClassificationBadge) and 5.10. Build /app/inbox.

- Three panes: filters (All, Interested, Not now, Unsubscribe, OOO, Other, Unread, by campaign, by inbox), thread list, thread view. Selected thread in the URL (?thread=<agentmail_thread_id>) so Resend alert links open it directly.
- Thread list: group messages by agentmail_thread_id where at least one inbound message exists. Show the latest inbound classification, lead name, company, snippet, time, unread dot (read_at is null). 50 per page.
- Realtime: inserts on public.messages for this user prepend new threads and bump the sidebar unread badge.
- Thread view: header with lead, company, campaign, inbox. Label dropdown calls supabase.rpc('relabel_reply', { p_message, p_label }) (it also suppresses on unsubscribe). Mark as read on open (update read_at, the only messages column the browser may change).
- Low-confidence unsubscribe (label unsubscribe, confidence under 0.6): warning Alert with Confirm (relabel to unsubscribe) / Not an unsubscribe (relabel to other).
- OOO with follow_up_date: "Resume on 14 Nov" button that is a v2 placeholder (disabled, tooltip "Coming soon").
- Reply composer: plain textarea, "Send from <inbox email>", cmd+enter. Inserts a messages row (direction outbound, status queued, is_manual true, inbox_id = lead.assigned_inbox_id, lead_id, campaign_id, user_id, scheduled_for now(), subject "Re: <subject>", body_text). Shows "Sending within 5 minutes" until status becomes sent.
- Mobile: list then a full-screen thread with a back button.

Plan first, then wait for my OK.`),
      steps(
        'Approve the plan and build.',
        'In Table Editor set one test lead to status replied, then insert an inbound message for it (direction inbound, status received, classification interested, agentmail_thread_id test-1).',
        'Open /app/inbox and check it appears under Interested.',
        'Change the label to "not now" and check the events table has a reply_relabelled row.',
        'Write a reply and check a queued manual message appears in the messages table.',
      ),
      code('out-fe-inbox-sql', 'Supabase SQL Editor: check labels and manual replies', 'sql', `
select classification, count(*) from public.messages where direction = 'inbound' group by 1;
select type, data from public.events where type = 'reply_relabelled' order by created_at desc limit 3;
select status, is_manual, scheduled_for from public.messages where is_manual order by created_at desc limit 3;`),
      mistakes([
        { mistake: 'The manual reply insert fails with a row-level security error.', fix: 'The policy only allows replies to leads in status replied, from the inbox assigned to that lead. Check the lead\'s status and assigned_inbox_id in Table Editor.' },
        { mistake: 'Relabelling to unsubscribe does not stop other campaigns emailing them.', fix: 'You updated the column directly instead of calling relabel_reply. Use the RPC; it adds the suppression row and cancels queued messages everywhere.' },
        { mistake: 'Threads show twice.', fix: 'You grouped by subject instead of agentmail_thread_id. Group by thread id and pick the latest message per group.' },
      ]),
    ],
    checklist: [
      ['Copy the unified inbox prompt', 'copy:out-fe-inbox-prompt'],
      'See a test reply appear under Interested',
      'Relabel a reply and check the events table',
      'Queue a manual reply from the composer',
      ['Run the inbox SQL check', 'copy:out-fe-inbox-sql'],
    ],
  }),
]
