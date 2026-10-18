import { useState } from 'react'
import { Search } from 'lucide-react'
import { inline } from '../lib/markdown'

interface Doc { term: string; group: string; eli5: string; detail: string; example?: string }

const DOCS: Doc[] = [
  { group: 'Basics', term: 'Terminal', eli5: 'A text window where you type commands instead of clicking buttons.', detail: 'Mac: press Cmd+Space, type Terminal, press Enter. Windows: press the Windows key, type PowerShell, press Enter. Every `command` in the playbook is typed here and run with Enter.', example: 'cd ~/Documents' },
  { group: 'Basics', term: 'Folder / directory', eli5: 'Your project lives in one folder. Claude Code only sees what is inside it.', detail: '`cd` moves you into a folder. `mkdir name` makes a new one. `pwd` prints where you are. Always start `claude` from inside your app’s folder.', example: 'mkdir ethereel && cd ethereel' },
  { group: 'Basics', term: 'Claude Code', eli5: 'Claude, living in your terminal, able to read and write the files in your folder.', detail: 'Install once, then run `claude` in a project folder. It writes code, runs commands, fixes errors and commits to git. You give it PRDs and prompts from the playbook. Needs a Claude Pro or Max plan.', example: 'claude' },
  { group: 'Basics', term: 'PRD', eli5: 'The instruction manual for your app, written before any code.', detail: 'Product Requirements Document. The Build PRD says what the app does, page by page. The Design PRD says how it looks. Claude Code reads both and turns them into a plan, then code.' },
  { group: 'Basics', term: 'Plan mode', eli5: 'Claude thinks and writes a plan but is not allowed to change files yet.', detail: 'Press Shift+Tab until the status bar says plan mode. Use it for anything touching the database, auth or payments. Approve the plan, then Claude builds it.' },
  { group: 'Basics', term: 'CLAUDE.md', eli5: 'A sticky note Claude reads at the start of every session.', detail: 'Lives in the root of your project. Holds your stack, commands and rules (for example “every table gets RLS”). Keep it short: every line should stop a real mistake.' },
  { group: 'Backend', term: 'Supabase', eli5: 'Your app’s back office: who is logged in, where data is stored, where files go.', detail: 'Gives you a Postgres database, user sign-up and login, file storage and edge functions. Use the cloud version at supabase.com.' },
  { group: 'Backend', term: 'SQL', eli5: 'The language you use to tell the database what tables to build.', detail: 'Each kit has one big SQL file. You paste it into Supabase > SQL Editor > New query and press Run. It creates every table, security rule and storage bucket the app needs.' },
  { group: 'Backend', term: 'RLS (Row Level Security)', eli5: 'A bouncer on every table that only lets you see your own rows.', detail: 'Without RLS anyone with your public key can read every row. With RLS, a policy like `(select auth.uid()) = user_id` means each user only sees their own data. Every kit’s SQL turns it on for every table.' },
  { group: 'Backend', term: 'Publishable key vs secret key', eli5: 'The publishable key is your shop’s front door. The secret key is the master key to the building.', detail: '`sb_publishable_...` is safe in the browser because RLS still applies. `sb_secret_...` skips RLS, so it only goes in server code and Supabase secrets. Never paste it in a file that starts with `"use client"` or a variable that starts with `NEXT_PUBLIC_`.' },
  { group: 'Backend', term: 'Environment variable', eli5: 'A labelled envelope holding a key, kept outside your code.', detail: 'Locally they live in `.env.local` (never committed to GitHub). On Vercel you paste them in Project > Settings > Environment Variables. Change one on Vercel and you must redeploy.', example: 'STRIPE_SECRET_KEY=sk_test_...' },
  { group: 'Backend', term: 'Edge function', eli5: 'A small piece of code that runs on Supabase’s servers when something calls it.', detail: 'Used for anything that needs a secret key or takes a while: calling Claude, Firecrawl or Deepgram, receiving webhooks. Deploy with `npx supabase functions deploy name`.' },
  { group: 'Backend', term: 'Webhook', eli5: 'A doorbell another service rings when something happens.', detail: 'Stripe rings it when someone pays. Deepgram rings it when a transcript is ready. Your endpoint checks the signature so nobody can fake the ring, then updates the database.' },
  { group: 'Backend', term: 'MCP server', eli5: 'A plug that lets Claude Code use another tool directly.', detail: 'With the Supabase MCP connected, Claude can list your tables, run the security advisor and read logs without you copying anything. Add one with `claude mcp add`, then run `/mcp` to log in.' },
  { group: 'Payments', term: 'Free trial', eli5: 'They put a card in, use the app free for 7 days, then get charged automatically.', detail: 'Set with `subscription_data.trial_period_days` on Stripe Checkout. The webhook writes `trialing` to your subscriptions table. Your app lets people in when status is `trialing` or `active`.' },
  { group: 'Payments', term: 'Test mode', eli5: 'Stripe’s practice mode with fake money.', detail: 'Use card 4242 4242 4242 4242, any future date, any CVC. Test keys start `sk_test_`. When ready, switch to live keys and create a live webhook endpoint.' },
  { group: 'Payments', term: 'Customer Portal', eli5: 'A Stripe-hosted page where customers change card or cancel without emailing you.', detail: 'Turn it on in Stripe > Settings > Billing > Customer portal. Your “Manage billing” button sends people there.' },
  { group: 'Deploy', term: 'Git and GitHub', eli5: 'Git is save points for your code. GitHub is the cloud shelf where the save points live.', detail: 'Claude Code commits your changes and pushes them to a private GitHub repo. Vercel watches that repo and redeploys on every push.' },
  { group: 'Deploy', term: 'Vercel', eli5: 'The computer on the internet that shows your app to the world.', detail: 'Sign in with GitHub, import the repo, paste your env vars, press Deploy. Every push to the main branch goes live in about a minute.' },
  { group: 'Deploy', term: 'DNS', eli5: 'The internet’s phone book: it turns yourapp.com into Vercel’s address.', detail: 'At Porkbun, add an A record `@ → 76.76.21.21` and a CNAME `www → cname.vercel-dns.com`. Changes usually work within 30 minutes.' },
  { group: 'Deploy', term: 'Domain', eli5: 'Your app’s address. Buy it once a year.', detail: 'Buy at Porkbun. A .com is usually under $12 in year one. Use a second, separate domain for cold email so your main one stays clean.' },
  { group: 'Selling', term: 'MRR', eli5: 'Money that arrives every month without you selling again.', detail: 'Monthly recurring revenue. 130 customers at $79 is $10,270 MRR. The playbook targets work backwards from your MRR goal.' },
  { group: 'Selling', term: 'Warm-up', eli5: 'New email inboxes start slow so Gmail learns to trust them.', detail: 'New inboxes send 5 to 10 emails a day in week 1 and ramp to 25 to 30 a day by week 3. Sending 100 a day from a new domain lands you in spam.' },
  { group: 'Selling', term: 'ICP', eli5: 'The exact type of customer you are selling to.', detail: 'Ideal customer profile: role, company size, industry, and the problem they already pay to solve. Every kit’s outbound tab gives you the ICP and the lead filters.' },
]

