import type { AppDef } from '../content/types'
import { getPhases } from '../content/apps'
import { downloadBlob } from './files'
import designSystem from '../content/QUIET_PRECISION.md?raw'

/** Every Claude Code prompt in the playbook, in order, as one markdown file. */
export function promptsMarkdown(app: AppDef): string {
  const out: string[] = [`# ${app.name}: every Claude Code prompt, in order`, '', 'Paste these one at a time. Wait for each to finish and pass its checks before the next.', '']
  let n = 1
  for (const p of getPhases(app)) {
    const prompts = p.tasks.flatMap((t) => t.blocks.filter((b) => b.type === 'prompt').map((b) => ({ t, b })))
    if (!prompts.length) continue
    out.push(`## ${p.title}`, '')
    for (const { t, b } of prompts) {
      if (b.type !== 'prompt') continue
      out.push(`### ${n++}. ${t.title}: ${b.title}`, '', '```', b.code, '```', '')
    }
  }
  return out.join('\n')
}

export function oneShotPrompt(app: AppDef): string {
  return `You are building ${app.name} from the starter pack in this folder.

1. Read README.md, PRD.md, DESIGN_SYSTEM.md, DESIGN.md, LANDING.md, CLAUDE.md and PROMPTS.md in full before writing any code.
2. Enter plan mode. Write PLAN.md (data model, routes, RLS per table, env vars, edge functions) and TASKS.md (ordered tasks, each with a check I can run).
3. Show me PLAN.md and wait for my approval.
4. Then work through TASKS.md one task at a time, following PROMPTS.md in order. After each task run \`npm run build\` and \`npm run lint\`, show me the output, and commit with a clear message.
5. The database schema is in supabase/migrations/0001_init.sql. Do not change it without asking. Edge function skeletons are in supabase/functions.
6. Ask me for each API key when you need it. Never print keys back to me or commit .env.local.

Stop and ask if anything in the PRD is unclear.`
}

export async function downloadStarterZip(app: AppDef) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const root = zip.folder(app.slug)!
  const c = app.content

  root.file('PRD.md', c.buildPrd)
  root.file('DESIGN.md', c.designPrd)
  root.file('DESIGN_SYSTEM.md', designSystem)
  if (c.landingPrd) root.file('LANDING.md', c.landingPrd)
  root.file('PROMPTS.md', promptsMarkdown(app))
  root.file('supabase/migrations/0001_init.sql', c.sql)
  root.file('START-HERE.md', `# Start here\n\n1. Open this folder in your terminal.\n2. Run \`claude\`.\n3. Paste this prompt:\n\n\`\`\`\n${oneShotPrompt(app)}\n\`\`\`\n`)
  for (const f of c.starterFiles) root.file(f.path, f.content)
  if (!c.starterFiles.some((f) => f.path === 'README.md')) {
    root.file('README.md', `# ${app.name}\n\n${app.oneLiner}\n\nStart with START-HERE.md.\n`)
  }
  if (!c.starterFiles.some((f) => f.path === 'CLAUDE.md')) {
    root.file('CLAUDE.md', `# ${app.name}\n\n${app.oneLiner}\nProduct context: @PRD.md\nUI rules: @DESIGN_SYSTEM.md @DESIGN.md\n\n## Stack\n- Next.js (App Router, TypeScript), Tailwind, shadcn/ui\n- Supabase: auth, Postgres + RLS, storage, edge functions\n- Stripe: Checkout with ${app.price.trialDays}-day trial, Customer Portal, webhooks\n- Resend for email. Vercel for hosting.\n\n## Rules\n- Every table has RLS with one policy per operation using (select auth.uid()).\n- sb_secret_ and Stripe secret keys only in server code.\n- Server code checks the user with supabase.auth.getClaims().\n- Run npm run build before every commit.\n`)
  }
  if (!c.starterFiles.some((f) => f.path === '.gitignore')) root.file('.gitignore', 'node_modules\n.next\n.env\n.env*.local\n.vercel\n')

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${app.slug}-starter-pack.zip`)
}
