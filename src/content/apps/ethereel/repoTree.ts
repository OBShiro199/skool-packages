// Ethereel: Folder tree shown in setup.
// Generated from markdown source; plain text inside a template literal.

export const repoTree = `ethereel/
├── app/
│   ├── (marketing)/page.tsx            # landing page from LANDING.md
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── onboarding/page.tsx             # Brand, Look, Socials, First upload
│   ├── app/layout.tsx                  # access check + sidebar shell
│   ├── app/videos/page.tsx             # library
│   ├── app/videos/[id]/page.tsx        # processing view
│   ├── app/videos/[id]/assets/page.tsx # "Add assets?"
│   ├── app/review/page.tsx             # review inbox
│   ├── app/review/[id]/page.tsx        # phone preview, caption, Pass / Revise / Reject
│   ├── app/queue/page.tsx              # week view of slots
│   ├── app/assets/page.tsx
│   ├── app/docs/page.tsx
│   ├── app/help/page.tsx
│   ├── app/billing/page.tsx
│   ├── app/settings/page.tsx           # 7 tabs
│   └── api/
│       ├── stripe/webhook/route.ts
│       ├── zernio/callback/route.ts
│       └── videos/{retry,reject,undo,delete}/route.ts
├── components/
│   ├── shell/{AppShell,Sidebar,PlanMeter}.tsx
│   ├── upload/{UploadSheet,UploadRow,DropZone}.tsx
│   ├── review/{PhoneFrame,PlatformOverlay,CaptionEditor,PassDialog,RevisionDialog,VersionList}.tsx
│   ├── queue/SlotGrid.tsx
│   ├── StatusTag.tsx
│   ├── StepList.tsx
│   └── ui/                             # shadcn/ui, restyled to Quiet Precision
├── lib/
│   ├── grade.ts                        # one preset → CSS filters + ffmpeg filters
│   ├── plans.ts                        # display copy of plan_limits()
│   ├── upload/tus.ts
│   └── supabase/{client,server}.ts
├── packages/shared/                    # used by Next.js, Trigger.dev and Remotion
│   ├── edit.ts                         # EditSchema (edit.json)
│   ├── cut.ts                          # silence map + cut list (exact numbers)
│   ├── captions.ts  zoom.ts  assets.ts  cutawayRules.ts  layout.ts  revise.ts  diff.ts
│   └── __tests__/*.test.ts
├── trigger/                            # Trigger.dev v4 tasks
│   ├── queues.ts
│   ├── process-video.ts  prepare-video.ts  transcribe-video.ts  cut-video.ts
│   ├── detect-faces.ts   plan-video.ts     render-video.ts      mix-export.ts
│   ├── write-caption.ts  revise-video.ts
│   └── lib/{supabase,callback,claude,ffmpeg}.ts
├── python/
│   ├── faces.py
│   ├── models/face_landmarker.task
│   └── requirements.txt
├── remotion/
│   ├── index.ts  Root.tsx  Reel.tsx
│   ├── layers/{VideoTrack,Cutaway,Captions,OpeningTitle,FollowCard}.tsx
│   ├── public/{fonts,sfx}/
│   └── sample-props.json
├── supabase/
│   ├── migrations/0001_ethereel.sql
│   └── functions/
│       ├── _shared/{admin,auth,http,log,limits,meter,trigger,claude,guard,email,zernio,caption}.ts
│       ├── create-upload/index.ts
│       ├── start-pipeline/index.ts
│       ├── trigger-callback/index.ts
│       ├── request-revision/index.ts
│       ├── rewrite-caption/index.ts
│       ├── pass-video/index.ts
│       ├── zernio-sync/index.ts
│       └── connect-social/index.ts
├── trigger.config.ts
├── PRD.md  DESIGN.md  DESIGN_SYSTEM.md  LANDING.md  CLAUDE.md
├── .env.example
└── README.md
`