export default function DocsPage() {
  const [q, setQ] = useState('')
  const n = q.trim().toLowerCase()
  const list = DOCS.filter((d) => !n || `${d.term} ${d.eli5} ${d.detail}`.toLowerCase().includes(n))
  const groups = [...new Set(DOCS.map((d) => d.group))]
  return (
    <div className="page">
      <header className="page-head">
        <span className="label">Documentation</span>
        <h1>Every word the playbook uses, explained.</h1>
        <p>One line like you are five, then exactly how it works in your build. Search any term you hit in a step.</p>
      </header>
      <div className="input-icon" style={{ maxWidth: 440, marginBottom: 28 }}><Search size={16} /><input className="input" placeholder="Search: RLS, webhook, DNS…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="docs-layout">
        <nav className="docs-toc">
          {groups.map((g) => (
            <div key={g}>
              <span className="label">{g}</span>
              {DOCS.filter((d) => d.group === g).map((d) => <a key={d.term} href={`#doc-${d.term}`}>{d.term}</a>)}
            </div>
          ))}
        </nav>
        <div className="stack" style={{ gap: 14 }}>
          {list.map((d) => (
            <article key={d.term} id={`doc-${d.term}`} className="card doc-item">
              <div className="row between wrap"><h3>{d.term}</h3><span className="chip">{d.group}</span></div>
              <p className="doc-eli5"><span className="label" style={{ color: 'var(--violet)' }}>ELI5</span> {d.eli5}</p>
              <p className="muted">{inline(d.detail)}</p>
              {d.example && <pre className="doc-ex mono">{d.example}</pre>}
            </article>
          ))}
          {!list.length && <p className="muted">No match for “{q}”. Ask in Support.</p>}
        </div>
      </div>
    </div>
  )
}
