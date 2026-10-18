# Quiet Precision: design system

v1.0, Oct 2026. Design requirements extracted from Decibel. This is the base design system for every
app built from the vault, and for the vault itself. Each kit's DESIGN.md builds on it and only states
what is different for that brand (accent hue, illustration style, product-specific screens).

**Calm surfaces. Exact type. Nothing jumps.** White working surfaces split by hairlines, one pastel
blue, Geist set close, soft motion that never moves the layout under your cursor.

- Light only
- Geist 400, 500, 600
- 6px boxes, 4px pills
- 13px app text
- Reduced motion respected

## 01 Principles

Eight decisions everything else follows from. When a new screen raises a question the spec doesn't
answer, answer it with these.

1. **White is the material.** Every working surface is white. Structure comes from 1px hairlines,
   never from grey panels or tinted backgrounds.
2. **One accent, used sparingly.** A single pastel blue marks "selected" and "in progress".
   Everything else is ink, greys and the eight pastel tag hues.
3. **Type does the hierarchy.** One family, three weights, close tracking. Emphasis comes from weight
   and ink depth, never from new sizes.
4. **Nothing moves under the cursor.** Clicking, revealing, counting or loading never resizes a
   button, a row or a bar. Space is reserved before content arrives.
5. **Motion explains, then gets out of the way.** Opacity and transform only, 160 to 360ms, one
   easing curve. A step changes in place; a row rises once.
6. **Overlays float, pages don't reflow.** Dialogs, menus and side panels sit above the page in a
   portal. Opening one never pushes content sideways.
7. **Sentence case, plain words.** Labels say what happens ("Reveal and export"). Errors say what
   went wrong and what to do next.
8. **Consistency beats novelty.** Before adding a shape, size or colour, reuse one that exists. A
   one-off pill is a bug.

## 02 Colour

Neutrals carry 95% of the interface. Ink is near-black with a cool bias; greys lean slightly blue so
they read as chosen, not default.

