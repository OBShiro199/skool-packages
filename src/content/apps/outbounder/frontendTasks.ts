import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'out-fe-icp-wizard',
    title: 'Build the ICP wizard and live sample',
    outcome: 'A 4-step onboarding wizard that saves the buyer profile and shows one real personalised first line before the paywall.',
    minutes: 75,
    xp: 50,
    blocks: [
      {
        type: 'callout',
        tone: 'eli5',
        title: 'What is an ICP?',
        text: 'ICP means ideal customer profile: the exact type of person you want to email. Job title, country, company size, industry. Outbounder turns those answers into a search, so vague answers give you vague leads.',
      },
      {
        type: 'p',
        text: 'This wizard is the first thing a new user sees. The live sample on step 4 is your trust moment: they see a real first line written from a real company website **before** they meet the Stripe Checkout page.',
      },
      {
        type: 'prompt',
        id: 'out-fe-icp-prompt',
        title: 'Build the ICP wizard',
        code: `Read PRD.md sections 6.2, 14 and DESIGN.md section 5.3. Build /app/onboarding as a full-screen 5-step wizard using the StepWizard component.

Steps:
1. Who: job titles chip input with suggestions (Founder, CEO, Head of Marketing, VP Sales, Head of Talent, Managing Director), seniority toggle chips (owner, founder, c_suite, vp, head, director, manager).
2. Where: country multi-select, optional city/state chips.
3. Company: employee range toggle cards (1-10, 11-50, 51-200, 201-500), industry keyword chips, exclude keyword chips.
4. Offer: website URL (save the hostname to profiles.website_domain), one-sentence offer, optional proof line, sender name, company, physical address. Character counters.
5. Domain prompt (after checkout).

Save progress to profiles.icp (jsonb) on every Continue so a refresh never loses answers. Validate each step with zod before Continue is enabled.

Live sample on step 4: a server action that calls the find-leads logic in "sample" mode is too heavy, so instead create a Next.js route handler /api/onboarding/sample that: checks the user with supabase.auth.getClaims(), rate limits to 3 per user per day (count rows in events with type 'sample_line'), calls Apollo search for 1 person with the ICP (using the dev APOLLO_API_KEY on the server), scrapes the homepage with Firecrawl, and calls claude-sonnet-5-5 with the PRD 11.1 prompt. Returns { company, domain, first_line, signal }. Show the loading steps from DESIGN.md while it runs. If anything fails, show "We couldn't fetch a sample this time. You'll see real ones in a minute." and let them continue.

Step 4 Continue button reads "Start 7-day free trial" and calls the existing /api/stripe/checkout route. On return (?step=domain), poll the subscriptions row every 2 seconds for up to 60 seconds until status is trialing, then show step 5.

Plan first, then wait for my OK.`,
      },
      {
        type: 'steps',
        items: [
          'Paste the prompt into Claude Code and approve the plan.',
          'Run npm run dev and open http://localhost:3000/signup. Create a test account.',
          'Fill in the wizard as your own ICP: "Founder", "Managing Director", United Kingdom, 11-50 employees, keyword "marketing agency".',
          'On step 4 wait for the live sample. Read the first line out loud. Does it mention something real from that company\'s site?',
          'Refresh the page on step 3 and check your answers are still there.',
        ],
      },
      {
        type: 'mistakes',
        items: [
          { mistake: 'The sample route calls Claude with no auth check, so anyone can run up your API bill.', fix: 'Ask Claude Code to add getClaims() and the 3 per day limit, then test with a logged-out curl. It must return 401.' },
          { mistake: 'Titles saved as one comma string, so Apollo gets "Founder, CEO" as a single title.', fix: 'Store icp.titles as a string array and check the jsonb in Supabase Table Editor.' },
        ],
      },
    ],
    checklist: [
      { id: 'out-fe-icp-c1', label: 'Copy the ICP wizard prompt into Claude Code', trigger: 'copy:out-fe-icp-prompt' },
      { id: 'out-fe-icp-c2', label: 'Complete the wizard with your own ICP on localhost' },
      { id: 'out-fe-icp-c3', label: 'See a live sample first line on step 4' },
      { id: 'out-fe-icp-c4', label: 'Refresh mid-wizard and confirm answers persist' },
    ],
  },
  {
    id: 'out-fe-leads-table',
    title: 'Build the leads table with live pipeline status',
    outcome: 'A leads table where every row moves from found to ready in real time, with a detail sheet and bulk actions.',
    minutes: 90,
    xp: 60,
    blocks: [
      {
        type: 'callout',
        tone: 'eli5',
        title: 'Why does each row change on its own?',
        text: 'Your edge functions update leads in the database every couple of minutes. Supabase Realtime pushes those changes to the browser like a group chat notification, so the table updates without anyone pressing refresh.',
      },
      {
        type: 'ascii',
        code: `found -> verifying -> verified -> enriching -> enriched -> personalising -> ready
                 \\-> rejected                                       \\-> needs_review
ready -> approved -> sending -> completed
                        \\-> replied | bounced | unsubscribed`,
        caption: 'Every lead_status the table must show with its own StatusPill tone.',
      },
      {
        type: 'prompt',
        id: 'out-fe-leads-prompt',
        title: 'Build the leads table',
        code: `Read PRD.md sections 6.2 and 9.2 and DESIGN.md sections 4 (StatusPill, PipelineBar, ConfidenceMeter, AiMark) and 5.6. Build /app/campaigns/[id]/leads.

- Server component loads the campaign (check ownership with getClaims and RLS) and the first 200 leads joined with lead_enrichment (ai_confidence, site_markdown is not null as has_site, source_urls).
- Client table with TanStack Table + shadcn table. Columns exactly as DESIGN.md 5.6. Local time column computed with Intl.DateTimeFormat from lead.timezone.
- Realtime: subscribe to postgres_changes on public.leads filtered by campaign_id=eq.<id>. Merge updates into table state and flash the row with --primary-soft for 600ms.
- PipelineBar on top with counts per status group, updating live.
- Filters: search (name, company, email), status multi-select, "Needs review" quick filter. Keep filters in the URL query string.
- Row click opens a Sheet with lead details, scraped summary with source links, AI fields with AiMark, message history, and actions: Approve, Reject, Regenerate (calls the personalise edge function with the user's JWT), Remove, Suppress (inserts into suppression_list).
- Bulk select shows a bottom action bar: Approve, Reject, Remove. Approve/Reject only update leads whose status is ready, needs_review or approved (the database trigger blocks the rest; show a toast with how many were skipped).
- Upload CSV: columns email, first_name, last_name, title, company_name, company_domain. Insert as status found. Export CSV of the current filter.
- Virtualise rows over 200. Loading: 8 skeleton rows. Empty state from DESIGN.md.

Plan first, then wait for my OK.`,
      },
      {
        type: 'steps',
        items: [
          'Approve the plan and let Claude Code build the page.',
          'In Supabase > Table Editor > leads, insert one row by hand for your test campaign with status found.',
          'Open the leads page. Then change that row\'s status to ready in the Table Editor and watch the row flash and update without refreshing.',
          'Select two rows and try "Approve". Check the toast tells you how many changed.',
          'Upload a 3-row CSV and check the rows appear as found.',
        ],
      },
      {
        type: 'mistakes',
        items: [
          { mistake: 'Realtime does nothing.', fix: 'The migration adds leads to the supabase_realtime publication. Check Database > Publications. Also confirm the subscription filter uses campaign_id=eq.<uuid>.' },
          { mistake: 'Bulk approve throws "Not allowed to move lead from found to approved".', fix: 'That is the database trigger doing its job. Filter the selection to ready and needs_review rows before updating.' },
        ],
      },
    ],
    checklist: [
      { id: 'out-fe-leads-c1', label: 'Copy the leads table prompt', trigger: 'copy:out-fe-leads-prompt' },
      { id: 'out-fe-leads-c2', label: 'Watch a row update live after editing it in Table Editor' },
      { id: 'out-fe-leads-c3', label: 'Open a lead in the side sheet and see its enrichment' },
      { id: 'out-fe-leads-c4', label: 'Upload and export a CSV' },
    ],
  },
  {
    id: 'out-fe-sequence-editor',
    title: 'Build the sequence editor with live preview',
    outcome: 'A 3-step sequence editor where every keystroke renders a real lead\'s email on the right, with lint warnings.',
    minutes: 80,
    xp: 55,
    blocks: [
      {
        type: 'callout',
        tone: 'eli5',
        title: 'Variables, not spintax',
        text: 'A variable like {{first_name}} gets swapped for real data about each lead. Spintax swaps random synonyms ("Hi | Hey | Hello"). Real data reads better to humans and to spam filters, so Outbounder only uses variables.',
      },
      {
        type: 'table',
        head: ['Variable', 'Comes from', 'Example'],
        rows: [
          ['{{first_name}}', 'Apollo', 'Sarah'],
          ['{{company}}', 'Apollo', 'Northpeak Studio'],
          ['{{title}}', 'Apollo', 'Founder'],
          ['{{city}}', 'Apollo', 'Leeds'],
          ['{{ai_first_line}}', 'Claude, from the website', 'Northpeak builds Shopify stores for outdoor brands, from what your work page shows.'],
          ['{{ai_pain}}', 'Claude', 'Agencies that niche this hard usually live off referrals.'],
          ['{{sender_name}}', 'Your profile', 'Olly'],
        ],
      },
      {
        type: 'code',
        id: 'out-fe-seq-default',
        filename: 'default-sequence.txt',
        lang: 'txt',
        code: `STEP 1 · day 0 · new thread
Subject: {{ai_subject}}
Hi {{first_name}},

{{ai_first_line}} {{ai_pain}}

Outbounder finds 100 leads like your best clients, writes a first line for each from their website and sends from safe inboxes. I can run 10 for {{company}} free so you can judge them.

Want me to send them over?

STEP 2 · day 3 · same thread
{{first_name}}, one number: a personalised first line takes most founders 3 to 5 minutes. Outbounder does 100 in about 10.

Happy to send the 10 sample emails for {{company}} either way.

STEP 3 · day 8 · new thread
Subject: close the loop?
Not sure outbound is on your list this quarter, {{first_name}}. Reply "later" and I'll check back in a couple of months. If it is, the samples are ready.`,
      },
      {
        type: 'prompt',
        id: 'out-fe-seq-prompt',
        title: 'Build the sequence editor',
        code: `Read PRD.md sections 7 (Sequence), 12.3 and DESIGN.md sections 4 (EmailPreview, VariableChip) and 5.7. Build /app/campaigns/[id]/sequence and reuse it inside step 3 of the campaign builder.

- Load or create the campaign's sequence and its steps. New campaigns get the 3 default steps from the file default-sequence.txt I will paste below.
- Left column: step cards with delay_days input, same/new thread toggle (step 1 is always new thread and the toggle is hidden), subject input, auto-growing body textarea that highlights {{variables}} in mono, VariableChip row that inserts at the cursor.
- Lint under each body: word count; warnings for a link in step 1 (anything matching http or www.), over 120 words, spam words from PRD 12.3, any {{variable}} not in the allowed list, subject over 60 characters.
- Right column: sticky EmailPreview rendering the selected step for the selected lead (lead picker with prev/next across ready and approved leads, using lead + lead_enrichment fields). Unresolved variables show as red pills. Footer and unsubscribe line rendered greyed exactly as PRD 12.4.
- Autosave each step 1 second after typing stops, with a "Saved" indicator. Max 3 steps.
- Mobile: Edit / Preview segmented control.
- Put the renderer in lib/render.ts and make it the same logic as supabase/functions/_shared/render.ts so preview and sent email always match.

Plan first, then wait for my OK.`,
      },
      {
        type: 'steps',
        items: [
          'Paste the prompt, then paste the default sequence file contents when Claude Code asks for it.',
          'Open the sequence page for your test campaign.',
          'Type a link like www.example.com into step 1 and check the "Link in step 1" warning appears.',
          'Switch the preview lead with the arrows and check the first line changes per lead.',
        ],
      },
    ],
    checklist: [
      { id: 'out-fe-seq-c1', label: 'Copy the default 3-step sequence', trigger: 'copy:out-fe-seq-default' },
      { id: 'out-fe-seq-c2', label: 'Copy the sequence editor prompt', trigger: 'copy:out-fe-seq-prompt' },
      { id: 'out-fe-seq-c3', label: 'Trigger the link-in-step-1 warning on purpose' },
      { id: 'out-fe-seq-c4', label: 'Preview the same step for two different leads' },
    ],
  },
  {
    id: 'out-fe-review-queue',
    title: 'Build the review queue',
    outcome: 'A keyboard-driven queue where you approve, edit, regenerate or reject each AI email in a few seconds.',
    minutes: 70,
    xp: 50,
    blocks: [
      {
        type: 'p',
        text: 'Nothing sends without approval. This page is where users spend most of their time before launch, so it has to be fast: one email on screen, the reason for the first line next to it, and a single key for each action.',
      },
      {
        type: 'prompt',
        id: 'out-fe-review-prompt',
        title: 'Build the review queue',
        code: `Read PRD.md section 7 (Review) and DESIGN.md sections 5.8 and 7. Build /app/campaigns/[id]/review.

- Load leads in status ready and needs_review (filter switch: Ready, Needs review, All) ordered by needs_review first, then ai_confidence ascending, joined with lead_enrichment.
- Left 60%: EmailPreview in edit mode. Subject and body are contentEditable-free plain inputs styled like the preview (use a textarea that looks like the mail body). First line highlighted with --violet-soft and AiMark. When the user edits, save final_subject/final_body and set edited = true.
- Right 40%: Why this line panel: ai_signal quote, source_urls links, site_summary as 3 bullets, Apollo fields, ConfidenceMeter, ai_skip_reason in a warning Alert when present.
- Actions: A approve (status approved), X reject (status rejected), E focus the body, R open the regenerate popover with a hint input that calls the personalise edge function with { lead_id, hint } and the user's JWT, J/K next/previous. Show KeyboardHint in the footer. Ignore shortcuts while typing in an input.
- Slide animation on approve/reject as DESIGN.md 7, reduced motion respected.
- "Approve all above 0.8" enabled only after this user has approved or rejected at least 10 leads in this campaign by hand (count from events type email_approved/email_rejected). Confirm dialog shows the exact count.
- Write events rows email_approved (with edited and confidence), email_rejected, email_regenerated, and send the same to PostHog.
- Done state when the queue is empty, with a button back to the launch step.

Plan first, then wait for my OK.`,
      },
      {
        type: 'steps',
        items: [
          'Approve the plan and build.',
          'Open the review queue with at least 5 ready leads (run the pipeline first, or set statuses by hand in Table Editor).',
          'Approve 3 with the A key, reject 1 with X, edit 1 and approve it.',
          'Press R, type "mention their pricing page" and regenerate one email. Check the new first line respects the hint.',
          'In Table Editor, confirm lead_enrichment.edited is true for the one you edited.',
        ],
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Review like a buyer',
        text: 'Read each first line as the person receiving it. If you would not reply, reject it. Your reject reasons are the best feedback for improving the system prompt in PRD section 11.1.',
      },
    ],
    checklist: [
      { id: 'out-fe-review-c1', label: 'Copy the review queue prompt', trigger: 'copy:out-fe-review-prompt' },
      { id: 'out-fe-review-c2', label: 'Approve, reject and edit leads using only the keyboard' },
      { id: 'out-fe-review-c3', label: 'Regenerate one email with a hint' },
    ],
  },
  {
    id: 'out-fe-unified-inbox',
    title: 'Build the unified inbox',
    outcome: 'Every reply from every inbox in one three-pane view, labelled by Claude, with reply and relabel.',
    minutes: 80,
    xp: 55,
    blocks: [
      {
        type: 'callout',
        tone: 'eli5',
        title: 'What is a thread?',
        text: 'A thread is one conversation: your email, their reply, your reply. AgentMail gives each thread an id. We store it on every message so replies stay together, the same way Gmail groups them.',
      },
      {
        type: 'prompt',
        id: 'out-fe-inbox-prompt',
        title: 'Build the unified inbox',
        code: `Read PRD.md sections 6.2, 7 (Replies) and DESIGN.md sections 4 (ClassificationBadge) and 5.10. Build /app/inbox.

- Three panes: filters (All, Interested, Not now, Unsubscribe, OOO, Other, Unread, by campaign, by inbox), thread list, thread view. Keep the selected thread in the URL (?thread=<agentmail_thread_id>) so Resend alert links open it directly.
- Thread list: group messages by agentmail_thread_id where at least one inbound message exists. Show the latest inbound classification, lead name, company, snippet, time, unread dot (read_at is null). Paginate 50 at a time.
- Realtime: subscribe to inserts on public.messages for this user and prepend new threads.
- Thread view: header with lead, company, campaign, inbox. Classification dropdown: changing it updates messages.classification and writes a reply_relabelled event. Changing it to unsubscribe also inserts into suppression_list and sets the lead to unsubscribed. Mark as read on open.
- Low-confidence unsubscribe (classification unsubscribe and confidence under 0.6): warning Alert with Confirm / Not an unsubscribe.
- Reply composer: plain textarea, "Send from <inbox email>", cmd+enter. Inserts a messages row (direction outbound, status queued, is_manual true, inbox_id = lead.assigned_inbox_id, scheduled_for now(), subject "Re: <subject>", body_text). Show it in the thread as "Sending within 5 minutes" until status becomes sent.
- Mobile: list then full-screen thread with a back button.

Plan first, then wait for my OK.`,
      },
      {
        type: 'steps',
        items: [
          'Approve the plan and build.',
          'In Table Editor insert one inbound message (direction inbound, status received, classification interested, agentmail_thread_id test-1) for a test lead.',
          'Open /app/inbox and check it appears under Interested.',
          'Change the label to "not now" and check the row in messages updated.',
          'Write a reply and check a queued manual message appears in the messages table.',
        ],
      },
    ],
    checklist: [
      { id: 'out-fe-inbox-c1', label: 'Copy the unified inbox prompt', trigger: 'copy:out-fe-inbox-prompt' },
      { id: 'out-fe-inbox-c2', label: 'See a test reply appear under Interested' },
      { id: 'out-fe-inbox-c3', label: 'Relabel a reply and check the database' },
      { id: 'out-fe-inbox-c4', label: 'Queue a manual reply from the composer' },
    ],
  },
]
