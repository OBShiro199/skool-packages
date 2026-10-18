// The shared 10-phase playbook. Every app gets these phases; app-specific parts
// come from app.content. Phase ids are fixed: the UI depends on them.
import type { AppDef, ApiDef, Block, ChecklistItem, EdgeFunctionDef, EnvVar, Phase, Task } from './types'

// ---------------------------------------------------------------------------
// Small helpers so the content below stays readable
// ---------------------------------------------------------------------------

type CodeLang = Extract<Block, { type: 'code' }>['lang']
type KeyRow = Extract<Block, { type: 'keys' }>['rows'][number]

const p = (text: string): Block => ({ type: 'p', text })
const eli5 = (title: string, text: string): Block => ({ type: 'callout', tone: 'eli5', title, text })
const tip = (title: string, text: string): Block => ({ type: 'callout', tone: 'tip', title, text })
const warn = (title: string, text: string): Block => ({ type: 'callout', tone: 'warn', title, text })
const steps = (...items: string[]): Block => ({ type: 'steps', items })
const code = (id: string, filename: string, lang: CodeLang, src: string): Block => ({ type: 'code', id, filename, lang, code: src.trim() })
const prompt = (id: string, title: string, src: string): Block => ({ type: 'prompt', id, title, code: src.trim() })
const keys = (rows: KeyRow[]): Block => ({ type: 'keys', rows })
const ascii = (src: string, caption: string): Block => ({ type: 'ascii', code: src.replace(/^\n+|\s+$/g, ''), caption })
const table = (head: string[], rows: string[][]): Block => ({ type: 'table', head, rows })
const links = (items: { label: string; url: string }[]): Block => ({ type: 'links', items })
const mistakes = (items: { mistake: string; fix: string }[]): Block => ({ type: 'mistakes', items })

/** Checklist items get ids `<taskId>-c1`, `<taskId>-c2`... so they are always unique. */
type CheckSpec = string | [string, ChecklistItem['trigger']]
const checks = (taskId: string, items: CheckSpec[]): ChecklistItem[] =>
  items.map((item, i) => {
    const [label, trigger] = typeof item === 'string' ? [item, undefined] : item
    const out: ChecklistItem = { id: `${taskId}-c${i + 1}`, label }
    if (trigger) out.trigger = trigger
    return out
  })

interface TaskSpec {
  id: string
  title: string
  outcome: string
  minutes: number
  xp: number
  blocks: Block[]
  checklist: CheckSpec[]
}
const task = (t: TaskSpec): Task => ({ ...t, checklist: checks(t.id, t.checklist) })

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const envRow = (v: EnvVar): KeyRow => ({ name: v.name, where: v.where, pasteInto: v.pasteInto, secret: v.secret })

/** Env vars an API needs inside the Next.js app (anything not only for Supabase secrets). */
const nextEnvVars = (api: ApiDef): EnvVar[] => api.envVars.filter((v) => !/^supabase secrets$/i.test(v.pasteInto.trim()))

/** Every env var name the Next.js app reads, for .env.example and Vercel. */
const supabaseRows = (pasteInto: string): KeyRow[] => [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', where: 'Supabase > Project Settings > Data API > Project URL', pasteInto, secret: false },
  { name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', where: 'Supabase > Project Settings > API Keys > Publishable key (sb_publishable_...)', pasteInto, secret: false },
  { name: 'SUPABASE_SECRET_KEY', where: 'Supabase > Project Settings > API Keys > Secret keys (sb_secret_...)', pasteInto, secret: true },
]

const stripeRows = (pasteInto: string, live: boolean): KeyRow[] => [
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', where: `Stripe > Developers > API keys > Publishable key (${live ? 'pk_live_' : 'pk_test_'}...)`, pasteInto, secret: false },
  { name: 'STRIPE_SECRET_KEY', where: `Stripe > Developers > API keys > Secret key (${live ? 'sk_live_' : 'sk_test_'}...)`, pasteInto, secret: true },
  { name: 'STRIPE_PRICE_ID', where: `Stripe > Product catalogue > your product > Pricing > ... > Copy price ID (price_...)`, pasteInto, secret: false },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    where: live
      ? 'Stripe (live) > Developers > Webhooks > your production endpoint > Signing secret (whsec_...)'
      : 'Stripe (test) > Developers > Webhooks > your endpoint > Signing secret (whsec_...). Locally: printed by stripe listen',
    pasteInto,
    secret: true,
  },
]

const resendRows = (pasteInto: string): KeyRow[] => [
  { name: 'RESEND_API_KEY', where: 'Resend > API Keys > Create API Key (re_...)', pasteInto, secret: true },
  { name: 'EMAIL_FROM', where: 'You choose it. Local: onboarding@resend.dev. After domain verify: hello@yourdomain.com', pasteInto, secret: false },
]

// ---------------------------------------------------------------------------
// Phase 1: Setup
// ---------------------------------------------------------------------------

function claudeMdTemplate(app: AppDef): string {
  return `
# ${app.name}

${app.oneLiner}
Product context: @PRD.md
UI rules: @DESIGN.md
Current plan: @PLAN.md and @TASKS.md

## Stack
- Next.js (App Router, TypeScript), Tailwind, shadcn/ui
- Supabase cloud: auth, Postgres + RLS, storage, edge functions (@supabase/supabase-js, @supabase/ssr)
- Stripe: Checkout (subscription mode, ${app.price.trialDays}-day free trial, then $${app.price.monthly}/month), Customer Portal, webhook at /api/stripe/webhook
- Resend: transactional email (welcome, trial ending)
- Vercel: hosting. main = Production, other branches = Preview
- Package manager: npm

## Commands
- Dev server: \`npm run dev\` (http://localhost:3000)
- Build: \`npm run build\` (must pass before any commit)
- Lint: \`npm run lint\`
- Stripe webhooks locally: \`stripe listen --forward-to localhost:3000/api/stripe/webhook\`
- Edge functions: \`npx supabase functions deploy <name>\`
- Edge function secrets: \`npx supabase secrets set NAME=value\` (I run this myself, never print values)

## Environment variables
- Browser-safe: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_SITE_URL
- Server only: SUPABASE_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID, RESEND_API_KEY, EMAIL_FROM, plus any third-party API keys in .env.example
- Local values live in .env.local (gitignored). Never print, log or commit them.
- I edit .env.local myself. You keep .env.example up to date with names only.

## Security rules
- IMPORTANT: every new table gets \`enable row level security\` and one policy per
  operation using \`(select auth.uid()) = user_id\` in the same migration. No \`for all\`.
- The secret key (sb_secret_...) and Stripe keys are used only in server code
  (route handlers, server actions, edge functions). Never in a "use client" file
  or any NEXT_PUBLIC_ variable.
- Server code checks the user with \`supabase.auth.getClaims()\`, never \`getSession()\`.
- Every API route and server action checks the user AND that they own the row.
- Access to paid features is read from public.subscriptions, which only the Stripe
  webhook writes. Status must be 'trialing' or 'active'. Never grant access from the
  Checkout success_url.
- Webhook: verify signature on the raw body, skip duplicate event IDs, return 2xx fast.
- Never use raw_user_meta_data in RLS; authorisation data goes in raw_app_meta_data.
- Views are created \`with (security_invoker = true)\`.
- Expensive endpoints (AI, third-party APIs, email) are rate limited per user.

## Workflow
- Schema, auth, payments or multi-file changes: plan mode first, wait for my approval.
- One task from TASKS.md at a time. Keep each diff under ~200 lines.
- After each task: run \`npm run build\` and \`npm run lint\`, show me the output, then commit.
- Show evidence (command output, screenshot), not "done".
- Database: inspect existing tables (Supabase MCP list_tables) before changing schema.
  Schema changes go in supabase/migrations as new files, applied only after I approve.
- I am not a developer. Explain anything I must do by hand as numbered click steps.

## Conventions
- Server Supabase client: lib/supabase/server.ts. Browser client: lib/supabase/client.ts.
- Admin (secret key) client: lib/supabase/admin.ts, imported only from server code.
- Session refresh: proxy.ts (Next 16+) or middleware.ts (Next 15 and earlier).
- Commit messages: imperative, under 72 characters ("Add Stripe webhook handler").

## Gotchas
- Env var changes on Vercel apply only to new deployments: redeploy after editing.
- Supabase auth redirect URLs and the Stripe webhook endpoint must be set for
  localhost and Production separately.
- Test and live Stripe modes have different keys and different whsec_ secrets.

## Compaction
When compacting, always preserve the list of modified files, open TASKS.md items
and the test commands.
`
}

const HOOK_SCRIPT = `
#!/bin/bash
# Blocks Claude from editing secrets, the lockfile and git internals.
# .env.example is allowed (names only, no values).
FILE=$(jq -r '.tool_input.file_path // empty')
case "$FILE" in
  *.env.example) exit 0 ;;
  *.env|*.env.*|*package-lock.json|*/.git/*)
    echo "Blocked: $FILE is protected. Ask the user to edit it." >&2
    exit 2
    ;;
esac
exit 0
`

const HOOK_SETTINGS = `
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "\\"$CLAUDE_PROJECT_DIR\\"/.claude/hooks/protect-files.sh" }
        ]
      }
    ]
  }
}
`

function setupPhase(app: AppDef): Phase {
  const { name, slug } = app
  const tasks: Task[] = [
    task({
      id: 'setup-terminal',
      title: 'Meet your terminal',
      outcome: 'You can open a terminal and run a command without fear.',
      minutes: 5,
      xp: 10,
      blocks: [
        eli5(
          'What is a terminal?',
          `A terminal is a text box where you type instructions to your computer instead of clicking. Every app you click on is doing the same thing behind the scenes. You will type about ten commands in this whole course, and Claude Code types the rest for you.`,
        ),
        p(`Open the terminal now so it is ready for the next task.`),
        steps(
          `**Mac:** press Cmd + Space, type \`Terminal\`, press Enter. A white or black window with a blinking cursor appears.`,
          `**Windows:** press the Windows key, type \`PowerShell\`, press Enter. A blue or black window appears. Use PowerShell, not "Command Prompt".`,
          `Type the command below and press Enter. It prints the folder you are in (your "home" folder).`,
        ),
        code('setup-terminal-pwd', 'Terminal (Mac and Windows)', 'bash', `pwd`),
        tip(
          'Three habits that save hours',
          `Copy and paste commands, never retype them. If a command prints red text, copy the whole message into Claude Code later and ask what it means. Press the Up arrow to bring back the last command.`,
        ),
      ],
      checklist: ['Open Terminal (Mac) or PowerShell (Windows)', 'Run pwd and see your home folder printed'],
    }),
    task({
      id: 'setup-install',
      title: 'Buy Claude Pro and install Claude Code',
      outcome: 'Running claude --version prints a version number.',
      minutes: 15,
      xp: 30,
      blocks: [
        eli5(
          'What is Claude Code?',
          `Claude Code is Claude living inside your terminal. Instead of chatting in a browser, it can read the files in a folder, create new ones and run commands. You describe what you want, it builds ${name} file by file.`,
        ),
        steps(
          `Go to claude.ai, sign in (or create an account), click your name bottom left > **Upgrade plan** and pick **Pro** ($20 a month). The free plan does not include Claude Code.`,
          `Copy the install command for your computer from the box below and paste it into your terminal. Press Enter and wait for it to finish (one to two minutes).`,
          `**Close the terminal window completely and open a new one.** New installs only show up in a fresh window.`,
          `Run \`claude --version\`. You should see something like \`2.1.211 (Claude Code)\`.`,
        ),
        code(
          'setup-install-cmd',
          'Install command (pick your system)',
          'bash',
          `
# Mac or Linux (Terminal)
curl -fsSL https://claude.ai/install.sh | bash

# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex

# Windows only: Claude Code also needs Git for Windows.
# Download and install it with all default options from:
# https://git-scm.com/downloads/win
`,
        ),
        code('setup-install-check', 'Check it worked (new terminal window)', 'bash', `claude --version`),
        warn(
          'If it says "command not found"',
          `Close every terminal window and open a new one, then try again. Still broken? Run \`claude doctor\` and read the first red line. On Windows, restart the computer once after installing Git for Windows.`,
        ),
        links([
          { label: 'Claude plans', url: 'https://claude.ai/upgrade' },
          { label: 'Claude Code setup docs', url: 'https://code.claude.com/docs/en/setup' },
          { label: 'Git for Windows', url: 'https://git-scm.com/downloads/win' },
        ]),
      ],
      checklist: [
        'Upgrade to Claude Pro',
        ['Run the install command for your system', 'copy:setup-install-cmd'],
        'Open a fresh terminal window',
        ['Run claude --version and see a version number', 'copy:setup-install-check'],
      ],
    }),
    task({
      id: 'setup-node',
      title: 'Install Node.js and a code editor',
      outcome: 'node -v prints v22 or higher and VS Code is installed.',
      minutes: 10,
      xp: 20,
      blocks: [
        eli5(
          'Why Node.js?',
          `${name} is built with Next.js, and Next.js runs on Node.js. Think of Node as the engine and Next.js as the car body. You install the engine once and never think about it again.`,
        ),
        steps(
          `Go to nodejs.org and download the **LTS** version (the button on the left). Open the file and click Next through the installer with default options.`,
          `Go to code.visualstudio.com and install **VS Code** (free). You will use it to look at files and paste secret keys into \`.env.local\` by hand. Claude Code does the writing.`,
          `Close your terminal, open a new one and run the check below.`,
        ),
        code('setup-node-check', 'Check it worked', 'bash', `node -v\nnpm -v`),
        p(`You should see something like \`v22.11.0\` and \`10.9.0\`. Any Node version of 22 or higher is fine.`),
        links([
          { label: 'Node.js download', url: 'https://nodejs.org/en/download' },
          { label: 'VS Code download', url: 'https://code.visualstudio.com/' },
        ]),
      ],
      checklist: ['Install Node.js LTS', 'Install VS Code', ['Run node -v and see v22 or higher', 'copy:setup-node-check']],
    }),
    task({
      id: 'setup-folder',
      title: `Create the ${slug} folder`,
      outcome: `An empty folder called ${slug} exists and your terminal is inside it.`,
      minutes: 5,
      xp: 15,
      blocks: [
        eli5(
          'Why one folder?',
          `Everything that makes up ${name} lives in one folder: code, plans, settings. Claude Code only sees the folder you start it in, so this folder is its whole world.`,
        ),
        p(`Copy the commands for your system. They make a Projects folder in your home folder, a \`${slug}\` folder inside it, and move the terminal into it.`),
        code(
          'setup-folder-mac',
          'Mac',
          'bash',
          `
mkdir -p ~/Projects/${slug}
cd ~/Projects/${slug}
open .
`,
        ),
        code(
          'setup-folder-win',
          'Windows (PowerShell)',
          'bash',
          `
mkdir $HOME\\Projects\\${slug} -Force
cd $HOME\\Projects\\${slug}
explorer .
`,
        ),
        steps(
          `Run the commands. A Finder (Mac) or File Explorer (Windows) window opens showing the empty folder. Keep it open, you will drop files in here.`,
          `Open VS Code > **File > Open Folder...** > pick \`Projects/${slug}\` > Open. If asked "Do you trust the authors?", click **Yes**.`,
          `Back in the terminal, run \`pwd\`. It should end in \`/Projects/${slug}\`.`,
        ),
        tip('Coming back tomorrow', `Every time you open a new terminal, run \`cd ~/Projects/${slug}\` (Mac) or \`cd $HOME\\Projects\\${slug}\` (Windows) before running \`claude\`.`),
        ascii(app.content.repoTree, `What your ${slug} folder will look like by the end. Claude Code creates almost all of it.`),
      ],
      checklist: [
        ['Run the folder commands for your system', 'copy:setup-folder-mac'],
        'Open the folder in VS Code',
        `Check pwd ends in /Projects/${slug}`,
      ],
    }),
    task({
      id: 'setup-first-run',
      title: 'First run: start Claude Code and log in',
      outcome: 'Claude Code is running in your folder and logged in to your Pro plan.',
      minutes: 5,
      xp: 15,
      blocks: [
        steps(
          `In the terminal (inside \`${slug}\`), type \`claude\` and press Enter.`,
          `Pick a colour theme with the arrow keys and press Enter.`,
          `Choose **Claude account with subscription** when asked how to log in. A browser tab opens. Click **Authorize**.`,
          `Back in the terminal, it asks whether you trust this folder. Choose **Yes**.`,
          `You now see a prompt box. Type \`hello, what folder are you in?\` and press Enter. It should answer with your \`${slug}\` path.`,
        ),
        code('setup-first-run-cmd', 'Start Claude Code', 'bash', `claude`),
        table(
          ['Key or command', 'What it does'],
          [
            ['Enter', 'Sends your message'],
            ['Shift + Enter', 'New line inside a message (for long prompts)'],
            ['Esc', 'Stops Claude mid-action'],
            ['Esc Esc', 'Rewinds to an earlier point if something went wrong'],
            ['Shift + Tab', 'Cycles modes: auto, manual, accept edits, plan'],
            ['/clear', 'Wipes the conversation. Do this after every finished task'],
            ['/exit', 'Quits Claude Code'],
          ],
        ),
        tip('Paste long prompts safely', `Every prompt in this playbook has a Copy button. Paste it into the Claude Code box with Cmd + V (Mac) or Ctrl + V (Windows) and press Enter once.`),
      ],
      checklist: [['Run claude in your project folder', 'copy:setup-first-run-cmd'], 'Log in with your Claude account', 'Ask Claude which folder it is in'],
    }),
    task({
      id: 'setup-model',
      title: 'Set the model and effort',
      outcome: 'Claude Code uses Opus, and you know when to raise the effort.',
      minutes: 3,
      xp: 10,
      blocks: [
        eli5(
          'Model and effort',
          `The model is which Claude brain you are talking to. Opus is the strongest. Effort is how long it thinks before acting. More thinking means fewer mistakes on hard jobs like databases and payments.`,
        ),
        code('setup-model-cmd', 'Type these inside Claude Code', 'txt', `/model opus\n/effort high`),
        table(
          ['Job', 'Model', 'Effort'],
          [
            ['Database, auth, Stripe, security', 'opus', 'high'],
            ['Pages, copy, layout tweaks', 'opus', 'medium'],
            ['Long plans that eat your usage', 'opusplan', 'medium'],
          ],
        ),
        tip('Plan mode', `Press Shift + Tab until the bottom of the screen says **plan mode on**. Claude then reads and plans but changes nothing until you approve. You will use it for every big task.`),
      ],
      checklist: [['Run /model opus', 'copy:setup-model-cmd'], 'Run /effort high', 'Press Shift + Tab until you see plan mode, then back to auto'],
    }),
    task({
      id: 'setup-claude-md',
      title: `Create CLAUDE.md for ${name}`,
      outcome: 'Claude reads your project rules at the start of every session.',
      minutes: 10,
      xp: 25,
      blocks: [
        eli5(
          'What is CLAUDE.md?',
          `Claude forgets everything when you close it. CLAUDE.md is a note it reads every time it starts, like the rules pinned to a kitchen wall. It tells Claude what ${name} is, which tools to use and which mistakes never to make.`,
        ),
        p(`This version is already filled in for ${name}. It points at PRD.md, DESIGN.md, PLAN.md and TASKS.md, which you add in the Foundations phase. That is fine: Claude ignores missing files until they exist.`),
        code('setup-claude-md-file', 'CLAUDE.md', 'md', claudeMdTemplate(app)),
        prompt(
          'setup-claude-md-prompt',
          'Ask Claude Code to create the file',
          `Create a file called CLAUDE.md in the root of this folder with exactly the content
below. Do not add or remove anything. When done, tell me its line count.

${claudeMdTemplate(app)}`,
        ),
        steps(
          `Copy the prompt above (it already contains the whole file) into Claude Code and press Enter.`,
          `Open VS Code. You should see \`CLAUDE.md\` in the file list on the left. Click it and check it starts with \`# ${name}\`.`,
          `Type \`/clear\` then \`/context\` in Claude Code. CLAUDE.md should appear in the list of loaded files.`,
        ),
      ],
      checklist: [
        ['Copy the CLAUDE.md template', 'copy:setup-claude-md-file'],
        ['Ask Claude Code to create CLAUDE.md', 'copy:setup-claude-md-prompt'],
        'Open CLAUDE.md in VS Code and check the first line',
        'Run /context and see CLAUDE.md loaded',
      ],
    }),
    task({
      id: 'setup-hook',
      title: 'Install the protect-files hook',
      outcome: 'Claude physically cannot edit your secret keys file or git internals.',
      minutes: 10,
      xp: 25,
      blocks: [
        eli5(
          'What is a hook?',
          `CLAUDE.md is advice. A hook is a lock. It is a tiny script that runs every time Claude tries to edit a file, and if the file is on the blocked list, the edit is refused. Your secret keys stay where you put them.`,
        ),
        p(`Two files. The script decides what is blocked. The settings file tells Claude Code to run the script before every edit.`),
        code('setup-hook-script', '.claude/hooks/protect-files.sh', 'bash', HOOK_SCRIPT),
        code('setup-hook-settings', '.claude/settings.json', 'json', HOOK_SETTINGS),
        prompt(
          'setup-hook-prompt',
          'Ask Claude Code to install the hook',
          `
Install a PreToolUse hook that stops you editing protected files.
1. Create .claude/hooks/protect-files.sh with exactly this content:

${HOOK_SCRIPT.trim()}

2. Create .claude/settings.json with exactly this content:

${HOOK_SETTINGS.trim()}

3. Make the script executable: chmod +x .claude/hooks/protect-files.sh
4. The script needs jq. Check with \`jq --version\`. If it is missing, tell me the
   exact install command for my operating system (Mac: brew install jq, Windows:
   winget install jqlang.jq) and wait for me to run it.
5. Test it: use your Write tool (not Bash) to create .env.local containing TEST=1. The hook
   should block you. Show me the blocked message. Then create .env.example with
   the line TEST= and show me that it was allowed. Delete .env.example afterwards.
`,
        ),
        steps(
          `Copy the prompt (it contains both files) and paste it into Claude Code. The two blocks above are there so you can read what you are installing.`,
          `If Claude asks you to install jq, run the command it gives you in a second terminal window, then tell Claude "done".`,
          `Check it worked: Claude shows "Blocked: .env.local is protected" when it tries to write .env.local.`,
          `Run \`/hooks\` in Claude Code. You should see one PreToolUse hook listed.`,
        ),
      ],
      checklist: [
        ['Copy the hook script', 'copy:setup-hook-script'],
        ['Copy the settings file', 'copy:setup-hook-settings'],
        ['Ask Claude Code to install and test the hook', 'copy:setup-hook-prompt'],
        'See the Blocked message for .env.local',
      ],
    }),
    task({
      id: 'setup-mcp-later',
      title: 'Know which MCP servers come later',
      outcome: 'You know what an MCP server is and when you will add each one.',
      minutes: 3,
      xp: 10,
      blocks: [
        eli5(
          'What is an MCP server?',
          `An MCP server is a plug that lets Claude Code talk to another service directly. With the Supabase plug, Claude can look at your database itself instead of you copying and pasting. You add each plug at the moment you need it.`,
        ),
        table(
          ['Server', 'What Claude can do with it', 'When you add it'],
          [
            ['Supabase', 'See tables, run security checks, read logs, deploy edge functions', 'Backend phase'],
            ['Chrome DevTools', 'Open your app in a browser, take screenshots, read console errors', 'Optional, any time a page looks wrong'],
            ['Stripe', 'Create products and look up payments in test mode', 'Optional, Payments phase'],
            ['Vercel', 'Read deploy and build logs', 'Optional, Deployment phase'],
          ],
        ),
        code(
          'setup-mcp-devtools',
          'Optional now: let Claude see your pages',
          'bash',
          `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest`,
        ),
        tip('Fewer is better', `Every MCP server adds text to Claude's memory. Add the Supabase one in Backend, and the others only if you find yourself copying screenshots or logs back and forth.`),
      ],
      checklist: ['Read the MCP table', 'Optional: add the Chrome DevTools MCP'],
    }),
  ]

  return {
    id: 'setup',
    label: 'Setup',
    title: `Get Claude Code running for ${name}`,
    goal: `Claude Code runs in an empty ${slug} folder with your CLAUDE.md rules and the protect-files hook in place.`,
    icon: 'terminal',
    tasks,
  }
}