| Token | Hex | Use |
| --- | --- | --- |
| Surface | `#ffffff` | Every working surface |
| Row hover | `#fafafb` | Table row hover |
| Hover fill | `#f5f5f6` | Button and nav hover |
| Hairline | `#e6e6e9` | Structure lines |
| Row divider | `#efeff1` | Between table rows |
| Button edge | `#dcdde0` | Button borders |
| Ink | `#08090a` | Headings |
| Body | `#3c4149` | Body text |
| Muted | `#62666d` | Secondary text |
| Faint | `#6f747c` | Labels (darkened from Decibel's `#8a8f98`, which fails 4.5:1 on white) |
| Ghost | `#b4b8bf` | Placeholders, disabled |
| Blue | `#5f86e0` | Selected, in progress |
| Blue soft | `#f1f5fd` | Selected fill |
| Blue edge | `#c4d4f5` | Selected border |
| Success | `#27a644` | |
| Warning | `#d18b0f` | |
| Danger | `#eb5757` | |

**Tag hues:** pastel fill at 6 to 9% opacity, a darker edge of the same hue, and readable ink. Status
maps to fixed hues; free labels hash to the first seven of eight hues.

## 03 Typography

Geist everywhere, weights 400, 500 and 600. Tracking tightens as size grows. Inside the app every
piece of UI text is 13px; only real headings are larger. Figures that line up use tabular numbers.

| Role | Size / line height | Tracking | Weight |
| --- | --- | --- | --- |
| Display | 52 / 1.04 | -0.045em | 500 |
| H1 | 35 / 1.12 | -0.035em | 500 |
| H2 | 24 / 32 | -0.03em | 500 |
| H3 | 20 / 26 | -0.025em | 500 |
| App text | 13 / 18 | -0.014em | 400 |
| Label | 13 / 18, faint ink | -0.014em | 400 |
| Numbers | tabular-nums | | |

- One size scale (12, 13, 14, 16, 20, 24, 32, 48) and never an arbitrary pixel size. Headings get
  `text-wrap: balance`. Body copy stays near 65 characters wide. No monospace in the UI.
- Emphasis: step up in weight (400 to 500) or ink (muted to ink) before reaching for size. Bold
  renders at 600. Never all caps, never all lowercase labels.

## 04 Layout and space

A fixed set of bar heights gives every screen the same rhythm. Content scrolls; chrome doesn't.

| Element | Size | Notes |
| --- | --- | --- |
| Sidebar | 240px, 56px under 1100px | White, right hairline. Nav items 32px high, section labels 28px |
| Page toolbar | 48px | Search, count, actions. Bottom hairline. No page titles, no top bar |
| Filter bar | 44px | Chips across the top, scrolls sideways, never a side rail |
| Table header / row | 36px / 48px | Fixed column widths, single-line cells, ellipsis |
| Footer bar | 48px | Paging and totals |
| Controls | 36px, compact 32px | Inputs, selects and buttons share heights so rows align |
| Marketing rail | 1180px max | Hairline left and right; sections 56px / 80px vertical padding |
| Dialog | 520px max, 24px padding | Opens at 10% from the top, not centred, so steps can grow downwards |

Spacing uses a 4px base (4, 8, 12, 16, 20, 24, 32, 48). Lay out siblings with `gap`, not margins.
Layers: nav 90, header 92, menus 93, dialog overlay 100, dialog 101, toast 110.

## 05 Shape and depth

- **Radius:** 6px for every box in the app: buttons, inputs, nav items, cards, dialogs. 4px for tags
  and pills. 2px for checkboxes. Marketing stays square.
- **Borders:** always 1px. Hairline `#e6e6e9` for structure, softer `#efeff1` between rows. Dashed
  only for "add" affordances.
- **Shadow:** only floating things cast one: menus, the selection bar, toasts.
  `0 4px 16px rgba(8,9,10,.08)` plus a 1px ring. Buttons get a 1px lift at most.

## 06 Motion

Opacity and transform only. One out-curve, `cubic-bezier(0.16, 1, 0.3, 1)`, and one morph curve,
`cubic-bezier(0.2, 0, 0, 1)`. With reduced motion on, everything appears instantly.

- **Dialog in:** 220ms, rises 8px and scales from 98.5%, overlay fades over 200ms.
- **Step morph:** height animates 300ms to the new content while it fades up 4px after 60ms. Width
  never changes.
- **Rows rise once:** 360ms, 6px, staggered 25ms per row, capped at 270ms. Only the first time a
  region appears in a session.
- **Menu pop:** 160ms from the trigger corner, 4px and 98% scale. Rendered in a portal so no table
  can clip it.

| Moment | Duration | Movement |
| --- | --- | --- |
| Hover, press | 100 to 160ms | Colour only; buttons press to 98% scale |
| Page, overlay | 200 to 220ms | Fade |
| Toast | 240ms | Rises 8px from the bottom left |
| Side panel | 200ms | Slides 24px from the right over the page; never reflows it |
| Progress, meters | 300 to 500ms | Width eases with the morph curve |
| Live states | 1.4 to 1.5s loop | A dot pulses; nothing else loops in the app |
| Loading | after 200ms, min 400ms | Spinners wait 200ms before showing and stay at least 400ms so they never flicker. The label stays underneath so width holds |

## 07 Components

Every button is white with a light edge; there are no filled or black buttons. The primary is
distinguished by a firmer edge, not a fill.

- **Buttons:** 36px (32 compact, 46 large). Label states the action. Loading keeps the label in place
  and overlays the spinner.
- **Inputs:** focus is a darker edge and a 3px ink halo, no blue outline. Errors sit below in danger
  ink with `role=alert`.
- **Filter chips:** label, the first value cut at 150px, and a "+N" that always shows. Chips stack
  across the top of the table. "+ Add filter" is dashed.
- **Selection bar:** floats 16px above the bottom. Fixed width, and every action has a minimum width
  sized for three-digit counts, so changing the selection never shifts anything.
- **Meter:** blue, then amber under 20%, coral under 5%.
- **Toast:** bottom left, 4 seconds, at most four. No full stop.
- **Live status:** a pulsing dot plus label ("Checking 42%"). The only looping motion in the app.
- **Icons:** navigation uses Phosphor at 17px, regular weight at rest, duotone in pastel blue when
  selected. In-content icons use Lucide at 14 to 16px with a 1.5 stroke. One icon family per
  region, never mixed in a row.

## 08 Stability rules

The most important section. Most "ugly" feedback comes from layout that shifts while someone is using it.

**Do**
- Fix widths on bars whose labels contain counts; give each action a minimum width.
- Use tabular numbers anywhere digits change.
- Reserve the space a result will need before it arrives (min-heights on captions and status lines).
- Keep a multi-step flow in one dialog that morphs height; keep its width constant.
- Hide controls with `visibility: hidden`, not removal, when their absence would shift a row.
- Play reveal animations once per session per region.

**Don't**
- Let "1 lead" to "12 leads" resize a button.
- Swap a confirm dialog for a second dialog; morph the first.
- Reflow the page to show a panel; overlay it.
- Change a button's width while it loads.
- Truncate the part that matters (a "+1" count) instead of the long value.
- Re-animate rows on every refetch.

## 09 Voice and content

| Element | Rule | Example |
| --- | --- | --- |
| Buttons | Verb first, says exactly what happens, cost in brackets | Reveal and export (3 credits) |
| Errors | What went wrong, then what to do; full stop | Could not save the outcome yet. It will retry automatically. |
| Toasts | Short past tense, no full stop, optional action | Person added |
| Counts | Locale formatting, singular and plural handled | 1 lead · 1,004,788 credits |
| Claims | Anything not live or not measured carries a footnote | * Coming soon, included in Pro |
| Case | Sentence case everywhere; no all caps | Find missing mobiles |

## 10 Accessibility and responsive

- Visible focus on every control (2px outline, 2px offset). Real roles: dialog, menu, checkbox with
  mixed state, toolbar, progressbar with values. Icon-only buttons are labelled. Toasts are polite
  live regions. Escape closes overlays.
- Every animation has a reduced-motion fallback that shows the end state. The sidebar collapses to
  icons under 1100px. Marketing clips sideways overflow and gives grid children `min-width: 0`;
  check every page at 320, 375 and 430px.

## 11 Starter tokens

Drop these into a new project and build components only from them.

```css
:root {
  /* surfaces and lines */
  --surface: #ffffff;  --row-hover: #fafafb;  --hover: #f5f5f6;
  --hairline: #e6e6e9; --divider: #efeff1;   --btn-edge: #dcdde0;
  /* ink */
  --ink: #08090a; --body: #3c4149; --muted: #62666d; --faint: #6f747c; --ghost: #b4b8bf;
  /* accent */
  --blue: #5f86e0; --blue-soft: #f1f5fd; --blue-edge: #c4d4f5;
  /* status */
  --success: #27a644; --warning: #d18b0f; --danger: #eb5757;
  /* type */
  --font: "Geist", ui-sans-serif, system-ui, sans-serif;
  --text: 13px/18px; --tracking: -0.014em;
  --h3: 500 20px/26px; --h2: 500 24px/32px; --h1: 500 clamp(23px,2.8vw,35px)/1.12;
  /* shape */
  --radius-box: 6px; --radius-pill: 4px; --radius-check: 2px;
  --shadow-float: 0 4px 16px rgba(8,9,10,.08), 0 0 0 1px rgba(8,9,10,.04);
  /* size */
  --control: 36px; --control-compact: 32px; --bar: 48px; --filter-bar: 44px; --row: 48px;
  /* motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-morph: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 120ms; --dur-base: 200ms; --dur-reveal: 320ms;
}
```

## How a kit uses this

- Copy this file into the project root as `DESIGN_SYSTEM.md`, and the kit's own `DESIGN.md` next to it.
- CLAUDE.md imports both: `UI rules: @DESIGN_SYSTEM.md @DESIGN.md`. Where they disagree, DESIGN.md wins
  only for the brand accent and product-specific screens; every stability, motion and component rule
  here still applies.
- A kit may swap the accent hue for its brand (keeping it pastel, with a soft fill and an edge), but
  not the neutrals, radii, type scale or motion curves.
