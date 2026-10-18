// Content model for the vault. Every app is data: the UI renders whatever is here.

export type CategoryId = 'sales' | 'content' | 'business' | 'productivity' | 'ai-agents'

/** A block of content inside a task. Rendered top to bottom. */
export type Block =
  /** Plain paragraph. Supports **bold** and `code` inline. */
  | { type: 'p'; text: string }
  /** ELI5 explainer, tip, or warning box. */
  | { type: 'callout'; tone: 'eli5' | 'tip' | 'warn'; title: string; text: string }
  /** Numbered sub-steps a user follows by hand (click X, then Y). */
  | { type: 'steps'; items: string[] }
  /** Something to copy into a terminal, SQL editor, or file. Gets a Copy button. */
  | { type: 'code'; id: string; filename: string; lang: 'bash' | 'sql' | 'ts' | 'json' | 'md' | 'env' | 'txt' | 'html'; code: string }
  /** A prompt to paste into Claude Code. Rendered as a terminal-style block with Copy. */
  | { type: 'prompt'; id: string; title: string; code: string }
  /** A long downloadable document (PRD etc). Preview modal + .md and PDF download. */
  | { type: 'doc'; id: string; title: string; filename: string; summary: string; content: string }
  /** Env vars / API keys: where to find each one and where to paste it. */
  | { type: 'keys'; rows: { name: string; where: string; pasteInto: string; secret: boolean }[] }
  /** ASCII diagram. */
  | { type: 'ascii'; code: string; caption: string }
  /** Simple table. */
  | { type: 'table'; head: string[]; rows: string[][] }
  /** Outbound links (sign-up pages, docs). */
  | { type: 'links'; items: { label: string; url: string }[] }
  /** Mistake / fix pairs. */
  | { type: 'mistakes'; items: { mistake: string; fix: string }[] }

export interface ChecklistItem {
  id: string
  label: string
  /**
   * Optional auto-tick. When the user copies a block with this id
   * ('copy:<blockId>') or downloads a doc ('download:<blockId>'), the item ticks itself.
   */
  trigger?: `copy:${string}` | `download:${string}`
}

export interface Task {
  id: string
  title: string
  /** One line under the title saying what this task gets you. */
  outcome: string
  minutes: number
  xp: number
  blocks: Block[]
  checklist: ChecklistItem[]
}

export interface Phase {
  id: string
  /** Short tab label, e.g. "Backend". */
  label: string
  title: string
  /** One sentence: what is true when the phase is done. */
  goal: string
  icon: 'terminal' | 'layout' | 'database' | 'card' | 'rocket' | 'shield' | 'send' | 'video' | 'megaphone' | 'flag'
  tasks: Task[]
}

export interface EnvVar {
  name: string
  /** Where the value comes from (dashboard path). */
  where: string
  /** Where it gets pasted: '.env.local', 'Supabase secrets', 'Vercel env'. */
  pasteInto: string
  secret: boolean
}

export interface ApiDef {
  name: string
  /** The job it does in this app, e.g. "transcribes audio with word timestamps". */
  job: string
  signupUrl: string
  docsUrl: string
  pricing: string
  envVars: EnvVar[]
}

export interface EdgeFunctionDef {
  name: string
  purpose: string
  /** e.g. "Called by the browser after upload", "Deepgram webhook". */
  trigger: string
  secrets: string[]
  /** The Claude Code prompt that builds it. */
  prompt: string
}

/** Everything app-specific. Shared phases pull from this. */
export interface AppContent {
  /** Full build PRD in markdown. Long. Pasted into Claude Code. */
  buildPrd: string
  /** Full design PRD in markdown: tokens, screens, components, motion, onboarding, auth pages. */
  designPrd: string
  /** The single migration the user runs in Supabase SQL editor. Tables, RLS, triggers, storage buckets. */
  sql: string
  edgeFunctions: EdgeFunctionDef[]
  /** Extra app-specific tasks appended to the Foundations phase (e.g. "Build the editor timeline"). */
  frontendTasks: Task[]
  /** Extra app-specific tasks appended to the Backend phase (e.g. API account setup). */
  backendTasks: Task[]
  /** Security tests specific to this app (e.g. "try to read another user's video"). */
  securityTasks: Task[]
  marketing: {
    outbound: Task[]
    inbound: Task[]
    paid: Task[]
  }
  /** Final sweep extras: landing page copy etc. */
  launchTasks: Task[]
  /** Folder tree shown in setup and used for the zip. */
  repoTree: string
  /** Fake starter files put in the downloadable zip (path relative to repo root). */
  starterFiles: { path: string; content: string }[]
}

export interface AppDef {
  slug: string
  name: string
  /** 3 to 6 words. */
  tagline: string
  /** One sentence bio for cards. */
  oneLiner: string
  category: CategoryId
  /** Thumbnail art params. */
  art: { motif: 'waveform' | 'mail' | 'kanban' | 'calendar' | 'chart' | 'chat'; tone: 'blue' | 'green' | 'ink' | 'amber' | 'violet' }
  price: { monthly: number; trialDays: number }
  difficulty: 1 | 2 | 3
  buildHours: number
  /** Third-party APIs beyond the core stack. */
  apis: ApiDef[]
  /** Who it suits, used in onboarding copy. */
  idealFor: string
  /** Why it sells, one or two sentences with a number. */
  whyItSells: string
  features: string[]
  /** full = complete playbook, preview = shared steps only with stub PRDs. */
  status: 'full' | 'preview'
  content: AppContent
}
