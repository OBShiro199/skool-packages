// Dossier app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'dsr-fe-shell',
    title: 'Build onboarding, the app shell and settings',
    outcome: 'A new user creates a workspace with company facts, sees the Dossier sidebar, and can invite a teammate with a role.',
    minutes: 70,
    xp: 50,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why company facts come first', text: 'Half of every security questionnaire asks the same basics: where is your data hosted, which regions, do you have SOC 2. If Dossier knows those facts from day one, it never has to guess them, and guessing is how AI tools get answers wrong.' },
      { type: 'prompt', id: 'dsr-fe-shell-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7, 8, 12 and 12.2, @DESIGN_SYSTEM.md, and @DESIGN.md sections 6, 7.1, 7.2 and 7.16.

Build:
1. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, then profiles.current_workspace_id, then the workspace and the user's role. Redirect to /onboarding if none. Export roleAtLeast(role, 'reviewer').
2. app/onboarding/page.tsx: the 3-step card from DESIGN.md 7.2. Step 1 calls supabase.rpc('create_workspace', { p_name, p_facts }) with the company facts as JSON. Step 2 uploads sources (reuse the upload component from the next task later; for now a drop zone that inserts source_documents and uploads to sources/<ws>/<id>.<ext>). Step 3 links to /app/questionnaires/new.
3. The app shell from DESIGN.md section 6: sidebar items in this order: Questionnaires, Library, Sources, Assigned to me (count pill from questions where assignee_id = me and status not in approved, skipped), Activity, then the bottom group Documentation, Help, Billing, Settings. Billing only for the owner. UsageMeter above the bottom group from supabase.rpc('usage_summary', { ws }).
4. app/app/settings/page.tsx with tabs Profile, Workspace, Team, Notifications, Data exactly as DESIGN.md 7.16. Team: members table with role select (rpc set_member_role, owner only), remove (delete on workspace_members), invite form calling supabase.functions.invoke('ds-invite-member'), open invites with Revoke. Data: the statement from PRD 12.2 word for word and the subprocessor table.
5. app/invite/[token]/page.tsx: if not logged in, sign up or log in with the invited email, then rpc accept_invite(p_token) and redirect to /app.
6. app/app/docs/page.tsx and app/app/help/page.tsx as DESIGN.md 7.17.
Use design tokens only, no raw hex. Then run the app and screenshot onboarding step 1 and Settings > Team at 390px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create an account.',
        'Finish onboarding step 1 with your real company facts (hosting provider, regions, SOC 2 status).',
        'Open Settings > Team and invite a second email of yours (Gmail lets you use you+reviewer@gmail.com) as Reviewer.',
        'Accept the invite in a private window. Check the sidebar shows the same workspace.',
      ] },
      { type: 'code', id: 'dsr-fe-shell-sql', filename: 'check-workspace.sql', lang: 'sql', code: `-- Run in Supabase > SQL Editor. You should see your workspace, two members
-- with their roles, and your company facts.
select w.name, m.role, u.email, s.company_facts ->> 'hosting' as hosting
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
join auth.users u on u.id = m.user_id
join public.workspace_settings s on s.workspace_id = w.id;

select action, created_at from public.audit_events order by created_at desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'Onboarding errors with "new row violates row-level security policy".', fix: 'Claude Code inserted into workspaces directly. Tell it: "Create the workspace with supabase.rpc(\'create_workspace\'), never with an insert. The function adds the owner, settings and notification prefs in one go."' },
        { mistake: 'Accepting the invite says invite_wrong_email.', fix: 'You logged in with a different email from the one invited. Log out, then sign up with exactly the invited address.' },
        { mistake: 'The role select does nothing for an admin.', fix: 'Only the owner can change roles (set_member_role). Hide the select for everyone else and show the role as text.' },
      ] },
    ],
    checklist: [
      { id: 'dsr-fe-shell-c1', label: 'Copy the shell and onboarding prompt', trigger: 'copy:dsr-fe-shell-prompt' },
      { id: 'dsr-fe-shell-c2', label: 'Finish onboarding with your company facts' },
      { id: 'dsr-fe-shell-c3', label: 'Invite and accept a reviewer' },
      { id: 'dsr-fe-shell-c4', label: 'Run the check SQL and see two members', trigger: 'copy:dsr-fe-shell-sql' },
    ],
  },
  {
    id: 'dsr-fe-sources',
    title: 'Build the file runner and the Sources pages',
    outcome: 'You upload a policy PDF, it shows Reading, then Ready with its passages, and nothing ever runs longer than a request should.',
    minutes: 120,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two workers, one to-do list', text: 'Reading files needs Node.js libraries for Excel, Word and PDF. Supabase edge functions run Deno with a tight CPU budget, so file work runs on Vercel instead, at /api/jobs/run. AI work runs in Supabase. Both pick jobs from the same jobs table, each only its own kind, and the database alarm clock pokes both every minute.' },
      { type: 'prompt', id: 'dsr-fe-sources-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.1, 9.4, 11.3, 13.5 and 14.1, and @DESIGN.md sections 7.11 and 7.12.

Install: npm i exceljs jszip @xmldom/xmldom unpdf mammoth pdf-lib zod

Build:
1. app/api/jobs/run/route.ts: export const runtime = 'nodejs'; export const maxDuration = 300. POST only. Compare the x-cron-secret header with process.env.CRON_SECRET using crypto.timingSafeEqual (401 on mismatch). Secret-key Supabase client from lib/supabase/admin.ts (server only, import 'server-only'). rpc release_stuck_jobs, then rpc claim_jobs { p_runner: 'node', p_limit: 3 }. Dispatch by kind to lib/runner/<kind>.ts. Stop claiming after 240 s. Same retry rules as the edge worker: attempts + 1 and backoff 2^attempts minutes, dead at 5 with the parent marked failed.
2. lib/runner/extract_source.ts: download the file with a 15 minute signed URL. PDF: unpdf getDocumentProxy + extractText per page; pages with under 200 characters are "scanned" and go to LlamaParse (lib/llamaparse.ts: POST https://api.cloud.llamaindex.ai/api/v2/parse/upload with Authorization: Bearer LLAMA_CLOUD_API_KEY, the file, and configuration { tier: 'cost_effective', version: 'latest' } plus do_not_cache true; store the job id in jobs.payload and requeue the job with run_after + 20 s; on the next run GET /api/v2/parse/{id}?expand=markdown until COMPLETED. Check the current LlamaParse v2 docs for field names first and tell me what you found). DOCX: mammoth.convertToHtml, then split on h1 to h3 for headings. XLSX past questionnaires: hand over to import_library (next tasks) and also chunk each Q and A row. MD and TXT: split on # headings.
3. lib/chunk.ts exactly as PRD 14.1: about 350 tokens (estimate 4 characters per token), 50 overlap, never split a table row, keep page and breadcrumb. Unit tests with vitest for a 3 page fake policy.
4. After chunking: insert source_chunks in batches of 500, update pages and status 'embedding', meter pages (usage_ledger kind 'pages', quantity pages, idempotency 'pages:' + id) and llamaparse_usd (cost only, 3 credits x $0.00125 per scanned page), then insert job embed_source with idempotency 'embed:' + document_id. Before chunking, checkLimit pages against plan_limits: over the cap marks the document failed with "You have used all X parsed pages this month."
5. app/app/sources/page.tsx and app/app/sources/[id]/page.tsx as DESIGN.md 7.11 and 7.12, with Realtime on source_documents for live status, the full-page drop overlay, and Retry on failed rows (sets status back through ds-ingest-source).
6. components/sources/UploadSources.tsx: for each file, insert source_documents (title from file name, kind guessed from the name: "soc" -> soc2, "questionnaire|caiq|sig" -> questionnaire, else policy), upload to sources/<ws>/<id>.<ext>, then supabase.functions.invoke('ds-ingest-source'). Show "Already in your sources" when duplicate is true.
Then upload a real 10+ page policy PDF and a DOCX and show me both reaching Ready.` },
      { type: 'steps', items: [
        'Add CRON_SECRET (run openssl rand -hex 32) and LLAMA_CLOUD_API_KEY to .env.local and Vercel env, and CRON_SECRET to Supabase secrets with the same value.',
        'Deploy to Vercel so the runner has a public URL, then run the schedules block at the bottom of the SQL migration with your domain filled in.',
        'Upload two of your own policies. Watch the status go Reading, then Embedding, then Ready.',
        'Open one source and check the passages read like whole paragraphs, not cut mid-sentence.',
      ] },
      { type: 'code', id: 'dsr-fe-sources-sql', filename: 'check-sources.sql', lang: 'sql', code: `select d.title, d.status, d.pages,
       count(c.id) as passages,
       count(c.id) filter (where c.embedding is not null) as embedded,
       round(avg(c.token_count)) as avg_tokens
from public.source_documents d
left join public.source_chunks c on c.document_id = d.id
group by d.id order by d.created_at desc limit 5;

select kind, runner, status, attempts, last_error from public.jobs order by created_at desc limit 10;` },
      { type: 'mistakes', items: [
        { mistake: 'Jobs stay queued for ever.', fix: 'pg_cron is not calling the runner. Run select * from cron.job_run_details order by start_time desc limit 5; then check the URL and that the cron_secret in Vault matches CRON_SECRET in Vercel.' },
        { mistake: 'The runner returns 504 on a big PDF.', fix: 'Your Vercel plan caps the duration. Hobby allows 300 s and Pro up to 800 s (checked Oct 2026). Lower the runner to 2 jobs per call, or split extract_source per 50 pages.' },
        { mistake: 'Every PDF page goes to LlamaParse.', fix: 'unpdf returned empty text because the import failed in the serverless build. Ask Claude Code to log the character count per page from unpdf before deciding a page is scanned.' },
      ] },
    ],
    checklist: [
      { id: 'dsr-fe-sources-c1', label: 'Copy the file runner and sources prompt', trigger: 'copy:dsr-fe-sources-prompt' },
      { id: 'dsr-fe-sources-c2', label: 'Set CRON_SECRET in .env.local, Vercel and Supabase' },
      { id: 'dsr-fe-sources-c3', label: 'Turn on the pg_cron schedules' },
      { id: 'dsr-fe-sources-c4', label: 'Upload two sources and see them Ready', trigger: 'copy:dsr-fe-sources-sql' },
    ],
  },
  {
    id: 'dsr-fe-questionnaires',
    title: 'Build questionnaire upload, parsing and the column mapping screen',
    outcome: 'A buyer\'s XLSX with several sheets becomes a list of questions, each knowing exactly which cell its answer goes back into.',
    minutes: 120,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why a human checks the columns', text: 'Every buyer lays out their spreadsheet differently: questions in column B or C, answers in D, a "Comments" column, an instructions tab. Dossier makes a good guess, but writing 400 answers into the wrong column would be a disaster. So a person confirms the guess once, in ten seconds, before anything is drafted.' },
      { type: 'prompt', id: 'dsr-fe-questionnaires-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 8 (the locator), 9.2, 11.3 and 13.5, and @DESIGN.md sections 7.3, 7.4 and 7.5.

Build:
1. app/app/questionnaires/page.tsx (the list) and app/app/questionnaires/new/page.tsx (Upload and Paste tabs). Upload: insert questionnaires (file_type from extension, status uploading, storage_path '<ws>/<id>.<ext>'), upload to the questionnaires bucket, then supabase.functions.invoke('ds-start-questionnaire', { body: { questionnaire_id } }). Paste: invoke it with { workspace_id, name, buyer_name, due_at, paste_text }.
2. lib/runner/parse_questionnaire.ts:
   - XLSX: exceljs load, for every worksheet write questionnaire_sheets (sheet_name, sheet_index, preview = first 40 rows as arrays of cell text, merged cells marked). Guess header_row, question_col, answer_col, detail_col and section_col with the heuristics in PRD 11.3. Set weak_guess when no header matched or the question column has under 5 rows of 20+ characters. Sheets named like instructions, cover, scoring, guide: include false.
   - DOCX: JSZip + @xmldom/xmldom on word/document.xml. Every table becomes a sheet (sheet_name "Table N", preview from its rows). Numbered or "?" paragraphs outside tables are kept in jobs.payload as paragraph questions.
   - PDF: unpdf text per page (LlamaParse for scanned pages as in extract_source); save 20-page text windows in the next job's payload.
   - Meter pages. If any sheet is weak, or the file is a PDF, insert job detect_structure (edge); else set status 'mapping'.
3. app/app/questionnaires/[id]/mapping/page.tsx: DESIGN.md 7.5. The MappingGrid with column header menus, the sheet rail with include checkboxes, the 44px bar of selects. Saving updates questionnaire_sheets through the browser client (RLS and the guard allow only mapping columns while status is 'mapping'). "Confirm and create N questions" calls app/api/questionnaires/[id]/mapping/route.ts: getClaims, reviewer role, bump mapping_version with the secret key client, insert job extract_questions with idempotency 'extractq:' + id + ':' + version.
4. lib/runner/extract_questions.ts: for each included sheet, every row after header_row with question text of 8+ characters becomes a question: section from section_col (carry the last non-empty value down), answer_kind yes_no_detail when the answer column has a data validation list containing Yes and No, locator { type: 'xlsx', sheet, sheetIndex, row, answerCol, detailCol }. DOCX: locator table_cell or paragraph. Skip rows whose answer cell already has text unless the reviewer ticked "Overwrite existing answers". Apply assign_rules if the plan allows. Then status 'ready' and rpc refresh_questionnaire.
Test with a real CAIQ or SIG Lite spreadsheet and a DOCX with a two-column table, and show me the mapping screen for both.` },
      { type: 'steps', items: [
        'Download a public sample questionnaire (search "CAIQ v4 xlsx download" on the Cloud Security Alliance site) or ask a friend at a SaaS company for a blank vendor questionnaire.',
        'Upload it on New questionnaire. Within a minute it shows Check columns.',
        'On the mapping screen, check the Instructions sheet is excluded and the answer column is right on each sheet. Change one guess on purpose, then Confirm.',
        'Paste 10 questions with one section heading on the Paste tab and check they appear under that section.',
      ] },
      { type: 'code', id: 'dsr-fe-questionnaires-sql', filename: 'check-questions.sql', lang: 'sql', code: `-- Sheets and their confirmed mapping.
select sheet_name, include, header_row, question_col, answer_col, detail_col, weak_guess
from public.questionnaire_sheets where questionnaire_id = '<id>' order by sheet_index;

-- Every question must have a locator that says where its answer goes.
select count(*) as questions,
       count(*) filter (where locator ? 'row' or locator ? 'paragraphIndex' or locator ? 'line' or locator ? 'page') as located,
       count(distinct section) as sections
from public.questions where questionnaire_id = '<id>';` },
      { type: 'mistakes', items: [
        { mistake: 'Every row of the sheet became a question, including headers and blank rows.', fix: 'header_row was not used. Ask Claude Code to start after header_row and skip rows where the question cell is under 8 characters or repeats the header.' },
        { mistake: 'The mapping cannot be saved: "the mapping is locked once questions are created".', fix: 'The questionnaire already moved past mapping. That is the guard working. Delete and re-upload, or add a "Re-map" button that resets status through a server route.' },
        { mistake: 'A password-protected XLSX fails with a zip error.', fix: 'Show the DESIGN.md microcopy "It may be password protected. Remove the password and upload it again." instead of the raw error.' },
      ] },
    ],
    checklist: [
      { id: 'dsr-fe-questionnaires-c1', label: 'Copy the upload and mapping prompt', trigger: 'copy:dsr-fe-questionnaires-prompt' },
      { id: 'dsr-fe-questionnaires-c2', label: 'Upload a real multi-sheet questionnaire' },
      { id: 'dsr-fe-questionnaires-c3', label: 'Confirm the mapping and create questions' },
      { id: 'dsr-fe-questionnaires-c4', label: 'Run the check SQL: located equals questions', trigger: 'copy:dsr-fe-questionnaires-sql' },
    ],
  },
  {
    id: 'dsr-fe-review',
    title: 'Build the review workspace: draft, check sources, assign, approve',
    outcome: 'Your team works through a questionnaire in one screen: drafts arrive live, every answer shows its sources, and low-confidence ones are first.',
    minutes: 150,
    xp: 80,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Confidence is a to-do list', text: 'Nobody should read 400 answers. The confidence score sorts them: high ones with strong sources get a quick look, low ones with no source or old sources go to the person who knows. That is how a 20 hour job becomes a 1 hour job.' },
      { type: 'prompt', id: 'dsr-fe-review-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.3, 13.3, 14.3, 14.4 and 14.5, and @DESIGN.md sections 4, 7.6, 9, 14 and 15.

Build app/app/questionnaires/[id]/page.tsx, the three-pane review workspace:
1. Question list (components/review/QuestionList.tsx): virtualised (@tanstack/react-virtual) for 2,000 rows, filters from DESIGN.md 7.6 in the URL, default sort needs_review first then ordinal, checkboxes for bulk select, unread comment dot.
2. Editor (components/review/AnswerEditor.tsx): question, locator line, Yes/No/Partial/N/A segmented control for yes_no kinds, plain textarea autosaving 800 ms after typing (update questions set answer_text, answer_short through the browser client; the guard trigger handles status and last_edited_by), status line with reserved height, Approve split button calling supabase.rpc('approve_questions', { p_ids, p_save_to_library, p_update_library }), Redraft menu calling ds-draft-run with question_ids and an instruction, Assign (AssigneePicker -> rpc assign_questions), Not applicable (rpc skip_questions). ConfidenceBadge, FlagChips, LibraryReuseNote, model note.
3. Evidence (components/review/EvidencePanel.tsx): answer_citations joined to source_chunks and source_documents, EvidenceCards with the quote highlighted inside the passage, then a search box calling ds-library-search (debounced 300 ms), then CommentThread (insert question_comments with mentions from the @ menu).
4. Toolbar: RunProgress from the questionnaire counts, "Draft all (N)" opening the one morphing dialog from DESIGN.md section 15 (handle 409 over_cap and 402 limit_reached exactly as written), Export button (built in the next task).
5. Realtime: subscribe to postgres_changes on questions with filter questionnaire_id=eq.<id>, merge rows into the list without re-animating. Presence channel 'q:<question_id>' to show "Priya is editing" and make the editor read-only for others.
6. SelectionBar for bulk Approve, Assign, Redraft, Not applicable with counts and fixed minimum widths.
7. Keyboard: j, k, a, r, e, /, Esc, ? as PRD 14.5.
8. app/app/assigned/page.tsx (DESIGN.md 7.13) and app/app/activity/page.tsx (DESIGN.md 7.14, CSV export only when plan_limits.audit_export).
Render every answer, quote and comment as text, never as HTML. Then draft a 30-question questionnaire and record a 20 second screen capture of drafts arriving.` },
      { type: 'steps', items: [
        'Open the questionnaire you created and click Draft all. Leave the page and come back: progress continues.',
        'Filter to Needs review. Open one, read its evidence, fix the answer, and Approve and save to library.',
        'Assign three questions to your reviewer account with a due date, and @mention them in a comment.',
        'In the reviewer\'s window, open Assigned to me and approve one of them.',
      ] },
      { type: 'code', id: 'dsr-fe-review-sql', filename: 'check-review.sql', lang: 'sql', code: `-- Status and confidence spread for one questionnaire.
select status, count(*), round(avg(confidence)) as avg_conf,
       count(*) filter (where 'no_evidence' = any (flags)) as no_evidence
from public.questions where questionnaire_id = '<id>' group by status order by status;

-- Every drafted answer has at least one citation or the no_evidence flag. Must return 0.
select count(*) from public.questions q
where q.questionnaire_id = '<id>' and q.status in ('drafted', 'needs_review', 'approved')
  and not exists (select 1 from public.answer_citations c where c.question_id = q.id)
  and not ('no_evidence' = any (q.flags));` },
      { type: 'mistakes', items: [
        { mistake: 'Typing in the editor throws "status changes go through approve_questions".', fix: 'The editor sends status along with the answer. Send only answer_text and answer_short; the guard trigger moves the status itself.' },
        { mistake: 'The list jumps around every time a draft arrives.', fix: 'The list re-sorts on every Realtime event. Keep the sort order frozen while the user is on the page, and show "12 new drafts, re-sort" as a quiet text button.' },
        { mistake: 'Approve does nothing for some answers.', fix: 'approve_questions skips empty answers and, with two-step approval on, answers you edited yourself. Show its returned skipped count in the toast: "10 approved, 2 need another reviewer".' },
      ] },
    ],
    checklist: [
      { id: 'dsr-fe-review-c1', label: 'Copy the review workspace prompt', trigger: 'copy:dsr-fe-review-prompt' },
      { id: 'dsr-fe-review-c2', label: 'Draft a questionnaire and watch drafts arrive live' },
      { id: 'dsr-fe-review-c3', label: 'Approve one answer into the library' },
      { id: 'dsr-fe-review-c4', label: 'Assign, mention and approve as a second user' },
      { id: 'dsr-fe-review-c5', label: 'Run the check SQL and get 0 uncited answers', trigger: 'copy:dsr-fe-review-sql' },
    ],
  },
  {
    id: 'dsr-fe-library-export',
    title: 'Build the answer library, past-questionnaire import and export',
    outcome: 'Approved answers are reused next time, stale ones are flagged, and you download the buyer\'s own file with every answer in place.',
    minutes: 150,
    xp: 80,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why we edit cells instead of re-saving the file', text: 'An Excel file is a zip of small XML files. Opening it in a library and saving it again can quietly drop things the library does not understand: charts, macros, odd formatting. So Dossier opens the zip, changes only the answer cells in the sheet XML, and zips it back. Everything else stays byte for byte the same.' },
      { type: 'prompt', id: 'dsr-fe-library-export-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.5, 11.4, 13.5 and 14.4, and @DESIGN.md sections 7.7 to 7.10.

Build:
1. app/app/library/page.tsx, the library answer side panel (DESIGN.md 7.9) and app/app/library/import/page.tsx. Owner and review date changes go through rpc set_library_owner. "Mark reviewed" updates review_by to today + workspace_settings.default_review_days.
2. lib/runner/import_library.ts: for a source of kind questionnaire (XLSX), reuse the parse and mapping guess, and insert library_answers with status 'draft' for every row with both a question and an answer (skip rows where an approved answer has the same normalized_hash; mark those as "Duplicate of"). The import page approves in bulk by updating status to 'approved' (reviewer+, RLS applies).
3. lib/runner/export_questionnaire.ts exactly as PRD 11.4:
   - xlsx: JSZip open, map sheet names to xl/worksheets/sheetN.xml through xl/workbook.xml and xl/_rels/workbook.xml.rels, parse with @xmldom/xmldom, set each answer cell to t="inlineStr" with <is><t xml:space="preserve">...</t></is>, keep its s attribute, insert missing cells in column order, never touch other cells. Yes/no: short answer in the answer column, detail in the detail column if mapped, else "Yes. <detail>". Write unit tests: round-trip a workbook with a formula, a data validation list, a merged cell and a chart, and assert every other zip entry is byte-identical.
   - docx: table cell answers replace the runs of the answer cell with one run copying the first run's rPr; paragraph answers insert a paragraph after the question copying its pPr, prefixed "Answer: ".
   - pdf_form: pdf-lib getForm(), fill text fields by locator.field, save.
   - answers_xlsx / answers_docx / csv: question, short answer, answer, status, confidence, sources (document and page). Use exceljs to create and the docx package to create.
   - only_approved: leave other answer cells empty. Upload to exports/<ws>/<questionnaire_id>/<export_id>.<ext>, set exports done with answer_count and size_bytes, questionnaire status 'exported' via rpc refresh_questionnaire after setting it, email export_ready.
4. The export dialog (DESIGN.md 7.7): insert into exports { questionnaire_id, workspace_id, format, only_approved } with the browser client (the trigger queues the job), Realtime on that export row, then Download through app/api/exports/[id]/download/route.ts (getClaims, membership, createSignedUrl 60 s).
Then export your test XLSX and open it in Excel and Google Sheets.` },
      { type: 'steps', items: [
        'Approve 10 answers with Save to library on, then open Library and check owners and review dates.',
        'Upload a second questionnaire that repeats some of the same questions with different numbering. Draft it: those come back at confidence 95 with "From the library".',
        'Set one library answer\'s review date to yesterday and redraft its question: it now shows the Stale source flag.',
        'Export the first questionnaire as Original file (XLSX). Open it in Excel: answers sit in the right cells and the other sheets, colours and dropdowns are unchanged.',
      ] },
      { type: 'code', id: 'dsr-fe-library-export-sql', filename: 'check-library-export.sql', lang: 'sql', code: `-- Library reuse: answers that came straight from the library.
select count(*) filter (where library_answer_id is not null and confidence = 95) as exact_reuse,
       count(*) as total
from public.questions where questionnaire_id = '<second questionnaire id>';

-- Exports and their files.
select format, status, answer_count, size_bytes, error, created_at
from public.exports order by created_at desc limit 5;` },
      { type: 'mistakes', items: [
        { mistake: 'Excel says the file is corrupt and offers to repair it.', fix: 'A cell was inserted out of column order or a shared string index was left behind. Ask Claude Code to write cells as inlineStr only, insert them sorted by column, and run the round-trip test on that file.' },
        { mistake: 'Library reuse never happens even for identical questions.', fix: 'The embed_library job did not run, or the library answer is still draft. Check jobs for kind embed_library and that the answer status is approved. Exact matches use normalized_hash and need no embedding at all.' },
        { mistake: 'Download link returns 400 "Object not found".', fix: 'The export path does not start with the workspace id, or the file runner wrote to a different bucket. Log the storage_path the runner saved and compare it with the exports bucket layout.' },
      ] },
    ],
    checklist: [
      { id: 'dsr-fe-library-export-c1', label: 'Copy the library and export prompt', trigger: 'copy:dsr-fe-library-export-prompt' },
      { id: 'dsr-fe-library-export-c2', label: 'See a repeated question answered from the library' },
      { id: 'dsr-fe-library-export-c3', label: 'See the stale flag on an expired library answer' },
      { id: 'dsr-fe-library-export-c4', label: 'Export the original XLSX and open it in Excel', trigger: 'copy:dsr-fe-library-export-sql' },
    ],
  },
]
