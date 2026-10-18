// Harvest app-specific backend tasks: one account-setup task per service, the schedules, and the end-to-end test.
import type { Task } from '../../types'

export const backendTasks: Task[] = [
  {
    id: 'hrv-be-apify',
    title: 'Set up Apify for collecting reactions and comments',
    outcome: 'Harvest can ask Apify for everyone who reacted to or commented on a LinkedIn post, and Apify calls Harvest back when it is done.',
    minutes: 35,
    xp: 45,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'What Apify does here', text: 'Apify is a marketplace of ready-made scrapers called actors. Harvest hands an actor a list of post links; the actor (run by its developer, not by you, and without your LinkedIn login) returns the people who reacted or commented. You pay per result, about $2 per 1,000 people. When it finishes, Apify phones Harvest with a webhook.' },
      { type: 'callout', tone: 'warn', title: 'Know the supply risk', text: 'LinkedIn does not allow scraping and has shut down data providers before (Proxycurl closed in July 2025 after LinkedIn sued). The actor you pick can stop working or disappear. That is why Harvest keeps actor ids in secrets (swap in one command), validates every result, alerts you when runs come back empty, and has the engager CSV import as a fallback.' },
      { type: 'table', head: ['Actor (Apify Store)', 'Job', 'Price (checked Oct 2026)', 'Secret'], rows: [
        ['harvestapi/linkedin-post-reactions', 'People who reacted to a post', '$2 per 1,000 reactions [verify]', 'APIFY_REACTIONS_ACTOR'],
        ['harvestapi/linkedin-post-comments', 'People who commented, with the comment', '$2 per 1,000 comments [verify]', 'APIFY_COMMENTS_ACTOR'],
        ['harvestapi/linkedin-profile-posts', 'A creator\'s recent posts', '$2 per 1,000 posts [verify]', 'APIFY_POSTS_ACTOR'],
      ] },
      { type: 'steps', items: [
        'Go to apify.com and click Sign up (top right). Sign up with Google or email. The Free plan gives $5 of usage a month, enough to build and test.',
        'In the Apify Console, open each actor above from the Store (search its name) and read the Input tab and an example output on the actor page. Note the exact input field names for the post URLs and the max items. Mark anything that differs from @PRD.md 12.1 and tell Claude Code.',
        'Get your token: Console > Settings > API & Integrations > Personal API tokens [verify the menu name]. Copy the default token. It starts with apify_api_.',
        'Add to Supabase secrets (Supabase > Edge Functions > Secrets > Add new secret): APIFY_TOKEN, plus APIFY_REACTIONS_ACTOR = harvestapi~linkedin-post-reactions, APIFY_COMMENTS_ACTOR = harvestapi~linkedin-post-comments, APIFY_POSTS_ACTOR = harvestapi~linkedin-profile-posts (a tilde, not a slash).',
        'Make the webhook secret: run `openssl rand -hex 32` in a terminal and save it in Supabase secrets as APIFY_WEBHOOK_SECRET.',
        'Before your first paying customer, upgrade to Starter ($29 a month of prepaid usage [verify]) so a busy night never stops at the free $5. Set a usage limit in Console > Settings > Usage limits [verify] at about 1.5 times what you expect.',
      ] },
      { type: 'keys', rows: [
        { name: 'APIFY_TOKEN', where: 'Apify Console > Settings > API & Integrations > Personal API tokens (apify_api_...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'APIFY_WEBHOOK_SECRET', where: 'Make one: openssl rand -hex 32', pasteInto: 'Supabase secrets', secret: true },
        { name: 'APIFY_REACTIONS_ACTOR', where: 'harvestapi~linkedin-post-reactions', pasteInto: 'Supabase secrets', secret: false },
        { name: 'APIFY_COMMENTS_ACTOR', where: 'harvestapi~linkedin-post-comments', pasteInto: 'Supabase secrets', secret: false },
        { name: 'APIFY_POSTS_ACTOR', where: 'harvestapi~linkedin-profile-posts', pasteInto: 'Supabase secrets', secret: false },
      ] },
      { type: 'p', text: 'Test the token, then run the reactions actor on one real post with a 10 result cap (costs about 2 cents). Replace YOUR_TOKEN and the post URL. Check the field names against the actor\'s Input tab first.' },
      { type: 'code', id: 'hrv-be-apify-curl', filename: 'test-apify.sh', lang: 'bash', code: `# 1. Who am I? A good answer has "data": { "username": ... }
curl -s https://api.apify.com/v2/users/me -H "Authorization: Bearer YOUR_TOKEN" | head -c 300; echo

# 2. Ten reactions from one post, synchronous (fine for a test, never in the app).
#    Field names below are a guess [verify on the actor's Input tab].
curl -s -X POST "https://api.apify.com/v2/acts/harvestapi~linkedin-post-reactions/run-sync-get-dataset-items?maxTotalChargeUsd=0.05" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"posts":["https://www.linkedin.com/feed/update/urn:li:activity:PASTE_ID"],"maxItems":10}' | head -c 1500` },
      { type: 'p', text: 'A good answer to call 2 is a JSON array of up to 10 items, each with a reaction type and an actor object holding a name, a linkedinUrl and a position (their headline). Save one item: Claude Code uses it as the test fixture in hv-ingest.' },
      { type: 'links', items: [
        { label: 'Apify pricing', url: 'https://apify.com/pricing' },
        { label: 'Post reactions actor', url: 'https://apify.com/harvestapi/linkedin-post-reactions' },
        { label: 'Post comments actor', url: 'https://apify.com/harvestapi/linkedin-post-comments' },
        { label: 'Profile posts actor', url: 'https://apify.com/harvestapi/linkedin-profile-posts' },
        { label: 'Run actor API', url: 'https://docs.apify.com/api/v2/act-runs-post' },
        { label: 'Ad-hoc webhooks', url: 'https://docs.apify.com/platform/integrations/webhooks/ad-hoc-webhooks' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'The run returns 400 "Input is not valid".', fix: 'The input field names differ from the guess. Open the actor\'s Input tab, switch to JSON view, copy the exact field names, and update both the curl and @PRD.md 12.1.' },
        { mistake: '404 "Actor was not found".', fix: 'In URLs the actor id uses a tilde: harvestapi~linkedin-post-reactions. A slash only works in the Console search.' },
        { mistake: 'The run succeeds but returns an empty array.', fix: 'The post is private, deleted, or a repost. Try a public post with visible reactions. If public posts also return nothing, the actor may be broken: check its Issues tab on Apify and try an alternative actor by changing APIFY_REACTIONS_ACTOR.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-be-apify-c1', label: 'Create an Apify account and copy the API token' },
      { id: 'hrv-be-apify-c2', label: 'Read the Input tab of all three actors and note the field names' },
      { id: 'hrv-be-apify-c3', label: 'Add the five Apify secrets to Supabase' },
      { id: 'hrv-be-apify-c4', label: 'Run the test and save one result item', trigger: 'copy:hrv-be-apify-curl' },
    ],
  },
  {
    id: 'hrv-be-prospeo',
    title: 'Set up Prospeo for role, company and email',
    outcome: 'Harvest can turn a LinkedIn profile link into a current title, company, headcount and a work email, paying only when it finds a match.',
    minutes: 20,
    xp: 30,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Enrichment, and why it is the expensive step', text: 'A reaction tells you a name and a headline. Enrichment looks that person up in a business database and returns their real job, company, company size and work email. It costs about 2 cents a person, ten times more than collecting them, so Harvest only enriches people whose headline already looks like a fit.' },
      { type: 'table', head: ['', 'Prospeo (picked)', 'Why not the others'], rows: [
        ['What one call returns', 'Person, company and email together [verify]', 'Many tools charge separately for profile and email'],
        ['Charge', '1 credit per match, nothing when not found, re-enrich free [verify]', ''],
        ['Plans (checked Oct 2026)', 'Starter $49 / 2,000 credits, Growth $99 / 5,000, Pro $249 / 15,000 a month [verify]', 'Apollo needs each customer\'s own plan for API filters'],
        ['Cost per enriched lead', 'About $0.017 to $0.025', 'Proxycurl shut down in 2025'],
        ['API on the free plan', 'No, Starter or above [verify]', ''],
      ] },
      { type: 'steps', items: [
        'Go to prospeo.io and click Sign up. Confirm your email.',
        'Choose Starter (monthly). You need a paid plan for API access [verify]. Move to Growth at about 10 customers and Pro at about 30.',
        'In the dashboard open the API section (left menu) [verify] and copy your API key.',
        'Add it to Supabase secrets as PROSPEO_API_KEY.',
        'Note your credit balance on the dashboard, then run the test below once and check it went down by 1.',
      ] },
      { type: 'keys', rows: [
        { name: 'PROSPEO_API_KEY', where: 'Prospeo dashboard > API > API key [verify the menu name]', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'hrv-be-prospeo-curl', filename: 'test-prospeo.sh', lang: 'bash', code: `# Use your own LinkedIn profile URL so you can check the answer.
curl -s -X POST https://api.prospeo.io/enrich-person \\
  -H "X-KEY: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"data":{"linkedin_url":"https://www.linkedin.com/in/YOUR-ID"}}' | head -c 1500` },
      { type: 'p', text: 'A good answer has "error": false with a person object (name, job title) and a company object (name, domain, headcount or size band), plus an email with a status. If nothing matches you get an error code such as NO_MATCH and no credit is used [verify the exact codes in the docs].' },
      { type: 'links', items: [
        { label: 'Enrich person docs', url: 'https://prospeo.io/api-docs/enrich-person' },
        { label: 'Prospeo plans and pricing', url: 'https://help.prospeo.io/en/article/plans-and-pricing-overview-cdloq9' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '401 or "INVALID_API_KEY".', fix: 'The header is X-KEY, not Authorization. Copy the key again from the dashboard with no spaces.' },
        { mistake: '"INSUFFICIENT_CREDITS" on day 20.', fix: 'Your plan ran out across all customers. hv-enrich emails ADMIN_EMAIL when this happens. Upgrade the Prospeo plan, then re-run hv-enrich; queued people pick up where they stopped.' },
        { mistake: 'Emails come back but MillionVerifier marks many invalid.', fix: 'Check that hv-enrich asks for verified emails only, if the docs offer that option, and that you are not storing personal emails. Lower the share by keeping only ok and catch_all.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-be-prospeo-c1', label: 'Create a Prospeo account on Starter' },
      { id: 'hrv-be-prospeo-c2', label: 'Add PROSPEO_API_KEY to Supabase secrets' },
      { id: 'hrv-be-prospeo-c3', label: 'Enrich your own profile with the test call', trigger: 'copy:hrv-be-prospeo-curl' },
    ],
  },
  {
    id: 'hrv-be-millionverifier',
    title: 'Set up MillionVerifier for the second email check',
    outcome: 'Every email Harvest shows has been checked by a second, independent verifier, so customers do not burn their sending domains.',
    minutes: 15,
    xp: 20,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why check the email twice', text: 'A bounced email hurts the sender\'s reputation. The data provider already checks its emails, but a second check costs less than half a cent and catches addresses that died since. "Catch-all" means the company accepts every address, so nobody can be sure; Harvest marks those amber.' },
      { type: 'steps', items: [
        'Go to millionverifier.com and click Sign up. Confirm your email.',
        'Buy the smallest credit pack (about $37 to $39 for 10,000 checks [verify]; credits do not expire). That covers your first 30 or so customers.',
        'Open the API page from the menu [verify] and copy the API key.',
        'Add it to Supabase secrets as MILLIONVERIFIER_API_KEY.',
      ] },
      { type: 'keys', rows: [
        { name: 'MILLIONVERIFIER_API_KEY', where: 'MillionVerifier > API > API key [verify the menu name]', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'hrv-be-mv-curl', filename: 'test-millionverifier.sh', lang: 'bash', code: `# Check one address (use your own work email), then your credit balance.
curl -s "https://api.millionverifier.com/api/v3/?api=YOUR_KEY&email=you@yourcompany.com&timeout=10"; echo
curl -s "https://api.millionverifier.com/api/v3/credits?api=YOUR_KEY"; echo   # [verify this endpoint]` },
      { type: 'p', text: 'A good first answer includes "result": "ok" (or catch_all for some company domains) and a resultcode. Only ok, invalid and disposable results use a credit [verify].' },
      { type: 'links', items: [
        { label: 'MillionVerifier API docs', url: 'https://developer.millionverifier.com' },
        { label: 'What each result means', url: 'https://help.millionverifier.com/email-verification/email-verification-results' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '"result": "error" with an API key message.', fix: 'The key goes in the api query parameter, not a header. Copy it again from the API page.' },
        { mistake: 'Lots of "unknown" results.', fix: 'The mail server did not answer in time. Raise timeout to 20 seconds in providers/millionverifier.ts; unknown results are not charged and Harvest shows them as unverified.' },
        { mistake: 'Credits run out unnoticed.', fix: 'Add a weekly check: hv-scheduler can call the credits endpoint on Mondays and email ADMIN_EMAIL under 2,000. Ask Claude Code to add it.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-be-mv-c1', label: 'Create a MillionVerifier account and buy the smallest pack' },
      { id: 'hrv-be-mv-c2', label: 'Add MILLIONVERIFIER_API_KEY to Supabase secrets' },
      { id: 'hrv-be-mv-c3', label: 'Verify your own email with the test call', trigger: 'copy:hrv-be-mv-curl' },
    ],
  },
  {
    id: 'hrv-be-anthropic',
    title: 'Set up the Claude API for scoring and openers',
    outcome: 'Harvest can filter headlines, score leads and write openers with claude-haiku-5-5 for a fraction of a cent each.',
    minutes: 15,
    xp: 25,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the small model', text: 'Harvest asks Claude two small questions many times: "does this headline look like a buyer?" and "how good is this person, and what is a good first line?" The small Haiku model is fast and cheap enough to do that for thousands of people a night: about 2 cents per 1,000 headlines and 3 hundredths of a cent per scored lead.' },
      { type: 'steps', items: [
        'Go to console.anthropic.com and sign up or log in.',
        'Settings > Billing: add a card and buy $10 of credit.',
        'Settings > Limits: set a monthly spend limit of $25 to start. Raise it as customers grow.',
        'Settings > API Keys > Create Key. Name it "harvest-prod". Copy it (starts with sk-ant-). You only see it once.',
        'Add it to Supabase secrets as ANTHROPIC_API_KEY and to .env.local as ANTHROPIC_API_KEY (the ICP draft route runs in Next.js).',
      ] },
      { type: 'keys', rows: [
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ANTHROPIC_API_KEY', where: 'Same key, for the onboarding ICP draft route', pasteInto: '.env.local', secret: true },
      ] },
      { type: 'code', id: 'hrv-be-anthropic-curl', filename: 'test-claude.sh', lang: 'bash', code: `curl -s https://api.anthropic.com/v1/messages \\
  -H "x-api-key: YOUR_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{"model":"claude-haiku-5-5","max_tokens":100,"messages":[{"role":"user","content":"Score 0 to 100 how likely this LinkedIn headline is a buyer of onboarding software for B2B SaaS: Head of Customer Success at a 120 person SaaS. Reply with only the number."}]}'` },
      { type: 'p', text: 'A good answer has "type": "message", a content block with a number such as 88, and a usage object with input_tokens and output_tokens. Those token counts are what hv-enrich and hv-score meter into usage_ledger.' },
      { type: 'links', items: [
        { label: 'Anthropic console', url: 'https://console.anthropic.com' },
        { label: 'Messages API', url: 'https://docs.claude.com/en/api/messages' },
        { label: 'Structured outputs', url: 'https://docs.claude.com/en/docs/build-with-claude/structured-outputs' },
        { label: 'Pricing', url: 'https://www.anthropic.com/pricing' },
      ] },
      { type: 'mistakes', items: [
        { mistake: '404 "model not found".', fix: 'Check the exact model id on the models page and paste it into _shared/claude.ts. Model ids are spelled with dashes: claude-haiku-5-5.' },
        { mistake: '400 "credit balance is too low".', fix: 'Buy credit in Settings > Billing. New accounts have no free credit for the API.' },
        { mistake: 'Scores are all 50.', fix: 'The ICP block is empty: the default ICP was never saved. Open Targeting, fill it in, save, and re-run hv-enrich.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-be-anthropic-c1', label: 'Buy $10 of credit and set a spend limit' },
      { id: 'hrv-be-anthropic-c2', label: 'Create the API key and add it to Supabase secrets and .env.local' },
      { id: 'hrv-be-anthropic-c3', label: 'Run the test call and see a number back', trigger: 'copy:hrv-be-anthropic-curl' },
    ],
  },
  {
    id: 'hrv-be-crm',
    title: 'Make free HubSpot and Pipedrive test accounts',
    outcome: 'You can test pushing leads to both CRMs the way your customers will, with their own tokens.',
    minutes: 30,
    xp: 30,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Customers bring their own keys', text: 'Harvest does not need its own HubSpot or Pipedrive account in production. Each customer pastes a token from their CRM, and Harvest stores it locked (encrypted). You only need test accounts to check the push works, and an encryption key so stored tokens are useless if someone copies the database.' },
      { type: 'steps', items: [
        'Make the encryption key: run `openssl rand -base64 32` and save it in Supabase secrets as INTEGRATIONS_ENCRYPTION_KEY. Never change it later without re-encrypting, or every saved token stops working.',
        'HubSpot: sign up for a free CRM account at hubspot.com. Then Settings (gear icon) > Integrations > Private apps > Create a private app [verify; HubSpot may call these legacy apps or service keys now]. Name it "Harvest test". Scopes: crm.objects.contacts.read, crm.objects.contacts.write and the notes write scope [verify]. Create, then copy the access token from the Auth tab (starts with pat-).',
        'Pipedrive: start a free trial at pipedrive.com. Then profile menu (top right) > Personal preferences > API [verify], copy your personal API token.',
        'Keep both tokens in a password manager. You paste them into Harvest > Settings > Integrations, not into any env file.',
      ] },
      { type: 'keys', rows: [
        { name: 'INTEGRATIONS_ENCRYPTION_KEY', where: 'Make one: openssl rand -base64 32', pasteInto: 'Supabase secrets', secret: true },
      ] },
      { type: 'code', id: 'hrv-be-crm-curl', filename: 'test-crm-tokens.sh', lang: 'bash', code: `# HubSpot: list one contact. A good answer has "results": [...]
curl -s "https://api.hubapi.com/crm/v3/objects/contacts?limit=1" -H "Authorization: Bearer pat-YOUR-TOKEN" | head -c 400; echo

# Pipedrive: list one person [verify the v2 path and header in the docs]
curl -s "https://api.pipedrive.com/api/v2/persons?limit=1" -H "x-api-token: YOUR_PIPEDRIVE_TOKEN" | head -c 400; echo` },
      { type: 'links', items: [
        { label: 'HubSpot private apps', url: 'https://developers.hubspot.com/docs/guides/apps/private-apps/overview' },
        { label: 'HubSpot contacts API', url: 'https://developers.hubspot.com/docs/api/crm/contacts' },
        { label: 'Pipedrive API reference', url: 'https://developers.pipedrive.com/docs/api/v1' },
      ] },
      { type: 'mistakes', items: [
        { mistake: 'HubSpot answers 403 "MISSING_SCOPES".', fix: 'The private app needs the contacts write and notes scopes. Edit the app, add the scopes, and copy the token again (it can change).' },
        { mistake: 'Pipedrive answers 401.', fix: 'Each Pipedrive company has its own token. Copy it again from Personal preferences > API while logged in to the right company.' },
        { mistake: 'Saved integrations stop working after a redeploy.', fix: 'INTEGRATIONS_ENCRYPTION_KEY changed. Put the old value back in Supabase secrets; old tokens can only be read with the key that locked them.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-be-crm-c1', label: 'Add INTEGRATIONS_ENCRYPTION_KEY to Supabase secrets' },
      { id: 'hrv-be-crm-c2', label: 'Create a HubSpot private app token' },
      { id: 'hrv-be-crm-c3', label: 'Copy a Pipedrive API token' },
      { id: 'hrv-be-crm-c4', label: 'Test both tokens with curl', trigger: 'copy:hrv-be-crm-curl' },
    ],
  },
  {
    id: 'hrv-be-schedules',
    title: 'Set the remaining secrets and switch on the nightly schedule',
    outcome: 'pg_cron pokes the scheduler, the five workers and the digest on time, so Harvest runs every night without you.',
    minutes: 25,
    xp: 35,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'An alarm clock inside the database', text: 'pg_cron is a clock in your Supabase database. Every minute it rings and pg_net calls your worker functions with a secret password (CRON_SECRET) so nobody else can trigger them. Each worker does up to 45 seconds of work and stops; the next ring carries on.' },
      { type: 'code', id: 'hrv-be-schedules-secrets', filename: 'set-secrets.sh', lang: 'bash', code: `# Run in your project folder (Supabase CLI logged in and linked).
CRON=$(openssl rand -hex 32); echo "CRON_SECRET is $CRON  (save it, you need it for Vault)"
UNSUB=$(openssl rand -hex 32); echo "UNSUBSCRIBE_SECRET is $UNSUB  (save it for Vercel)"
npx supabase secrets set CRON_SECRET=$CRON UNSUBSCRIBE_SECRET=$UNSUB
npx supabase secrets set APP_URL=https://yourdomain.com ADMIN_EMAIL=you@yourdomain.com
npx supabase secrets list   # shows names only` },
      { type: 'steps', items: [
        'Run the script above. Copy the two printed values into your password manager. The CRON_SECRET value also goes into Vault (step 3).',
        'Supabase > Database > Extensions: enable pg_cron and pg_net.',
        'Supabase > SQL Editor > New query: run select vault.create_secret(\'PASTE_YOUR_CRON_SECRET\', \'cron_secret\');',
        'Open the migration (section 24, SCHEDULES), copy the commented block, remove the leading "-- " from each line, replace YOUR_PROJECT_REF, and run it.',
        'Wait two minutes, then run the check below.',
        'Add APP_URL, ADMIN_EMAIL and UNSUBSCRIBE_SECRET to Vercel env as well (Settings > Environment Variables), then redeploy.',
      ] },
      { type: 'keys', rows: [
        { name: 'CRON_SECRET', where: 'Make one: openssl rand -hex 32 (same value in Vault as cron_secret)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'UNSUBSCRIBE_SECRET', where: 'Make one: openssl rand -hex 32', pasteInto: 'Supabase secrets', secret: true },
        { name: 'UNSUBSCRIBE_SECRET', where: 'Same value, for /api/unsubscribe', pasteInto: 'Vercel env', secret: true },
        { name: 'ADMIN_EMAIL', where: 'Your own email: receives vendor and anomaly alerts', pasteInto: 'Supabase secrets', secret: false },
      ] },
      { type: 'code', id: 'hrv-be-schedules-check', filename: 'check-cron.sql', lang: 'sql', code: `-- Seven jobs scheduled:
select jobname, schedule, active from cron.job order by jobname;

-- Recent runs: status should be "succeeded". pg_net answers are in net._http_response.
select jobid, status, start_time, return_message from cron.job_run_details order by start_time desc limit 10;
select status_code, left(content::text, 120) from net._http_response order by created desc limit 10;` },
      { type: 'mistakes', items: [
        { mistake: 'net._http_response shows 401 for every call.', fix: 'The Vault value and the CRON_SECRET edge secret differ. Delete the Vault secret (select vault.update_secret(...) or delete and re-create) and paste the exact same value as the edge secret.' },
        { mistake: 'cron.job is empty.', fix: 'The schedule block was still commented out. Each line must start with select, not "-- select".' },
        { mistake: 'Workers time out at 150 seconds and logs show half-finished jobs.', fix: 'A worker ignored the 45 second deadline. Ask Claude Code: "Every worker loop must check deadline().expired() before claiming the next job and before each vendor call."' },
      ] },
    ],
    checklist: [
      { id: 'hrv-be-schedules-c1', label: 'Set CRON_SECRET, UNSUBSCRIBE_SECRET, APP_URL and ADMIN_EMAIL', trigger: 'copy:hrv-be-schedules-secrets' },
      { id: 'hrv-be-schedules-c2', label: 'Enable pg_cron and pg_net and store the Vault secret' },
      { id: 'hrv-be-schedules-c3', label: 'Uncomment and run the schedule block' },
      { id: 'hrv-be-schedules-c4', label: 'See succeeded runs in the check SQL', trigger: 'copy:hrv-be-schedules-check' },
    ],
  },
  {
    id: 'hrv-be-e2e',
    title: 'Run one full harvest end to end',
    outcome: 'A real post goes in, and enriched, scored leads with openers come out in the app, in your CRM and in your inbox, with every cent metered.',
    minutes: 60,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Follow one post all the way through', text: 'This is the dress rehearsal. You add one real post, press Collect now, and watch each step hand over to the next: Apify, ingest, prefilter, enrich, score, digest, push. The SQL below lets you see every hand-over, so if something stalls you know exactly which step to fix.' },
      { type: 'steps', items: [
        'Pick a public LinkedIn post from someone in your niche with 50 to 300 reactions and some comments.',
        'In Sources, add it as Competitor with Collect now ticked.',
        'Within 5 minutes: Apify Console > Runs shows two runs (reactions and comments) that succeed.',
        'Within 10 minutes: Today shows Engagers collected, Filtered by ICP and then Enriched counts moving, and leads appear.',
        'Open the best lead, check the opener mentions the post topic, copy it.',
        'Push the lead to your HubSpot test account and check the contact and note exist.',
        'Set Settings > Workspace > Digest time to the current hour and wait for the next 15 minute tick (or run the hv-digest curl). Check the email in Gmail on your phone.',
        'Run the SQL below and compare the costs with the plan maths in the Costs tab.',
      ] },
      { type: 'code', id: 'hrv-be-e2e-sql', filename: 'trace-a-harvest.sql', lang: 'sql', code: `-- 1. The run and its counters
select run_date, is_manual, status, counters, started_at, ready_at, digest_sent_at
from public.daily_runs order by created_at desc limit 1;

-- 2. Apify runs for it
select kind, status, max_items, items_count, charged_usd from public.apify_runs order by started_at desc limit 4;

-- 3. Jobs by kind and status (nothing should stay queued or running for long)
select kind, status, count(*), max(attempts) as max_attempts, max(last_error) as an_error
from public.jobs group by 1, 2 order by 1, 2;

-- 4. The funnel
select enrich_status, email_status, count(*) from public.people group by 1, 2 order by 1, 2;
select tier, count(*), round(avg(score)) from public.leads group by 1;

-- 5. What it cost (micros = millionths of a dollar)
select kind, sum(quantity) as qty, round(sum(cost_micros) / 1e6, 4) as dollars
from public.usage_ledger group by 1 order by 1;` },
      { type: 'table', head: ['If this is stuck', 'Look here'], rows: [
        ['apify_runs stays running', 'hv-apify-webhook logs; the webhook secret header; hv-scheduler polls after 20 minutes'],
        ['ingest_run jobs queued', 'hv-ingest schedule and logs; dataset field mapping errors'],
        ['People stay new', 'prefilter jobs; ANTHROPIC_API_KEY; ICP saved'],
        ['People stay queued', 'enrich job created after prefilter; Prospeo credits; remaining_enrichments'],
        ['No leads', 'score jobs; opener guard rejecting everything (check logs)'],
        ['No digest', 'digest_hour, notification_prefs.digest_enabled, Resend logs, email_log'],
      ] },
      { type: 'mistakes', items: [
        { mistake: 'Engagers collected but zero enriched.', fix: 'Everyone was filtered. Open Targeting and look at "Recently filtered": if real buyers were cut, your threshold is too high or your titles are too narrow. Lower the threshold to 45 and collect again tomorrow.' },
        { mistake: 'The same people appear as two leads.', fix: 'person_key differs between the reactions and comments actor (one returns a public id, the other an internal urn). Ask Claude Code to log both URLs for one person and fix personKey() per @PRD.md 8.1.' },
        { mistake: 'Costs in usage_ledger are double what Apify charged.', fix: 'An ingest page was metered twice with different keys. The key must be eng:<runId>:<offset>, the same on every retry. Check hv-ingest re-enqueues with the next offset, not the same one.' },
      ] },
    ],
    checklist: [
      { id: 'hrv-be-e2e-c1', label: 'Add a real post with Collect now' },
      { id: 'hrv-be-e2e-c2', label: 'See leads with openers on Today' },
      { id: 'hrv-be-e2e-c3', label: 'Push one lead to HubSpot' },
      { id: 'hrv-be-e2e-c4', label: 'Receive the digest email on your phone' },
      { id: 'hrv-be-e2e-c5', label: 'Trace the run and its costs with the SQL', trigger: 'copy:hrv-be-e2e-sql' },
    ],
  },
]
