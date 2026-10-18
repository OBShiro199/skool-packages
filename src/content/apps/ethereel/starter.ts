// Ethereel: Starter file contents, keyed by path.
// Generated from markdown source.

export const starterText: Record<string, string> = {
  '.env.example': `# Next.js (.env.local and Vercel env)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
TRIGGER_SECRET_KEY=

# Supabase secrets (npx supabase secrets set NAME=value)
# TRIGGER_SECRET_KEY, TRIGGER_CALLBACK_SECRET, ANTHROPIC_API_KEY, ZERNIO_API_KEY,
# RESEND_API_KEY, CRON_SECRET, SITE_URL

# Trigger.dev env (dashboard > Environment Variables, Dev and Prod)
# SUPABASE_URL, SUPABASE_SECRET_KEY, TRIGGER_CALLBACK_URL, TRIGGER_CALLBACK_SECRET,
# GROQ_API_KEY, DEEPGRAM_API_KEY (optional), ANTHROPIC_API_KEY,
# REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY, REMOTION_AWS_REGION,
# REMOTION_FUNCTION_NAME, REMOTION_SERVE_URL`,
  'CLAUDE.md': `# Ethereel

Raw talking-head clips in, edited and captioned reels out, posted to TikTok and Instagram after the creator presses Pass.

Specs: @PRD.md (build), @LANDING.md (landing page).
UI rules: @DESIGN_SYSTEM.md @DESIGN.md

## Rules
- edit.json (packages/shared/edit.ts) is the single source of truth. Renders never decide anything that is not in it.
- Claude decides content; code decides layout, timing and rules. Never ask Claude for pixel positions.
- Keep every number marked (exact) in PRD.md exactly as written.
- Long work runs in Trigger.dev tasks (./trigger), never in a Next.js route or an edge function.
- Every paid call writes usage_ledger with an idempotency key. Limits come from plan_limits() in SQL.
- User text (transcripts, filenames, notes, guidance) goes to Claude inside tags with the data rule. No tools on any Claude call.
- Model: claude-opus-5-5 with output_config.effort and json_schema output. Do not send thinking: disabled.
- Nothing posts without a Pass. Never add an auto-approve path.
- Tests: npm test runs vitest for packages/shared. Run it before every commit.`,
  'packages/shared/cut.ts': `// Silence cutting. Numbers are exact (from Rosewell Reels). Do not change without asking.
export const WINDOW_MS = 10
export const THRESHOLD_BELOW_VOICE_DB = 12
export const MIN_LOUD_RUN_MS = 60 // clicks shorter than this do not break a pause
export const MIN_PAUSE_TO_CUT_MS = 400
export const KEEP_AFTER_WORD_MS = 120
export const KEEP_BEFORE_WORD_MS = 100
export const LEAD_IN_MS = 200
export const TAIL_MS = 400

export interface Word { i: number; w: string; s: number; e: number }
export interface Segment { id: string; srcStart: number; srcEnd: number }

/** Pauses between consecutive words longer than MIN_PAUSE_TO_CUT_MS become cuts, with padding kept. */
export function cutList(words: Word[], durationMs: number): Segment[] {
  if (words.length === 0) return []
  const segs: Segment[] = []
  let start = Math.max(0, words[0].s - LEAD_IN_MS)
  for (let k = 0; k < words.length - 1; k++) {
    const gap = words[k + 1].s - words[k].e
    if (gap > MIN_PAUSE_TO_CUT_MS) {
      segs.push({ id: \`s\${segs.length + 1}\`, srcStart: start, srcEnd: words[k].e + KEEP_AFTER_WORD_MS })
      start = words[k + 1].s - KEEP_BEFORE_WORD_MS
    }
  }
  const last = words[words.length - 1]
  segs.push({ id: \`s\${segs.length + 1}\`, srcStart: start, srcEnd: Math.min(durationMs, last.e + TAIL_MS) })
  return segs
}`,
  'README.md': `# Ethereel

1. Copy .env.example to .env.local and fill it in (see the playbook).
2. npm install
3. npm run dev (Next.js), npx trigger.dev@latest dev (tasks), npm run remotion:studio (reel preview).
4. Run the migration in supabase/migrations/0001_ethereel.sql once in the Supabase SQL editor.`,
}
