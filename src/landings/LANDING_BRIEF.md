# Landing page brief

Each kit has a fictional brand and a `landingPrd` (in its `src/content/apps/<slug>` content). Build that
brand's real marketing site as a React page so members can see what "done" looks like before they
build their own. It must follow the kit's landingPrd: every section in order, the exact copy, the
plans and prices, the FAQ, the comparison table. Do not invent features the PRD doesn't have.

## Where it lives
- `src/landings/<slug>/index.tsx` default-exports the page component. Split sections into files in
  the same folder if long. Styles in `src/landings/<slug>/styles.css`, imported by index.tsx, and
  EVERY selector scoped under `.lp-<slug>` (the root element's class) so nothing leaks into the vault.
- Route `/landing/<slug>` renders it full-screen (registered automatically). A "Back to kit" pill
  floats bottom-left; leave room for it (no fixed element in the bottom-left 260x60).
- Available: React 19, `motion` (`import { motion, useInView } from 'motion/react'`), `lucide-react`.
  No other packages. No images from the internet: product visuals are built in code (styled divs,
  inline SVG, ASCII in `<pre>`).
- Fonts: load extra Google Fonts only by injecting a `<link>` in a `useEffect` (Geist and Instrument
  Serif are already loaded globally). Allowed extras: Geist Mono, Inter Tight, Space Grotesk,
  Fraunces, IBM Plex Mono, JetBrains Mono.

## Shared design base (the Decibel style)
- Geist, tight letter spacing: headings -0.035em to -0.045em, body -0.006em. `text-wrap: balance`.
- Hairline borders (#E6E9F0 light), 8px radius (some brands 12 to 16px), soft tinted surfaces
  (e.g. #F5F7FC, #EDF2FD), chips as rounded pills with a 6px status dot.
- Accent used sparingly. NO solid black blocks and no big solid-colour slabs; buttons are soft tints
  with coloured text, or a subtle gradient, or a crisp outline. Dark brands use deep navy/charcoal
  surfaces with lighter cards, never pure #000.
- Bento grids for features: 2 to 3 sizes of tile, each tile has a small live motion piece (a looping
  mini product animation: counters ticking, list items sliding in, a cursor clicking, a chart line
  drawing, a waveform, typing dots). Motion is subtle, 200 to 900 ms, ease [0.2, 0.7, 0.1, 1].
- One ASCII element per page that teaches something (a flow diagram, a pipeline, a terminal, a
  chart) in a mono font.
- Standard page scrolling. NO scroll-jacking, no pinned scroll scenes, no parallax galleries, no
  horizontal scroll sections. Reveal-on-view (fade/rise 12px once) is fine.
- Every animation respects `prefers-reduced-motion` (show the finished state).
- Responsive: perfect at 375, 768, 1280, 1440. No horizontal page scroll. Nav collapses to a menu.
- Pricing: monthly/annual toggle with animated price change; plan cards; "Start 7-day free trial".
- FAQ: accessible accordion. On open it must not jump the page (no scrollIntoView).
- Accessibility: real buttons and links, focus rings, alt text/aria-labels on visuals, contrast 4.5:1.

## Per-brand direction (make each one feel distinct)
| Kit | Direction |
| --- | --- |
| bookwell | Warm and friendly local-business feel. Cream #FFFBF3 background, amber accent, 14px radius, rounded calendar bento, a phone mockup with a booking flow. Headings Geist; one playful accent in Instrument Serif italic. |
| helpdeck | Clean SaaS, white with soft blue tints, chat-bubble motion, a live "AI answering with sources" demo tile, light dot-grid background in the hero. |
| etcher | Enterprise CRM, crisp light theme on a faint 24px square grid, slate ink, blue accent, dense data bento (kanban that moves a deal, call timer, pipeline value counter), Inter Tight for big numbers. |
| factorie | The dark one: deep navy #0B1020 surfaces, lighter #121933 cards, violet/cyan accents, dot-matrix grid, ASCII rank chart, monospace data labels (Geist Mono), engines leaderboard animating. |
| ethereel | Creator brand: warm off-white paper #F7F4EE with faint blue exercise-book grid, burnt red #C2412D accent, Instrument Serif italic mixed into headlines, 9:16 phone frames playing fake captioned clips, film grain overlay at low opacity. |
| conversate | Friendly support brand: soft lavender-blue gradient wash, 16px radius, big rounded widget mockup with launcher, typing indicator, inbox three-pane tile, Space Grotesk headings. |
| outbounder | Technical growth brand: light with green accent, terminal-like ASCII sequence diagram, inbox warm-up chart, reply classification chips, JetBrains Mono for data. |
| proposely | Editorial: ivory background, Fraunces headings, document/paper cards with signatures drawing on, amber accent, generous whitespace. |
| carousely | Playful creator tool: violet and peach tints, Space Grotesk, slides fanning out in a bento, swipe dots, bold numbers. |

## Done means
- `npx tsc -p .` passes. Open `http://localhost:5173/landing/<slug>` (dev server may already be
  running; else `npx vite --port 5173 &`), screenshot at 1440 and 390 wide with Playwright
  (`require('/opt/node22/lib/node_modules/playwright')`, Chromium is preinstalled) and fix anything
  broken, overlapping or off-brief. Check there is no horizontal scroll at 390.
- Scoped styles only. Touch no files outside `src/landings/<slug>/`. Do not commit.
