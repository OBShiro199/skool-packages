// Ethereel app-specific backend tasks: one account-setup task per service, the pipeline build, and the end-to-end test.
import type { Task } from '../../types'
import { p, eli5, tip, warn, steps, prompt, code, keys, table, links, mistakes, ascii, task } from './helpers'
import { taskText as T } from './taskText'

const setupTasks: Task[] = [
  task({
    id: 'eth-be-trigger',
    title: 'Set up Trigger.dev v4 (the job queue that runs ffmpeg)',
    outcome: 'A Trigger.dev project with ffmpeg and Python baked in, keys in the right places, and a hello task running in Dev and Prod.',
    minutes: 45,
    xp: 60,
    blocks: [
      eli5('Why not run the edit inside the website?', 'Editing a reel takes minutes and needs ffmpeg, a video tool that does not exist inside a website or a Supabase edge function. Trigger.dev rents you small computers that wake up when a job arrives, run it, retry it if it breaks, and go back to sleep. You only pay for the seconds they run.'),
      table(['Plan (checked 17 Oct 2026)', 'Price', 'Included usage', 'Use it when'], [
        ['Free', '$0', '$5 of compute a month', 'Building and testing'],
        ['Hobby', '$10/month', '$10 of compute', 'First paying creators'],
        ['Pro', '$50/month', '$50 of compute, more concurrency', 'From about 50 creators'],
      ]),
      table(['Machine', 'vCPU / RAM', '$ per second', 'Ethereel uses it for'], [
        ['small-1x', '0.5 / 0.5 GB', '$0.0000338', 'orchestrator, transcribe, plan, caption, render polling'],
        ['small-2x', '1 / 1 GB', '$0.0000675 [verify]', 'cut list'],
        ['medium-1x', '1 / 2 GB', '$0.0000850', 'face detection (Python)'],
        ['medium-2x', '2 / 4 GB', '$0.0001700 [verify]', 'prepare, mix and export (ffmpeg)'],
        ['large-2x', '8 / 16 GB', '$0.0006800 [verify]', 'fallback render without AWS'],
      ]),
      p('Every run also costs $0.000025 to start. A full Ethereel video uses about $0.04 to $0.06 of compute.'),
      steps(
        'Go to cloud.trigger.dev and click Sign up. Choose "Continue with GitHub" (you made a GitHub account in Setup).',
        'Create an organization: name it `Ethereel`. Create a project: name it `ethereel`.',
        'In the left sidebar open **Project settings**. Copy the project ref (starts with `proj_`). You paste it into trigger.config.ts.',
        'In the left sidebar open **API keys**. You see one secret key per environment. Copy the **Development** key (starts with `tr_dev_`) into `.env.local` as `TRIGGER_SECRET_KEY`. The **Production** key (starts with `tr_prod_`) goes into Vercel env and Supabase secrets later.',
        'In the left sidebar open **Environment Variables** > **New environment variable**. Add every name in the keys table below whose "paste into" says Trigger.dev env. Tick both Development and Production (use your production values for Production).',
        'Make the callback secret: run `openssl rand -hex 32` in a terminal. Save it as `TRIGGER_CALLBACK_SECRET` in Trigger.dev env AND Supabase secrets (same value in both).',
      ),
      keys([
        { name: 'TRIGGER_SECRET_KEY', where: 'Trigger.dev > API keys > Development (tr_dev_...) for local, Production (tr_prod_...) for live', pasteInto: '.env.local, Vercel env and Supabase secrets', secret: true },
        { name: 'TRIGGER_CALLBACK_SECRET', where: 'Make one: openssl rand -hex 32', pasteInto: 'Trigger.dev env and Supabase secrets', secret: true },
        { name: 'TRIGGER_CALLBACK_URL', where: 'https://<project-ref>.supabase.co/functions/v1/trigger-callback', pasteInto: 'Trigger.dev env', secret: false },
        { name: 'SUPABASE_URL', where: 'Supabase > Project Settings > API > Project URL', pasteInto: 'Trigger.dev env', secret: false },
        { name: 'SUPABASE_SECRET_KEY', where: 'Supabase > Project Settings > API Keys > Secret keys (sb_secret_...)', pasteInto: 'Trigger.dev env', secret: true },
      ]),
      code('eth-be-trigger-config', 'trigger.config.ts', 'ts', T['be-trigger-config']),
      prompt('eth-be-trigger-prompt', 'Paste into Claude Code', T['be-trigger-init']),
      p('**Good result:** the hello run in the Trigger.dev dashboard shows status Completed, and its output contains `ffmpeg version 7` and `{"ok": true}`.'),
      mistakes([
        { mistake: 'Deploy fails with "ffmpeg: not found" at run time.', fix: 'The extension is missing from build.extensions, or you imported it from the wrong place. It is `import { ffmpeg } from "@trigger.dev/build/extensions/core"` and @trigger.dev/build must be in devDependencies. Deploy again.' },
        { mistake: 'python.runScript says the script does not exist.', fix: 'Add the file pattern to pythonExtension({ scripts: ["./python/**/*.py"] }) and use the same relative path in runScript. In dev, point devPythonBinaryPath at .venv/bin/python.' },
        { mistake: 'Runs work in Dev but fail in Prod with "SUPABASE_URL is undefined".', fix: 'Environment variables are set per environment. Open Environment Variables, pick Production in the filter and add the missing ones, then redeploy.' },
      ]),
      links([
        { label: 'Trigger.dev cloud', url: 'https://cloud.trigger.dev' },
        { label: 'Pricing', url: 'https://trigger.dev/pricing' },
        { label: 'ffmpeg build extension', url: 'https://trigger.dev/docs/config/extensions/ffmpeg' },
        { label: 'Python build extension', url: 'https://trigger.dev/docs/config/extensions/pythonExtension' },
        { label: 'Machines', url: 'https://trigger.dev/docs/machines' },
        { label: 'Queues and concurrency', url: 'https://trigger.dev/docs/queue-concurrency' },
      ]),
    ],
    checklist: [
      'Create the Ethereel organization and ethereel project',
      'Copy the tr_dev_ key into .env.local',
      'Add the Trigger.dev environment variables for Dev and Prod',
      ['Copy trigger.config.ts', 'copy:eth-be-trigger-config'],
      ['Run the setup prompt and see the hello run complete', 'copy:eth-be-trigger-prompt'],
    ],
  }),
  task({
    id: 'eth-be-remotion',
    title: 'Set up AWS and Remotion Lambda (the renderer)',
    outcome: 'Remotion renders a 1080x1920 reel in your own AWS account in about a minute, with a user that can only do Remotion things.',
    minutes: 60,
    xp: 70,
    blocks: [
      eli5('Why render on AWS Lambda?', 'Remotion turns React code into video by taking a screenshot of every frame. One computer doing 1,410 screenshots for a 47 second reel is slow. Lambda splits the reel into chunks and renders them on many small computers at once, then stitches the result. It finishes in about a minute and you pay only while it runs.'),
      ascii(`
render-video task (Trigger.dev)
   │ renderMediaOnLambda(props = edit.json)
   ▼
remotion-render-... Lambda ──► 12 Lambdas, 120 frames each ──► S3 bucket (remotionlambda-...)
   │ getRenderProgress every 4 s                                   │
   ▼                                                               ▼
renders row: progress, cost                          download → Supabase renders/<uid>/<vid>/video-v1.mp4`, 'One render, many small computers.'),
      table(['Cost (checked Oct 2026)', 'Amount', 'Note'], [
        ['Lambda compute per reel', 'about $0.03 to $0.06', 'Remotion lists about $0.021 for a 1 minute 720p video with a video inside it; 1080x1920 with OffthreadVideo costs more. Measure your own with costs.accruedSoFar.'],
        ['S3 storage and requests', 'under $0.01', 'Delete outputs after you copy them to Supabase (lifecycle rule, 1 day).'],
        ['Remotion licence', 'Free for companies of up to 3 people', 'Larger companies need the Company licence: Automators $0.01 per render with a $100/month minimum [verify on remotion.pro].'],
      ]),
      warn('Use a separate AWS user, never your root login', 'Your root login can spend anything on anything. The remotion-user below can only run Remotion. If its key ever leaks, delete the key and make a new one.'),
      steps(
        'Go to aws.amazon.com and click Create an AWS account. Enter an email, account name `ethereel`, a card, and verify your phone. Choose the free Basic support plan.',
        'Sign in to the AWS console. Top right, pick the region **US East (N. Virginia) us-east-1** and keep using it.',
        'In your project folder run the commands in block 1 and 2 below. Keep the two JSON outputs open.',
        'Console search bar: **IAM** > **Roles** > **Create role**. Trusted entity: **AWS service**, use case **Lambda** > Next > skip permissions > Next. Role name exactly `remotion-lambda-role` > Create role.',
        'Open the new role > **Add permissions** > **Create inline policy** > **JSON** tab. Delete what is there, paste the output of `npx remotion lambda policies role` > Next > name `remotion-lambda-policy` > Create policy.',
        'IAM > **Users** > **Create user**. Name `remotion-user`. Do not tick console access. Next > Next (no permissions yet) > Create user.',
        'Open remotion-user > **Permissions** tab > **Add permissions** > **Create inline policy** > JSON > paste the output of `npx remotion lambda policies user` > name `remotion-user-policy` > Create policy.',
        'Still on remotion-user: **Security credentials** tab > **Create access key** > use case "Application running outside AWS" > Next > Create. Copy the Access key ID (starts with `AKIA`) and the Secret access key now: AWS shows the secret once.',
        'Add both to `.env` in the project root as `REMOTION_AWS_ACCESS_KEY_ID` and `REMOTION_AWS_SECRET_ACCESS_KEY` (Remotion\'s CLI reads these names), then run the validate command in block 3. Every line should say ✓.',
        'Run block 4 (deploy the function). Copy the function name it prints (like `remotion-render-4-0-xxx-mem3009mb-disk4096mb-240sec`).',
        'Build the Remotion project first (task "Build the Remotion composition"), then run block 5 to upload it as a site. Copy the Serve URL it prints.',
        'Service Quotas: console search **Service Quotas** > AWS services > **AWS Lambda** > **Concurrent executions**. New accounts are often limited to 10. Click **Request increase** and ask for 1,000 so renders are not throttled.',
      ),
      code('eth-be-remotion-cmds', 'Terminal, in your project folder', 'bash', T['be-remotion-setup']),
      keys([
        { name: 'REMOTION_AWS_ACCESS_KEY_ID', where: 'IAM > Users > remotion-user > Security credentials > Access keys (AKIA...)', pasteInto: 'Trigger.dev env', secret: true },
        { name: 'REMOTION_AWS_SECRET_ACCESS_KEY', where: 'Shown once when you create the access key', pasteInto: 'Trigger.dev env', secret: true },
        { name: 'REMOTION_AWS_REGION', where: 'The region you picked, e.g. us-east-1', pasteInto: 'Trigger.dev env', secret: false },
        { name: 'REMOTION_FUNCTION_NAME', where: 'Printed by npx remotion lambda functions deploy', pasteInto: 'Trigger.dev env', secret: false },
        { name: 'REMOTION_SERVE_URL', where: 'Printed by npx remotion lambda sites create', pasteInto: 'Trigger.dev env', secret: false },
      ]),
      tip('Redeploy the site when the composition changes', 'Each time you change files in ./remotion, run the sites create command again with the same --site-name. The Serve URL stays the same. Renders of older edit.json versions still look the same because the composition reads everything from edit.json.'),
      mistakes([
        { mistake: 'Render fails with "Rate Exceeded" or "TooManyRequestsException".', fix: 'Your Lambda concurrency quota is too low (new accounts get 10). Request 1,000 in Service Quotas, and until it is approved set framesPerLambda to 300 so each render uses fewer Lambdas.' },
        { mistake: 'policies validate shows ✗ next to some permissions.', fix: 'The inline policy on remotion-user is missing or was pasted into the role instead. Open the user > Permissions, delete the policy, and paste the output of `npx remotion lambda policies user` again.' },
        { mistake: 'Render fails with "The role defined for the function cannot be assumed by Lambda".', fix: 'The role name must be exactly `remotion-lambda-role` and its trusted entity must be Lambda. Recreate it with the steps above.' },
      ]),
      links([
        { label: 'AWS sign up', url: 'https://aws.amazon.com' },
        { label: 'Remotion Lambda setup', url: 'https://www.remotion.dev/docs/lambda/setup' },
        { label: 'Permissions', url: 'https://www.remotion.dev/docs/lambda/permissions' },
        { label: 'Cost example', url: 'https://www.remotion.dev/docs/lambda/cost-example' },
        { label: 'renderMediaOnLambda', url: 'https://www.remotion.dev/docs/lambda/rendermediaonlambda' },
        { label: 'Remotion licence', url: 'https://www.remotion.dev/docs/license' },
      ]),
    ],
    checklist: [
      'Create the AWS account and pick us-east-1',
      'Create remotion-lambda-role with the role policy',
      'Create remotion-user with the user policy and an access key',
      ['Run the Remotion commands and see validate pass', 'copy:eth-be-remotion-cmds'],
      'Request a Lambda concurrency increase to 1,000',
    ],
  }),
  task({
    id: 'eth-be-groq',
    title: 'Set up Groq Whisper for word-level transcripts',
    outcome: 'Ethereel can turn a clip\'s audio into words with start and end times for $0.04 an hour of audio.',
    minutes: 20,
    xp: 35,
    blocks: [
      eli5('Why every word needs a time', 'To cut a pause you need to know exactly when the last word stopped and the next one began. Whisper hands back each word with a start and end time in seconds. Ethereel then snaps those times to the real sound, so cuts land on breaths, not mid-syllable.'),
      table(['', 'Groq whisper-large-v3-turbo', 'Deepgram nova-3 (batch)'], [
        ['Price (checked Oct 2026)', '$0.04 per audio hour, 10 s minimum per request', '$0.0043 per minute (about $0.26 an hour) [verify]'],
        ['60 s clip', 'about $0.0007', 'about $0.0043'],
        ['Word timestamps', 'Yes: verbose_json + timestamp_granularities[]=word', 'Yes, by default'],
        ['Custom vocabulary', 'prompt (about 224 tokens)', 'keyterm prompting (nova-3)'],
        ['Decision', 'Use this', 'Fallback only (optional key)'],
      ]),
      steps(
        'Go to console.groq.com and sign up with Google or email.',
        'Left sidebar > **API Keys** > **Create API Key**. Name it `ethereel-dev` > Submit. Copy the key (starts with `gsk_`). It is shown once.',
        'Add it to Trigger.dev > Environment Variables as `GROQ_API_KEY` (Development and Production).',
        'Optional: **Settings** > **Billing** to move from the free tier to the paid Developer tier for higher rate limits before launch.',
        'Run the test below with the key exported in your terminal: `export GROQ_API_KEY=gsk_...`.',
      ),
      keys([
        { name: 'GROQ_API_KEY', where: 'console.groq.com > API Keys > Create API Key (gsk_...)', pasteInto: 'Trigger.dev env', secret: true },
        { name: 'DEEPGRAM_API_KEY', where: 'Optional fallback: console.deepgram.com > API Keys > Create a New API Key', pasteInto: 'Trigger.dev env', secret: true },
      ]),
      code('eth-be-groq-curl', 'Terminal', 'bash', T['be-groq-curl']),
      p('**Good result:** JSON with `"text"`, a `"words"` array where each item looks like `{"word":"Ethereel","start":0.42,"end":0.88}`, and `"duration": 10`. If the words array is missing, the `timestamp_granularities[]=word` line was dropped.'),
      mistakes([
        { mistake: '413 "Request Entity Too Large".', fix: 'Send 16 kHz mono FLAC, not the original video. A 3 minute clip is about 4 MB as FLAC. The free tier caps files at 25 MB.' },
        { mistake: 'Product names come back wrong every time.', fix: 'Add them to Settings > Captions > Vocabulary. They go into the prompt. For words Whisper still mishears, add a spelling fix ("super base" → "Supabase").' },
        { mistake: '429 rate limit during a batch of 10 clips.', fix: 'The free tier has low per-minute limits. Move to the paid tier in Settings > Billing, and keep retries with backoff in the transcribe task.' },
      ]),
      links([
        { label: 'Groq console', url: 'https://console.groq.com' },
        { label: 'Speech to text docs', url: 'https://console.groq.com/docs/speech-to-text' },
        { label: 'Groq pricing', url: 'https://groq.com/pricing' },
        { label: 'Deepgram pricing (to compare)', url: 'https://deepgram.com/pricing' },
      ]),
    ],
    checklist: [
      'Create a Groq API key named ethereel-dev',
      'Add GROQ_API_KEY to Trigger.dev env',
      ['Run the test curl and see a words array', 'copy:eth-be-groq-curl'],
    ],
  }),
  task({
    id: 'eth-be-anthropic',
    title: 'Set up the Claude API with a spend limit',
    outcome: 'Ethereel can call claude-opus-5-5 with structured JSON output, and one bug can never spend more than your monthly cap.',
    minutes: 20,
    xp: 35,
    blocks: [
      eli5('What Claude does here (and what it never does)', 'Claude reads the transcript and decides what is worth drawing, what the subtitle says, and what the post caption says. It never decides where things go on screen. Code does that, so a reel can never have a diagram covering the subtitles.'),
      table(['Call', 'Effort', 'Typical tokens in / out', 'Cost per call'], [
        ['Plan cutaways', 'medium', '6,000 / 3,000', 'about $0.084'],
        ['Opening subtitle', 'low', '2,000 / 300', 'about $0.014'],
        ['Post caption', 'low', '2,500 / 500', 'about $0.020'],
        ['Revision plan', 'medium', '5,000 / 2,000', 'about $0.060'],
      ]),
      p('Prices: $4 per million input tokens, $20 per million output tokens, $0.20 per million cached input tokens (claude-opus-5-5, checked Oct 2026). A typical video with one revision and one rewrite costs about $0.17 in Claude calls.'),
      steps(
        'Go to console.anthropic.com and sign up. This is separate from a Claude.ai chat subscription.',
        '**Settings** > **Billing**: add a card and buy $10 of credit (about 60 test videos).',
        '**Settings** > **Limits**: set a monthly spend limit. Start at $50 and raise it as creators join.',
        '**Settings** > **API Keys** > **Create Key**. Name it `ethereel-dev`. Copy it (starts with `sk-ant-`); it is shown once.',
        'Paste it into Trigger.dev env (for the pipeline) and Supabase secrets (for rewrite-caption) as `ANTHROPIC_API_KEY`.',
      ),
      keys([
        { name: 'ANTHROPIC_API_KEY', where: 'console.anthropic.com > Settings > API Keys > Create Key (sk-ant-...)', pasteInto: 'Trigger.dev env and Supabase secrets', secret: true },
      ]),
      code('eth-be-anthropic-curl', 'Terminal (export ANTHROPIC_API_KEY first)', 'bash', T['be-anthropic-curl']),
      p('**Good result:** a JSON message whose content has a text block like `{"subtitle":"editing in minutes"}` and `"stop_reason": "end_turn"`. The `usage` object shows input and output tokens.'),
      mistakes([
        { mistake: '400 "thinking type disabled is not supported".', fix: 'claude-opus-5-5 always thinks. Remove the thinking parameter completely and control depth with output_config.effort.' },
        { mistake: 'The JSON fails zod validation now and then.', fix: 'Make sure output_config.format has type json_schema with additionalProperties false and every property listed in required. Then validate with zod and retry once.' },
        { mistake: '429 rate limit when 10 clips plan at once.', fix: 'The per-creator Trigger.dev queue already spreads calls. If it still happens, add retries with backoff honouring the retry-after header, and check your usage tier in Settings > Limits.' },
      ]),
      links([
        { label: 'Anthropic console', url: 'https://console.anthropic.com' },
        { label: 'Structured outputs', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs' },
        { label: 'Pricing', url: 'https://www.anthropic.com/pricing' },
      ]),
    ],
    checklist: [
      'Add credit and a monthly spend limit',
      'Create a key named ethereel-dev',
      'Add ANTHROPIC_API_KEY to Trigger.dev env and Supabase secrets',
      ['Run the test curl and see a subtitle', 'copy:eth-be-anthropic-curl'],
    ],
  }),
  task({
    id: 'eth-be-zernio',
    title: 'Set up Zernio for TikTok and Instagram posting',
    outcome: 'Ethereel can connect a creator\'s TikTok and Instagram and schedule a reel to both with one API.',
    minutes: 30,
    xp: 45,
    blocks: [
      eli5('Why a posting service in the middle', 'TikTok and Instagram each make apps go through a long review before they can post for other people. Zernio has already done that. Each creator connects their accounts to Zernio through your app, and you send one request with the video, the caption and the time.'),
      table(['Zernio pricing (checked Oct 2026)', 'Per connected account per month'], [
        ['Accounts 1 to 2', 'Free'],
        ['Accounts 3 to 10', '$6'],
        ['Accounts 11 to 100', '$3'],
        ['Accounts 101 to 2,000', '$1'],
      ]),
      p('A creator with TikTok + Instagram is 2 accounts: about $6 a month at 10 to 50 creators, about $2 a month past 100. Fallback: Ayrshare (Premium $149/month, Business $599/month, checked Oct 2026 [verify]) with the same shape behind lib/posting/provider.ts.'),
      warn('Zernio keeps uploads for 7 days', 'Media you upload must be used by a post that publishes within 7 days, or it is deleted. That is why zernio-sync hands a post over only when its slot is 6 days away or closer.'),
      steps(
        'Go to zernio.com and click Sign up. Use your business email.',
        'In the dashboard open **Settings** > **API Keys** > **Create API key**. Name it `ethereel-dev` and copy it [verify the exact menu names and key prefix on first login].',
        'Save it to Supabase secrets as `ZERNIO_API_KEY` (zernio-sync, pass-video and connect-social use it).',
        'Run the four calls below one by one. In step 3, open the returned URL and connect a test TikTok account you own.',
        'In docs.zernio.com read **Platform settings** and note the exact TikTok and Instagram field names for privacy level, comments, duet, stitch and cover frame. Tell Claude Code if they differ from @PRD.md section 13.3.',
      ),
      keys([
        { name: 'ZERNIO_API_KEY', where: 'zernio.com dashboard > Settings > API Keys > Create API key', pasteInto: 'Supabase secrets', secret: true },
      ]),
      code('eth-be-zernio-curl', 'Terminal (export ZERNIO_API_KEY first)', 'bash', T['be-zernio-curl']),
      p('**Good result:** call 1 returns 200 with a profiles list, call 2 returns a profile with an `_id`, call 3 returns an auth URL, and call 4 lists your TikTok account with its id after you connect it.'),
      mistakes([
        { mistake: '401 on every call.', fix: 'The header must be `Authorization: Bearer <key>` with no quotes around the key. Copy the key again.' },
        { mistake: 'The post is accepted but fails on TikTok with a privacy error.', fix: 'TikTok only accepts the privacy levels its creator info returns for that account (an unaudited app may be limited to private posts). Read the allowed values into social_accounts.creator_info and only show those in the Pass dialog.' },
        { mistake: 'A scheduled post fails a week later with "media not found".', fix: 'It was handed over more than 7 days before its slot. Check due_for_handover only returns slots within 6 days, and that a post moved further out is pulled back from Zernio (zernio-sync step 2).' },
      ]),
      links([
        { label: 'Zernio', url: 'https://zernio.com' },
        { label: 'Zernio docs', url: 'https://docs.zernio.com' },
        { label: 'Platform settings', url: 'https://docs.zernio.com/guides/platform-settings' },
        { label: 'Media uploads', url: 'https://docs.zernio.com/guides/media-uploads' },
        { label: 'Zernio pricing', url: 'https://zernio.com/pricing' },
        { label: 'Ayrshare (fallback)', url: 'https://www.ayrshare.com/pricing' },
      ]),
    ],
    checklist: [
      'Create a Zernio account and API key',
      'Add ZERNIO_API_KEY to Supabase secrets',
      ['Run the four test calls', 'copy:eth-be-zernio-curl'],
      'Connect one test TikTok account through the connect link',
    ],
  }),
  task({
    id: 'eth-be-storage',
    title: 'Prepare Supabase Storage, Vault secrets and the music library',
    outcome: 'Big uploads are allowed, the 10-minute posting sync can call its edge function, and every creator has music to pick from.',
    minutes: 25,
    xp: 35,
    blocks: [
      eli5('What Vault is', 'The posting sync runs inside the database every 10 minutes and needs to call your edge function with a password. Vault is a locked drawer inside Supabase for that password, so it never sits in plain text in your SQL.'),
      steps(
        'Upgrade to Supabase Pro before real creators upload (Free caps each file at 50 MB and pauses after a week of no use). Organization > Billing > Change plan > Pro.',
        'Storage > **Settings** > Upload file size limit: set **2 GB** > Save. The raw-videos bucket already has its own 2 GB limit from the migration.',
        'Make a cron secret: `openssl rand -hex 32`. Save it as `CRON_SECRET` in Supabase secrets (`npx supabase secrets set CRON_SECRET=...`).',
        'SQL Editor > New query > run the Vault block below with your project ref and the same CRON_SECRET value.',
        'Integrations > **Cron**: you should see `ethereel-zernio-sync` (every 10 minutes) and `ethereel-trim-job-events`. Once zernio-sync is deployed, the job history shows status 200.',
        'Music library: upload 5 to 10 tracks you have the rights to use commercially (for example Mixkit items under its Free License, check each item) into Storage > music > a new folder `library`. Then run the music insert below with each file path and length.',
      ),
      code('eth-be-storage-vault', 'SQL Editor', 'sql', `select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<the same CRON_SECRET value>', 'cron_secret');

-- check (shows names, not values)
select name, created_at from vault.secrets;`),
      code('eth-be-storage-music', 'SQL Editor: add library tracks', 'sql', `insert into public.music_tracks (user_id, title, artist, storage_path, duration_ms, licence_note) values
  (null, 'Calm keys', 'Mixkit', 'library/calm-keys.mp3', 128000, 'Mixkit Free License, checked 18 Oct 2026'),
  (null, 'Soft pulse', 'Mixkit', 'library/soft-pulse.mp3', 96000, 'Mixkit Free License, checked 18 Oct 2026');`),
      mistakes([
        { mistake: 'The cron job history shows "null value in column url".', fix: 'The Vault secret is missing or named differently. The job reads names project_url and cron_secret exactly. Run the select on vault.secrets and recreate any missing one.' },
        { mistake: 'zernio-sync returns 401 from cron but works with curl.', fix: 'The cron_secret in Vault and CRON_SECRET in Supabase secrets are different values. Update the Vault one with vault.update_secret.' },
        { mistake: 'Creators cannot hear library tracks.', fix: 'Files must sit in music/library/ exactly (the storage policy allows reading that folder). Check the storage_path in music_tracks matches the file path.' },
      ]),
      links([
        { label: 'Supabase resumable uploads', url: 'https://supabase.com/docs/guides/storage/uploads/resumable-uploads' },
        { label: 'Supabase Cron', url: 'https://supabase.com/docs/guides/cron' },
        { label: 'Supabase Vault', url: 'https://supabase.com/docs/guides/database/vault' },
        { label: 'Mixkit licence', url: 'https://mixkit.co/license/' },
      ]),
    ],
    checklist: [
      'Raise the Storage upload limit to 2 GB on Pro',
      'Set CRON_SECRET in Supabase secrets',
      ['Create the two Vault secrets', 'copy:eth-be-storage-vault'],
      ['Add library music tracks', 'copy:eth-be-storage-music'],
    ],
  }),
  task({
    id: 'eth-be-mediapipe',
    title: 'Test face and eye detection with MediaPipe',
    outcome: 'You can find the speaker\'s eyes in every sampled frame for free, so punch-ins zoom on the face, not the wall.',
    minutes: 25,
    xp: 35,
    blocks: [
      eli5('Why find the eyes?', 'A punch-in is a quick 1.12x zoom. If it zooms on the middle of the frame and you are sitting to the left, the zoom cuts off half your face. MediaPipe finds 478 points on a face, including the middle of each eye, so the zoom centres on you.'),
      table(['', 'MediaPipe Face Landmarker', 'Google Cloud Vision'], [
        ['Price', 'Free (open source, runs in your task)', '$1.50 per 1,000 images per feature after the first 1,000 a month (checked Oct 2026)'],
        ['60 s clip at 6 samples a second', 'a few seconds of CPU (about $0.005)', '360 images, about $0.54'],
        ['Eye centres', 'Yes (iris landmarks 468 and 473)', 'Landmarks include eye positions'],
        ['Setup', 'Model file in your repo', 'Google Cloud project + billing + key'],
        ['Decision', 'Use this', 'Documented fallback only'],
      ]),
      steps(
        'Open the MediaPipe Face Landmarker guide (link below) > Models > download `face_landmarker.task` (float16).',
        'Save it as `python/models/face_landmarker.task` in your project and commit it (it is about 4 MB).',
        'Create `python/faces_test.py` with the code below and run it on any clip of yourself: `.venv/bin/python python/faces_test.py my-clip.mp4`.',
      ),
      code('eth-be-mediapipe-test', 'python/faces_test.py', 'txt', T['be-mediapipe-test']),
      p('**Good result:** `{"samples": 360, "first": [{"t": 0, "x": 0.5123, "y": 0.4011}, ...]}` for a 60 s clip. x and y are 0 to 1 across and down the frame. Your eyes are usually around y 0.35 to 0.45.'),
      mistakes([
        { mistake: '"samples": 0.', fix: 'The face is too small or the video is rotated. Run it on proxy.mp4 (already rotated and cropped by the prepare step), not the raw iPhone file.' },
        { mistake: 'ImportError for mediapipe.tasks.', fix: 'Install the current package into the venv: `.venv/bin/pip install -U mediapipe opencv-python-headless`.' },
        { mistake: 'Eye points jitter from frame to frame.', fix: 'That is normal. The detect-faces task smooths with a 0.5 s moving median and uses one median point per segment.' },
      ]),
      links([
        { label: 'Face Landmarker for Python', url: 'https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/python' },
        { label: 'Cloud Vision pricing (to compare)', url: 'https://cloud.google.com/vision/pricing' },
      ]),
    ],
    checklist: [
      'Download face_landmarker.task into python/models/',
      ['Create and run the test script', 'copy:eth-be-mediapipe-test'],
      'See eye points for your own clip',
    ],
  }),
]

const pipelineTasks: Task[] = [
  task({
    id: 'eth-be-pipe-1',
    title: 'Build the pipeline part 1: prepare, transcribe, cut pauses',
    outcome: 'A raw iPhone clip becomes a clean 30 fps file, a word-timed transcript and a cut list that uses the exact Rosewell Reels numbers.',
    minutes: 150,
    xp: 80,
    blocks: [
      eli5('How the pause cutter thinks', 'It listens to your voice and works out how loud you normally are. Anything 12 dB quieter than that counts as silence. A pause longer than 0.4 s gets cut, but it keeps a little breath on both sides (0.12 s after the word, 0.1 s before the next) so you do not sound like a robot.'),
      table(['Rule (exact)', 'Value'], [
        ['Silence threshold', 'voice average loudness minus 12 dB'],
        ['Clicks that do not break a pause', 'under 60 ms'],
        ['Pauses removed', 'over 400 ms only'],
        ['Kept after the last word / before the next', '120 ms / 100 ms'],
        ['Lead-in before the first word', '200 ms'],
        ['Tail after the last word', '400 ms'],
        ['Audio for transcription', 'mono 16 kHz'],
      ]),
      prompt('eth-be-pipe-1-prompt', 'Paste into Claude Code (plan mode first)', T['be-pipe-1']),
      code('eth-be-pipe-1-sql', 'Check the transcript and cuts', 'sql', `select v.title, v.status, v.duration_ms, v.edited_duration_ms, v.was_hdr,
       jsonb_array_length(t.words) as words, t.voice_avg_db, t.threshold_db,
       jsonb_array_length(t.fixes_applied) as spelling_fixes
from public.videos v join public.transcripts t on t.video_id = v.id
order by v.created_at desc limit 3;`),
      p('**Good result:** threshold_db is exactly 12 lower than voice_avg_db, edited_duration_ms is shorter than duration_ms, and the 5 cut-list tests pass.'),
      mistakes([
        { mistake: 'iPhone HDR clips come out grey and washed out.', fix: 'The tone-map filter was skipped. Check ffprobe color_transfer is read from the video stream and the zscale + tonemap=hable chain from PRD 9.2 runs when it is smpte2084 or arib-std-b67.' },
        { mistake: 'Cuts sound clipped at the start of words.', fix: 'Word starts are not being snapped to the sound. Check snapWords looks from s - 80 ms for the first loud window, and that KEEP_BEFORE_WORD_MS is 100.' },
        { mistake: 'The task times out on a 3 minute clip.', fix: 'Prepare runs on medium-2x with -preset veryfast. Check maxDuration is 1800 in trigger.config.ts and that you stream ffmpeg progress instead of buffering stdout.' },
      ]),
    ],
    checklist: [
      ['Run the part 1 prompt', 'copy:eth-be-pipe-1-prompt'],
      'See all cut-list unit tests pass',
      'Run process-video on a real clip in dev',
      ['Check the transcript and cut numbers', 'copy:eth-be-pipe-1-sql'],
    ],
  }),
  task({
    id: 'eth-be-pipe-2',
    title: 'Build the pipeline part 2: faces, zooms, captions, cutaway plan and layout',
    outcome: 'Each video gets edit.json version 1: segments with eye points, seeded punch-ins, caption pages, and Claude\'s cutaways checked by code.',
    minutes: 180,
    xp: 80,
    blocks: [
      eli5('Claude decides content, code decides layout', 'Claude is good at "this bit is a comparison, call it hourly vs project". It is bad at "put the box at x 312". So Claude only returns words and which spoken words they belong to. Code then checks every rule (never in the first 3 s, at least 6 s apart, at most 4) and places every box so nothing overlaps.'),
      table(['Cutaway rule (exact)', 'Value'], [
        ['How often', 'about one every 16 s, max 4'],
        ['Length', '3 to 6.5 s'],
        ['Never in', 'the first 3 s, or over the follow card'],
        ['Gap between cutaways', 'at least 6 s'],
        ['Title / items / punch note', '≤ 4 words / ≤ 3 words each / 1 to 3 words'],
        ['Screenshots', 'each used once, at the moment its filename words are spoken'],
        ['Punch-ins', 'about 1 cut in 3, 1.12x on the eyes, never first, never twice in a row, seeded from the video name'],
      ]),
      prompt('eth-be-pipe-2-prompt', 'Paste into Claude Code (plan mode first)', T['be-pipe-2']),
      code('eth-be-pipe-2-sql', 'See what Claude proposed and what code kept', 'sql', `select cp.created_at,
       jsonb_array_length(cp.raw_plan->'cutaways') as proposed,
       jsonb_array_length(cp.validated_plan) as kept,
       cp.dropped
from public.cutaway_plans cp
order by cp.created_at desc limit 3;`),
      p('**Good result:** for a 60 s clip, proposed is 2 to 4, kept is 3 or fewer, and anything dropped has a reason like `too_close_to_previous` or `in_first_3s`.'),
      mistakes([
        { mistake: 'Claude returns positions or colours.', fix: 'The schema must not have position fields, and additionalProperties must be false everywhere. Remove any styling words from the system prompt.' },
        { mistake: 'Every cutaway is dropped with layout_overflow.', fix: 'measureText is using the wrong font. Load the same hand-lettering font file the composition uses before measuring, and check the content area is 420 to 1280 px.' },
        { mistake: 'The punch-ins change between renders of the same video.', fix: 'Something uses Math.random. Search for it and use the seeded mulberry32(fnv1a(seed)) PRNG from packages/shared/zoom.ts.' },
      ]),
    ],
    checklist: [
      ['Run the part 2 prompt', 'copy:eth-be-pipe-2-prompt'],
      'See all rule and layout tests pass',
      'Print the edit.json summary for a real clip',
      ['Check proposed vs kept cutaways', 'copy:eth-be-pipe-2-sql'],
    ],
  }),
  task({
    id: 'eth-be-remotion-comp',
    title: 'Build the Remotion composition (the reel look)',
    outcome: 'One React composition draws the graded video, punch-ins, captions, opening title, follow card and all six cutaway kinds from edit.json.',
    minutes: 240,
    xp: 80,
    blocks: [
      eli5('A video made of web pages', 'Remotion renders a web page 30 times per second and saves each one as a frame. Your captions are HTML text, your diagrams are SVG drawings, the footage is a video tag. Because every frame is drawn from edit.json, the same edit.json always gives the same reel.'),
      prompt('eth-be-remotion-comp-prompt', 'Paste into Claude Code (plan mode first)', T['be-remotion-comp']),
      steps(
        'Run `npm run remotion:studio`. The Remotion Studio opens in your browser with the Reel composition.',
        'Scrub to 0:02: the series title is near the top with the orange scribble drawn on.',
        'Scrub into a cutaway: paper page, faint blue grid, black boiling ink, captions turn dark with no outline on the exact first frame.',
        'Scrub to the follow card: the button fills to "Following ✓" with a small burst.',
        'Run `npm run remotion:render` and watch out/sample.mp4 on your phone.',
      ),
      tip('Compare with the reference reels', 'Keep one finished Rosewell Reels export open next to the Studio. Match caption height (74% of the frame), title position and cutaway timing frame by frame before moving on.'),
      mistakes([
        { mistake: 'Captions flicker or drift by a frame.', fix: 'Convert times with Math.round(ms * 30 / 1000) in one shared msToFrame helper and use it everywhere: captions, cutaways and SFX.' },
        { mistake: 'Fonts fall back to Times in the Lambda render but look right in the Studio.', fix: 'Load fonts with @remotion/fonts loadFont from staticFile() inside the composition and wait for them (Remotion delays the render until loadFont resolves). Do not rely on a CSS @import.' },
        { mistake: 'The render is slow and expensive.', fix: 'Use the 720x1280 proxy for previews and OffthreadVideo, not Video. Keep feTurbulence filters only on the cutaway layer, never on the full frame.' },
      ]),
    ],
    checklist: [
      ['Run the composition prompt', 'copy:eth-be-remotion-comp-prompt'],
      'Check title, cutaway and follow card in the Studio',
      'Render out/sample.mp4 and watch it on your phone',
    ],
  }),
  task({
    id: 'eth-be-pipe-3',
    title: 'Build the pipeline part 3: render, audio, export, checks, caption',
    outcome: 'Each edit becomes a validated final.mp4 at -14 LUFS that meets the TikTok and Instagram spec, with a cover at 3 s and a post caption.',
    minutes: 150,
    xp: 80,
    blocks: [
      eli5('Why rebuild the audio separately', 'The renderer makes pictures only. Then ffmpeg cuts your voice with tiny 10 ms fades at every cut (so no clicks), makes it as loud as TikTok expects (-14 LUFS), tucks the music about 25 dB under your voice and adds the pen-scratch and click sounds at the right frames.'),
      table(['Export check (exact)', 'Must be'], [
        ['Video', 'H.264 High, level 4.1, 1080x1920, 30 fps constant'],
        ['Bitrate', '≤ 6 Mbps'],
        ['Colour tags', 'BT.709 primaries, transfer and matrix'],
        ['Audio', 'AAC, 48 kHz, stereo'],
        ['Container', 'no metadata, no chapters, no edit list, faststart'],
        ['Loudness', '-15 to -13 LUFS integrated'],
        ['Cover', 'frame at 3 s'],
      ]),
      prompt('eth-be-pipe-3-prompt', 'Paste into Claude Code (plan mode first)', T['be-pipe-3']),
      code('eth-be-pipe-3-ffprobe', 'Terminal: check a downloaded final.mp4', 'bash', `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,level,width,height,r_frame_rate,color_primaries,color_transfer,color_space,bit_rate -of compact final.mp4
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of compact final.mp4
ffmpeg -i final.mp4 -af loudnorm=print_format=summary -f null - 2>&1 | grep "Input Integrated"`),
      code('eth-be-pipe-3-sql', 'Check the render row', 'sql', `select r.edit_version, r.status, r.remotion_cost_usd, r.size_bytes,
       (select count(*) from jsonb_array_elements(r.validation->'checks') c where (c->>'ok')::boolean) as checks_ok,
       jsonb_array_length(r.validation->'checks') as checks_total
from public.renders r order by r.created_at desc limit 3;`),
      mistakes([
        { mistake: 'Validation fails on "edit list present".', fix: 'Add -use_editlist 0 to the mp4 muxer options and do not copy the audio stream from Remotion (render with muted: true and mux the rebuilt mix).' },
        { mistake: 'Loudness lands at -16 LUFS.', fix: 'Use two-pass loudnorm: run pass 1 with print_format=json, then feed measured_I, measured_TP, measured_LRA and measured_thresh into pass 2 with linear=true.' },
        { mistake: 'Music is louder than the voice under cutaways.', fix: 'Music is normalised to music_level_lufs (default -39) first, then the -4 dB dips under cutaways are applied with volume filters enabled between the cutaway times.' },
      ]),
    ],
    checklist: [
      ['Run the part 3 prompt', 'copy:eth-be-pipe-3-prompt'],
      'Run the full pipeline on a real clip',
      ['Check the file with ffprobe', 'copy:eth-be-pipe-3-ffprobe'],
      ['See every validation check ok', 'copy:eth-be-pipe-3-sql'],
    ],
  }),
  task({
    id: 'eth-be-revise',
    title: 'Build plain-language revisions with Undo',
    outcome: 'A note like "fix the word at 0:12 and drop the second diagram" becomes validated edit operations, a new version and a "what changed" list.',
    minutes: 120,
    xp: 75,
    blocks: [
      eli5('Allowed moves only', 'Claude can only use eight moves, like a board game: fix a caption word, edit, add or remove a diagram, cut words, change music, change the look, change the subtitle. If your note asks for something none of the moves can do, nothing changes and you get a plain reason.'),
      table(['Op', 'Main check'], [
        ['fix_caption_word', 'word exists, 1 to 24 characters'],
        ['edit_cutaway / add_cutaway', 'result still passes every cutaway rule'],
        ['remove_cutaway', 'cutaway exists'],
        ['cut_words', 'never removes more than half of all words'],
        ['change_music / change_filter', 'track or preset visible to the creator'],
        ['change_subtitle', '2 to 3 lowercase words, 32 characters'],
      ]),
      prompt('eth-be-revise-prompt', 'Paste into Claude Code (plan mode first)', T['be-revise']),
      code('eth-be-revise-sql', 'See the revision history', 'sql', `select rr.created_at, rr.status, rr.note, rr.what_changed, rr.impossible_reason, rr.from_version, rr.to_version
from public.revision_requests rr
order by rr.created_at desc limit 5;`),
      mistakes([
        { mistake: 'A revision re-runs the whole pipeline and takes 5 minutes.', fix: 'Only re-run the affected steps: caption, subtitle, cutaway and filter changes start at render; cut_words starts at the cut step; music starts at mix. Pass fromStep to process-video.' },
        { mistake: '"What changed" sometimes lists things that did not change.', fix: 'Generate it in code from a diff of the old and new edit.json (packages/shared/diff.ts), never from Claude\'s summary.' },
        { mistake: 'Undo makes a new render every time.', fix: 'Renders are unique per edit version. Undo should point current_render_id at the existing render of the restored content instead of rendering again.' },
      ]),
    ],
    checklist: [
      ['Run the revisions prompt', 'copy:eth-be-revise-prompt'],
      'Request one possible and one impossible revision',
      'Press Undo and see the earlier version come back',
      ['Check the revision history', 'copy:eth-be-revise-sql'],
    ],
  }),
  task({
    id: 'eth-be-e2e',
    title: 'Run the end-to-end test: clip in, reel scheduled',
    outcome: 'One script proves upload, pipeline, review, revision, pass and handover all work together, with the SQL checks from the PRD.',
    minutes: 60,
    xp: 70,
    blocks: [
      eli5('Why one big test', 'Each part can work on its own and still fail together, like a relay team that never practised the baton handover. This test runs one real clip all the way from upload to a scheduled post and checks the database at every handover.'),
      p('Put a real 60 second talking-head clip at `tests/fixtures/clip-60s.mov` (under 50 MB if you are still on Supabase Free). Make sure Trigger.dev dev is running (`npx trigger.dev@latest dev`).'),
      prompt('eth-be-e2e-prompt', 'Paste into Claude Code', T['be-e2e']),
      table(['Step', 'Expected'], [
        ['Upload', 'videos row moves from uploading to queued'],
        ['Pipeline', 'ready_for_review in under 6 minutes, 12 job_events rows'],
        ['Checks', 'PRD tests 4 to 7 pass, ffprobe matches the spec'],
        ['Revision', 'edit version 2 with 2 what-changed lines'],
        ['Impossible revision', 'status impossible, version unchanged'],
        ['Pass', 'a slot at one of the creator\'s times'],
        ['Handover', 'zernio_post_id set, then deleted again'],
      ]),
      mistakes([
        { mistake: 'The test hangs at queued.', fix: 'Trigger.dev dev is not running, or TRIGGER_SECRET_KEY in Supabase secrets is the prod key while you test in dev. Use the tr_dev_ key while testing.' },
        { mistake: 'It fails at render with an AWS error.', fix: 'Run npx remotion lambda policies validate and check the REMOTION_* values in Trigger.dev env for the Development environment.' },
        { mistake: 'Handover fails with 401.', fix: 'ZERNIO_API_KEY is missing from Supabase secrets, or CRON_SECRET in the curl does not match.' },
      ]),
    ],
    checklist: [
      'Add a real 60 s clip to tests/fixtures',
      ['Run the end-to-end prompt', 'copy:eth-be-e2e-prompt'],
      'See every row in the results table pass',
    ],
  }),
]

export const backendTasks: Task[] = [...setupTasks, ...pipelineTasks]
