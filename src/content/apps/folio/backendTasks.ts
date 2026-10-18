// Folio backend tasks: one spoon-fed account setup per service, plans and cron, then an end-to-end test.
import type { Task } from '../../types'
import { code, eli5, keys, links, mistakes, p, prompt, steps, task, tip, warn } from './helpers'

export const backendTasks: Task[] = [
  task({
    id: 'fol-be-anthropic',
    title: 'Set up Claude (Anthropic API) with a spend cap',
    outcome: 'Folio can call claude-sonnet-5-5 and claude-haiku-5-5, and one bad day can never cost more than your cap.',
    minutes: 15,
    xp: 25,
    blocks: [
      eli5('Two Claudes', 'Claude Code (the thing building your app) runs on your Claude subscription. Folio itself, when it writes slides for customers, uses the Claude API: pay per word. That needs its own key and its own credit balance.'),
      steps(
        'Go to console.anthropic.com and sign up (or sign in). Create an organisation named "Folio".',
        'Left menu: Billing → Add credits → add $20. Turn on auto reload only after launch.',
        'Settings → Limits → set a monthly spend limit of $50 for now. Raise it as customers grow.',
        'Settings → API keys → Create key → name it `folio-dev` → copy it. It starts with `sk-ant-api03-` and is shown once.',
        'Make a second key `folio-prod` later for production and keep them apart.',
      ),
      keys([
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com → Settings → API keys → Create key', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('fol-be-anthropic-curl', 'First test call', 'bash', `
curl https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{"model":"claude-sonnet-5-5","max_tokens":300,"messages":[{"role":"user","content":"Write a 10 word LinkedIn carousel hook about onboarding."}]}'`),
      p('A good response is JSON with `"type": "message"`, a `content` array holding your hook, and a `usage` block with `input_tokens` and `output_tokens`. Those token counts are what Folio stores as cost on every carousel.'),
      mistakes([
        { mistake: '401 authentication_error.', fix: 'The key was copied with a space or a line break. Create a new key and paste it again with `npx supabase secrets set ANTHROPIC_API_KEY=...`.' },
        { mistake: '400 "credit balance is too low".', fix: 'Billing → Add credits. New organisations start at $0.' },
      ]),
      links([
        { label: 'Anthropic Console', url: 'https://console.anthropic.com' },
        { label: 'Messages API docs', url: 'https://docs.claude.com/en/api/messages' },
        { label: 'Pricing', url: 'https://www.anthropic.com/pricing' },
      ]),
    ],
    checklist: [
      'Add $20 of API credit and a $50 monthly limit',
      'Create the folio-dev key and set it in Supabase secrets',
      ['Run the first test call', 'copy:fol-be-anthropic-curl'],
    ],
  }),
  task({
    id: 'fol-be-firecrawl',
    title: 'Set up Firecrawl to read blog posts',
    outcome: 'Pasting a blog URL gives Folio clean article text without menus, cookie banners or ads.',
    minutes: 10,
    xp: 20,
    blocks: [
      eli5('Why not fetch the page ourselves?', 'Many blogs load their text with JavaScript or block servers. Firecrawl opens the page like a browser and hands back only the article, as tidy text. It also means our own servers never fetch a stranger\'s URL, which keeps hackers out of our network.'),
      steps(
        'Go to firecrawl.dev → Sign up with Google or email.',
        'Dashboard → API Keys → copy the default key. It starts with `fc-`.',
        'Free credits cover building (about 500 [verify]). Before launch move to Hobby (about $19/month for 5,000 pages [verify on firecrawl.dev/pricing]). One blog URL = 1 credit.',
      ),
      keys([
        { name: 'FIRECRAWL_API_KEY', where: 'firecrawl.dev → Dashboard → API Keys', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('fol-be-firecrawl-curl', 'First test call', 'bash', `
curl -X POST https://api.firecrawl.dev/v2/scrape \\
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://www.paulgraham.com/greatwork.html","formats":["markdown"],"onlyMainContent":true}'`),
      p('A good response has `"success": true` and `data.markdown` starting with the essay text, plus `data.metadata.title`. No navigation links at the top.'),
      mistakes([
        { mistake: '402 Payment required.', fix: 'Free credits are used up. Upgrade to Hobby in the Firecrawl dashboard.' },
        { mistake: 'The markdown is a cookie banner.', fix: 'Some sites gate content. Folio shows "Paste the text as an Idea instead" for these. That is expected.' },
      ]),
      links([
        { label: 'Firecrawl', url: 'https://www.firecrawl.dev' },
        { label: 'Scrape endpoint docs', url: 'https://docs.firecrawl.dev/features/scrape' },
      ]),
    ],
    checklist: [
      'Sign up and copy the fc- key',
      'Set FIRECRAWL_API_KEY in Supabase secrets',
      ['Run the scrape test', 'copy:fol-be-firecrawl-curl'],
    ],
  }),
  task({
    id: 'fol-be-supadata',
    title: 'Set up Supadata for YouTube transcripts',
    outcome: 'Pasting a YouTube link gives Folio the video transcript, even from a server that YouTube would block.',
    minutes: 10,
    xp: 20,
    blocks: [
      eli5('Why a transcript service?', 'YouTube only lets the video owner download captions through its official API, and it often blocks servers that try anyway. Supadata does the fetching for you and returns the words. One video with captions costs one credit.'),
      steps(
        'Go to supadata.ai → Get started → sign up.',
        'Dashboard → API key → copy it [verify the exact menu name].',
        'Free plan: 100 credits a month. Pro is about $17 for 3,000 credits [verify on supadata.ai/pricing]. Videos without captions cost 2 credits per minute, which is why Folio refuses those over 30 minutes.',
      ),
      keys([
        { name: 'SUPADATA_API_KEY', where: 'supadata.ai → Dashboard → API key', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('fol-be-supadata-curl', 'First test call', 'bash', `
curl "https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&text=true" \\
  -H "x-api-key: $SUPADATA_API_KEY"`),
      p('A good response is JSON with a `content` field holding the transcript as plain text and a `lang` field. Long videos may return a `jobId` instead: Folio polls it until done [verify field names on docs.supadata.ai].'),
      mistakes([
        { mistake: '401 or "invalid api key".', fix: 'The header must be `x-api-key`, not Authorization.' },
        { mistake: 'Shorts links fail.', fix: 'Send the full URL as the user pasted it. If it still fails, convert youtube.com/shorts/ID to youtube.com/watch?v=ID before calling.' },
      ]),
      links([
        { label: 'Supadata', url: 'https://supadata.ai' },
        { label: 'Supadata docs', url: 'https://docs.supadata.ai' },
      ]),
    ],
    checklist: [
      'Sign up and copy the Supadata key',
      'Set SUPADATA_API_KEY in Supabase secrets',
      ['Run the transcript test', 'copy:fol-be-supadata-curl'],
    ],
  }),
  task({
    id: 'fol-be-deepgram',
    title: 'Set up Deepgram for voice notes',
    outcome: 'A voice note recorded on a phone turns into text in a few seconds.',
    minutes: 10,
    xp: 20,
    blocks: [
      eli5('Speech to text', 'Deepgram listens to an audio file and writes down what was said, with punctuation. A 3 minute note costs about one cent. New accounts get $200 of free credit, which is thousands of notes.'),
      steps(
        'Go to console.deepgram.com → Sign up.',
        'Your first project is created for you. Left menu: API Keys → Create a New API Key → name `folio-dev`, permission Member, no expiry → Create. Copy the key now; it is shown once.',
        'Billing shows the $200 free credit (checked Oct 2026 [verify]). Pay as you go after that, about $0.0043 per minute for Nova-3 pre-recorded.',
      ),
      keys([
        { name: 'DEEPGRAM_API_KEY', where: 'console.deepgram.com → API Keys → Create a New API Key', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('fol-be-deepgram-curl', 'First test call', 'bash', `
curl -X POST "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true" \\
  -H "Authorization: Token $DEEPGRAM_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://dpgr.am/spacewalk.wav"}'`),
      p('A good response has `results.channels[0].alternatives[0].transcript` with the spoken words and `metadata.duration` in seconds. Folio bills voice minutes from that duration.'),
      mistakes([
        { mistake: '401 INVALID_AUTH.', fix: 'The header is `Authorization: Token <key>`, not Bearer.' },
        { mistake: 'Empty transcript from an iPhone note.', fix: 'The signed URL expired or the file is empty. Check the file in Storage > voice-notes plays, and that the signed URL is valid for 10 minutes.' },
      ]),
      links([
        { label: 'Deepgram console', url: 'https://console.deepgram.com' },
        { label: 'Pre-recorded audio docs', url: 'https://developers.deepgram.com/docs/pre-recorded-audio' },
        { label: 'Pricing', url: 'https://deepgram.com/pricing' },
      ]),
    ],
    checklist: [
      'Sign up and create the folio-dev key',
      'Set DEEPGRAM_API_KEY in Supabase secrets',
      ['Run the transcription test', 'copy:fol-be-deepgram-curl'],
    ],
  }),
  task({
    id: 'fol-be-zernio',
    title: 'Set up Zernio for LinkedIn and Instagram posting',
    outcome: 'Folio can connect customers\' LinkedIn and Instagram accounts and post PDF carousels without its own LinkedIn partner approval.',
    minutes: 25,
    xp: 40,
    blocks: [
      eli5('Why not post to LinkedIn directly?', 'LinkedIn lets any app post to your own profile, but company pages, analytics and long-lived logins need a partner programme with company checks and a video review. Zernio already has those approvals. Folio asks Zernio to post, and pays a few dollars per connected account.'),
      warn('Check the price before you set yours', 'Zernio charges per connected social account per month (first 2 free, then about $6 each up to 10, $3 from 11 to 100, $1 from 101 [verify on zernio.com/pricing]). Analytics is an add-on [verify]. Folio\'s plans cap accounts so the maths in the Costs tab holds.'),
      steps(
        'Go to zernio.com → Sign up.',
        'Dashboard → Settings → API Keys → Create API key → name `folio-dev` → copy it. It starts with `sk_` followed by 64 characters and is shown once.',
        'Turn on the Analytics add-on in Billing when you are ready to show analytics on Pro and Agency [verify the add-on name].',
        'Settings → Webhooks → Add webhook: URL `https://<your-project-ref>.supabase.co/functions/v1/fol-zernio-webhook`, events `post.published`, `post.failed`, `post.partial`, `post.cancelled`, `account.disconnected`. Copy the signing secret.',
        'After deploying fol-zernio-webhook, press "Send test" on the webhook and check it shows 200.',
      ),
      keys([
        { name: 'ZERNIO_API_KEY', where: 'zernio.com → Settings → API Keys → Create API key (sk_...)', pasteInto: 'Supabase secrets', secret: true },
        { name: 'ZERNIO_WEBHOOK_SECRET', where: 'zernio.com → Settings → Webhooks → your webhook → Secret', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('fol-be-zernio-curl', 'First test calls', 'bash', `
# 1. Who am I / which profiles exist
curl https://zernio.com/api/v1/profiles -H "Authorization: Bearer $ZERNIO_API_KEY"

# 2. Get a LinkedIn connect link for a profile id from step 1
curl "https://zernio.com/api/v1/connect/linkedin?profileId=PROFILE_ID&redirect_url=http://localhost:3000/app/brand" \\
  -H "Authorization: Bearer $ZERNIO_API_KEY"`),
      p('A good first response is JSON listing your profiles (Zernio creates a default one). The second returns an `authUrl`: open it, approve LinkedIn, and you land back on the redirect URL with the account connected. `GET /v1/accounts` now lists it.'),
      tip('Test with a dry run', 'Zernio\'s create post call accepts `dryRun: true`. Ask Claude Code to add a "Validate" button in development that sends your PDF post with dryRun so you can test media and captions without posting.'),
      mistakes([
        { mistake: '403 insufficient_permissions.', fix: 'The API key has a resource group turned off. In Zernio → API Keys, edit the key and allow publishing, accounts, analytics and webhooks.' },
        { mistake: 'LinkedIn post fails: document title required.', fix: 'Send `platformSpecificData.documentTitle` on LinkedIn document posts.' },
        { mistake: 'Webhook test shows 401.', fix: 'ZERNIO_WEBHOOK_SECRET in Supabase does not match the webhook secret, or the function parsed JSON before checking the signature. Check the raw body is used.' },
      ]),
      links([
        { label: 'Zernio', url: 'https://zernio.com' },
        { label: 'Zernio API docs', url: 'https://docs.zernio.com' },
        { label: 'Zernio pricing', url: 'https://zernio.com/pricing' },
        { label: 'LinkedIn Community Management API (for later)', url: 'https://developer.linkedin.com/product-catalog/marketing/community-management-api' },
      ]),
    ],
    checklist: [
      'Sign up for Zernio and create the folio-dev key',
      'Add the webhook and copy its secret',
      'Set ZERNIO_API_KEY and ZERNIO_WEBHOOK_SECRET in Supabase secrets',
      ['Run the profile and connect link test', 'copy:fol-be-zernio-curl'],
    ],
  }),
  task({
    id: 'fol-be-plans-cron',
    title: 'Create the three plans and turn on the timers',
    outcome: 'Stripe knows Creator, Pro and Agency, the database maps each price to its limits, and the sweeper and analytics jobs run on schedule.',
    minutes: 30,
    xp: 40,
    blocks: [
      eli5('Prices in two places', 'Stripe holds the prices people pay. The database holds what each plan is allowed to do. The plan_prices table is the bridge: "this Stripe price means the Pro limits". Change a price in Stripe and you add one row here.'),
      steps(
        'Stripe Dashboard (test mode) → Product catalogue → Add product "Folio Creator" with two prices: $39 monthly and $390 yearly. Repeat for "Folio Pro" ($79 / $790) and "Folio Agency" ($249 / $2,490).',
        'Copy the six price ids (they start with `price_`) into `.env.local` and Vercel env as STRIPE_PRICE_CREATOR_MONTHLY, STRIPE_PRICE_CREATOR_YEARLY, STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY, STRIPE_PRICE_AGENCY_MONTHLY, STRIPE_PRICE_AGENCY_YEARLY.',
        'Run the SQL below in Supabase SQL Editor with your six real ids.',
        'Supabase → Project Settings → Vault → Add new secret named `cron_secret` with the same value as your CRON_SECRET.',
        'Paste the cron prompt into Claude Code.',
      ),
      code('fol-be-plans-sql', 'Map Stripe prices to plans', 'sql', `
insert into public.plan_prices (stripe_price_id, plan_id, interval) values
  ('price_CREATOR_MONTHLY', 'creator', 'month'),
  ('price_CREATOR_YEARLY',  'creator', 'year'),
  ('price_PRO_MONTHLY',     'pro',     'month'),
  ('price_PRO_YEARLY',      'pro',     'year'),
  ('price_AGENCY_MONTHLY',  'agency',  'month'),
  ('price_AGENCY_YEARLY',   'agency',  'year');
select * from public.plan_prices;`),
      keys([
        { name: 'CRON_SECRET', where: 'Make one up: run `openssl rand -hex 24`', pasteInto: 'Supabase secrets (and Vault as cron_secret)', secret: true },
        { name: 'APP_URL', where: 'Your live URL, e.g. https://getfolio.app (http://localhost:3000 while building)', pasteInto: 'Supabase secrets', secret: false },
      ]),
      prompt('fol-be-cron-prompt', 'Paste into Claude Code', `
Use the Supabase MCP. Read @PRD.md sections 12.9 and 12.10.
1. Check pg_cron and pg_net are enabled (the migration creates them).
2. Schedule fol-sweeper every 2 minutes and fol-analytics-sync at minute 17 every 6 hours with cron.schedule and net.http_post, reading the x-cron-secret header value from vault.decrypted_secrets where name = 'cron_secret'. Never put the secret in the SQL text.
3. Show me select jobname, schedule, active from cron.job; and the last 5 rows of cron.job_run_details.
4. Update the checkout route so the pricing page's plan and interval pick the right STRIPE_PRICE_* env var, and the webhook keeps writing price_id on public.subscriptions (workspace_plan() reads it).`),
      mistakes([
        { mistake: 'A paying Pro customer still gets Creator limits.', fix: 'Their price id is missing from plan_prices (workspace_plan falls back to creator). Add the row.' },
        { mistake: 'cron.job_run_details shows "permission denied for schema vault".', fix: 'Run the schedule as the postgres role from the SQL editor or MCP, not from a client.' },
      ]),
    ],
    checklist: [
      'Create the three products with monthly and yearly prices in Stripe',
      ['Map the six price ids with the SQL', 'copy:fol-be-plans-sql'],
      'Add cron_secret to Vault',
      ['Run the cron prompt and see both jobs active', 'copy:fol-be-cron-prompt'],
    ],
  }),
  task({
    id: 'fol-be-e2e',
    title: 'Run the full Folio test from link to published post',
    outcome: 'One run proves every part works together: source, carousel, edit, export, schedule, publish, analytics and limits.',
    minutes: 45,
    xp: 60,
    blocks: [
      p('Do this on the deployed Vercel URL with Stripe in test mode and your own LinkedIn. Tick each line only when you have seen it with your own eyes.'),
      steps(
        'Sign up with a new email. Finish onboarding with a brand kit and start the trial with card 4242 4242 4242 4242.',
        'Paste a blog URL. The carousel is ready in under 60 seconds with a hook first and a CTA last.',
        'Rewrite slide 2 with Punchier, undo it, then drag slide 4 to position 2.',
        'Export. Open the PDF: fonts, colours, headshot and handle are right on every page.',
        'Connect LinkedIn and schedule the PDF for 10 minutes from now. It publishes and the chip turns green.',
        'Wait for the next analytics sync (or call fol-analytics-sync with curl). Numbers appear on the post.',
        'Use up the trial limit with the SQL from PRD 21 test 9. The Create button is disabled and shows Upgrade.',
      ),
      prompt('fol-be-e2e-prompt', 'Paste into Claude Code', `
Write scripts/e2e-check.ts (run with npx tsx) that, using the Supabase secret key and a test workspace id I give you, prints PASS or FAIL for:
1. The newest carousel has 8 to 11 slides, first hook, last cta.
2. Its latest render is done, has slide_paths equal to the slide count and a pdf_path, and both files exist in Storage.
3. usage_ledger has exactly one 'carousel' row and one 'render' row for that carousel, and cost_micros > 0 on the carousel row.
4. The newest scheduled_posts row is 'published' with a platform_post_url.
5. provider_events has the Zernio event ids for that post and no duplicates.
6. No jobs are stuck in 'running' for more than 5 minutes.
7. email_log has one post_published row for that post.
Then run it and show me the output.`),
      code('fol-be-e2e-sql', 'Spot check in SQL Editor', 'sql', `
select c.title, c.status, count(s.*) as slides, r.status as render, sp.status as post, sp.platform_post_url
from public.carousels c
join public.slides s on s.carousel_id = c.id
left join public.renders r on r.id = c.latest_render_id
left join public.scheduled_posts sp on sp.carousel_id = c.id
group by c.id, r.status, sp.status, sp.platform_post_url
order by c.created_at desc limit 3;`),
    ],
    checklist: [
      'Go from signup to a published LinkedIn PDF on the live URL',
      ['Run the end-to-end script and get all PASS', 'copy:fol-be-e2e-prompt'],
      ['Run the spot check SQL', 'copy:fol-be-e2e-sql'],
      'Hit the trial limit and see the Upgrade state',
    ],
  }),
]
