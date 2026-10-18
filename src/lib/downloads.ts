import type { AppDef, Block } from '../content/types'
import { getPhases } from '../content/apps'
import { promptsMarkdown } from './zip'

export interface Downloadable {
  id: string
  title: string
  filename: string
  /** What it is and what to do with it, one sentence. */
  use: string
  /** Where it goes in the project folder. */
  saveTo: string
  kind: 'doc' | 'sql' | 'prompts' | 'env' | 'scripts'
  content: string
  /** Checklist trigger fired when downloaded (matches doc blocks in the playbook). */
  trigger?: string
}

/** Every downloadable file for a kit, in the order a builder needs them. */
export function kitDownloads(app: AppDef): Downloadable[] {
  const phases = getPhases(app)
  const blocks = phases.flatMap((p) => p.tasks.flatMap((t) => t.blocks.map((b) => ({ b, phase: p.label }))))
  const docs = blocks.filter((x): x is { b: Extract<Block, { type: 'doc' }>; phase: string } => x.b.type === 'doc')

  const out: Downloadable[] = docs.map(({ b, phase }) => ({
    id: b.id,
    title: b.title,
    filename: b.filename,
    use: `${b.summary} Used in ${phase}.`,
    saveTo: 'Project folder root, next to CLAUDE.md',
    kind: 'doc',
    content: b.content,
    trigger: `download:${b.id}`,
  }))

  out.push({
    id: 'dl-sql',
    title: `${app.name} database (SQL)`,
    filename: '0001_init.sql',
    use: 'The whole database in one file: tables, security rules, storage and functions. Paste it into Supabase > SQL Editor and press Run once.',
    saveTo: 'supabase/migrations/',
    kind: 'sql',
    content: app.content.sql,
  })

  if (app.content.edgeFunctions.length) {
    const md = [
      `# ${app.name}: edge functions`,
      '',
      'One section per function. Paste each prompt into Claude Code, set the secrets, then deploy with `npx supabase functions deploy <name> --no-verify-jwt`.',
      '',
      ...app.content.edgeFunctions.flatMap((f) => [
        `## ${f.name}`,
        '',
        `**Job:** ${f.purpose}`,
        '',
        `**Called by:** ${f.trigger}`,
        '',
        `**Secrets:** ${f.secrets.length ? f.secrets.map((s) => '`' + s + '`').join(', ') : 'none'}`,
        '',
        '```',
        f.prompt.trim(),
        '```',
        '',
      ]),
    ].join('\n')
    out.push({ id: 'dl-functions', title: 'Edge function prompts', filename: 'EDGE_FUNCTIONS.md', use: `Every ${app.name} server function: what it does, its secrets and the exact prompt that builds it.`, saveTo: 'Project folder root', kind: 'prompts', content: md })
  }

  out.push({ id: 'dl-prompts', title: 'Every Claude Code prompt, in order', filename: 'PROMPTS.md', use: 'All the prompts from every phase in one file, numbered in build order. Handy for re-running a step.', saveTo: 'Project folder root', kind: 'prompts', content: promptsMarkdown(app) })

  const envNames = new Map<string, string>()
  const core: [string, string][] = [
    ['NEXT_PUBLIC_SUPABASE_URL', 'Supabase > Project Settings > API'],
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'Supabase > Project Settings > API Keys (sb_publishable_...)'],
    ['SUPABASE_SECRET_KEY', 'Supabase > Project Settings > API Keys (sb_secret_...). Server only'],
    ['NEXT_PUBLIC_SITE_URL', 'http://localhost:3000 now, your domain later'],
    ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'Stripe > Developers > API keys (pk_test_...)'],
    ['STRIPE_SECRET_KEY', 'Stripe > Developers > API keys (sk_test_...). Server only'],
    ['STRIPE_WEBHOOK_SECRET', 'Printed by stripe listen locally, or the webhook endpoint page (whsec_...)'],
    ['STRIPE_PRICE_ID', 'Stripe > Product catalog > your product > price (price_...)'],
    ['RESEND_API_KEY', 'Resend > API Keys (re_...)'],
    ['EMAIL_FROM', `e.g. ${app.name} <hello@yourdomain.com>`],
  ]
  for (const [k, v] of core) envNames.set(k, v)
  for (const api of app.apis) for (const v of api.envVars) if (!envNames.has(v.name)) envNames.set(v.name, `${api.name}: ${v.where} (paste into ${v.pasteInto})`)
  const env = [`# ${app.name} environment variables`, '# Copy to .env.local and fill in. Never commit .env.local.', '', ...[...envNames].flatMap(([k, v]) => [`# ${v}`, `${k}=`, ''])].join('\n')
  out.push({ id: 'dl-env', title: 'Environment variables template', filename: '.env.example', use: 'Every key the app needs, with where to find each one. Copy it to .env.local and fill in the values.', saveTo: 'Project folder root', kind: 'env', content: env })

  const marketing = phases.filter((p) => ['outbound', 'inbound', 'paid', 'launch'].includes(p.id))
  const scripts = marketing.flatMap((p) => p.tasks.flatMap((t) => t.blocks.filter((b): b is Extract<Block, { type: 'code' }> => b.type === 'code' && (b.lang === 'txt' || b.lang === 'md' || b.lang === 'html')).map((b) => ({ p, t, b }))))
  if (scripts.length) {
    const md = [`# ${app.name}: marketing scripts`, '', 'Every email, DM, call script and ad from the marketing phases.', '', ...scripts.flatMap(({ p, t, b }) => [`## ${p.label} · ${t.title}: ${b.filename}`, '', '```', b.code, '```', ''])].join('\n')
    out.push({ id: 'dl-marketing', title: 'Marketing scripts', filename: 'MARKETING_SCRIPTS.md', use: `${scripts.length} ready-to-send scripts: cold emails, DMs, call openers, ad copy.`, saveTo: 'Anywhere, this one is for you not Claude', kind: 'scripts', content: md })
  }
  return out
}