// ---------------------------------------------------------------------------
// Phase 2: Foundations & Frontend
// ---------------------------------------------------------------------------

function foundationsPhase(app: AppDef): Phase {
  const { name, slug, price, apis } = app
  const apiRows: string[][] = apis.length
    ? apis.map((a) => [a.name, a.job, a.pricing, a.signupUrl])
    : [['None', `${name} only uses the core stack`, '$0', '']]

  const tasks: Task[] = [
    task({
      id: 'fnd-accounts',
      title: 'Open the accounts you need',
      outcome: `Every service ${name} talks to has an account, so nothing blocks you mid-build.`,
      minutes: 25,
      xp: 30,
      blocks: [
        eli5(
          'Why open them all now?',
          `Some sign-ups need an email check or a card before they let you in. Doing them in one sitting means you never stop halfway through a build waiting for a verification email.`,
        ),
        p(`Open each link in a new tab, sign up with the same email you used for Claude, and keep a note in your password manager. You do not need to copy any keys yet. Each phase tells you exactly which key to grab and when.`),
        table(
          ['Service', 'What it does for ' + name, 'Cost to start'],
          [
            ['Stripe', `Takes card payments: ${price.trialDays}-day free trial, then $${price.monthly}/month`, '$0, 2.9% + 30c per payment'],
            ['Resend', 'Sends welcome and trial-ending emails, plus your login emails', '$0 for 3,000 emails/month'],
            ['DataFast (or PostHog)', 'Shows where visitors come from and which ones pay', 'DataFast from $9/month, PostHog free tier'],
            ['Supabase', 'Database, logins, file storage (you sign up in Backend)', '$0 to start'],
            ['GitHub + Vercel', 'Saves your code online and puts the site live (Deployment phase)', '$0'],
          ],
        ),
        steps(
          `**Stripe:** go to dashboard.stripe.com/register, enter email, name, password. Verify your email. When asked to activate payments, click **Skip for now** or stay in test mode. You will build everything in test mode first.`,
          `**Resend:** go to resend.com/signup, sign up with GitHub or email. Verify your email. Leave the onboarding screen once you see the dashboard.`,
          `**DataFast:** go to datafa.st, click **Get started**, sign up. (Prefer free? Use posthog.com/signup instead and pick the US or EU cloud.) Do not add the script yet. That happens in Final Sweep.`,
          `**${name}'s extra APIs:** sign up at each link in the table below.`,
        ),
        table(['API', `Job in ${name}`, 'Pricing', 'Sign up'], apiRows),
        links([
          { label: 'Stripe sign up', url: 'https://dashboard.stripe.com/register' },
          { label: 'Resend sign up', url: 'https://resend.com/signup' },
          { label: 'DataFast', url: 'https://datafa.st' },
          { label: 'PostHog sign up', url: 'https://us.posthog.com/signup' },
          ...apis.map((a) => ({ label: `${a.name} sign up`, url: a.signupUrl })),
          ...apis.map((a) => ({ label: `${a.name} docs`, url: a.docsUrl })),
        ]),
        tip('Use a password manager', `Use 1Password, Bitwarden or your browser's built-in one. You are about to collect a lot of logins and secret keys. Never keep them in a notes app or a Google Doc.`),
      ],
      checklist: [
        'Create your Stripe account',
        'Create your Resend account',
        'Create your DataFast or PostHog account',
        ...(apis.length ? [`Create accounts for ${apis.map((a) => a.name).join(', ')}`] : []),
      ],
    }),
    task({
      id: 'fnd-feed-build-prd',
      title: 'Feed Claude the Build PRD',
      outcome: 'Claude has turned your PRD into PLAN.md and TASKS.md, and you approved them.',
      minutes: 20,
      xp: 40,
      blocks: [
        eli5(
          'What is a PRD?',
          `A PRD (product requirements document) is the full description of what ${name} does: every screen, every rule, what is out of scope. Builders work from it the way a builder works from house plans. We wrote it for you, so Claude starts with a complete brief instead of guessing.`,
        ),
        {
          type: 'doc',
          id: 'fnd-build-prd',
          title: `${name} Build PRD`,
          filename: 'PRD.md',
          summary: `The complete build spec for ${name}: users, features, data model, flows, edge cases and what is out of scope for v1.`,
          content: app.content.buildPrd,
        },
        steps(
          `Click **Download .md** on the PRD above. It saves as \`PRD.md\` in your Downloads folder.`,
          `Drag \`PRD.md\` from Downloads into your \`${slug}\` folder (the Finder or Explorer window you opened in Setup).`,
          `In VS Code, check \`PRD.md\` now appears in the file list next to \`CLAUDE.md\`.`,
          `In Claude Code, press **Shift + Tab** until the bottom says **plan mode on**.`,
          `Paste the prompt below and press Enter. Claude reads the PRD and writes a plan. It takes two to five minutes.`,
          `Read the plan it shows you. If it looks sensible, choose **Yes** to let it write PLAN.md and TASKS.md. If something is wrong, say so in plain words and ask for a new plan.`,
        ),
        prompt(
          'fnd-build-prd-prompt',
          'Plan mode: PRD to PLAN and TASKS',
          `
Plan mode. Read @PRD.md and @CLAUDE.md fully. Do not write any app code yet.

Produce two files:

1. PLAN.md with these sections:
   - Data model: every table, its columns and types, foreign keys, and the RLS
     policy for each operation (select, insert, update, delete).
   - Pages and routes: every URL in the app, who can see it (public, logged in,
     paying), and what it shows.
   - API routes, server actions and Supabase edge functions, with their inputs
     and outputs.
   - Third-party calls (Supabase, Stripe, Resend${apis.length ? ', ' + apis.map((a) => a.name).join(', ') : ''}) and which file makes each one.
   - Environment variables, split into browser-safe (NEXT_PUBLIC_) and server-only.

2. TASKS.md: an ordered checklist using "- [ ]" boxes. Each task changes under
   ~200 lines, touches as few files as possible, and ends with a "Verify:" line
   that I can run myself (a command, or exactly what to click at localhost:3000).
   Order: scaffold, landing page, auth pages, onboarding, app shell, then the
   core ${name} features, then billing.

Before writing, list any part of the PRD that is unclear or contradicts itself and
ask me about it. Then show me both files' outline for approval.
`,
        ),
        p(`**Check it worked:** in VS Code you now see \`PLAN.md\` and \`TASKS.md\`. Open TASKS.md: every task has a "Verify:" line.`),
        tip('If the plan is huge', `That is normal for a full app. You do not work through TASKS.md in one go. Each later task in this playbook tells Claude which part to build.`),
      ],
      checklist: [
        ['Download PRD.md', 'download:fnd-build-prd'],
        `Move PRD.md into your ${slug} folder`,
        ['Run the plan prompt in plan mode', 'copy:fnd-build-prd-prompt'],
        'Approve PLAN.md and TASKS.md',
      ],
    }),
    task({
      id: 'fnd-feed-design-prd',
      title: 'Feed Claude the Design PRD',
      outcome: `Claude knows ${name}'s colours, fonts, spacing and every screen's layout.`,
      minutes: 10,
      xp: 25,
      blocks: [
        eli5(
          'Why a separate design file?',
          `Without design rules, AI apps all look the same: purple gradients and floating cards. DESIGN.md is the style guide. It fixes the colours, fonts and spacing so every page Claude builds matches.`,
        ),
        {
          type: 'doc',
          id: 'fnd-design-prd',
          title: `${name} Design PRD`,
          filename: 'DESIGN.md',
          summary: `Design tokens, components, screen layouts, motion, onboarding and auth page designs for ${name}.`,
          content: app.content.designPrd,
        },
        steps(
          `Click **Download .md** above. It saves as \`DESIGN.md\`.`,
          `Drag it into your \`${slug}\` folder next to PRD.md.`,
          `Paste the prompt below into Claude Code (auto mode is fine for this one).`,
        ),
        prompt(
          'fnd-design-prd-prompt',
          'Load the design rules',
          `
Read @DESIGN.md fully. Then:
1. Confirm CLAUDE.md imports it (the line "UI rules: @DESIGN.md"). Add it if missing.
2. Summarise back to me in under 15 lines: the colour tokens with hex values, the
   fonts, the spacing scale, the border radius, and the list of screens it designs.
3. Add one line to TASKS.md under the scaffold task: "Set up DESIGN.md tokens as
   Tailwind theme variables and shadcn/ui CSS variables in app/globals.css".
4. List anything in DESIGN.md that conflicts with PLAN.md (a screen in one but not
   the other) and ask me which wins.
Do not write any app code yet.
`,
        ),
        p(`**Check it worked:** Claude prints your colour hex codes and font names, and TASKS.md has the new tokens line.`),
        tip('Optional design skill', `Anthropic publishes a frontend-design skill. In Claude Code run \`/plugin marketplace add anthropics/skills\` then \`/plugin install example-skills@anthropic-agent-skills\`. Claude then follows stricter design rules on every page.`),
      ],
      checklist: [
        ['Download DESIGN.md', 'download:fnd-design-prd'],
        `Move DESIGN.md into your ${slug} folder`,
        ['Run the design prompt', 'copy:fnd-design-prd-prompt'],
        'Check Claude lists your colour tokens',
      ],
    }),
    task({
      id: 'fnd-scaffold',
      title: 'Scaffold the Next.js app',
      outcome: 'A blank Next.js app with Tailwind and shadcn/ui runs at localhost:3000.',
      minutes: 15,
      xp: 40,
      blocks: [
        eli5(
          'What is scaffolding?',
          `Scaffolding is the empty skeleton of an app: folders, config files and a starter page. Next.js gives you this with one command. Claude runs it, then adds Tailwind (styling) and shadcn/ui (ready-made buttons, inputs and dialogs).`,
        ),
        prompt(
          'fnd-scaffold-prompt',
          'Scaffold the project',
          `
Create a Next.js App Router project in this folder for ${name}, with TypeScript,
Tailwind CSS, ESLint, the src/ directory OFF, and the "@/*" import alias.

IMPORTANT: this folder already contains CLAUDE.md, PRD.md, DESIGN.md, PLAN.md,
TASKS.md and .claude/. Do not delete or overwrite any of them. If create-next-app
refuses because the folder is not empty, scaffold into ./tmp-app, move every file
and folder from tmp-app into the root (skip anything that already exists), then
delete tmp-app.

Then:
1. Initialise shadcn/ui (npx shadcn@latest init) and add these components:
   button, input, label, card, dialog, dropdown-menu, sonner, form, badge, avatar,
   separator, skeleton, tabs.
2. Apply the DESIGN.md tokens: colours as CSS variables in app/globals.css that
   shadcn/ui uses, fonts via next/font, radius and spacing in the Tailwind theme.
3. Create .env.example with these names and empty values:
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
   SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, RESEND_API_KEY,
   EMAIL_FROM${apis.flatMap((a) => nextEnvVars(a).map((v) => ', ' + v.name)).join('')}
4. Make sure .gitignore includes: node_modules/, .next/, .env, .env.*,
   !.env.example, .vercel/, supabase/.temp/, .claude/settings.local.json, .DS_Store
5. Replace the default home page with a single line "${name} is coming" styled
   with the DESIGN.md tokens.
6. Run npm run build and npm run lint and show me the full output. Fix any errors.
`,
        ),
        steps(
          `Paste the prompt into Claude Code. It asks permission for a few commands (npx, npm install). Choose **Yes** each time.`,
          `When it finishes, open a **second terminal window** (Cmd + N on Mac, or a new PowerShell window), \`cd\` into your \`${slug}\` folder, and run \`npm run dev\`.`,
          `Open http://localhost:3000 in your browser. You should see "${name} is coming" in your brand font and colours.`,
          `Leave that second terminal running while you build. It reloads the page every time Claude changes a file. Press Ctrl + C in it to stop.`,
        ),
        code('fnd-scaffold-dev', 'Second terminal window', 'bash', `cd ~/Projects/${slug}\nnpm run dev`),
        eli5('What is localhost:3000?', `localhost means "this computer". 3000 is the door number the app listens on. Only you can see it. It goes public in the Deployment phase.`),
        mistakes([
          { mistake: 'Running npm run dev in the same window as Claude Code', fix: 'Use a second terminal window. Claude Code stays in the first one.' },
          { mistake: 'Page shows "This site cannot be reached"', fix: 'The dev server is not running. Run npm run dev in the second window and wait for "Ready".' },
          { mistake: 'Claude deleted PRD.md during scaffolding', fix: 'Download it again from Feed Claude the Build PRD and drop it back in the folder.' },
        ]),
      ],
      checklist: [
        ['Run the scaffold prompt', 'copy:fnd-scaffold-prompt'],
        ['Start the dev server in a second window', 'copy:fnd-scaffold-dev'],
        'Open localhost:3000 and see the placeholder page',
        'Check npm run build passed in Claude output',
      ],
    }),
    task(app.content.landingPrd ? {
      id: 'fnd-landing',
      title: 'Build the landing page from the Landing PRD',
      outcome: `localhost:3000 shows the full ${name} marketing site: every section, motion, pricing and FAQ.`,
      minutes: 60,
      xp: 70,
      blocks: [
        eli5(
          'Why a whole PRD for one page?',
          `The landing page is your best salesperson. It works 24 hours a day and decides whether a stranger starts a trial. A vague prompt gets a generic page. LANDING.md lists every section, every headline and button, the motion and the FAQ answers, so Claude builds a page that looks like a funded startup made it.`,
        ),
        {
          type: 'doc',
          id: 'fnd-landing-prd',
          title: `${name} Landing Page PRD`,
          filename: 'LANDING.md',
          summary: `Every section of the ${name} marketing site top to bottom: exact copy, layout, motion, pricing, FAQ, SEO and analytics events.`,
          content: app.content.landingPrd,
        },
        steps(
          `Click **Download .md** above. It saves as \`LANDING.md\`.`,
          `Drag \`LANDING.md\` into your \`${slug}\` folder next to PRD.md and DESIGN.md.`,
          `In Claude Code press **Shift + Tab** until it says **plan mode on**. A page this size goes better with a plan first.`,
          `Paste the prompt below. Approve the plan, then let it build. Expect 10 to 20 minutes.`,
          `Refresh http://localhost:3000 and scroll the whole page slowly. Every section in LANDING.md should be there, in order.`,
          `Check phone width: right-click > **Inspect** > phone icon > **iPhone 12 Pro**. Nothing spills off the side, and the nav collapses into a menu.`,
          `Turn on reduced motion to test the fallback. Mac: System Settings > Accessibility > Display > Reduce motion. Windows: Settings > Accessibility > Visual effects > Animation effects off. The page should still look finished with no animation.`,
        ),
        prompt(
          'fnd-landing-prompt',
          'Build the landing page from LANDING.md',
          `
Plan mode first. Read @LANDING.md, @DESIGN.md and @PRD.md fully.

Build the ${name} marketing site at app/(marketing)/page.tsx exactly as LANDING.md
specifies: every section in the same order, the exact copy (headings, sub-lines,
button labels, FAQ answers, pricing), the layout notes and the motion specs.

Rules:
- One component per section in components/landing/, named after the section.
- Motion with the "motion" package (npm i motion), using the durations and easing in
  LANDING.md. Every animation respects prefers-reduced-motion and has a finished
  static state.
- Pricing section uses the plans in LANDING.md with the monthly/annual toggle. Every
  pricing button goes to /signup?plan=<plan id>.
- Add the SEO title, meta description and Open Graph tags from LANDING.md in
  app/(marketing)/layout.tsx with the Next.js Metadata API. Create the OG image with
  app/opengraph-image.tsx as specified.
- Images and product visuals: build them as real UI mockups in code (divs styled with
  the DESIGN.md tokens), not stock photos or empty grey boxes.
- Must look right at 375px, 768px and 1440px wide. No horizontal scroll.
- Fire the analytics events listed in LANDING.md through a small lib/track.ts
  helper (console.log for now; we wire DataFast or PostHog later).

When done: run npm run build and npm run lint and show me the output. If you have the
Chrome DevTools or Playwright MCP, screenshot 375px and 1440px and list every
difference from LANDING.md, then fix them.
`,
        ),
        tip('Change the copy by talking', `Do not edit text by hand. Tell Claude: "In the hero, change the headline to: <your words>. Keep everything else." Small precise asks get small precise changes.`),
        mistakes([
          { mistake: 'Claude skips sections to save time', fix: 'Say: "Compare the page against every section heading in LANDING.md and build the missing ones."' },
          { mistake: 'Animations make the page jumpy on phones', fix: 'Say: "On screens under 768px, reduce every motion distance by half and remove parallax."' },
        ]),
      ],
      checklist: [
        ['Download LANDING.md', 'download:fnd-landing-prd'],
        `Move LANDING.md into your ${slug} folder`,
        ['Run the landing page prompt in plan mode', 'copy:fnd-landing-prompt'],
        'Scroll every section at localhost:3000',
        'Check it at iPhone width and with reduced motion',
      ],
    } : {
      id: 'fnd-landing',
      title: 'Build the landing page',
      outcome: `localhost:3000 shows a full ${name} sales page with one trial button.`,
      minutes: 25,
      xp: 45,
      blocks: [
        p(`The landing page is the first thing a buyer sees. It has one job: get them to click **Start ${price.trialDays}-day free trial**. Claude builds it from the PRD and DESIGN.md.`),
        prompt(
          'fnd-landing-prompt',
          'Build the landing page',
          `
Build the landing page at app/page.tsx for ${name}, following @DESIGN.md exactly
and using copy based on @PRD.md. Sections in this order:
1. Nav: logo text "${name}", links to #how-it-works, #pricing, #faq, "Log in"
   (to /login) and a primary button "Start ${price.trialDays}-day free trial" (to /signup).
2. Hero: headline that states the outcome for the customer (not the feature),
   one sub-line, the primary CTA button, and a 16:9 placeholder box with the label
   "Demo video" where a product GIF goes later.
3. Proof bar: a row for 3 to 5 logos or "Built for <ideal customer>" text.
4. Problem: 3 short pains the ideal customer feels, in their words.
5. How it works: 3 numbered steps.
6. Features: a grid of the features in the PRD, each with a one-line benefit.
7. Pricing (#pricing): one card, $${price.monthly}/month, "${price.trialDays}-day free trial",
   4 to 6 bullet points, the CTA button.
8. FAQ (#faq): 6 questions using shadcn Accordion (add it), covering price,
   cancellation, data privacy, setup time, who it is for, and support.
9. Final CTA band and a footer with links to /privacy and /terms placeholders.

Rules: one CTA destination only (/signup). Buttons say what happens, never
"Submit". Must look right at 375px wide (phone) and 1440px (desktop). Split
sections into components in components/landing/. No placeholder lorem ipsum.
Run npm run build and show me the output. If you have the Chrome DevTools MCP,
screenshot the page at 375px and 1440px and list anything that breaks DESIGN.md.
`,
        ),
        steps(
          `Paste the prompt into Claude Code and wait for it to finish.`,
          `Refresh http://localhost:3000. Scroll the whole page.`,
          `Check it on phone width: right-click the page > **Inspect** > click the phone/tablet icon at the top of the panel > pick **iPhone 12 Pro**. Nothing should spill off the side.`,
          `Click every nav link. #pricing and #faq should scroll down. "Start trial" goes to /signup (a 404 page for now is fine).`,
        ),
        tip('Change the copy by talking', `Do not edit the text yourself. Tell Claude: "Change the hero headline to: <your words>. Keep everything else." Small precise asks get small precise changes.`),
      ],
      checklist: [
        ['Run the landing page prompt', 'copy:fnd-landing-prompt'],
        'Scroll the page at localhost:3000',
        'Check it at iPhone width in DevTools',
        'Click every nav link',
      ],
    }),
    task({
      id: 'fnd-auth-pages',
      title: 'Build the auth pages',
      outcome: 'Sign up, sign in and forgot password pages exist and look finished.',
      minutes: 20,
      xp: 35,
      blocks: [
        eli5(
          'What is auth?',
          `Auth (short for authentication) is the sign up and log in part of an app. It proves you are you, so you only ever see your own data. Today you build how it looks. In the Backend phase you plug it into Supabase so it works for real.`,
        ),
        prompt(
          'fnd-auth-pages-prompt',
          'Build the auth page UI',
          `
Build the auth pages for ${name} following the auth page designs in @DESIGN.md.
UI only for now: the forms call placeholder server actions in
app/(auth)/actions.ts that return { error: "Not connected yet" }. We wire them to
Supabase in a later task.

Pages (inside an app/(auth) route group with a shared centred layout and the logo):
1. /signup: email, password (min 8 characters, show/hide toggle), a line
   "${price.trialDays}-day free trial. Cancel any time.", button "Create account",
   link "Already have an account? Log in".
2. /login: email, password, button "Log in", links "Forgot password?" and
   "New here? Start free trial".
3. /forgot-password: email, button "Send reset link", success state text
   "Check your inbox for a reset link".
4. /reset-password: new password + confirm password, button "Save new password".

Use shadcn Form with react-hook-form and zod for validation (install them).
Show field errors under each field and a form-level error with sonner toasts.
Disable the button and show a spinner while submitting. Every input has a label,
correct type and autocomplete attribute. Must work at 375px wide.
Run npm run build and show me the output.
`,
        ),
        steps(
          `Paste the prompt and wait.`,
          `Open http://localhost:3000/signup. Try to submit with an empty email: you should see a red error under the field.`,
          `Type a valid email and an 8+ character password and submit: you should see "Not connected yet". That is correct for now.`,
          `Open /login, /forgot-password and /reset-password and check each one matches the design.`,
        ),
      ],
      checklist: [
        ['Run the auth pages prompt', 'copy:fnd-auth-pages-prompt'],
        'Test empty-field errors on /signup',
        'Open /login, /forgot-password and /reset-password',
      ],
    }),
    task({
      id: 'fnd-onboarding',
      title: 'Build the onboarding flow',
      outcome: `New users get a short welcome flow that sets up ${name} for them.`,
      minutes: 20,
      xp: 35,
      blocks: [
        eli5(
          'Why onboarding matters',
          `Most people who sign up for an app never come back after day one. A good onboarding flow asks two or three questions, sets things up for them and gets them to the first "oh nice" moment within a few minutes. That moment is what makes them pay when the trial ends.`,
        ),
        prompt(
          'fnd-onboarding-prompt',
          'Build onboarding',
          `
Build the onboarding flow for ${name} at /onboarding, following the onboarding
section of @DESIGN.md and the activation event in @PRD.md.

- 3 steps maximum, one question per screen, with a progress bar and Back/Continue.
- Ask only what ${name} needs to personalise the first session (take the questions
  from the PRD; if it does not list them, propose 3 and ask me before building).
  Ideal customer: ${app.idealFor}.
- The last step sends the user to /app with a first-run checklist visible.
- For now store answers in React state and log them; in the Backend phase we save
  them to the profiles table. Put the save call behind a function
  saveOnboarding(answers) in app/onboarding/actions.ts that we can fill in later.
- Keyboard: Enter continues, the first input is autofocused.
- Must work at 375px.
Run npm run build and show me the output.
`,
        ),
        steps(
          `Paste the prompt. If Claude asks you to confirm the questions, reply with any changes or "looks good".`,
          `Open http://localhost:3000/onboarding and click through every step.`,
          `Press Back on step 2 and check your step 1 answer is still there.`,
          `The final Continue should take you to /app (a blank or 404 page is fine until the next task).`,
        ),
      ],
      checklist: [['Run the onboarding prompt', 'copy:fnd-onboarding-prompt'], 'Click through every onboarding step', 'Check Back keeps your answers'],
    }),
    task({
      id: 'fnd-shell',
      title: 'Build the app shell and dashboard',
      outcome: `/app shows ${name}'s sidebar, top bar and an empty-state dashboard.`,
      minutes: 25,
      xp: 40,
      blocks: [
        eli5(
          'What is an app shell?',
          `The shell is the frame that stays the same on every logged-in page: the sidebar, the top bar with your account menu, and the space in the middle where each page loads. Build it once and every feature slots inside.`,
        ),
        prompt(
          'fnd-shell-prompt',
          'Build the app shell',
          `
Build the logged-in app shell for ${name} under app/(app)/ following @DESIGN.md
and the pages list in @PLAN.md.

1. app/(app)/layout.tsx: left sidebar (collapses to a bottom sheet menu under
   768px) with the ${name} logo, nav items for every logged-in page in PLAN.md,
   and at the bottom "Billing" and "Settings". Top bar with page title and an
   avatar dropdown: "Settings", "Billing", "Log out".
2. app/(app)/app/page.tsx at /app: the dashboard. Show a first-run checklist card
   (3 items from the PRD activation path), and an empty state with an icon, one
   sentence and a primary button that starts the core ${name} action.
3. Placeholder pages for every other nav item with a proper empty state (no
   "coming soon").
4. app/(app)/settings/page.tsx with sections Profile, Email, Password, Delete
   account (buttons can be disabled for now).
5. app/(app)/billing/page.tsx with a card "Plan: ${name} $${price.monthly}/month" and a
   disabled "Manage billing" button. We wire it in the Payments phase.
6. Loading skeletons (loading.tsx) and an error boundary (error.tsx) for the group.

No auth checks yet; we add them when Supabase is connected.
Run npm run build and show me the output.
`,
        ),
        steps(
          `Paste the prompt and wait.`,
          `Open http://localhost:3000/app. You should see the sidebar, the top bar and the empty dashboard.`,
          `Click every sidebar item. None should show a 404.`,
          `Shrink the browser to phone width. The sidebar should turn into a menu button.`,
        ),
        tip('Commit point', `This is a good moment to say to Claude: "Initialise git if it is not already, and commit everything with the message Add app shell". You push it online in the Deployment phase.`),
      ],
      checklist: [['Run the app shell prompt', 'copy:fnd-shell-prompt'], 'Open /app and click every sidebar link', 'Check the menu at phone width'],
    }),
  ]

  return {
    id: 'foundations',
    label: 'Foundations & Frontend',
    title: `Plan ${name} and build every screen`,
    goal: `Claude has your PRD, design rules and a plan, and every ${name} screen runs at localhost:3000.`,
    icon: 'layout',
    tasks: [...tasks, ...app.content.frontendTasks],
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Backend
// ---------------------------------------------------------------------------

function apiKeyTask(app: AppDef, api: ApiDef): Task {
  const s = slugify(api.name)
  const id = `be-api-${s}`
  const localVars = api.envVars.filter((v) => /env\.local/i.test(v.pasteInto))
  const fnVars = api.envVars.filter((v) => /supabase secrets/i.test(v.pasteInto))
  const blocks: Block[] = [
    p(`**What ${api.name} does in ${app.name}:** ${api.job}. **Pricing:** ${api.pricing}.`),
    steps(
      `Log in to ${api.name} (${api.signupUrl}).`,
      `Find the API keys page (see the "where" column below) and create a new key. Name it \`${app.slug}-dev\` so you can tell it apart later.`,
      `Copy the key straight into your password manager first, then into the place in the "paste into" column.`,
      ...(localVars.length
        ? [`For \`.env.local\` values: open \`.env.local\` in VS Code, add one line per variable as \`NAME=value\` (no spaces, no quotes), and save with Cmd + S or Ctrl + S.`]
        : []),
      ...(fnVars.length ? [`For Supabase secrets: run the \`npx supabase secrets set\` command below in your terminal (not inside Claude Code). You linked the CLI in "Install and link the Supabase CLI".`] : []),
      `Restart the dev server (Ctrl + C in the second window, then \`npm run dev\`) so Next.js reads the new values.`,
    ),
    keys(api.envVars.map(envRow)),
  ]
  if (localVars.length) {
    blocks.push(code(`${id}-env`, '.env.local (add these lines)', 'env', localVars.map((v) => `${v.name}=`).join('\n')))
  }
  if (fnVars.length) {
    blocks.push(code(`${id}-secrets`, 'Terminal (outside Claude Code)', 'bash', fnVars.map((v) => `npx supabase secrets set ${v.name}=paste_value_here`).join('\n')))
  }
  blocks.push(
    prompt(
      `${id}-prompt`,
      `Check the ${api.name} key is wired`,
      `
Check that ${api.name} is set up correctly without printing any secret values.
1. Confirm .env.example lists ${api.envVars.map((v) => v.name).join(', ')} (add any missing names, no values).
2. Confirm these variables are only read in server code (route handlers, server
   actions, lib/ files imported only by server code, or Supabase edge functions),
   never in a "use client" file and never with a NEXT_PUBLIC_ prefix unless it is
   a publishable key.
3. Create lib/${s}.ts (or the edge function helper if the PRD puts ${api.name} in an
   edge function) with a typed client and one small health-check call from the
   ${api.name} docs (${api.docsUrl}). Run it once from a temporary script or route and
   tell me only "OK" plus the HTTP status, never the key.
4. Delete the temporary script afterwards.
`,
    ),
    p(`**Check it worked:** Claude reports "OK" with a 200 status from ${api.name}. If you see 401, the key is wrong or has a space at the end: copy it again.`),
    links([
      { label: `${api.name} sign up`, url: api.signupUrl },
      { label: `${api.name} docs`, url: api.docsUrl },
    ]),
  )
  return task({
    id,
    title: `Add your ${api.name} key`,
    outcome: `${app.name} can call ${api.name} to ${api.job.replace(/\.$/, '')}.`,
    minutes: 10,
    xp: 20,
    blocks,
    checklist: [
      `Create a ${api.name} API key named ${app.slug}-dev`,
      ...(localVars.length ? [[`Add the ${api.name} lines to .env.local`, `copy:${id}-env`] as CheckSpec] : []),
      ...(fnVars.length ? [[`Set the ${api.name} Supabase secrets`, `copy:${id}-secrets`] as CheckSpec] : []),
      [`Run the ${api.name} check prompt`, `copy:${id}-prompt`],
    ],
  })
}

function edgeFunctionTask(app: AppDef, fn: EdgeFunctionDef): Task {
  const s = slugify(fn.name)
  const id = `be-fn-${s}`
  const blocks: Block[] = [
    p(`**What it does:** ${fn.purpose}`),
    p(`**What starts it:** ${fn.trigger}`),
  ]
  if (fn.secrets.length) {
    blocks.push(
      p(`This function needs ${fn.secrets.length === 1 ? 'one secret' : `${fn.secrets.length} secrets`}. Edge functions cannot read your \`.env.local\`, so you hand them over with the CLI. Run these in a normal terminal window (not inside Claude Code), replacing \`paste_value_here\` with the real value. Skip any you already set in an earlier task.`),
      code(`${id}-secrets`, 'Terminal (outside Claude Code)', 'bash', fn.secrets.map((n) => `npx supabase secrets set ${n}=paste_value_here`).join('\n')),
      p(`Check with \`npx supabase secrets list\`. You see the names (not the values). \`SUPABASE_URL\` and \`SUPABASE_SERVICE_ROLE_KEY\` are there by default, so never set those yourself.`),
    )
  }
  blocks.push(
    prompt(
      `${id}-prompt`,
      `Build the ${fn.name} edge function`,
      `
${fn.prompt.trim()}

General rules for this ${app.name} edge function:
- Location: supabase/functions/${fn.name}/index.ts (create it with
  npx supabase functions new ${fn.name} if it does not exist).
- Read secrets with Deno.env.get("NAME") only. Never hardcode or log them.
- If it is called from the browser, check the caller's JWT with
  supabase.auth.getClaims() and reject anonymous requests with 401. Handle the
  OPTIONS preflight with CORS headers limited to http://localhost:3000 and
  NEXT_PUBLIC_SITE_URL.
- If it is called by a third-party webhook, verify that provider's signature
  before doing anything.
- Return JSON with clear error messages and correct status codes.
- After writing it, deploy with: npx supabase functions deploy ${fn.name}
  and show me the output. Then tell me exactly how to test it from the app.
`,
    ),
    code(`${id}-deploy`, 'Deploy (Claude runs this, or you can)', 'bash', `npx supabase functions deploy ${fn.name}`),
    steps(
      `Paste the prompt into Claude Code (Shift + Tab to plan mode first if it touches payments or user data).`,
      `When it deploys, open Supabase > **Edge Functions** in the left sidebar. You should see \`${fn.name}\` in the list.`,
      `Do the action that starts it (${fn.trigger.replace(/\.$/, '')}).`,
      `Back in Supabase > Edge Functions > \`${fn.name}\` > **Logs**, you should see a new line with status 200. Anything red: copy the log line into Claude Code and ask it to fix the cause.`,
    ),
  )
  return task({
    id,
    title: `Edge function: ${fn.name}`,
    outcome: fn.purpose,
    minutes: 25,
    xp: 45,
    blocks,
    checklist: [
      ...(fn.secrets.length ? [[`Set the secrets for ${fn.name}`, `copy:${id}-secrets`] as CheckSpec] : []),
      [`Run the ${fn.name} build prompt`, `copy:${id}-prompt`],
      `Deploy ${fn.name}`,
      `See a 200 in the ${fn.name} logs`,
    ],
  })
}

function backendPhase(app: AppDef): Phase {
  const { name, slug, apis } = app
  const fns = app.content.edgeFunctions

  const tasks: Task[] = [
    task({
      id: 'be-supabase-account',
      title: 'Create your Supabase account',
      outcome: 'You are logged in to the Supabase dashboard.',
      minutes: 5,
      xp: 10,
      blocks: [
        eli5(
          'What is Supabase?',
          `Supabase is the back office of ${name}. It stores every user's data in a database, handles sign up and log in, keeps uploaded files, and runs small bits of server code called edge functions. You get all of that from one dashboard.`,
        ),
        steps(
          `Go to supabase.com and click **Start your project**.`,
          `Click **Continue with GitHub** if you already have GitHub, otherwise sign up with email and password and verify your email.`,
          `When asked to create an organisation, name it after yourself or your company, pick **Personal**, plan **Free**, and click **Create organization**.`,
        ),
        links([{ label: 'Supabase sign up', url: 'https://supabase.com/dashboard/sign-up' }]),
      ],
      checklist: ['Sign up at supabase.com', 'Create your organisation on the Free plan'],
    }),
    task({
      id: 'be-supabase-project',
      title: `Create the ${slug} project`,
      outcome: `A Supabase project for ${name} is running.`,
      minutes: 5,
      xp: 15,
      blocks: [
        eli5(
          'What is a project?',
          `A Supabase project is one complete back office: its own database, its own logins, its own storage and its own keys. ${name} gets one project. If you build a second app later, it gets its own.`,
        ),
        steps(
          `In the Supabase dashboard click **New project**.`,
          `**Name:** \`${slug}\`.`,
          `**Database password:** click **Generate a password**, then copy it into your password manager under "${name} Supabase DB". You rarely need it, but you cannot see it again.`,
          `**Region:** pick the one closest to most of your customers (for example **East US (North Virginia)** for the US, **West EU (London)** for the UK).`,
          `Click **Create new project**. Wait one to two minutes until the green "Project is ready" state.`,
          `Copy your **project ref**: it is the random string in the browser address bar after \`/project/\` (for example \`abcdxyzabcdxyzabcd\`). Save it in your password manager too.`,
        ),
        warn('Never share the database password', `If you ever paste it somewhere public, go to Project Settings > Database > Reset database password and save the new one.`),
        p(`**Check it worked:** the project home page shows your project name \`${slug}\` and the left sidebar lists Table Editor, SQL Editor, Authentication and Storage.`),
      ],
      checklist: [`Create the ${slug} project`, 'Save the database password in your password manager', 'Save the project ref'],
    }),
    task({
      id: 'be-supabase-keys',
      title: 'Copy your Supabase keys into .env.local',
      outcome: `Your local ${name} app knows which Supabase project to talk to.`,
      minutes: 10,
      xp: 25,
      blocks: [
        eli5(
          'What is an env var?',
          `An environment variable (env var) is a named secret your app reads when it starts, like a labelled envelope. The code says "open the envelope called SUPABASE_SECRET_KEY" and never contains the key itself. \`.env.local\` is the drawer those envelopes live in on your computer, and it never gets uploaded.`,
        ),
        eli5(
          'Publishable vs secret key',
          `The publishable key (starts \`sb_publishable_\`) is like a shop's front door key: fine to hand out, because the database rules decide what each visitor can see. The secret key (starts \`sb_secret_\`) is the master key that ignores every rule. It only ever lives on the server.`,
        ),
        steps(
          `In Supabase, open your project, click the **gear icon (Project Settings)** at the bottom of the left sidebar.`,
          `Click **Data API**. Copy the **Project URL** (looks like \`https://abcd.supabase.co\`).`,
          `Click **API Keys**. Copy the **Publishable key** (\`sb_publishable_...\`).`,
          `On the same page under **Secret keys**, click the eye or copy icon next to the default secret key (\`sb_secret_...\`). If there is none, click **+ New secret key**, name it \`${slug}-server\`, and copy it.`,
          `In VS Code, right-click in the file list > **New File** > name it exactly \`.env.local\` (with the dot at the start).`,
          `Paste the block below into it, fill in the three values after the \`=\` signs (no spaces, no quotes) and save.`,
          `Restart the dev server: Ctrl + C in the second terminal window, then \`npm run dev\`.`,
        ),
        code(
          'be-supabase-env',
          '.env.local',
          'env',
          `
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
`,
        ),
        keys([
          ...supabaseRows('.env.local'),
          { name: 'NEXT_PUBLIC_SITE_URL', where: 'Type it: http://localhost:3000 for now, your domain after Deployment', pasteInto: '.env.local', secret: false },
        ]),
        warn('Never paste keys into Claude Code', `Claude does not need to see your keys to use them. If you ever paste a secret key into the chat, a screenshot or a commit, create a new one in Supabase and delete the old one.`),
        p(`**Check it worked:** in Claude Code ask "Does .env.local exist and does it contain the names NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY with non-empty values? Do not print the values." It should answer yes for all three. (The hook stops it editing the file, but it can still read names.)`),
      ],
      checklist: [
        'Copy the Project URL',
        'Copy the publishable key',
        'Copy the secret key',
        ['Create .env.local and paste the block', 'copy:be-supabase-env'],
        'Restart the dev server',
      ],
    }),
    task({
      id: 'be-auth-settings',
      title: 'Turn off email confirm and set redirect URLs',
      outcome: 'New users can sign up and start using the app instantly.',
      minutes: 5,
      xp: 15,
      blocks: [
        eli5(
          'Why turn off confirm email?',
          `With it on, every new user has to leave your app, open their inbox and click a link before they can try anything. Lots of them never come back. With it off, they sign up and land straight in onboarding.`,
        ),
        steps(
          `Supabase > **Authentication** (left sidebar) > **Sign In / Providers**.`,
          `Click **Email**. Turn **Confirm email** OFF. Leave **Enable Email provider** ON. Click **Save**.`,
          `Go to Authentication > **URL Configuration**.`,
          `**Site URL:** \`http://localhost:3000\`. Click **Save**.`,
          `Under **Redirect URLs** click **Add URL**, enter \`http://localhost:3000/**\` and save.`,
        ),
        tip('You come back here twice', `In Deployment you add your Vercel URL, then your real domain. Supabase refuses to send users to any address that is not on this list.`),
      ],
      checklist: ['Turn off Confirm email', 'Set Site URL to http://localhost:3000', 'Add http://localhost:3000/** to Redirect URLs'],
    }),
    task({
      id: 'be-run-sql',
      title: `Run the ${name} database SQL`,
      outcome: `Every table, security rule and storage bucket ${name} needs exists in Supabase.`,
      minutes: 10,
      xp: 40,
      blocks: [
        eli5(
          'What is RLS?',
          `Row Level Security (RLS) is a bouncer for each table. Every time someone asks for data, the bouncer checks "is this row yours?" and only hands over the rows that are. Without RLS, anyone with your publishable key could read every customer's data. The SQL below switches the bouncer on for every table.`,
        ),
        eli5(
          'What is SQL?',
          `SQL is the language databases speak. This one block creates all of ${name}'s tables, the RLS rules, automatic triggers (like creating a profile when someone signs up) and file storage buckets. You paste it once and click Run.`,
        ),
        code('be-sql', 'supabase/migrations/0001_init.sql', 'sql', app.content.sql),
        steps(
          `Click **Copy** on the SQL block above.`,
          `Supabase > **SQL Editor** (left sidebar) > **+ New query** (or the + tab).`,
          `Paste the SQL into the empty editor.`,
          `Click **Run** (bottom right) or press Cmd + Enter / Ctrl + Enter.`,
          `If a pop-up warns about "destructive operations" or RLS, read it, then click **Run this query**. You should see **Success. No rows returned.**`,
          `Open **Table Editor** in the left sidebar. You should see ${name}'s tables listed, each without a red "RLS disabled" or "Unrestricted" badge.`,
          `Save a copy for Claude: ask Claude Code "Create supabase/migrations/0001_init.sql containing the exact SQL I ran" and paste the SQL after it.`,
        ),
        mistakes([
          { mistake: 'Error: relation already exists', fix: 'You ran it twice. That is fine if the first run succeeded. Check Table Editor shows all tables.' },
          { mistake: 'Error part way through', fix: 'Copy the full red error text into Claude Code: "I ran this SQL in Supabase and got this error. Give me a fixed version that is safe to rerun." Run the fixed version.' },
          { mistake: 'A table shows Unrestricted', fix: 'RLS is off on that table. Ask Claude to write the enable row level security line and the four policies for it, and run them in the SQL Editor.' },
        ]),
      ],
      checklist: [
        ['Copy the SQL', 'copy:be-sql'],
        'Run it in SQL Editor > New query',
        'See Success. No rows returned',
        'Check Table Editor shows every table with RLS on',
      ],
    }),
    task({
      id: 'be-mcp',
      title: 'Connect the Supabase MCP to Claude Code',
      outcome: 'Claude can look at your database and run security checks itself.',
      minutes: 10,
      xp: 30,
      blocks: [
        p(`Remember the MCP plugs from Setup? This is the most useful one. Claude gets read access to your tables, logs and the Supabase security advisor, locked to this one project.`),
        steps(
          `Quit Claude Code with \`/exit\`.`,
          `In the same terminal (inside \`${slug}\`), run the command below, replacing \`<project-ref>\` with the project ref you saved.`,
          `Start Claude Code again with \`claude\`.`,
          `Type \`/mcp\`. Select **supabase** > **Authenticate**. A browser tab opens: pick your organisation and click **Authorize**.`,
          `Back in Claude Code, \`/mcp\` should show supabase as **connected**.`,
          `Paste the verify prompt below.`,
        ),
        code(
          'be-mcp-add',
          'Terminal (in your project folder)',
          'bash',
          `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<project-ref>"`,
        ),
        prompt(
          'be-mcp-verify',
          'Verify the database',
          `
Use the Supabase MCP. Do not change anything.
1. Run list_tables for the public schema. Show me a table: table name | RLS on? |
   number of policies | which operations they cover.
2. Compare it with the data model in @PLAN.md and supabase/migrations/0001_init.sql.
   List anything missing or extra.
3. Run get_advisors for both "security" and "performance". Show every finding with
   its level and a one-line fix in plain English.
4. If any finding is ERROR level, write a new migration file in supabase/migrations
   that fixes it, show it to me and wait for my approval before applying it.
`,
        ),
        p(`**Check it worked:** Claude prints your tables with "RLS on: yes" for each, and the advisor shows no ERROR level findings (WARN level items it explains are fine for now).`),
        tip('Ask Claude about your data any time', `"How many rows are in profiles?" or "Show me the last 5 errors in the auth logs" now work without you opening the dashboard.`),
      ],
      checklist: [
        ['Add the Supabase MCP with your project ref', 'copy:be-mcp-add'],
        'Authenticate in /mcp',
        ['Run the verify prompt', 'copy:be-mcp-verify'],
        'See RLS on for every table',
      ],
    }),
    task({
      id: 'be-wire-auth',
      title: 'Wire Supabase auth into Next.js',
      outcome: 'Sign up, log in, log out and password reset work for real.',
      minutes: 30,
      xp: 60,
      blocks: [
        eli5(
          'Why the server checks the user',
          `Your browser holds a login cookie. Anyone can fake a cookie, so the server never trusts it blindly. \`getClaims()\` checks the cookie's signature with Supabase every time, like a bouncer checking a wristband under a UV light.`,
        ),
        p(`Press **Shift + Tab** to plan mode and run \`/effort high\` first. Auth is one of the jobs worth the extra thinking.`),
        prompt(
          'be-wire-auth-prompt',
          'Connect auth to Supabase',
          `
Plan mode. Connect ${name}'s auth pages to Supabase using @supabase/ssr and
@supabase/supabase-js, following the official Supabase Next.js server-side auth
guide. Use the env names NEXT_PUBLIC_SUPABASE_URL and
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.

1. lib/supabase/client.ts: createBrowserClient for "use client" components.
2. lib/supabase/server.ts: async createClient() using cookies() from next/headers.
3. lib/supabase/admin.ts: a client using SUPABASE_SECRET_KEY with
   import "server-only" at the top, so it can never be bundled for the browser.
4. Session refresh: check the installed Next.js version in package.json. Next 16+
   uses proxy.ts, Next 15 or earlier uses middleware.ts. Refresh the session with
   supabase.auth.getClaims() and redirect logged-out users away from /app, /onboarding,
   /settings and /billing to /login?next=<path>. Exclude static files and /api/stripe/webhook
   from the matcher.
5. Replace the placeholder actions in app/(auth)/actions.ts:
   - signUp: supabase.auth.signUp, then redirect to /onboarding.
   - logIn: signInWithPassword, then redirect to the "next" param or /app.
   - logOut: signOut, redirect to /.
   - forgotPassword: resetPasswordForEmail with redirectTo
     \${NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password.
   - resetPassword: updateUser({ password }).
   Show friendly errors ("Wrong email or password", "That email is already
   registered") instead of raw Supabase messages.
6. app/auth/confirm/route.ts: handles the token_hash + type from the reset email
   with verifyOtp and redirects to "next".
7. Every server component and server action under app/(app) gets the user with
   supabase.auth.getClaims() (claims.sub is the user id). Never getSession().
8. Save onboarding answers: fill in saveOnboarding() to update the user's row in
   public.profiles (check the column names with the Supabase MCP first).
9. Logged-in users who visit /login or /signup go to /app.

When done: run npm run build and show the output. Then tell me exactly what to
click to test sign up, log out, log in and forgot password.
`,
        ),
        steps(
          `Approve the plan when it matches the list above.`,
          `At http://localhost:3000/signup create an account with a real email you own.`,
          `You should land on /onboarding. Finish it and land on /app.`,
          `In Supabase > **Authentication > Users** your new user is listed. In **Table Editor > profiles** there is a matching row with your onboarding answers.`,
          `Log out from the avatar menu. Visit http://localhost:3000/app directly: you should be sent to /login.`,
          `Log in again. You should land on /app.`,
        ),
        mistakes([
          { mistake: 'Signup works but nothing appears in profiles', fix: 'The trigger that creates profiles did not run. Ask Claude to check the handle_new_user trigger with the Supabase MCP.' },
          { mistake: 'Logged-out users can still see /app', fix: 'The proxy or middleware file has the wrong name for your Next version. Ask Claude: "Check which Next.js version is installed and whether proxy.ts or middleware.ts is being called."' },
          { mistake: 'Invalid API key error', fix: 'A value in .env.local has a space or quote. Retype it, save, restart npm run dev.' },
        ]),
      ],
      checklist: [
        ['Run the auth wiring prompt in plan mode', 'copy:be-wire-auth-prompt'],
        'Sign up with a real email and land on onboarding',
        'See your user in Authentication > Users',
        'Log out and check /app redirects to /login',
      ],
    }),
    task({
      id: 'be-resend',
      title: 'Add Resend for email',
      outcome: `${name} can send welcome emails, and Supabase sends login emails through Resend.`,
      minutes: 15,
      xp: 30,
      blocks: [
        eli5(
          'Why not let Supabase send emails?',
          `Supabase's built-in email is for testing: it sends only a few per hour and often lands in spam. Resend is a proper email sender. You plug it into Supabase so password resets arrive fast, and ${name} uses it for its own emails too.`,
        ),
        steps(
          `Resend dashboard > **API Keys** > **Create API Key**. Name: \`${slug}-dev\`. Permission: **Sending access**. Click **Add**. Copy the key (\`re_...\`).`,
          `Open \`.env.local\` in VS Code and add the two lines below. Use \`onboarding@resend.dev\` for now: Resend lets you send from it to your own email address only, which is all you need while testing.`,
          `Supabase > **Authentication > Emails** > **SMTP Settings** tab. Turn on **Enable Custom SMTP**.`,
          `Fill in: **Sender email** \`onboarding@resend.dev\`, **Sender name** \`${name}\`, **Host** \`smtp.resend.com\`, **Port** \`465\`, **Username** \`resend\`, **Password** your \`re_...\` key. Click **Save changes**.`,
          `In the same Emails section, open the **Templates** tab. Under **Reset password**, change the link to \`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password\` and save.`,
          `Restart \`npm run dev\` and paste the prompt below.`,
        ),
        code('be-resend-env', '.env.local (add these lines)', 'env', `RESEND_API_KEY=\nEMAIL_FROM=${name} <onboarding@resend.dev>`),
        keys([...resendRows('.env.local'), { name: 'SMTP password', where: 'Same re_ key', pasteInto: 'Supabase > Authentication > Emails > SMTP Settings', secret: true }]),
        prompt(
          'be-resend-prompt',
          'Send the welcome email',
          `
Add transactional email with Resend.
1. npm install resend and @react-email/components.
2. lib/email.ts (import "server-only"): a sendEmail({ to, subject, react }) helper
   using RESEND_API_KEY and EMAIL_FROM. Log failures with the error message only,
   never the key.
3. emails/welcome.tsx: a React Email template for ${name} using the DESIGN.md
   colours: greeting, one sentence on what to do first (from the PRD activation
   step), a button to \${NEXT_PUBLIC_SITE_URL}/app, and a sign-off.
4. Send it once, right after a successful signUp in app/(auth)/actions.ts. If the
   email fails, the signup still succeeds.
Run npm run build and show me the output.
`,
        ),
        steps(
          `Sign up at localhost:3000/signup with **the same email you used for Resend** (onboarding@resend.dev only delivers to that address).`,
          `**Check it worked:** the welcome email arrives within a minute. Resend > **Emails** shows it as Delivered.`,
          `Log out, click **Forgot password?**, enter that email. The reset email arrives, the link opens /reset-password, and you can save a new password.`,
        ),
        tip('Real sender address later', `In Deployment you verify your own domain in Resend, then swap \`onboarding@resend.dev\` for \`hello@yourdomain.com\` here and in Supabase SMTP.`),
      ],
      checklist: [
        'Create a Resend API key',
        ['Add RESEND_API_KEY and EMAIL_FROM to .env.local', 'copy:be-resend-env'],
        'Turn on custom SMTP in Supabase with smtp.resend.com',
        ['Run the welcome email prompt', 'copy:be-resend-prompt'],
        'Receive the welcome email and a password reset email',
      ],
    }),
  ]

  if (fns.length) {
    tasks.push(
      task({
        id: 'be-cli',
        title: 'Install and link the Supabase CLI',
        outcome: 'You can deploy edge functions and set their secrets from your terminal.',
        minutes: 10,
        xp: 25,
        blocks: [
          eli5(
            'What is an edge function?',
            `An edge function is a small piece of server code that lives inside Supabase instead of in your Next.js app. It wakes up when something calls it (your app, a webhook, a schedule), does one job, and goes back to sleep. ${name} uses ${fns.length === 1 ? 'one' : fns.length} of them: ${fns.map((f) => f.name).join(', ')}.`,
          ),
          eli5(
            'What is the CLI?',
            `The Supabase CLI is a command-line remote control for your Supabase project. Installing it inside the project with npm means everyone (and Claude) uses the same version, run with \`npx supabase ...\`.`,
          ),
          steps(
            `In a normal terminal window inside \`${slug}\` (not inside Claude Code), run the first command to install the CLI.`,
            `Run \`npx supabase login\`. A browser tab opens. Click **Authorize**, then come back.`,
            `Run \`npx supabase init\` if there is no \`supabase/config.toml\` yet. Answer **N** to the VS Code settings questions.`,
            `Run the link command with your project ref. When it asks for the database password, paste the one from your password manager (nothing shows as you paste: that is normal) and press Enter.`,
          ),
          code(
            'be-cli-cmds',
            'Terminal (outside Claude Code)',
            'bash',
            `
npm i -D supabase
npx supabase login
npx supabase init
npx supabase link --project-ref <project-ref>
`,
          ),
          code('be-cli-check', 'Check it worked', 'bash', `npx supabase functions list\nnpx supabase secrets list`),
          p(`**Check it worked:** both commands print a table (it can be empty) instead of an error. \`secrets list\` shows the default \`SUPABASE_URL\` and \`SUPABASE_SERVICE_ROLE_KEY\` names.`),
        ],
        checklist: [
          ['Install the CLI with npm', 'copy:be-cli-cmds'],
          'Log in with npx supabase login',
          'Link the project with your project ref',
          ['Run functions list and secrets list', 'copy:be-cli-check'],
        ],
      }),
    )
  }
  tasks.push(...apis.map((api) => apiKeyTask(app, api)), ...fns.map((fn) => edgeFunctionTask(app, fn)))

  return {
    id: 'backend',
    label: 'Backend',
    title: `Give ${name} a real database, logins and email`,
    goal: `Users can sign up and log in, their data is locked to them with RLS, and every ${name} API and edge function works.`,
    icon: 'database',
    tasks: [...tasks, ...app.content.backendTasks],
  }
}

// ---------------------------------------------------------------------------
// Phase 4: Payments
// ---------------------------------------------------------------------------

function paymentsPhase(app: AppDef): Phase {
  const { name, slug, price } = app
  const d = price.trialDays
  const m = price.monthly

  const flow = `
 Visitor clicks "Start ${d}-day free trial"
            |
            v
 /signup  ->  /onboarding  ->  /api/stripe/checkout (POST)
                                      |
                                      v
                        Stripe Checkout (card required, $0 today)
                                      |
                 checkout.session.completed + customer.subscription.created
                                      |
                                      v
     /api/stripe/webhook  --(verify signature, skip duplicates)-->  public.subscriptions
                                                                   status = 'trialing'
                                      |
            day ${Math.max(d - 3, 0)}: customer.subscription.trial_will_end  ->  Resend "trial ending" email
                                      |
            day ${d}: Stripe charges $${m}
              |                                   |
          card works                         card fails
              |                                   |
   subscription.updated                 invoice.payment_failed
   status = 'active'                    status = 'past_due'  -> banner + email
              |                                   |
     access to /app                      paywall at /paywall until fixed
              |
   user cancels in Customer Portal -> subscription.deleted -> status = 'canceled'
`

  const tasks: Task[] = [
    task({
      id: 'pay-test-mode',
      title: 'Put Stripe in test mode and copy your keys',
      outcome: 'Your local app can talk to Stripe without moving real money.',
      minutes: 10,
      xp: 20,
      blocks: [
        eli5(
          'What is test mode?',
          `Test mode is a full copy of Stripe with toy money. Fake cards, fake customers, fake payouts. You build and break everything here, and only switch to live when ${name} is on its real domain.`,
        ),
        steps(
          `Log in at dashboard.stripe.com.`,
          `Top right, make sure **Test mode** is on (or you are inside a **Sandbox**: the top bar turns orange or shows "Sandbox"). If you see neither, click your account name top left > **Switch to sandbox** > create one called \`${slug}\`.`,
          `Click **Developers** (bottom left) > **API keys**.`,
          `Copy the **Publishable key** (\`pk_test_...\`) and click **Reveal** to copy the **Secret key** (\`sk_test_...\`).`,
          `Open \`.env.local\` in VS Code, add the lines below with your values, and save. Leave the other two empty for now.`,
        ),
        code('pay-env', '.env.local (add these lines)', 'env', `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\nSTRIPE_SECRET_KEY=\nSTRIPE_PRICE_ID=\nSTRIPE_WEBHOOK_SECRET=`),
        keys(stripeRows('.env.local', false)),
        warn('Check the prefix', `Every Stripe key in .env.local must start with \`pk_test_\` or \`sk_test_\` while you build. If you see \`_live_\`, you are in live mode: switch back.`),
      ],
      checklist: ['Turn on Test mode or a Sandbox', 'Copy pk_test_ and sk_test_ keys', ['Add the Stripe lines to .env.local', 'copy:pay-env']],
    }),
    task({
      id: 'pay-product',
      title: `Create the ${name} product and price`,
      outcome: `Stripe knows ${name} costs $${m} a month, and you have its price ID.`,
      minutes: 5,
      xp: 15,
      blocks: [
        eli5(
          'Product vs price',
          `In Stripe a product is the thing you sell (${name}) and a price is how you charge for it ($${m} every month). Your code never types the amount: it asks for the price by its ID, so you can change prices later without touching code.`,
        ),
        steps(
          `Stripe (test mode) > **Product catalogue** (left sidebar) > **+ Add product**.`,
          `**Name:** \`${name}\`. **Description:** \`${app.oneLiner}\``,
          `Under pricing pick **Recurring**. **Amount:** \`${m}.00\` **USD**. **Billing period:** **Monthly**.`,
          `Leave the free trial box empty here. The trial is set in code at checkout so you can change it without touching Stripe.`,
          `Click **Add product**.`,
          `Open the product. In the **Pricing** section, click the **...** next to the price > **Copy price ID**. It starts with \`price_\`.`,
          `Paste it after \`STRIPE_PRICE_ID=\` in \`.env.local\` and save. Restart \`npm run dev\`.`,
        ),
        p(`**Check it worked:** Product catalogue shows ${name} at $${m}.00 / month, and \`.env.local\` has a \`price_...\` value.`),
        tip('Annual plan later', `Once people pay monthly, add a second price on the same product (Yearly, about 10 months' worth). Do not add it now: one price keeps launch simple.`),
      ],
      checklist: [`Create the ${name} product at $${m}/month`, 'Copy the price ID', 'Paste it into STRIPE_PRICE_ID in .env.local'],
    }),
    task({
      id: 'pay-checkout',
      title: 'Build the checkout route with the free trial',
      outcome: `Clicking "Start trial" opens Stripe Checkout for a ${d}-day free trial.`,
      minutes: 25,
      xp: 50,
      blocks: [
        ascii(flow, `How a ${name} visitor becomes a paying customer`),
        eli5(
          'Why ask for a card on a free trial?',
          `Trials that ask for a card up front convert to paid far more often, because only serious people start them, and they keep access with no extra click when the trial ends. Stripe charges $0 today and $${m} on day ${d} unless they cancel.`,
        ),
        p(`Plan mode and \`/effort high\` for this one.`),
        prompt(
          'pay-checkout-prompt',
          'Build Stripe Checkout',
          `
Plan mode. Add Stripe Checkout for ${name} using the stripe npm package (server
only). Read @CLAUDE.md security rules first.

1. Use the Supabase MCP to check public.subscriptions exists and show me its
   columns. Do not create a new table if it exists. If public.stripe_events does
   not exist, write a migration that creates it (id text primary key, type text,
   received_at timestamptz default now()) with RLS enabled and no policies, and wait
   for my approval before applying it.
2. lib/stripe.ts with import "server-only": a Stripe client from STRIPE_SECRET_KEY.
3. app/api/stripe/checkout/route.ts (POST):
   - Get the user with supabase.auth.getClaims(). 401 if none.
   - Find or create a Stripe customer for the user (store stripe_customer_id on the
     user's subscriptions row via the admin client, or reuse the existing one).
   - stripe.checkout.sessions.create with:
       mode: 'subscription',
       customer: <stripe customer id>,
       line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
       subscription_data: { trial_period_days: ${d}, metadata: { user_id } },
       payment_method_collection: 'always',
       client_reference_id: user_id,
       allow_promotion_codes: true,
       success_url: \`\${process.env.NEXT_PUBLIC_SITE_URL}/app?checkout=success\`,
       cancel_url: \`\${process.env.NEXT_PUBLIC_SITE_URL}/paywall\`
   - Return { url } and redirect the browser to it.
4. After onboarding finishes, send users with no subscription row (or status not in
   trialing/active) to Checkout instead of /app.
5. The success_url page must NOT grant access. If the subscription row is not
   trialing/active yet, show "Setting up your trial..." and poll every 2 seconds
   for up to 30 seconds.
Run npm run build and show me the output.
`,
        ),
        steps(
          `Approve the plan, wait for the build to pass.`,
          `Sign up a new test user at localhost:3000/signup (use \`you+test1@yourmail.com\`, the +test1 part still reaches your inbox).`,
          `After onboarding, Stripe Checkout opens and says **${d} days free**, then $${m}.00 per month.`,
          `Pay with card \`4242 4242 4242 4242\`, any future expiry (\`12/34\`), any CVC (\`123\`), any postcode.`,
          `You come back to /app showing "Setting up your trial...". It stays like that until the webhook exists (next task). That is correct.`,
          `In Stripe > **Customers**, your test user is listed with a **Trialing** subscription.`,
        ),
      ],
      checklist: [
        ['Run the checkout prompt in plan mode', 'copy:pay-checkout-prompt'],
        'Complete a test checkout with 4242 4242 4242 4242',
        'See a Trialing subscription in Stripe > Customers',
      ],
    }),
    task({
      id: 'pay-webhook',
      title: 'Build the Stripe webhook',
      outcome: 'Stripe tells your database every time a subscription starts, renews, fails or ends.',
      minutes: 30,
      xp: 60,
      blocks: [
        eli5(
          'What is a webhook?',
          `A webhook is Stripe phoning your app. When something happens (trial started, card charged, card failed, cancelled), Stripe sends a message to a URL in your app. Your app checks the message really came from Stripe, then updates the subscriptions table. That table is the only thing that decides who gets in.`,
        ),
        prompt(
          'pay-webhook-prompt',
          'Build the webhook handler',
          `
Plan mode. Build the Stripe webhook at app/api/stripe/webhook/route.ts.

1. export const runtime = 'nodejs'. Read the raw body with await req.text() (never
   req.json()), get the stripe-signature header, and verify with
   stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET).
   Return 400 on a bad signature.
2. Idempotency: insert event.id and event.type into public.stripe_events with the
   admin client (lib/supabase/admin.ts). If the insert hits a duplicate key, return
   200 and stop.
3. Handle these events. For every subscription-related event, retrieve the latest
   subscription from the Stripe API (events can arrive out of order) and upsert
   public.subscriptions by user_id (from subscription.metadata.user_id, or the
   customer lookup) with status, stripe_customer_id, stripe_subscription_id,
   price_id, trial_end, current_period_end and cancel_at_period_end:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed (also send a "card failed" email with a link to /billing)
   - customer.subscription.trial_will_end (send the trial-ending email, built later)
4. Return 200 within a few seconds. Log event type and id only, never the payload.
5. Make sure proxy.ts / middleware.ts does not run on /api/stripe/webhook.
6. Only this route writes public.subscriptions. Check there is no RLS insert or
   update policy on it for authenticated users.
Run npm run build and show me the output.
`,
        ),
        code(
          'pay-verify-sql',
          'Supabase SQL Editor: check the tables',
          'sql',
          `
-- Should show RLS on (true) for both tables
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('subscriptions', 'stripe_events');

-- Should show only a SELECT policy on subscriptions, none on stripe_events
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('subscriptions', 'stripe_events');

-- Latest subscription rows
select user_id, status, trial_end, current_period_end, updated_at
from public.subscriptions
order by updated_at desc
limit 5;
`,
        ),
        p(`**Check it worked:** run the SQL above in Supabase > SQL Editor > New query. Both tables show \`true\` for rowsecurity, and subscriptions has only a SELECT policy. You test real events in the next task.`),
      ],
      checklist: [['Run the webhook prompt in plan mode', 'copy:pay-webhook-prompt'], ['Run the verification SQL', 'copy:pay-verify-sql'], 'Check only a SELECT policy exists on subscriptions'],
    }),
    task({
      id: 'pay-local-test',
      title: 'Test webhooks locally with the Stripe CLI',
      outcome: 'A test checkout on your laptop writes a trialing row into public.subscriptions.',
      minutes: 20,
      xp: 45,
      blocks: [
        eli5(
          'Why a CLI for this?',
          `Stripe cannot phone localhost: it is not on the internet. The Stripe CLI is a tunnel. It listens to Stripe for you and forwards each message to your laptop, so you can test the webhook before the site is live.`,
        ),
        steps(
          `**Mac:** if you do not have Homebrew, install it with the first line of the Stripe CLI block below, then run \`brew install stripe/stripe-cli/stripe\`.`,
          `**Windows:** go to github.com/stripe/stripe-cli/releases/latest, download the file ending \`windows_x86_64.zip\`, and unzip it to \`C:\\stripe\`. In the commands below, type \`C:\\stripe\\stripe.exe\` wherever you see \`stripe\` (for example \`C:\\stripe\\stripe.exe login\`).`,
          `Run \`stripe login\`, press Enter, click **Allow access** in the browser.`,
          `Open a **third terminal window** and run the listen command. It prints \`Ready! Your webhook signing secret is whsec_...\`.`,
          `Copy that \`whsec_...\` into \`STRIPE_WEBHOOK_SECRET=\` in \`.env.local\`, save, and restart \`npm run dev\`.`,
          `Keep the listen window open. In another window run the trigger command. The listen window shows \`--> checkout.session.completed\` and \`<-- [200]\`.`,
          `Now do a full real test: sign up a new test user, go through Checkout with \`4242 4242 4242 4242\`, and you should land in /app with access.`,
        ),
        code(
          'pay-cli-cmds',
          'Stripe CLI',
          'bash',
          `
# Mac only, if you do not have Homebrew yet:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
`,
        ),
        code(
          'pay-cli-trigger',
          'In another window: fire test events',
          'bash',
          `
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.trial_will_end
`,
        ),
        p(`**Check it worked:** run the last query from the verification SQL. Your test user has a row with \`status = trialing\` and a \`trial_end\` ${d} days from today.`),
        table(
          ['Test card', 'What happens'],
          [
            ['4242 4242 4242 4242', 'Works every time'],
            ['4000 0000 0000 0341', 'Checkout succeeds, the first real charge (end of trial) fails: tests past_due'],
            ['4000 0025 0000 3155', 'Asks for 3D Secure confirmation'],
            ['4000 0000 0000 9995', 'Declined for insufficient funds'],
          ],
        ),
        tip('Skip the wait for trial end', `Stripe > Customers > your test customer > subscription > **...** > **End trial now** (or **Update subscription > Trial end**). It fires the same webhooks as a real day ${d}.`),
        mistakes([
          { mistake: 'Listen window shows [400]', fix: 'STRIPE_WEBHOOK_SECRET does not match the whsec_ that stripe listen printed. Copy it again and restart npm run dev. It changes when you log in again.' },
          { mistake: 'Listen window shows [307] or [308]', fix: 'The proxy/middleware is redirecting the webhook. Ask Claude to exclude /api/stripe/webhook from the matcher.' },
          { mistake: 'Row not created after checkout', fix: 'Paste the npm run dev window output into Claude Code and ask it to find why the upsert failed.' },
        ]),
      ],
      checklist: [
        ['Install the Stripe CLI', 'copy:pay-cli-cmds'],
        'Paste the whsec_ from stripe listen into .env.local',
        ['Fire the test events', 'copy:pay-cli-trigger'],
        'Complete a full checkout and see a trialing row',
      ],
    }),
    task({
      id: 'pay-paywall',
      title: 'Gate the app behind an active subscription',
      outcome: `Only trialing or paying users can use ${name}. Everyone else sees the paywall.`,
      minutes: 20,
      xp: 45,
      blocks: [
        eli5(
          'Two locks, not one',
          `The proxy file is the lock on the front door: it checks before any page loads. The server check is the lock on each room: every action that does real work checks again. If one is ever skipped by mistake, the other still holds.`,
        ),
        prompt(
          'pay-paywall-prompt',
          'Build the paywall',
          `
Gate ${name} on subscription status.
1. lib/billing.ts (server only): getSubscription(userId) reads public.subscriptions
   with the server client; hasAccess(sub) returns true only when status is
   'trialing' or 'active'.
2. In proxy.ts / middleware.ts: for /app and everything under app/(app) except
   /billing and /settings, logged-in users without access go to /paywall.
3. Server-side check too: every server action and API route that does paid work
   (everything in the core ${name} features) calls hasAccess() and returns 402 if false.
4. app/paywall/page.tsx following @DESIGN.md: headline "Start your ${d}-day free trial",
   price $${m}/month, 4 bullets from the PRD, a button that POSTs to
   /api/stripe/checkout, and for past_due users a message "Your last payment failed"
   with a "Update card" button (Customer Portal, next task).
5. A banner across the app for: trialing (days left in the trial), past_due (update
   card), canceled with cancel_at_period_end (access until <date>).
6. Never read access from the URL, a cookie, localStorage or success_url.
Run npm run build. Then tell me how to test each status with the Stripe CLI or SQL.
`,
        ),
        steps(
          `Log in as a user who never went through Checkout. Visit /app: you land on /paywall.`,
          `Log in as your trialing test user: /app works and the banner shows the days left.`,
          `In Supabase SQL Editor run \`update public.subscriptions set status = 'canceled' where user_id = '<your test user id>';\` then refresh /app: you land on /paywall. Run \`stripe trigger customer.subscription.updated\` or set it back to \`trialing\` afterwards.`,
        ),
      ],
      checklist: [['Run the paywall prompt', 'copy:pay-paywall-prompt'], 'Check a user with no subscription sees /paywall', 'Check a trialing user can use /app'],
    }),
    task({
      id: 'pay-portal',
      title: 'Set up the Customer Portal',
      outcome: 'Customers can update their card or cancel without emailing you.',
      minutes: 15,
      xp: 30,
      blocks: [
        eli5(
          'What is the Customer Portal?',
          `It is a billing page Stripe hosts for you. Your customer clicks "Manage billing", Stripe shows their card, invoices and a cancel button, and sends them back when done. You write zero billing screens.`,
        ),
        steps(
          `Stripe (test mode) > **Settings** (gear, top right) > **Billing** > **Customer portal**.`,
          `Turn on: **Customers can update payment methods**, **View invoice history**, **Cancel subscriptions** (choose **At end of billing period**).`,
          `Under **Cancellation reasons** turn on the reason survey. You read these every week.`,
          `**Business information:** add your headline ("${name} billing"), and links to your privacy and terms pages (localhost URLs are fine for now).`,
          `Click **Save changes**.`,
        ),
        prompt(
          'pay-portal-prompt',
          'Wire the Manage billing button',
          `
Wire the "Manage billing" button on app/(app)/billing/page.tsx.
1. app/api/stripe/portal/route.ts (POST): getClaims(), read the user's
   stripe_customer_id from public.subscriptions, create
   stripe.billingPortal.sessions.create({ customer, return_url:
   \`\${process.env.NEXT_PUBLIC_SITE_URL}/billing\` }) and return { url }.
   404 if the user has no customer id.
2. The billing page shows: plan name "${name}", $${m}/month, status badge, trial end or
   next renewal date, and "Cancels on <date>" when cancel_at_period_end is true.
3. Use the same portal route for the "Update card" button on /paywall.
Run npm run build. Then tell me how to test cancel and update card.
`,
        ),
        steps(
          `At localhost:3000/billing click **Manage billing**. The Stripe portal opens in test mode.`,
          `Click **Cancel subscription** and confirm. Come back: the billing page shows "Cancels on <date>" (the webhook updated it).`,
          `In the portal, click **Renew subscription** to undo it.`,
        ),
      ],
      checklist: ['Turn on the Customer Portal in Stripe settings', ['Run the portal prompt', 'copy:pay-portal-prompt'], 'Cancel and renew a test subscription from the portal'],
    }),
    task({
      id: 'pay-trial-email',
      title: 'Send the trial-ending email',
      outcome: `Trial users get a friendly email before their first $${m} charge.`,
      minutes: 15,
      xp: 30,
      blocks: [
        p(`Stripe fires \`customer.subscription.trial_will_end\` three days before a trial ends. A clear email at that moment reduces angry refunds and reminds people why ${name} is worth paying for.`),
        prompt(
          'pay-trial-email-prompt',
          'Build the trial-ending email',
          `
Build emails/trial-ending.tsx with React Email using @DESIGN.md colours:
- Subject: "Your ${name} trial ends in 3 days"
- Body: one line on what they have done so far (pull one real number from their
  data, for example how many items they created, using the admin client), what
  happens next ("On <date> we charge $${m} to your card ending <last4>"), a button to
  \${NEXT_PUBLIC_SITE_URL}/app, and a plain link "Manage or cancel" to /billing.
Send it from the customer.subscription.trial_will_end branch of the webhook using
lib/email.ts. Look up the user's email with the admin client
(auth.admin.getUserById). If sending fails, still return 200 to Stripe.
Also build emails/payment-failed.tsx for invoice.payment_failed with a button to /billing.
Run npm run build, then run stripe trigger customer.subscription.trial_will_end and
show me the npm run dev log line that confirms the send.
`,
        ),
        steps(
          `Run the prompt with \`stripe listen\` still running in its window.`,
          `**Check it worked:** Resend > **Emails** shows "Your ${name} trial ends in 3 days" as Delivered (with test events it goes to the test customer's email, so check the Resend log rather than your inbox).`,
        ),
      ],
      checklist: [['Run the trial email prompt', 'copy:pay-trial-email-prompt'], 'Trigger trial_will_end with the Stripe CLI', 'See the email in the Resend log'],
    }),
    task({
      id: 'pay-live',
      title: 'Going live checklist (after Deployment)',
      outcome: 'Real customers can pay you real money.',
      minutes: 30,
      xp: 50,
      blocks: [
        warn('Do this after the Deployment phase', `You need your live domain first. Come back here when ${name} is on its own domain and the test-mode checkout works there.`),
        steps(
          `Stripe > top left > **Activate payments** (or **Complete your profile**). Fill in business type, address, bank account for payouts and the statement descriptor (\`${name.toUpperCase().slice(0, 22)}\`).`,
          `Switch Test mode **off**. Recreate the product: Product catalogue > **+ Add product** > \`${name}\`, Recurring, $${m}.00 USD, Monthly. Copy the new live \`price_...\`.`,
          `Settings > Billing > **Customer portal**: turn on the same options as test mode (live mode has its own settings) and save.`,
          `Developers > **Webhooks** > **+ Add destination** > events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed, customer.subscription.trial_will_end > **Webhook endpoint** > URL \`https://yourdomain.com/api/stripe/webhook\` > **Create destination**.`,
          `Open the new endpoint and click **Reveal** under **Signing secret**. Copy the live \`whsec_...\`. This is a different secret from test mode.`,
          `Developers > **API keys**: copy the live \`pk_live_...\` and \`sk_live_...\`.`,
          `Vercel > your project > **Settings > Environment Variables**: edit the four Stripe variables for **Production** only with the live values. Then **Deployments** > the latest > **...** > **Redeploy**.`,
          `Buy ${name} yourself on the live site with your own card. Check public.subscriptions shows \`trialing\`. Then cancel in the portal and refund any charge in Stripe > Payments.`,
        ),
        keys(stripeRows('Vercel env (Production only)', true)),
        mistakes([
          { mistake: 'Live checkout works but users never get access', fix: 'STRIPE_WEBHOOK_SECRET in Vercel still holds the test whsec_. Copy the live endpoint secret, save, redeploy.' },
          { mistake: 'Checkout says "No such price"', fix: 'STRIPE_PRICE_ID is still the test price. Use the live price_ ID.' },
          { mistake: 'Changed env vars but nothing changed', fix: 'Vercel only applies env changes to new deployments. Redeploy.' },
        ]),
      ],
      checklist: ['Activate your Stripe account', 'Recreate the product and price in live mode', 'Create the live webhook endpoint and copy its whsec_', 'Swap Production env vars on Vercel and redeploy', 'Make one real purchase and refund it'],
    }),
  ]

  return {
    id: 'payments',
    label: 'Payments',
    title: `Charge $${m} a month after a ${d}-day trial`,
    goal: `${name} sells a ${d}-day free trial that turns into $${m}/month, and only trialing or paying users get in.`,
    icon: 'card',
    tasks,
  }
}

// ---------------------------------------------------------------------------
// Phase 5: Deployment
// ---------------------------------------------------------------------------

function deployPhase(app: AppDef): Phase {
  const { name, slug, apis } = app
  const vercelRows: KeyRow[] = [
    ...supabaseRows('Vercel env'),
    { name: 'NEXT_PUBLIC_SITE_URL', where: 'Your .vercel.app URL for now, then https://yourdomain.com', pasteInto: 'Vercel env', secret: false },
    ...stripeRows('Vercel env', false),
    ...resendRows('Vercel env'),
    ...apis.flatMap((a) => nextEnvVars(a).map((v) => ({ ...envRow(v), pasteInto: 'Vercel env' }))),
  ]

  const tasks: Task[] = [
    task({
      id: 'dep-github-account',
      title: 'Create your GitHub account and an empty repo',
      outcome: `A private, empty ${slug} repo is waiting on GitHub.`,
      minutes: 10,
      xp: 20,
      blocks: [
        eli5(
          'What is GitHub?',
          `GitHub is Google Drive for code, with a full history. Every time you save a version (a "commit") and upload it (a "push"), GitHub keeps it forever, so you can always go back. Vercel watches your GitHub and puts each new version live.`,
        ),
        steps(
          `Go to github.com/signup. Enter your email, a password and a username (this shows in your repo URLs, so pick something professional).`,
          `Solve the puzzle, then enter the code GitHub emails you to verify your account.`,
          `Pick the **Free** plan if asked. Skip any personalisation questions.`,
          `Top right **+** > **New repository**.`,
          `**Repository name:** \`${slug}\`. Choose **Private**.`,
          `Leave **Add a README**, **.gitignore** and **license** all OFF. The repo must be empty, or the first push fails.`,
          `Click **Create repository**. Keep the page open: it shows your repo URL, like \`https://github.com/<you>/${slug}.git\`.`,
        ),
        links([{ label: 'GitHub sign up', url: 'https://github.com/signup' }]),
      ],
      checklist: ['Sign up and verify your GitHub email', `Create a private repo called ${slug}`, 'Leave README, .gitignore and licence off'],
    }),
    task({
      id: 'dep-git',
      title: 'Install git',
      outcome: 'git --version prints a version number.',
      minutes: 5,
      xp: 10,
      blocks: [
        eli5('What is git?', `git is the save-history tool on your computer. GitHub is where those saves get uploaded. Claude Code runs git for you, it only needs to be installed.`),
        steps(
          `**Mac:** run the command below. A pop-up asks to install the command line developer tools. Click **Install** and wait (5 to 15 minutes).`,
          `**Windows:** you installed Git for Windows in Setup. If you skipped it, download it from git-scm.com/downloads/win and click Next through the installer.`,
          `Open a new terminal and run \`git --version\`.`,
        ),
        code('dep-git-mac', 'Mac only', 'bash', `xcode-select --install`),
        code('dep-git-check', 'Check it worked', 'bash', `git --version`),
        p(`You should see something like \`git version 2.47.0\`.`),
      ],
      checklist: [['Install git for your system', 'copy:dep-git-mac'], ['Run git --version', 'copy:dep-git-check']],
    }),
    task({
      id: 'dep-push',
      title: 'Push your code to GitHub',
      outcome: `Your ${name} code is on GitHub, without a single secret in it.`,
      minutes: 15,
      xp: 35,
      blocks: [
        eli5(
          'What is .gitignore?',
          `.gitignore is a "do not pack" list. Files on it never leave your computer. \`.env.local\` (your keys) is on it, so your secrets never reach GitHub even though everything else does.`,
        ),
        steps(
          `Install the GitHub CLI so Claude can log in for you. **Mac:** \`brew install gh\`. **Windows:** \`winget install --id GitHub.cli\`. Open a new terminal afterwards.`,
          `Run \`gh auth login\`. Choose **GitHub.com** > **HTTPS** > **Yes** (authenticate git) > **Login with a web browser**. Copy the one-time code it shows, press Enter, paste the code in the browser and click **Authorize**.`,
          `Back in Claude Code, paste the prompt below with your repo URL.`,
        ),
        code('dep-gh-login', 'Terminal', 'bash', `gh auth login`),
        prompt(
          'dep-push-prompt',
          'Commit and push',
          `
Put this project on GitHub.
1. If git is not initialised, run git init and set the branch name to main.
2. Check .gitignore contains at least: node_modules/, .next/, .env, .env.*,
   !.env.example, .vercel/, supabase/.temp/, .claude/settings.local.json, .DS_Store.
   Add anything missing.
3. Run git status and show me the list of files that will be committed. Stop and
   warn me if .env.local, any file containing sb_secret_, sk_test_, sk_live_,
   whsec_ or re_ keys is in the list.
4. Search the files to be committed for those prefixes with grep and show me the
   command and the result (it must be empty).
5. git add -A, then commit with the message "Initial ${name} build".
6. git remote add origin https://github.com/<my-username>/${slug}.git
   (ask me for my username if you cannot get it from gh api user).
7. git push -u origin main and show me the output.
`,
        ),
        steps(
          `Refresh your repo page on GitHub. You see all your folders (app, components, lib, supabase...) and CLAUDE.md.`,
          `**Check it worked:** there is NO \`.env.local\` file in the list on GitHub. If there is, tell Claude immediately: it must remove it from git and you must create new keys in every service.`,
        ),
        tip('From now on', `After every finished task say: "Commit with a clear message and push". That is your save button.`),
      ],
      checklist: [['Log in with gh auth login', 'copy:dep-gh-login'], ['Run the commit and push prompt', 'copy:dep-push-prompt'], 'See your code on GitHub', 'Confirm .env.local is NOT on GitHub'],
    }),
    task({
      id: 'dep-vercel',
      title: 'Deploy to Vercel',
      outcome: `${name} is live on a public .vercel.app URL.`,
      minutes: 20,
      xp: 45,
      blocks: [
        eli5(
          'What is Vercel?',
          `Vercel is the computer on the internet that runs ${name} for your customers. It copies your code from GitHub, builds it and gives it a web address. Your laptop can be off and the app keeps running.`,
        ),
        steps(
          `Go to vercel.com/signup. Choose **Hobby**, type your name, click **Continue with GitHub** and authorise Vercel.`,
          `On the dashboard click **Add New...** > **Project**.`,
          `Under **Import Git Repository**, click **Install** or **Adjust GitHub App Permissions** if \`${slug}\` is not listed. Give Vercel access to the \`${slug}\` repo only.`,
          `Click **Import** next to \`${slug}\`.`,
          `**Framework Preset** shows **Next.js** automatically. Leave Root Directory, Build and Output settings as they are.`,
          `Open **Environment Variables**. Open your \`.env.local\` in VS Code, select everything, copy, and paste it into the first **Key** box: Vercel splits it into one row per variable. Check every row in the table below is there.`,
          `Change \`NEXT_PUBLIC_SITE_URL\` to \`https://${slug}.vercel.app\` (you fix it after the first deploy if Vercel gives a different URL).`,
          `Click **Deploy**. Wait two to four minutes for the confetti.`,
          `Click **Continue to Dashboard**, then the **Visit** button. Your landing page loads on a \`.vercel.app\` address.`,
        ),
        keys(vercelRows),
        warn('STRIPE_WEBHOOK_SECRET is different here', `The \`whsec_\` from \`stripe listen\` only works on your laptop. Put any value for now: you create the real Vercel one in the next task.`),
        mistakes([
          { mistake: 'Build failed', fix: 'Vercel > Deployments > the failed one > Build Logs. Copy the red lines into Claude Code: "My Vercel build failed with this. Fix it, run npm run build locally, commit and push."' },
          { mistake: 'Page loads but signup errors', fix: 'An env var is missing or misspelt. Compare Vercel > Settings > Environment Variables with the table above.' },
          { mistake: 'URL is different from what you typed in NEXT_PUBLIC_SITE_URL', fix: 'Copy the real URL from the project dashboard, edit the variable, then Deployments > ... > Redeploy.' },
        ]),
        links([{ label: 'Vercel sign up', url: 'https://vercel.com/signup' }]),
      ],
      checklist: ['Sign up to Vercel with GitHub', `Import the ${slug} repo`, 'Paste every env var', 'Deploy and open your .vercel.app URL'],
    }),
    task({
      id: 'dep-urls',
      title: 'Point Supabase and Stripe at your Vercel URL',
      outcome: 'Sign up and checkout work on the live site, not only on your laptop.',
      minutes: 15,
      xp: 30,
      blocks: [
        steps(
          `**Supabase:** Authentication > **URL Configuration** > Redirect URLs > **Add URL** > \`https://${slug}.vercel.app/**\` (use your real Vercel URL). Save. Leave the Site URL as localhost until you have a domain.`,
          `**Stripe (test mode):** Developers > **Webhooks** > **+ Add destination**. Select the events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed, customer.subscription.trial_will_end. Choose **Webhook endpoint**, URL \`https://${slug}.vercel.app/api/stripe/webhook\`, click **Create destination**.`,
          `Open that endpoint, click **Reveal** under **Signing secret**, copy the \`whsec_...\`.`,
          `**Vercel:** project > **Settings** > **Environment Variables** > \`STRIPE_WEBHOOK_SECRET\` > **Edit** > paste > **Save**.`,
          `Vercel > **Deployments** > the top one > **...** > **Redeploy**. Env changes only apply to new deployments.`,
          `**Check it worked:** on the live URL, sign up a new test user, go through checkout with \`4242 4242 4242 4242\`, and land in /app with access. Stripe > Webhooks > your endpoint shows the events with a green **200**.`,
        ),
        eli5('Why two webhook secrets?', `Each place Stripe sends to gets its own password. Your laptop has one (from stripe listen). The live site has another. If the passwords swap, Stripe's messages get rejected and nobody gets access.`),
        keys([
          { name: 'STRIPE_WEBHOOK_SECRET', where: 'Stripe (test) > Developers > Webhooks > your Vercel endpoint > Signing secret', pasteInto: 'Vercel env', secret: true },
          { name: 'STRIPE_WEBHOOK_SECRET', where: 'Printed by stripe listen (keep this one locally)', pasteInto: '.env.local', secret: true },
        ]),
        mistakes([
          { mistake: 'Webhook endpoint shows 401 or 307', fix: 'The proxy/middleware is catching /api/stripe/webhook. Ask Claude to exclude it from the matcher, push, and click Resend on the failed event in Stripe.' },
          { mistake: 'Login on the live URL sends you to localhost', fix: 'NEXT_PUBLIC_SITE_URL in Vercel is still localhost, or the Vercel URL is missing from Supabase Redirect URLs.' },
        ]),
      ],
      checklist: ['Add the Vercel URL to Supabase Redirect URLs', 'Create the Stripe test webhook for the Vercel URL', 'Paste the new whsec_ into Vercel and redeploy', 'Complete a test checkout on the live URL'],
    }),
    task({
      id: 'dep-domain-buy',
      title: 'Buy your domain on Porkbun',
      outcome: `You own the domain ${name} will live on.`,
      minutes: 10,
      xp: 15,
      blocks: [
        eli5('What is a domain?', `A domain is your app's street address, like \`${slug}.com\`. Without one, customers see \`${slug}.vercel.app\`, which looks like a side project. A domain costs about $10 to $15 a year.`),
        steps(
          `Go to porkbun.com and click **Sign Up**. Enter email and password, verify your email.`,
          `Search for \`${slug}\` in the search bar on the home page.`,
          `Pick one: **.com** first, then **.app** or **.io** if .com is taken. Try adding a word: \`get${slug}.com\`, \`${slug}hq.com\`, \`try${slug}.com\`.`,
          `Keep it under $15 for the first year. Skip anything marked premium.`,
          `Add to cart > **Checkout**. Leave **WHOIS privacy** on (it is free). Skip add-ons like email hosting and SSL (Vercel gives you free SSL).`,
          `Pay. The domain appears under **Account > Domain Management** within a minute.`,
        ),
        links([{ label: 'Porkbun', url: 'https://porkbun.com' }]),
      ],
      checklist: ['Sign up to Porkbun', 'Search and pick a domain under $15', 'Buy it with WHOIS privacy on'],
    }),
    task({
      id: 'dep-domain-connect',
      title: 'Connect the domain to Vercel',
      outcome: `https://yourdomain.com loads ${name} with a padlock.`,
      minutes: 20,
      xp: 35,
      blocks: [
        eli5(
          'What is DNS?',
          `DNS is the internet's phone book. When someone types your domain, DNS looks it up and finds the number of the computer to call. You are adding two lines to that phone book that say "for this domain, call Vercel".`,
        ),
        steps(
          `**Vercel:** project > **Settings** > **Domains** > type \`yourdomain.com\` > **Add**. If asked, pick the recommended option that adds both \`yourdomain.com\` and \`www.yourdomain.com\` and redirects one to the other.`,
          `Vercel shows **Invalid Configuration** and the records it wants. Keep the tab open.`,
          `**Porkbun:** Account > **Domain Management** > hover your domain > **DNS**.`,
          `Delete the default parked records: every **ALIAS**, **A** or **CNAME** row pointing at \`pixie.porkbun.com\` or a \`porkbun\` address (click the trash icon on each).`,
          `Add record 1: **Type** \`A\`, **Host** leave empty (that means the bare domain, \`@\`), **Answer** \`76.76.21.21\`, TTL default. Click **Add**.`,
          `Add record 2: **Type** \`CNAME\`, **Host** \`www\`, **Answer** \`cname.vercel-dns.com\`. Click **Add**.`,
          `Back on Vercel > Domains, click **Refresh** every few minutes. It usually turns to **Valid Configuration** within 5 to 30 minutes (rarely up to a few hours).`,
          `**Check it worked:** open \`https://yourdomain.com\` in a private window. ${name} loads with a padlock in the address bar.`,
        ),
        table(
          ['Type', 'Host (Porkbun)', 'Answer', 'Why'],
          [
            ['A', '(empty, means @)', '76.76.21.21', 'yourdomain.com goes to Vercel'],
            ['CNAME', 'www', 'cname.vercel-dns.com', 'www.yourdomain.com goes to Vercel'],
          ],
        ),
        mistakes([
          { mistake: 'Still Invalid Configuration after an hour', fix: 'A parked Porkbun record is still there. Delete every record pointing at porkbun, keep only your two new ones (and any Resend ones later).' },
          { mistake: 'Typed yourdomain.com in the Host box', fix: 'Porkbun adds the domain itself. Host is empty for the A record and www for the CNAME.' },
        ]),
      ],
      checklist: ['Add the domain in Vercel > Settings > Domains', 'Delete the Porkbun parked records', 'Add A @ 76.76.21.21 and CNAME www cname.vercel-dns.com', 'See Valid Configuration in Vercel'],
    }),
    task({
      id: 'dep-domain-urls',
      title: 'Switch everything to your domain',
      outcome: 'Logins, emails and payments all use your real domain.',
      minutes: 10,
      xp: 25,
      blocks: [
        eli5(
          'Why update four places?',
          `Each service keeps its own list of "addresses I am allowed to send people to". Supabase sends login links, Stripe sends webhooks, your app builds links in emails. All of them still point at the old .vercel.app address until you change them.`,
        ),
        keys([
          { name: 'NEXT_PUBLIC_SITE_URL', where: 'Type it: https://yourdomain.com (no trailing slash)', pasteInto: 'Vercel env', secret: false },
          { name: 'Site URL', where: 'Type it: https://yourdomain.com', pasteInto: 'Supabase > Authentication > URL Configuration', secret: false },
          { name: 'Webhook endpoint URL', where: 'Type it: https://yourdomain.com/api/stripe/webhook', pasteInto: 'Stripe > Developers > Webhooks', secret: false },
        ]),
        steps(
          `**Vercel:** Settings > Environment Variables > \`NEXT_PUBLIC_SITE_URL\` > Edit > \`https://yourdomain.com\` (no slash at the end) > Save.`,
          `**Supabase:** Authentication > URL Configuration > **Site URL** \`https://yourdomain.com\` > Save. Add Redirect URL \`https://yourdomain.com/**\`. Keep the localhost one for building.`,
          `**Stripe (test):** Developers > Webhooks > your Vercel endpoint > **...** > **Update details** > change the URL to \`https://yourdomain.com/api/stripe/webhook\` > Save. (The signing secret stays the same.)`,
          `**Stripe:** Settings > Billing > Customer portal > update the privacy and terms links to your domain.`,
          `**Vercel:** Deployments > top one > **...** > **Redeploy**.`,
          `**Check it worked:** on https://yourdomain.com sign up, reset your password (the email link must open yourdomain.com, not localhost), and do a test checkout.`,
        ),
        tip('Keep localhost working', `Leave \`http://localhost:3000/**\` in Supabase Redirect URLs and keep \`NEXT_PUBLIC_SITE_URL=http://localhost:3000\` in \`.env.local\`, so you can keep building on your laptop.`),
      ],
      checklist: ['Update NEXT_PUBLIC_SITE_URL in Vercel', 'Update Supabase Site URL and Redirect URLs', 'Update the Stripe webhook URL', 'Redeploy and test signup, reset and checkout'],
    }),
    task({
      id: 'dep-resend-domain',
      title: 'Verify your sending domain in Resend',
      outcome: `${name} emails come from hello@yourdomain.com and land in the inbox, not spam.`,
      minutes: 20,
      xp: 30,
      blocks: [
        eli5(
          'Why verify a domain?',
          `Inboxes check that an email really came from the domain it claims. The DNS records Resend gives you are your signature on file. Without them, your emails look forged and go to spam.`,
        ),
        steps(
          `Resend > **Domains** > **+ Add Domain** > enter \`yourdomain.com\` > pick the region closest to your Supabase region > **Add**.`,
          `Resend shows 3 to 4 records: an **MX** and a **TXT (SPF)** on a \`send\` host, a **TXT (DKIM)** on \`resend._domainkey\`, and an optional **TXT (DMARC)** on \`_dmarc\`.`,
          `In Porkbun > Domain Management > DNS, add each one. Copy **Host** and **Value** from Resend with the copy buttons. In Porkbun's Host box enter only the part before your domain (\`send\`, \`resend._domainkey\`, \`_dmarc\`). For the MX record set **Priority** to \`10\`.`,
          `Back in Resend click **Verify DNS Records**. Wait until every row shows **Verified** (minutes to an hour).`,
          `In Vercel, edit \`EMAIL_FROM\` to \`${name} <hello@yourdomain.com>\`, save, redeploy.`,
          `In Supabase > Authentication > Emails > **SMTP Settings**, change **Sender email** to \`hello@yourdomain.com\` and save.`,
          `**Check it worked:** sign up on the live site with an address that is NOT your Resend login (a friend's or a second Gmail). The welcome email arrives in the inbox, from hello@yourdomain.com.`,
        ),
        table(
          ['Type', 'Porkbun Host', 'Value', 'Job'],
          [
            ['MX', 'send', 'feedback-smtp.<region>.amazonses.com (priority 10)', 'Bounce handling'],
            ['TXT', 'send', 'v=spf1 include:amazonses.com ~all', 'SPF: allowed senders'],
            ['TXT', 'resend._domainkey', 'p=MIGfMA0... (long key from Resend)', 'DKIM: your signature'],
            ['TXT', '_dmarc', 'v=DMARC1; p=none;', 'DMARC: what inboxes do with fakes'],
          ],
        ),
        tip('Copy, do not type', `Always copy values from Resend's screen, the table above shows the shape only. One missing character in the DKIM key and it fails.`),
      ],
      checklist: ['Add your domain in Resend', 'Add the MX, SPF, DKIM (and DMARC) records in Porkbun', 'See Verified on every Resend record', 'Switch EMAIL_FROM and Supabase SMTP sender to your domain'],
    }),
    task({
      id: 'dep-autodeploy',
      title: 'Learn how updates and rollbacks work',
      outcome: 'You can ship a change in one sentence and undo a bad one in one click.',
      minutes: 5,
      xp: 15,
      blocks: [
        eli5(
          'Every push redeploys',
          `Vercel watches your GitHub repo. Every time Claude pushes to the main branch, Vercel builds a fresh copy and swaps it in. Customers never see a broken half-built version: the old one stays up until the new one is ready.`,
        ),
        ascii(
          `
 You: "Change the hero headline, commit and push"
          |
          v
 Claude Code  --git push-->  GitHub (main)  --webhook-->  Vercel builds
                                                              |
                                          build passes?  yes: live in ~2 min
                                                         no:  old version stays live,
                                                              you get a failure email
`,
          'What happens after every push',
        ),
        steps(
          `**To ship:** in Claude Code say "Commit with a clear message and push". Open Vercel > Deployments to watch it build.`,
          `**To roll back:** Vercel > **Deployments** > find the last version that worked (green **Ready**) > **...** > **Promote to Production**. It goes live instantly.`,
          `Then tell Claude what broke so it can fix it properly, and push again when ready.`,
        ),
      ],
      checklist: ['Push a small change and watch it deploy', 'Find the Promote to Production button on an older deployment'],
    }),
  ]

  return {
    id: 'deploy',
    label: 'Deployment',
    title: `Put ${name} on the internet`,
    goal: `${name} runs on your own domain with working logins, emails and test payments, and every push redeploys.`,
    icon: 'rocket',
    tasks,
  }
}

// ---------------------------------------------------------------------------
// Phase 6: Security Sweep
// ---------------------------------------------------------------------------

const RLS_AUDIT_SKILL = `
---
name: rls-audit
description: Audit Supabase Row Level Security on every public table and storage bucket. Use before any deploy or after any migration.
disable-model-invocation: true
argument-hint: "[optional table name]"
---
1. List every table in the public schema (Supabase MCP list_tables) and every
   storage bucket. Scope: $ARGUMENTS (all tables if empty).
2. For each table report: RLS on/off, policies per operation (select, insert,
   update, delete), whether policies use (select auth.uid()), whether any policy
   uses \`for all\`, \`true\`, or raw_user_meta_data, whether UPDATE policies have
   both using and with check, and whether filtered columns are indexed.
3. Run the Supabase security advisor (get_advisors) and include its findings.
4. Test as an anonymous visitor: query each table over REST with only the
   publishable key and report row counts. Anything other than 0 is a finding,
   unless the table is meant to be public.
5. Output a table: table | issue | severity | fix. Write fixes as a new migration
   file but do not apply it.
`

const SECURITY_REVIEWER = `
---
name: security-reviewer
description: Reviews code changes for security flaws before merge or deploy. Use after any change to auth, database, API routes, payments or environment variables.
tools: Read, Grep, Glob, Bash
model: opus
---
You are a security reviewer for a Next.js + Supabase + Stripe app. Review only;
never edit files.

Check, and cite file:line for every finding:
1. Secrets: any sb_secret_, sk_live_, sk_test_, whsec_, re_ or private key in source,
   client components, NEXT_PUBLIC_ variables, logs or git history.
2. Auth: every route handler and server action calls supabase.auth.getClaims()
   and checks ownership of the row it reads or writes. No getSession() on server.
3. RLS: every table in migrations enables RLS with per-operation policies;
   no \`for all\`, no \`using (true)\` on private data, no raw_user_meta_data.
4. Stripe: webhook verifies signature on the raw body, de-duplicates event IDs,
   and is the only writer of subscription status. Access is never granted from
   success_url.
5. Injection: raw SQL built from user input, unsanitised HTML (dangerouslySetInnerHTML),
   user text passed into LLM prompts that can trigger tools.
6. Abuse: auth, AI and other expensive endpoints have rate limits.

Report only real, exploitable issues ranked Critical / High / Medium with a
one-line fix each. No style comments.
`

function securityPhase(app: AppDef): Phase {
  const { name, slug } = app

  const tasks: Task[] = [
    task({
      id: 'sec-rls-skill',
      title: 'Create and run the rls-audit skill',
      outcome: 'One command checks every table and bucket for leaks.',
      minutes: 15,
      xp: 35,
      blocks: [
        eli5(
          'What is a skill?',
          `A skill is a saved recipe Claude can follow on command. You write the steps once in a file, and from then on typing \`/rls-audit\` makes Claude run the whole security check the same way every time.`,
        ),
        p(`Most hacked AI-built apps were not hacked cleverly. A table had RLS off, or a rule that said "everyone can read everything". This skill checks for exactly that.`),
        code('sec-rls-skill-file', '.claude/skills/rls-audit/SKILL.md', 'md', RLS_AUDIT_SKILL),
        prompt(
          'sec-rls-skill-prompt',
          'Create the skill',
          `
Create .claude/skills/rls-audit/SKILL.md with exactly this content:

${RLS_AUDIT_SKILL.trim()}

Then tell me to run /clear so the skill loads.
`,
        ),
        steps(
          `Paste the prompt. Then type \`/clear\`.`,
          `Type \`/rls-audit\` and press Enter. Claude uses the Supabase MCP to check every table.`,
          `Read the output table. Any **High** or **Critical** row: say "Show me the fix migration, explain it in one line per policy, then apply it with the Supabase MCP after I say yes".`,
          `Run \`/rls-audit\` again until there are no High or Critical rows.`,
        ),
        p(`**Check it worked:** the final table has no High or Critical rows, and every anonymous row count is 0.`),
      ],
      checklist: [['Create the rls-audit skill', 'copy:sec-rls-skill-prompt'], 'Run /rls-audit', 'Fix every High and Critical finding', 'Rerun until clean'],
    }),
    task({
      id: 'sec-reviewer',
      title: 'Add the security-reviewer subagent',
      outcome: 'A second Claude with fresh eyes reviews your code for exploitable bugs.',
      minutes: 15,
      xp: 35,
      blocks: [
        eli5(
          'What is a subagent?',
          `A subagent is a helper Claude with its own job description and a clean memory. The Claude that wrote the code is biased, it thinks it did fine. The security reviewer has never seen the code before, so it spots what the builder missed.`,
        ),
        code('sec-reviewer-file', '.claude/agents/security-reviewer.md', 'md', SECURITY_REVIEWER),
        prompt(
          'sec-reviewer-prompt',
          'Create and run the reviewer',
          `
Create .claude/agents/security-reviewer.md with exactly this content:

${SECURITY_REVIEWER.trim()}

Then use the security-reviewer subagent to review the whole ${name} repo: every
route handler, server action, edge function, migration, proxy/middleware file,
next.config and every place an environment variable is read. Show me its report
unchanged. Then fix every Critical and High finding one at a time, run
npm run build after each fix, and show me the output.
`,
        ),
        steps(
          `Paste the prompt. The review takes a few minutes.`,
          `Read the report. Critical and High get fixed now. Medium: ask Claude to add them to TASKS.md.`,
          `When fixes are done, say "Commit with a clear message and push".`,
        ),
        p(`**Check it worked:** run "Use the security-reviewer subagent again on the full repo" and it reports no Critical or High issues.`),
      ],
      checklist: [['Create and run the security reviewer', 'copy:sec-reviewer-prompt'], 'Fix every Critical and High finding', 'Rerun the reviewer until clean', 'Commit and push'],
    }),
    task({
      id: 'sec-advisors',
      title: 'Run the Supabase Security and Performance Advisors',
      outcome: 'Supabase\'s own scanner shows no errors on your project.',
      minutes: 10,
      xp: 20,
      blocks: [
        eli5(
          'What are the advisors?',
          `Supabase runs its own robot inspector over your database. The Security Advisor looks for open doors (tables without RLS, risky functions). The Performance Advisor looks for things that will get slow as ${name} grows (missing indexes).`,
        ),
        steps(
          `Supabase > your project > **Advisors** (left sidebar) > **Security Advisor**.`,
          `Click **Rerun linter** (or **Refresh**). Read each item under **Errors** and **Warnings**.`,
          `For each item click it, then **Copy as prompt** if shown (or copy the title and description) and paste into Claude Code with: "Fix this Supabase advisor finding with a new migration. Explain it in one sentence and wait for my approval before applying."`,
          `Go to Advisors > **Performance Advisor** and do the same. The usual ones are "unindexed foreign keys" and "auth RLS initplan" (a policy calling \`auth.uid()\` without \`select\`). Both are one-line fixes.`,
          `Rerun both advisors.`,
        ),
        links([{ label: 'Supabase database advisors docs', url: 'https://supabase.com/docs/guides/database/database-advisors' }]),
        p(`**Check it worked:** Security Advisor shows **0 errors**. Warnings like "Leaked password protection disabled" can be fixed in Authentication > Sign In / Providers > Email if your plan allows it.`),
      ],
      checklist: ['Run the Security Advisor', 'Fix every error with Claude', 'Run the Performance Advisor and fix its items', 'Rerun until 0 errors'],
    }),
    task({
      id: 'sec-hack-yourself',
      title: 'Hack yourself: try to read data you should not see',
      outcome: 'You have proven with your own eyes that strangers and other users see nothing.',
      minutes: 25,
      xp: 50,
      blocks: [
        eli5(
          'Why test as an attacker?',
          `A rule existing is not the same as a rule working. The only proof is to try the attack yourself. Your publishable key is visible in every visitor's browser, so you use it exactly as a stranger would.`,
        ),
        prompt(
          'sec-hack-prompt',
          'Generate the attack commands',
          `
Use the Supabase MCP to list every table in the public schema. For each table,
write me two curl commands I can run myself (do not run them, and use the
placeholders <ref> and <publishable-key> instead of real values):
1. Anonymous read: GET https://<ref>.supabase.co/rest/v1/<table>?select=*
   with headers apikey: <publishable-key>
2. Logged in as user B, reading user A's rows: same URL with
   &user_id=eq.<user-A-id> (or the table's owner column), headers apikey and
   Authorization: Bearer <user-B-access-token>.
Give Mac/Linux versions and Windows PowerShell versions (curl.exe). Also tell me
which tables are meant to be public, if any, and what each command should return.
`,
        ),
        p(`First get a logged-in token for a second test user (user B). Create user B by signing up on the live site with another email, then run:`),
        code(
          'sec-hack-token',
          'Get user B\'s access token (Mac/Linux)',
          'bash',
          `
curl -X POST "https://<ref>.supabase.co/auth/v1/token?grant_type=password" \\
  -H "apikey: <publishable-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"userB@example.com","password":"userB-password"}'
# Copy the long "access_token" value from the reply.
`,
        ),
        code(
          'sec-hack-curl',
          'The attacks (Mac/Linux). Windows: use curl.exe and put each command on one line',
          'bash',
          `
# 1. Stranger with only the publishable key. Expect: []
curl "https://<ref>.supabase.co/rest/v1/<table>?select=*" \\
  -H "apikey: <publishable-key>"

# 2. User B asking for user A's rows. Expect: []
curl "https://<ref>.supabase.co/rest/v1/<table>?select=*&user_id=eq.<user-A-id>" \\
  -H "apikey: <publishable-key>" \\
  -H "Authorization: Bearer <user-B-access-token>"

# 3. User B trying to write a row as user A. Expect: an error mentioning row-level security
curl -X POST "https://<ref>.supabase.co/rest/v1/<table>" \\
  -H "apikey: <publishable-key>" \\
  -H "Authorization: Bearer <user-B-access-token>" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id":"<user-A-id>"}'

# 4. Anyone trying to give themselves a subscription. Expect: an RLS error
curl -X POST "https://<ref>.supabase.co/rest/v1/subscriptions" \\
  -H "apikey: <publishable-key>" \\
  -H "Authorization: Bearer <user-B-access-token>" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id":"<user-B-id>","status":"active","stripe_customer_id":"cus_fake"}'
`,
        ),
        steps(
          `Find user A's id: Supabase > Authentication > Users > click user A > copy the **UID**.`,
          `Run the prompt above to get the exact commands for every ${name} table, then run each one in your terminal.`,
          `Every read must print \`[]\`. Every write must print an error with \`row-level security\` in it.`,
          `**The browser test:** log in as user A in your normal browser and open one of their records (copy the URL, for example \`/app/<something>/<id>\`). Open a private window, log in as user B, paste the URL. You must see "Not found" or be redirected, never user A's data.`,
          `Anything that returns data: copy the command and output into Claude Code and say "This should return nothing. Fix the RLS policy with a migration."`,
        ),
        mistakes([
          { mistake: 'Testing with the secret key', fix: 'The secret key ignores RLS on purpose, so every test passes. Always attack with the publishable key.' },
          { mistake: 'Seeing [] and assuming the table is safe for writes', fix: 'Reads and writes have separate policies. Run the POST tests too.' },
          { mistake: 'Trusting the success page for access', fix: 'Type /app?checkout=success into the address bar as an unpaid user. You must still hit the paywall.' },
          { mistake: 'Leaving a policy with using (true) on a private table', fix: 'That means "everyone". Replace it with (select auth.uid()) = user_id.' },
          { mistake: 'Fixing RLS in the dashboard by clicking', fix: 'Fixes go in a migration file so they are saved in GitHub and rerun the same way next time.' },
        ]),
      ],
      checklist: [
        ['Generate the attack commands', 'copy:sec-hack-prompt'],
        ['Get user B\'s access token', 'copy:sec-hack-token'],
        ['Run every anonymous and cross-user attack', 'copy:sec-hack-curl'],
        'Do the two-browser URL test',
        'Fix anything that returned data',
      ],
    }),
    task({
      id: 'sec-bundle',
      title: 'Check no secrets reach the browser',
      outcome: 'Your live JavaScript contains no secret keys.',
      minutes: 10,
      xp: 25,
      blocks: [
        eli5(
          'What is the bundle?',
          `Every visitor's browser downloads your app's JavaScript to run it. Anything in that download, anyone can read. If a secret key slipped into a browser file, it is public. You search the download to be sure.`,
        ),
        steps(
          `Open https://yourdomain.com in Chrome. Log in so the app pages load too.`,
          `Right-click > **Inspect** > **Sources** tab.`,
          `Press Cmd + Option + F (Mac) or Ctrl + Shift + F (Windows) to search all files.`,
          `Search for each of these one at a time: \`sb_secret_\`, \`sk_live_\`, \`sk_test_\`, \`whsec_\`, \`re_\` followed by part of your Resend key${app.apis.length ? `, and the first 6 characters of your ${app.apis.map((a) => a.name).join(' / ')} key${app.apis.length > 1 ? 's' : ''}` : ''}.`,
          `Every search must say **No matches** (\`sk_test_\` or \`re_\` may match inside library code as plain text, but never followed by your real key).`,
          `Also run the prompt below so Claude checks the code, the git history and the build output.`,
        ),
        prompt(
          'sec-bundle-prompt',
          'Search for leaked secrets',
          `
Run npm run build. Then search, and show me each command and its result:
1. The .next/static folder (browser code) for: sb_secret_, sk_live_, sk_test_,
   whsec_, re_ followed by 20+ characters, and every server-only env var name from
   .env.example.
2. The full git history: git log -p --all | grep -E "sb_secret_|sk_live_|sk_test_|whsec_" | head
3. Every file with "use client" for process.env usage that is not NEXT_PUBLIC_.
Do not print any secret values, only file names and counts. If anything is found,
tell me which key I must rotate and where.
`,
        ),
        warn('Found a key?', `Rotate it: create a new key in that service, update .env.local, Vercel and Supabase secrets, redeploy, then delete the old key. Deleting the commit is not enough, git history keeps it.`),
      ],
      checklist: ['Search the live site Sources for sb_secret_ and sk_', ['Run the leak search prompt', 'copy:sec-bundle-prompt'], 'Rotate any key that was found'],
    }),
    task({
      id: 'sec-rate-limit',
      title: 'Rate limit the expensive endpoints',
      outcome: `Nobody can run up your ${app.apis.length ? app.apis.map((a) => a.name).join(' or ') + ' bill' : 'bills'} or spam your signup form.`,
      minutes: 20,
      xp: 40,
      blocks: [
        eli5(
          'What is rate limiting?',
          `Rate limiting is a "one per customer" sign. Each user can call an expensive action only so many times per minute or day. Without it, one bot or one angry user can call your AI or email endpoints thousands of times and you pay for every call.`,
        ),
        prompt(
          'sec-rate-limit-prompt',
          'Add rate limits',
          `
Add per-user rate limiting to ${name} using Supabase (no new services).
1. Migration: table public.rate_limits (user_id uuid, bucket text, window_start
   timestamptz, count int, primary key (user_id, bucket, window_start)) with RLS
   enabled and no policies, plus a security definer function
   public.hit_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
   returns boolean that uses auth.uid(), upserts the counter for the current
   window and returns false when over the limit. Set search_path = '' on it and
   revoke execute from anon. Show me the migration and wait for approval.
2. List every API route, server action and edge function that costs money or
   sends email (third-party API calls${app.apis.length ? ' to ' + app.apis.map((a) => a.name).join(', ') : ''}, Resend sends,
   Stripe checkout/portal creation, file uploads). Propose a limit for each
   (for example 10 per minute and 200 per day) and wait for my OK.
3. Call hit_rate_limit at the top of each one and return 429 with a friendly
   message when it returns false. Show a toast in the UI for 429s.
4. For signup and login, confirm Supabase auth rate limits are on
   (Authentication > Rate Limits) and tell me the current values.
Run npm run build and show me the output, then tell me how to test one limit.
`,
        ),
        steps(
          `Approve the migration and the limits.`,
          `**Check it worked:** do the action Claude names as the test quickly more times than the limit (or ask Claude to write a tiny loop script against localhost). You should see the "slow down" toast and a 429 in the dev server log.`,
          `Supabase > **Authentication > Rate Limits**: check the email and sign-in limits look sensible (Claude tells you the numbers).`,
        ),
      ],
      checklist: [['Run the rate limit prompt', 'copy:sec-rate-limit-prompt'], 'Approve the migration and limits', 'Hit a limit on purpose and see the 429'],
    }),
    task({
      id: 'sec-storage',
      title: 'Lock down storage buckets',
      outcome: 'Uploaded files are private to the user who uploaded them.',
      minutes: 15,
      xp: 30,
      blocks: [
        eli5(
          'What is a bucket?',
          `A storage bucket is a folder in the cloud for files (images, audio, PDFs). A public bucket is like a shop window: anyone with the link can look. A private bucket needs a rule saying whose files are whose, usually "files in the folder named after your user id are yours".`,
        ),
        prompt(
          'sec-storage-prompt',
          'Audit storage',
          `
Use the Supabase MCP to list every storage bucket and every policy on
storage.objects. For each bucket tell me: public or private, file size limit,
allowed MIME types, and the policies for select, insert, update and delete.
Rules for ${name}:
- Only marketing images may be in a public bucket. User files go in private buckets.
- Private buckets store files at <user_id>/<filename> and every policy checks
  (storage.foldername(name))[1] = (select auth.jwt()->>'sub').
- Every bucket has a file size limit and an allowed MIME types list.
- The app shows private files with signed URLs that expire (createSignedUrl,
  60 to 3600 seconds), never getPublicUrl.
Write a migration for anything that breaks these rules and wait for my approval.
Then search the code for getPublicUrl and list each use.
`,
        ),
        steps(
          `Run the prompt and approve the fixes.`,
          `**Check it worked:** upload a file as user A. In Supabase > **Storage** > the bucket, click the file > **Get URL**. Open that URL in a private window with no login: it must fail (400 or "Object not found").`,
          `Log in as user B and try to open user A's file link from the app: it must fail.`,
        ),
        tip('No uploads in your app?', `If ${name} has no storage buckets, Claude says so. Tick this task off.`),
      ],
      checklist: [['Run the storage audit prompt', 'copy:sec-storage-prompt'], 'Test a private file link in a logged-out window', 'Test user B cannot open user A\'s file'],
    }),
    task({
      id: 'sec-headers',
      title: 'Add security headers',
      outcome: 'securityheaders.com gives your site an A.',
      minutes: 15,
      xp: 25,
      blocks: [
        eli5(
          'What are security headers?',
          `Headers are little notes your site sends to the browser with every page, like "never show this page inside another website" or "only load scripts from these places". They block whole families of attacks with no change to your app.`,
        ),
        steps(
          `Go to securityheaders.com, enter \`https://yourdomain.com\`, tick **Hide results** and **Follow redirects**, click **Scan**. Note the grade.`,
          `Paste the prompt below.`,
          `After Claude pushes and Vercel redeploys, scan again. Aim for **A**.`,
          `Click around the live site afterwards (landing, login, app, checkout, billing portal). If anything stopped loading, open DevTools > Console, copy the red "Content Security Policy" line into Claude Code and ask it to allow that source.`,
        ),
        prompt(
          'sec-headers-prompt',
          'Add headers',
          `
Add security headers to ${name} in next.config (headers() for all routes):
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=() (allow microphone or
camera only if the PRD needs them)
Content-Security-Policy: start in Content-Security-Policy-Report-Only mode with
default-src 'self', and allow exactly what the app uses: the Supabase project URL
(https and wss), js.stripe.com, checkout.stripe.com, api.stripe.com, the analytics
script domain, fonts, and every third-party domain the app calls from the browser.
List every domain you added and why.
Run npm run build, commit and push. After I confirm nothing broke, switch the CSP
from Report-Only to enforced in a second commit.
`,
        ),
        links([{ label: 'securityheaders.com', url: 'https://securityheaders.com' }]),
      ],
      checklist: ['Scan your domain on securityheaders.com', ['Run the headers prompt', 'copy:sec-headers-prompt'], 'Click through the live site for CSP errors', 'Rescan and get an A'],
    }),
    task({
      id: 'sec-deps',
      title: 'Turn on dependency and secret scanning',
      outcome: 'GitHub warns you about leaked keys and vulnerable packages automatically.',
      minutes: 10,
      xp: 20,
      blocks: [
        eli5(
          'What are dependencies?',
          `Your app uses hundreds of free code packages written by other people. Sometimes one has a security hole. \`npm audit\` and GitHub's Dependabot check them for known holes and tell you which to update.`,
        ),
        code('sec-audit-cmd', 'Terminal (in your project folder)', 'bash', `npm audit --omit=dev`),
        steps(
          `Run the command above. If it lists **high** or **critical** issues, paste the output into Claude Code: "Fix these with npm audit fix or by updating the packages. Do not use --force without asking. Run npm run build and show me the output."`,
          `GitHub > your \`${slug}\` repo > **Settings** > **Advanced Security** (older accounts: **Code security and analysis**).`,
          `Turn on **Dependabot alerts** and **Dependabot security updates**.`,
          `Turn on **Secret scanning** and **Push protection** if they are listed for your repo.`,
          `**Check it worked:** the repo's **Security** tab shows Dependabot as enabled. Rerun \`npm audit --omit=dev\`: 0 high or critical.`,
        ),
        tip('When Dependabot opens a pull request', `Ask Claude: "Review the open Dependabot PR with gh, run npm run build on that branch, and merge it if the build passes."`),
      ],
      checklist: [['Run npm audit', 'copy:sec-audit-cmd'], 'Fix high and critical issues', 'Turn on Dependabot alerts and security updates', 'Turn on secret scanning and push protection'],
    }),
  ]

  return {
    id: 'security',
    label: 'Security Sweep',
    title: `Lock ${name} down before strangers arrive`,
    goal: `You have tested ${name} as an attacker: no stranger or other user can read data, no secret reaches the browser, and costly endpoints are rate limited.`,
    icon: 'shield',
    tasks: [...tasks, ...app.content.securityTasks],
  }
}

// ---------------------------------------------------------------------------
// Phases 7 to 9: Marketing (app-specific content, one shared opener)
// ---------------------------------------------------------------------------

function outboundPhase(app: AppDef): Phase {
  const { name } = app
  const opener = task({
    id: 'out-daily-block',
    title: 'Set your daily outbound block',
    outcome: 'One protected hour a day for outreach, tracked on your streak.',
    minutes: 5,
    xp: 15,
    blocks: [
      eli5(
        'Why a fixed hour?',
        `Building feels productive and selling feels scary, so selling always gets pushed to "later". A fixed hour, every weekday, before you open Claude Code, means it happens. Ten messages a day for a month is 200 conversations.`,
      ),
      steps(
        `Open your calendar and create a recurring event: **9:00 to 10:00am, every weekday**, title \`${name} outbound\`.`,
        `Set it to busy and turn on a 5 minute reminder.`,
        `During that hour: no code, no Claude Code, no email inbox. Only the outbound tasks below.`,
        `At 10:00 tick today on your streak. Missing a day breaks it.`,
      ),
      table(
        ['Daily target', 'Minimum', 'Good'],
        [
          ['New people contacted', '10', '25'],
          ['Follow-ups sent', '5', '15'],
          ['Replies answered', 'All', 'All within 2 hours'],
        ],
      ),
      tip('Track it in one place', `A simple sheet with columns Date, Name, Company, Channel, Sent, Replied, Call booked, Trial started is enough. Look at it every Friday.`),
    ],
    checklist: ['Create the 9 to 10am weekday calendar block', 'Set up your outreach tracking sheet', 'Do your first outbound hour'],
  })
  return {
    id: 'outbound',
    label: 'Outbound',
    title: 'Outbound & Cold Sales',
    goal: `You contact ideal ${name} customers every weekday and book trials from cold outreach.`,
    icon: 'send',
    tasks: [opener, ...app.content.marketing.outbound],
  }
}

function inboundPhase(app: AppDef): Phase {
  return {
    id: 'inbound',
    label: 'Inbound & Content',
    title: `Content that brings ${app.name} customers to you`,
    goal: `You publish content on a schedule that sends ideal customers to ${app.name}'s free trial.`,
    icon: 'video',
    tasks: app.content.marketing.inbound,
  }
}

function paidPhase(app: AppDef): Phase {
  return {
    id: 'paid',
    label: 'Paid Ads',
    title: `Paid ads for ${app.name}`,
    goal: `You run small, tracked ad tests and know what one paying ${app.name} customer costs you.`,
    icon: 'megaphone',
    tasks: app.content.marketing.paid,
  }
}

// ---------------------------------------------------------------------------
// Phase 10: Final Sweep
// ---------------------------------------------------------------------------

function launchPhase(app: AppDef): Phase {
  const { name, slug, price } = app
  const d = price.trialDays
  const m = price.monthly

  const directories: string[][] = [
    ['Product Hunt', 'https://www.producthunt.com/posts/new', 'Launch day. Schedule for 12:01am Pacific, Tuesday to Thursday'],
    ['BetaList', 'https://betalist.com/submit', 'Early adopters. Free queue is slow, submit early'],
    ["There's An AI For That", 'https://theresanaiforthat.com/submit/', 'AI tool searchers'],
    ['Futurepedia', 'https://www.futurepedia.io/submit-tool', 'AI tool directory'],
    ['SaaSHub', 'https://www.saashub.com/submit', 'Alternatives searches, good for SEO'],
    ['AlternativeTo', 'https://alternativeto.net/', 'List as an alternative to the big tool in your niche'],
    ['Indie Hackers', 'https://www.indiehackers.com/products', 'Founder audience, post your revenue updates'],
    ['Microlaunch', 'https://microlaunch.net', 'Month-long launch for small products'],
    ['Uneed', 'https://www.uneed.best/submit-a-tool', 'Daily launch list'],
    ['Peerlist', 'https://peerlist.io/launchpad', 'Weekly launchpad'],
  ]

  const shared: Task[] = [
    task({
      id: 'launch-landing',
      title: 'Landing page conversion pass',
      outcome: `More of your visitors start the ${d}-day trial.`,
      minutes: 30,
      xp: 40,
      blocks: [
        eli5(
          'What is conversion?',
          `Conversion is the share of visitors who do the thing you want, here: start a trial. If 100 people visit and 3 start a trial, that is 3%. Small fixes to the page (a clearer headline, a demo above the fold) can double it, which is the same as doubling your traffic for free.`,
        ),
        prompt(
          'launch-landing-prompt',
          'Conversion pass on the landing page',
          `
Do a conversion pass on the ${name} landing page (app/page.tsx and
components/landing/). Check each item, show me pass/fail, then fix every fail:
1. Hero headline states the customer's outcome in under 10 words, not the feature.
   Sub-line says who it is for (${app.idealFor}).
2. A demo video or GIF of the real product sits above the fold on desktop and
   directly under the headline on mobile. If there is no file yet, add
   public/demo.mp4 support (autoplay, muted, loop, playsInline, poster image) and
   tell me how to record it.
3. One CTA only, everywhere: "Start ${d}-day free trial". Same destination on every
   button. Remove any competing links from the hero.
4. Pricing is visible on the page without clicking: $${m}/month, "${d}-day free trial,
   cancel any time".
5. FAQ answers the top objections: price, what happens after the trial, cancelling,
   data safety, setup time, who it is not for.
6. A social proof slot next to the hero CTA and the pricing CTA (testimonial,
   logos or "used by X teams"). Leave clearly marked placeholders I can fill.
7. Page title and meta description include what ${name} does. Add an Open Graph
   image (app/opengraph-image.tsx) with the headline.
8. Works at 375px. No layout shift when fonts load.
Run npm run build and show me the output. Screenshot at 375px and 1440px if you
have the Chrome DevTools MCP.
`,
        ),
        steps(
          `Run the prompt and read the pass/fail list before it fixes anything.`,
          `Record the demo: a 20 to 40 second screen recording of the core ${name} action from start to result (Mac: Cmd + Shift + 5; Windows: Win + Alt + R or Clipchamp). Save it as \`public/demo.mp4\` in your \`${slug}\` folder.`,
          `Ask Claude: "Commit and push".`,
          `**Check it worked:** paste your URL into the prompt "Here is only my URL: https://yourdomain.com. Work out my offer, my ideal customer and the companies I should target. Quote the lines that led you there." If Claude cannot tell who ${name} is for, neither can a visitor. Rewrite the hero until it can.`,
        ),
      ],
      checklist: [['Run the conversion pass prompt', 'copy:launch-landing-prompt'], 'Record and add the demo video', 'Test the page with the URL-only prompt', 'Commit and push'],
    }),
    task({
      id: 'launch-speed',
      title: 'Run Lighthouse and PageSpeed',
      outcome: 'Your landing page scores 90+ on performance on mobile.',
      minutes: 20,
      xp: 30,
      blocks: [
        eli5(
          'Why speed matters',
          `Every extra second a page takes to load, more visitors leave before they see it. Google also ranks slow pages lower. Lighthouse is a free checker that scores your page out of 100 and lists exactly what slows it down.`,
        ),
        steps(
          `Go to pagespeed.web.dev, paste \`https://yourdomain.com\`, click **Analyze**.`,
          `Look at the **Mobile** tab first (it is the harder one). Note the four scores: Performance, Accessibility, Best Practices, SEO.`,
          `Scroll to **Diagnostics** and copy everything listed into Claude Code with the prompt below.`,
          `After Claude pushes and Vercel redeploys, run the test again.`,
        ),
        prompt(
          'launch-speed-prompt',
          'Fix the Lighthouse findings',
          `
Here are the PageSpeed Insights mobile results for https://yourdomain.com:
[paste the scores and every Diagnostics item]

Fix them for ${name}, aiming for 90+ in all four categories on mobile:
- Images through next/image with width/height and priority on the hero only.
- The demo video lazy-loaded below the fold on mobile, with a poster image.
- Fonts via next/font with display swap; no layout shift.
- Remove unused JavaScript from the landing page (no client components that do
  not need to be; move analytics to load after interaction or idle).
- Every image has alt text, every button has a label, colour contrast passes.
- Add app/sitemap.ts and app/robots.ts.
Run npm run build, show me the route sizes from the build output, commit and push.
`,
        ),
        p(`**Check it worked:** mobile Performance is 90 or higher. If it is stuck in the 80s because of the analytics or video, that is acceptable: do not remove your demo to win points.`),
        links([{ label: 'PageSpeed Insights', url: 'https://pagespeed.web.dev' }]),
      ],
      checklist: ['Run PageSpeed on mobile', ['Paste the results into the fix prompt', 'copy:launch-speed-prompt'], 'Rerun and reach 90+ performance'],
    }),
    task({
      id: 'launch-security-pass',
      title: 'Second security pass on the full repo',
      outcome: 'Everything you added since the Security Sweep is checked too.',
      minutes: 20,
      xp: 35,
      blocks: [
        p(`You built more after the Security Sweep (landing changes, emails, maybe new tables). Run both checks again on the finished app.`),
        code('launch-security-cmds', 'Inside Claude Code', 'txt', `/clear\n/rls-audit`),
        prompt(
          'launch-security-prompt',
          'Full repo review',
          `
Use the security-reviewer subagent on the full ${name} repo (not only the latest
diff): every route handler, server action, edge function, migration,
proxy/middleware, next.config and env var read. Then go through this list and
show pass/fail with evidence for each:
1. RLS on every public table, per-operation policies, anonymous REST returns [].
2. No sb_secret_, sk_, whsec_ or re_ keys in .next/static or git history.
3. Every server action and API route calls getClaims() and checks ownership.
4. Webhook verifies the raw body signature and de-duplicates on event.id.
5. Access only from public.subscriptions status in ('trialing','active').
6. Rate limits on every endpoint that costs money or sends email.
7. Storage buckets private with per-user folder policies.
8. Security headers present on the live domain (curl -I https://yourdomain.com).
Fix every Critical and High finding, run npm run build after each fix, commit and push.
`,
        ),
        steps(
          `Run \`/rls-audit\` first, then the prompt.`,
          `Rerun the anonymous curl test from Hack yourself on any table added since.`,
          `**Check it worked:** both reports come back with no Critical or High items, and Supabase > Advisors > Security Advisor shows 0 errors.`,
        ),
      ],
      checklist: [['Run /rls-audit again', 'copy:launch-security-cmds'], ['Run the full repo review', 'copy:launch-security-prompt'], 'Fix every Critical and High', 'Check Security Advisor shows 0 errors'],
    }),
    task({
      id: 'launch-stripe-live',
      title: 'Go live on Stripe (if not done yet)',
      outcome: 'Real cards work on your real domain.',
      minutes: 30,
      xp: 40,
      blocks: [
        p(`If you finished **Going live checklist** in the Payments phase, tick this off. If not, do it now: open Payments > Going live checklist and follow every step.`),
        steps(
          `Check Vercel > Settings > Environment Variables (Production): \`STRIPE_SECRET_KEY\` starts \`sk_live_\`, \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\` starts \`pk_live_\`, \`STRIPE_PRICE_ID\` is the live price, \`STRIPE_WEBHOOK_SECRET\` is the live endpoint's \`whsec_\`.`,
          `Stripe (live mode) > Developers > Webhooks > your endpoint shows recent deliveries with **200**.`,
          `Buy ${name} with your own card on https://yourdomain.com, check you get in, then cancel in the portal and refund any charge.`,
        ),
        warn('Keep test keys local', `\`.env.local\` on your laptop keeps the test keys forever. Only Vercel Production gets live keys.`),
      ],
      checklist: ['Confirm all four Stripe vars in Vercel Production are live', 'See 200s on the live webhook', 'Make one real purchase and refund it'],
    }),
    task({
      id: 'launch-analytics',
      title: 'Set up analytics goals',
      outcome: 'You can see how many visitors sign up, start a trial and pay, and where they came from.',
      minutes: 20,
      xp: 35,
      blocks: [
        eli5(
          'What is a goal?',
          `Analytics counts visitors. A goal counts the moments that matter: someone signed up, someone started a trial, someone paid. Goals tell you which channel (cold email, a post, an ad) brings paying customers, not only clicks.`,
        ),
        steps(
          `**DataFast:** dashboard > **Add website** > enter \`yourdomain.com\` > copy the script tag it shows. (**PostHog:** Project settings > copy the project API key and host.)`,
          `Paste the prompt below, with your script or PostHog key, into Claude Code.`,
          `**DataFast revenue:** in DataFast > website settings > **Revenue** > connect Stripe, so it shows which traffic source brought each payment.`,
          `Push, then visit your live site in a private window, sign up a test account, and start a trial.`,
          `**Check it worked:** within a few minutes the dashboard shows your visit and the \`signup\` and \`trial_started\` goals.`,
        ),
        prompt(
          'launch-analytics-prompt',
          'Add analytics and goals',
          `
Add analytics to ${name}. I use [DataFast | PostHog] (pick the one I name).
DataFast: add this script to app/layout.tsx with next/script strategy
"afterInteractive": [paste the DataFast script tag]. Track goals with
window.datafast?.("<goal_name>").
PostHog: install posthog-js, init in a client provider with
NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST (add both to .env.example),
and track goals with posthog.capture("<goal_name>").

Goals to fire (once each, never twice for the same user action):
- signup: after a successful signUp.
- onboarding_completed: after the last onboarding step.
- trial_started: on the success_url page once the subscription row is trialing.
- paid: server side from the webhook when a subscription first becomes active
  (DataFast: connect Stripe revenue instead; PostHog: posthog-node capture).
- core_action: the first time a user completes the main ${name} action from the PRD.
Do not send emails, names or any personal data as properties.
Run npm run build, commit and push.
`,
        ),
        tip('Add the new env vars', `Using PostHog? Add \`NEXT_PUBLIC_POSTHOG_KEY\` and \`NEXT_PUBLIC_POSTHOG_HOST\` to \`.env.local\` and Vercel, then redeploy.`),
      ],
      checklist: ['Add your site in DataFast or PostHog', ['Run the analytics prompt', 'copy:launch-analytics-prompt'], 'Connect Stripe revenue (DataFast)', 'See signup and trial_started goals fire'],
    }),
    task({
      id: 'launch-uptime',
      title: 'Set up an uptime alert',
      outcome: `You get a text or email within minutes if ${name} goes down.`,
      minutes: 10,
      xp: 15,
      blocks: [
        eli5('What is uptime monitoring?', `A robot visits your site every few minutes. If it fails to load, the robot emails or texts you. You find out before your customers tell you.`),
        steps(
          `Go to betterstack.com > **Uptime** > sign up (free plan).`,
          `**Monitors** > **Create monitor**. **Alert us when:** URL becomes unavailable. **URL:** \`https://yourdomain.com\`. Check every **3 minutes**. Turn on **Email** (and **SMS/push** with the app if you want). **Create monitor**.`,
          `Create a second monitor for \`https://yourdomain.com/login\`, so a broken app is caught even if the landing page loads.`,
          `Optional: ask Claude "Add app/api/health/route.ts that returns 200 and runs a cheap select 1 style query against Supabase" and monitor that URL too.`,
          `**Check it worked:** the monitors show **Up** in green.`,
        ),
        links([{ label: 'Better Stack Uptime', url: 'https://betterstack.com/uptime' }]),
      ],
      checklist: ['Sign up to Better Stack', 'Create a monitor for your domain', 'Create a monitor for /login', 'See both monitors Up'],
    }),
    task({
      id: 'launch-directories',
      title: 'Submit to launch directories',
      outcome: `${name} is listed in 10 places early adopters browse.`,
      minutes: 60,
      xp: 40,
      blocks: [
        p(`Each listing brings a trickle of visitors and a backlink that helps Google trust your domain. Prepare the assets once, then paste them everywhere.`),
        prompt(
          'launch-directories-prompt',
          'Write the listing kit',
          `
Write a launch listing kit for ${name} in LAUNCH.md, using @PRD.md and the live
landing page copy:
- Name, tagline under 60 characters, one-liner under 140 characters.
- Short description (about 260 characters) and long description (about 800).
- 5 feature bullets, pricing line ("$${m}/month, ${d}-day free trial"), 6 tags or categories.
- A maker comment for Product Hunt: who I am, why I built it, what it does, the
  offer, and one question for the community. Plain, no hype words.
- A 4-slide gallery plan (what each 1270x760 image should show).
No em dashes. British spelling.
`,
        ),
        table(['Directory', 'Submit at', 'Notes'], directories),
        steps(
          `Run the prompt. Open LAUNCH.md in VS Code.`,
          `Make the gallery images: screenshots of your app at 1270x760 (ask Claude to build a /og-gallery page you can screenshot, or use Canva).`,
          `Submit to every directory in the table, one tab at a time, pasting from LAUNCH.md. Use the same name, tagline and logo everywhere.`,
          `Pick your Product Hunt day (Tuesday to Thursday) and schedule it. Tell your list and community the day before.`,
          `Track each submission in your outreach sheet: Directory, Submitted date, Live date, Visitors.`,
        ),
        links(directories.map(([label, url]) => ({ label, url }))),
      ],
      checklist: [['Write the listing kit', 'copy:launch-directories-prompt'], 'Make 4 gallery images', 'Submit to all 10 directories', 'Schedule your Product Hunt launch'],
    }),
    task({
      id: 'launch-communities',
      title: 'Post in communities',
      outcome: `People who already gather around ${name}'s problem hear about it from you.`,
      minutes: 45,
      xp: 35,
      blocks: [
        eli5(
          'Give before you post',
          `Communities hate drive-by links. The posts that work tell a real story (what you built, why, what you learned, a number) and ask for feedback. The link is the last line, not the first.`,
        ),
        prompt(
          'launch-communities-prompt',
          'Write the community posts',
          `
Write launch posts for ${name} for each place below, in my voice: plain, specific,
no hype words, no em dashes, British spelling. Each post tells the story (the
problem ${app.idealFor} have, what I built, one real number or result from testing),
asks one genuine question, and puts the link last.
1. Reddit r/SaaS (title + body, "show and tell" style, under 250 words)
2. Reddit r/SideProject (shorter, more personal, under 180 words)
3. Indie Hackers post (build story with what I would do differently)
4. LinkedIn post (hook line, 6 to 10 short lines, no hashtags spam, max 3)
5. X / Twitter thread (6 posts, first one stands alone)
6. One niche community where ${app.idealFor} hang out: name 3 candidates
   (subreddits, Slack/Discord groups, forums) and write a post that fits their rules.
Save them to LAUNCH.md under "Community posts".
`,
        ),
        steps(
          `Run the prompt and edit each post so it sounds like you.`,
          `Read each community's rules first (Reddit: sidebar > Rules). Some only allow promotion on certain days or in a weekly thread.`,
          `Post one per day across a week, not all at once, so you can reply to every comment within an hour.`,
          `Reply to every comment, including critical ones. Thank people, answer questions, ask what they would pay for.`,
          `**Check it worked:** DataFast shows visitors from each community (Referrer column), and your goals show which ones signed up.`,
        ),
        tip('Your Skool community counts', `Post your launch in the course community too. Other members are your first testers and your first testimonials.`),
      ],
      checklist: [['Write the community posts', 'copy:launch-communities-prompt'], 'Check each community\'s rules', 'Post in one community a day for a week', 'Reply to every comment'],
    }),
  ]

  const ship = task({
    id: 'launch-ship',
    title: 'Ship it',
    outcome: `${name} is live, taking real payments, and you are selling it every day.`,
    minutes: 15,
    xp: 80,
    blocks: [
      p(`This is the last check before you call ${name} launched. Go through it on the live domain, in a private window, on your phone.`),
      steps(
        `Open https://yourdomain.com on your phone. The page loads fast, the demo plays, the pricing is visible.`,
        `Sign up with a fresh email. The welcome email arrives from hello@yourdomain.com.`,
        `Finish onboarding and start the ${d}-day trial with a real card. You land in /app with access.`,
        `Do the core ${name} action once from start to finish.`,
        `Open Billing > Manage billing. Cancel. Check the "Cancels on" date shows. Refund yourself in Stripe if you were charged.`,
        `Check DataFast or PostHog shows the signup and trial_started goals, Better Stack shows Up, and Stripe live webhooks show 200s.`,
        `Ask Claude: "Append to CLAUDE.md anything you learned this project that would stop a future session making a mistake, one line each. Commit and push."`,
        `Post your launch in the Skool community with your URL and your first number (visitors, signups or trials).`,
      ),
      tip('What happens next', `From tomorrow your daily rhythm is: 9 to 10am outbound, one piece of content, reply to every user within a few hours, and one small improvement a day from what customers tell you.`),
    ],
    checklist: ['Sign up and start a trial on your phone', 'Do the core action end to end', 'Cancel from the portal and refund yourself', 'Post your launch in the community'],
  })

  return {
    id: 'launch',
    label: 'Final Sweep',
    title: `Final sweep and launch ${name}`,
    goal: `${name} is fast, secure, live on Stripe, tracked, listed in directories and announced.`,
    icon: 'flag',
    tasks: [...shared, ...app.content.launchTasks, ship],
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildPhases(app: AppDef): Phase[] {
  return [
    setupPhase(app),
    foundationsPhase(app),
    backendPhase(app),
    paymentsPhase(app),
    deployPhase(app),
    securityPhase(app),
    outboundPhase(app),
    inboundPhase(app),
    paidPhase(app),
    launchPhase(app),
  ]
}
