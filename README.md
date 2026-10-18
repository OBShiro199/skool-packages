# BPA Vault

Member dashboard for the **Build $10K p/m Profitable Apps** Skool community: a library of plug-and-play SaaS build kits for Claude Code, with gamified, step-by-step playbooks.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
```

Deploys to Vercel as a static Vite app (`vercel.json` rewrites every route to `index.html`).

## What is in it

| Area | Where |
| --- | --- |
| Sign up / sign in (Skool email prompt) | `src/pages/AuthPage.tsx` |
| Onboarding quiz and kit match | `src/pages/OnboardingPage.tsx` |
| Library ("Clone a Software App") | `src/pages/LibraryPage.tsx`, `src/pages/AppDetailPage.tsx` |
| Signature pledge and "You're in" | `src/components/CommitModal.tsx`, `src/components/SignaturePad.tsx` |
| Build workspace (10 phase tabs, checklists, XP) | `src/pages/BuildPage.tsx`, `src/components/TaskCard.tsx` |
| Download all code (starter pack zip) | `src/lib/zip.ts`, `src/components/DownloadCodeModal.tsx` |
| Dashboard, Docs, Support, About You | `src/pages/*` |

## Content

Every kit is data. `src/content/types.ts` is the model, `src/content/phases.ts` generates the 10 shared phases (Setup, Foundations & Frontend, Backend, Payments, Deployment, Security Sweep, Outbound, Inbound & Content, Paid Ads, Final Sweep) from each kit's `AppContent`, and `src/content/apps/*` holds the kits. Writing rules for new kits: `src/content/AUTHORING.md`.

Flagship kits with full playbooks: **Ethereel** (talking-head video to captioned shorts) and **Outbounder** (AI cold email with AgentMail inboxes). Preview kits: Closebook, Bookwell, Helpdeck. 15 more are listed as "dropping soon" in `src/content/catalog.ts`.

To add a kit: create `src/content/apps/<slug>.ts` exporting an `AppDef`, then add it to `APPS` in `src/content/apps/index.ts`.

## Backend status

There is no backend yet. Accounts, onboarding answers, signatures and every checklist tick are stored in `localStorage` by `src/lib/store.ts`, keyed by email. Swapping it for Supabase means replacing the actions in that one store: `users` becomes `auth.users` + a `profiles` table, `progress.checked` becomes a `checklist_ticks` table, `commitments` becomes a `commitments` table with the signature in Storage.
