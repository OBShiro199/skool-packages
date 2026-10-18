// Carousely design PRD: tokens, type, components, every screen, states, motion, a11y, mobile.

export const designPrd = `# Carousely: design PRD

Save this file as \`DESIGN.md\` in your project root. In Claude Code say:
"Use @DESIGN.md for every screen. Build the tokens first, then the app shell, then each page."

## 1. Brand feel
- **Calm studio, confident output.** The app is a quiet workspace. The slides are the loud part.
- Soft violet tints, lots of white space, rounded corners, no heavy borders, no solid black blocks.
- It should feel like a design tool a founder trusts with their name on it: precise, never playful to the
  point of looking cheap.
- Three words for every design decision: **clear, crafted, quick**.

## 2. Design tokens
Define as CSS variables in \`app/globals.css\` and map them in \`tailwind.config.ts\` (\`bg-surface\`, \`text-ink\`).
shadcn/ui components read the same variables.

### 2.1 Light
| Token | Value | Use |
|---|---|---|
| \`--bg\` | #F8F7FC | Page background |
| \`--surface\` | #FFFFFF | Cards, panels, inspector |
| \`--surface-2\` | #F3F1FA | Slide rail, table headers, inputs |
| \`--ink\` | #1D1933 | Main text |
| \`--ink-soft\` | #3F3A5A | Body text on tinted areas |
| \`--muted\` | #6B6688 | Secondary text, captions |
| \`--line\` | #E6E3F2 | Borders and dividers |
| \`--brand\` | #6D4AFF | Primary buttons, focus ring, active nav |
| \`--brand-hover\` | #5B39F0 | Primary hover |
| \`--brand-soft\` | #EEE9FF | Selected rows, active nav background, chips |
| \`--brand-ink\` | #FFFFFF | Text on \`--brand\` |
| \`--brand-tint-ink\` | #4A2FC9 | Text on \`--brand-soft\` |
| \`--ok\` | #1F8A5B | Published, done |
| \`--ok-soft\` | #E3F5EC | Published chip background |
| \`--warn\` | #B66A00 | 80% usage, warnings |
| \`--warn-soft\` | #FFF3DD | Warning backgrounds |
| \`--danger\` | #C2364B | Failed, destructive |
| \`--danger-soft\` | #FDE8EC | Failed chip background |
| \`--info-soft\` | #E7F0FF | Scheduled chip background |
| \`--info\` | #2D5BD8 | Scheduled text |
| \`--shadow-1\` | 0 1px 2px rgba(29,25,51,0.06), 0 1px 1px rgba(29,25,51,0.04) | Cards |
| \`--shadow-2\` | 0 10px 30px rgba(45,30,120,0.10) | Popovers, dialogs, slide canvas |
| \`--radius-sm\` | 8px | Inputs, chips |
| \`--radius\` | 12px | Cards, buttons |
| \`--radius-lg\` | 20px | Dialogs, hero panels |

### 2.2 Dark
| Token | Value |
|---|---|
| \`--bg\` | #121022 |
| \`--surface\` | #1A1730 |
| \`--surface-2\` | #221E3B |
| \`--ink\` | #EEEBFA |
| \`--ink-soft\` | #CFCAE6 |
| \`--muted\` | #A39DC2 |
| \`--line\` | #2E2A4B |
| \`--brand\` | #8B6CFF |
| \`--brand-hover\` | #9C82FF |
| \`--brand-soft\` | #2A2350 |
| \`--brand-ink\` | #FFFFFF |
| \`--brand-tint-ink\` | #CFC3FF |
| \`--ok\` / \`--ok-soft\` | #4CC38A / #173528 |
| \`--warn\` / \`--warn-soft\` | #F0A93A / #3A2C12 |
| \`--danger\` / \`--danger-soft\` | #F06C7F / #3D1A22 |
| \`--info\` / \`--info-soft\` | #7FA6FF / #1A2647 |
- Dark mode follows the system setting with a toggle in Settings (Light, Dark, System).
- **Slides never change with dark mode.** They always use the brand kit colours, because they are the
  export. The canvas area behind the slide uses \`--surface-2\` in both modes.

## 3. Type
- UI font: **Inter** (400, 500, 600, 700) via \`next/font\`, \`font-feature-settings: 'cv11', 'ss01'\`.
  Numbers in counters and tables use \`font-variant-numeric: tabular-nums\`.
- Display font for marketing and empty-state headings: **Bricolage Grotesque** 700.
| Style | Size / line height | Weight | Use |
|---|---|---|---|
| Page title | 24 / 32 | 650 | Top of each page |
| Section title | 18 / 26 | 600 | Card headers, inspector sections |
| Body | 15 / 24 | 400 | Default |
| Small | 13 / 20 | 500 | Labels, helper text |
| Micro | 12 / 16 | 600, uppercase, 0.04em tracking | Status chips, table headers |
- Slide fonts are whatever the brand kit chose. The editor loads them with \`FontFace\` from \`/fonts\`.

## 4. Spacing and layout
- 4px base grid. Common steps: 4, 8, 12, 16, 24, 32, 48.
- App content max width 1280px. Editor is full width.
- Cards: 24px padding desktop, 16px mobile.
- Minimum tap target 44px.

## 5. Components (shadcn/ui plus custom)
shadcn: Button, Input, Textarea, Label, Select, Tabs, Dialog, Sheet, Popover, DropdownMenu, Tooltip, Badge,
Progress, Skeleton, Switch, Slider, Toggle Group, Calendar, Command (brand switcher), Sonner (toasts), Avatar.
Custom components:
| Component | Spec |
|---|---|
| \`AppSidebar\` | 248px wide, \`--surface\`, right border \`--line\`. See section 6 |
| \`BrandSwitcher\` | Command popover: brand avatar (logo or initials on the brand accent), name, check on active |
| \`UsageMeter\` | Label "Carousels this month", value "9 of 15", 6px bar, \`--brand\` fill, amber at 80%, red at 100% |
| \`SourceTabs\` | 4 large tabs with icons (Link, PlayCircle, Lightbulb, Mic) |
| \`JobProgress\` | Vertical list of steps with a spinner on the current one, tick on done, retry on failed |
| \`SlideCanvas\` | Fixed 1080 wide box scaled to fit, \`--shadow-2\`, 12px radius on the outer frame only |
| \`SlideRail\` | Thumbnails 120px wide, 8px gap, number above each, drag handle on hover |
| \`LayoutPicker\` | 8 mini diagrams in a 4 x 2 grid, selected one has a 2px \`--brand\` ring |
| \`CharCounter\` | "62/70" in Micro style, amber at 90%, red over |
| \`AiRewritePopover\` | 7 preset chips, textarea, "Rewrite" button, remaining count |
| \`StatusChip\` | Soft background + strong text: draft (surface-2/muted), generating (brand-soft/brand-tint-ink), ready, rendered, scheduled (info), published (ok), failed (danger) |
| \`CalendarChip\` | 28px tall, brand colour dot, platform icon, time, title truncated |
| \`PlanCard\` | Name, price, toggle-aware, includes list, button |
| \`EmptyState\` | Illustration (simple line art in \`--brand\` at 60% opacity), title, one sentence, one button |

### 5.1 Buttons
- Primary: \`--brand\` background, \`--brand-ink\` text, 40px tall (44px on mobile), \`--radius\`.
- Secondary: \`--surface\` background, 1px \`--line\` border, \`--ink\` text.
- Soft: \`--brand-soft\` background, \`--brand-tint-ink\` text. Used for AI actions.
- Destructive: \`--danger-soft\` background, \`--danger\` text. Confirm dialogs only.
- Never a solid black button. Loading state keeps width and shows a 16px spinner.

## 6. App shell
- Desktop: fixed left sidebar 248px. Mobile (under 1024px): top bar with logo, brand switcher and a menu
  button that opens the sidebar as a Sheet from the left.
- Sidebar top to bottom:
  1. Logo "Carousely" (stacked-cards mark in \`--brand\`, wordmark 600).
  2. \`BrandSwitcher\` (shows "Add brand kit" at the bottom of the list if the plan allows more).
  3. Primary group: **Create** (Sparkles icon), **Library** (Grid), **Calendar** (CalendarDays), **Brand kit** (Palette).
  4. Flexible space.
  5. \`UsageMeter\` card on \`--surface-2\` with "Upgrade" link when on Creator or Trial.
  6. Bottom group, always this order: **Documentation** (BookOpen), **Help** (LifeBuoy), **Billing** (CreditCard),
     **Settings** (Settings).
  7. User row: avatar, name, workspace name, dropdown (Theme, Log out).
- Nav item: 40px tall, 12px horizontal padding, 8px radius. Active: \`--brand-soft\` background,
  \`--brand-tint-ink\` text and icon. Hover: \`--surface-2\`.
- One level only. No nested menus. 8 items.
- Trial banner across the top of the content area while trialing: "4 days left in your trial. Choose a plan"
  on \`--brand-soft\`.

## 7. Screens

### 7.1 Auth (\`/login\`, \`/signup\`, \`/reset\`)
- Split layout on desktop: left 45% is a form card on \`--bg\`, right 55% is a soft violet gradient panel
  (\`--brand-soft\` to #F8F7FC) with three floating example slides tilted -4, 0 and 4 degrees.
- Form: logo, H1 "Create your account" or "Welcome back", Google button (secondary), divider "or",
  email, password (show/hide), primary button full width.
- Line under the signup button: "7 days free. Your first carousel in 5 minutes."
- Errors inline under the field in \`--danger\`, 13px. Mobile: the slide panel is hidden.

### 7.2 Onboarding (\`/onboarding\`)
- Full screen, no sidebar. Top: 3-step progress with labels "Brand", "Source", "Trial".
- Step 1 Brand: two columns. Left form: display name, handle with @ prefix, headshot drop zone (circle preview),
  logo drop zone, colour presets as 6 swatches (Violet, Ocean, Forest, Ember, Graphite, Rose) plus "Custom",
  font pair select. Right: live hook slide preview at 360px wide that updates on every change.
- Step 2 Source: \`SourceTabs\` big and centred, each with an example ("Try it with this post").
- Step 3 Trial: \`PlanCard\` x 3 with monthly/yearly toggle, Pro marked "Most popular".
- Returning from Checkout: centred card "Confirming your trial" with a spinner, then "Writing your first
  carousel" with \`JobProgress\`.

### 7.3 Create (\`/app/create\`)
- Page title "Create a carousel". Subtitle: "Pick a source. We write the slides in your brand."
- \`SourceTabs\` card (max 760px wide, centred):
  - **Blog URL:** input with link icon, "Paste a blog post or article URL", helper "We read the main text only".
  - **YouTube:** input, helper "Videos with captions work best. Up to 30 minutes without captions."
  - **Idea:** textarea 6 rows, counter 4,000, placeholder "3 mistakes I made hiring my first salesperson..."
  - **Voice note:** big round record button (64px, \`--brand\`), timer, waveform bars (live from an
    AnalyserNode), Stop, Play back, Re-record, "Use this note". Max 10:00 with a countdown from 9:00.
- Options row (collapsible "More options"): body slides stepper 6 to 9 (default 7), angle input ("Angle or
  audience, e.g. for first-time founders"), format toggle Portrait 4:5 / Square 1:1.
- Primary button "Write my carousel" with remaining count: "(12 left this month)".
- After submit: the card flips to \`JobProgress\`: "Reading the page" / "Getting the transcript" /
  "Transcribing your note", then "Writing slides", then "Ready". When ready, redirect to the editor.
- Recent sources list under the card (last 5) with status and "Use again".

### 7.4 Editor (\`/app/carousels/[id]\`)
- Top bar (56px): back arrow to Library, editable title, \`StatusChip\`, "Saved" tick, buttons
  "Export" (primary) and "Schedule" (secondary).
- Three columns on desktop (rail 168px, canvas flexible, inspector 340px). Canvas background \`--surface-2\`
  with the slide centred and \`--shadow-2\`.
- Selected slide in the rail: 2px \`--brand\` ring. Hover: drag handle (GripVertical) on the left.
- Warnings: a small amber dot on the rail thumbnail and an amber banner in the inspector "Headline is 6
  characters over and was shrunk to fit."
- Inspector tabs: Slide, AI, Post (see PRD 23).
- Post tab: caption textarea with LinkedIn counter (3,000) and Instagram counter (2,200), hashtag chips,
  "Copy caption" button.
- Tablet (768 to 1023px): rail becomes a horizontal strip under the top bar, inspector a bottom Sheet.
- Mobile (under 768px): one slide full width, swipe left and right between slides, a bottom action bar
  (Edit, AI, Reorder, Export). Reorder opens a full-screen list with drag handles.

### 7.5 Export dialog
- Dialog 520px. Title "Export". Progress bar with "Rendering slide 4 of 9".
- Done state: a row of 3 large cards: "PDF for LinkedIn" (FileText icon, size), "PNGs for Instagram"
  (Images icon, count), "Schedule" (CalendarPlus). Each card hover lifts 2px.

### 7.6 Schedule dialog
- Account picker: avatar, name, platform icon, status. Expired accounts are disabled with "Reconnect".
- Date picker (Calendar) and time select in 15 minute steps, with suggested slot chips
  "Tue 08:30", "Wed 12:00", "Thu 08:30". Timezone shown under it.
- Caption preview with the first 210 characters bold (what LinkedIn shows before "see more").
- Buttons: "Schedule" (primary), "Post now" (secondary), "Cancel" (ghost).

### 7.7 Calendar (\`/app/calendar\`)
- Header: month name, previous / next, Today, view toggle Month / Week, filters (brand, platform).
- Month grid: 7 columns, day cells 120px tall, today has a \`--brand-soft\` circle on the date.
  \`CalendarChip\`s stack, "+3 more" link opens a popover.
- Week view: 7 day columns, rows every 30 minutes from 06:00 to 22:00, chips sized 28px.
- Suggested slot chips appear as dashed outlines in \`--line\` until hovered.
- Drag a chip: ghost follows the cursor, valid drop cells highlight in \`--brand-soft\`, invalid ones do nothing.
- Click a chip: side Sheet with slide 1 thumbnail, caption, status, actions (Open, Reschedule, Cancel, View post).

### 7.8 Library (\`/app/library\`)
- Top: "Top performers" strip of 3 wide cards (only when analytics exist).
- Toolbar: search, filters (brand, status, source kind, date), sort.
- Grid: 4 columns desktop, 2 tablet, 1 mobile. Card: 4:5 thumbnail, title (2 lines), brand dot and name,
  \`StatusChip\`, date, and for published: Eye icon with impressions, Heart icon with reactions.
- Card hover: thumbnail scales to 1.02 and shows a menu button.

### 7.9 Carousel analytics panel
- Inside the editor's Post tab when published, and in the calendar Sheet.
- 6 stat tiles in a 3 x 2 grid (impressions, reach, reactions, comments, shares, clicks), tabular numbers.
- A 30 day line chart (Recharts, one series, \`--brand\` line, 2px, no dots except the last).
- Locked state for Creator: tiles blurred, card "Analytics is on Pro and Agency" with Upgrade button.

### 7.10 Brand kit (\`/app/brand\`, \`/app/brand/[id]/accounts\`)
- List view for Agency: cards per brand with logo, name, accounts connected, "Edit".
- Edit view: left form in sections (Identity, Colours, Fonts, Voice, CTA, Footer), right sticky preview with a
  slide picker (Hook, Bullets, Stat, CTA) so they can check each layout.
- Colours: 6 swatch inputs with hex fields, a contrast badge "AA" in \`--ok\` or "Low contrast" in \`--warn\`.
- Fonts: heading and body selects showing each font name in its own face. "Upload font (TTF/OTF)" on Pro+.
- Voice: textarea "How do you write? e.g. direct, no jargon, short sentences, British spelling" (600 chars).
- Accounts tab: 3 rows (LinkedIn profile, LinkedIn page, Instagram) with status pill and Connect / Reconnect /
  Disconnect. Shows "2 of 3 accounts used on Pro".

### 7.11 Billing (\`/app/billing\`)
- Current plan card: name, price, renewal or trial end date, "Manage billing" (Stripe Customer Portal).
- Usage card: 4 meters (carousels, rewrites, exports, voice minutes) with "resets on 1 Nov".
- Plan cards with monthly/yearly toggle for upgrades. Current plan button says "Current plan".

### 7.12 Settings (\`/app/settings\`)
- Tabs: Profile (name, avatar, theme), Workspace (name, timezone), Team (members table with role select,
  Invite button, pending invites with Revoke), Danger zone (delete workspace, owner only, type the name to confirm).

### 7.13 Help (\`/app/help\`) and Documentation (\`/docs\`)
- Help: search box over FAQ, 8 FAQ accordions, "Contact us" form (subject, message), "Recent jobs" table
  showing the last 10 jobs with status and error text so users can self-diagnose.
- Docs: left nav of 8 articles, content max 720px, code-free plain language, screenshots.

### 7.14 Paywall (\`/paywall\`)
- Centred card: "Your trial has ended" or "Your subscription is paused", what they keep ("Your 14 carousels
  and brand kit are safe"), plan cards, "Manage billing" link.

## 8. Empty, loading and error states
| Place | Empty | Loading | Error |
|---|---|---|---|
| Library | Illustration of stacked cards, "No carousels yet", "Paste your first link" button | 8 skeleton cards with 4:5 blocks | Banner "Could not load your library. Retry" |
| Calendar | Month grid with suggested slots, card "Nothing scheduled. Export a carousel and pick a slot." | Skeleton chips | Toast + retry |
| Create progress | n/a | \`JobProgress\` with step spinners, never a blank screen | Step turns red with the message from PRD 19 and a button (Retry, or Paste as Idea) |
| Editor | n/a | Skeleton rail + canvas shimmer | "This carousel could not be generated." with Retry and "Start from the source again" |
| Export | n/a | Progress bar with slide count | "Export failed. We will retry automatically." plus Retry now |
| Accounts | "Connect LinkedIn to schedule posts" | Spinner in the button | "LinkedIn needs reconnecting" in \`--warn-soft\` |
| Analytics | "Numbers arrive about 24 hours after posting" | Skeleton tiles | "Analytics unavailable right now" |
| Usage at cap | Button disabled, tooltip "You have used 15 of 15 carousels this month", Upgrade link | n/a | n/a |

## 9. Motion
- Easing: \`cubic-bezier(0.22, 1, 0.36, 1)\` for enter, \`cubic-bezier(0.4, 0, 1, 1)\` for exit.
- Durations: hover 120ms, popovers and menus 160ms, dialogs and sheets 220ms, page content 260ms.
- Job progress: each step tick draws in (stroke-dashoffset) over 300ms.
- Slide rail reorder: dnd-kit with a 200ms transform transition, the dragged thumbnail scales to 1.04 with \`--shadow-2\`.
- AI rewrite: shimmer sweep across the slide every 1.2s while waiting, then a 200ms cross-fade to the new text.
- First carousel ready: confetti once (canvas-confetti, 120 particles, violet and white), never again.
- Calendar drag: ghost chip at 80% opacity follows the pointer, drop cell pulses \`--brand-soft\` once.
- \`prefers-reduced-motion: reduce\`: no shimmer (use a static "Rewriting..." label), no confetti, no scale,
  all transitions become 1ms opacity changes.

## 10. Accessibility
- WCAG 2.2 AA. Text contrast 4.5:1 (checked for every token pair above), UI controls 3:1.
- Focus ring: 2px \`--brand\` outline with 2px offset on every interactive element.
- Slide rail is a listbox; reordering works with the keyboard (Space to pick up, arrows to move, Space to drop)
  using dnd-kit's keyboard sensor, with live region announcements "Slide 5 moved to position 2".
- Every icon-only button has an \`aria-label\`. Status chips include text, never colour alone.
- Voice recorder announces "Recording started" and the elapsed time every 30 seconds in a polite live region.
- Exported PDFs carry the carousel title in metadata. The caption editor reminds users to add alt text on
  Instagram (Zernio supports alt text per image [verify]).

## 11. Mobile
- Create, Library, Calendar (as an agenda list grouped by day) and the voice recorder work fully on a phone.
- The editor works for text edits, rewrites, reorder and export. Layout picker opens as a bottom Sheet.
- Upload fields accept the camera roll. Recording uses the phone mic.
- Sidebar becomes a Sheet. Usage meter moves into the Sheet header.
- Test widths: 360, 390, 768, 1024, 1440.

## 12. Slide template visual rules (for the 8 layouts)
- Canvas 1080 x 1350 (portrait) or 1080 x 1080 (square). Safe padding 96px. Footer band 120px tall.
- Background: brand \`background\`. Optional subtle accent shape: a 640px circle of \`accent\` at 8% opacity in
  the top right on hook and cta only.
- Headline: heading font, 700, 88px max on hook, 72px on statement, 56px on titles. Line height 1.05.
  Body: body font, 400, 40px, line height 1.35, colour \`ink\`, secondary text \`muted\`.
- Bullets: 28px accent dot or check, 24px gap. Steps: big number 160px in \`accent\` at 90% opacity.
- Stat: value 220px heading font 800 in \`accent\`.
- Compare: two columns with \`surface\` cards, 24px radius, left label muted, right label accent.
- Quote: 120px opening quote mark in \`accent\`, quote 56px italic if the font has an italic, else regular.
- Footer: headshot 64px circle, display name 28px 600, handle 24px \`muted\`, counter "3/9" right aligned,
  logo 48px tall in the top left on hook and cta only.
- Hook: "Swipe" pill with arrow on the right edge, \`accent\` background, \`accentInk\` text.
- CTA: headshot 160px centred, headline, action line in an \`accent\` pill, follow line muted.
- "Made with Carousely" mark: 20px text in \`muted\` at 60% opacity, bottom centre, trial and Creator only.

### 12.1 Per-layout wireframes (portrait)
\`\`\`
HOOK                         BULLETS                      STAT
+------------------------+   +------------------------+   +------------------------+
| [logo]          (o)    |   | Title over two lines   |   |                        |
| KICKER                 |   |                        |   |        87%             |
| Big headline over      |   | (o) bullet one         |   |  label under number    |
| three lines max        |   | (o) bullet two         |   |                        |
| subline in muted       |   | (o) bullet three       |   |  one line of context   |
|               [Swipe>] |   |                        |   |                        |
| (face) Name @handle 1/9|   | (face) Name @handle 3/9|   | (face) Name @handle 5/9|
+------------------------+   +------------------------+   +------------------------+
STEP                         COMPARE                      CTA
+------------------------+   +------------------------+   +------------------------+
| 03                     |   | BEFORE      | AFTER    |   | [logo]                 |
| Step title             |   | - point     | - point  |   |        (face)          |
| body text over three   |   | - point     | - point  |   |  Headline centred      |
| or four lines          |   | - point     | - point  |   |  [ action in a pill ]  |
|                        |   |             |          |   |  follow line muted     |
| (face) Name @handle 4/9|   | (face) Name @handle 6/9|   | (face) Name @handle 9/9|
+------------------------+   +------------------------+   +------------------------+
STATEMENT: one centred headline, optional body under it.  QUOTE: big quote mark, quote, attribution.
\`\`\`

## 13. Icons and illustration
- Icons: lucide-react, 20px in nav and buttons, 16px in chips, 1.75 stroke.
- Platform icons: simple monochrome glyphs drawn in SVG (a rounded square "in" for LinkedIn, a rounded camera
  outline for Instagram). Do not use the official logos inside the app UI.
- Empty-state illustrations: 3 stacked rounded rectangles (the carousel mark) with one small accent shape,
  line art in \`--brand\` at 60% opacity, 160px wide. One per empty state, no people, no stock art.

## 14. Forms
- Labels above inputs, 13px 500, helper text under in \`--muted\`.
- Inputs 40px tall, \`--surface-2\` background, 1px \`--line\` border, focus ring 2px \`--brand\` with
  \`--brand-soft\` glow (0 0 0 4px).
- Validation on blur, then live once the field has been touched. Error text replaces helper text.
- URL inputs trim spaces and add https:// when missing. Paste of a YouTube Shorts link is accepted.
- File drop zones: dashed 1.5px \`--line\` border, \`--surface-2\` fill, icon, "Drop an image or click to upload",
  file type and size limit in small text. Hover and drag-over: border \`--brand\`, fill \`--brand-soft\`.
- Colour inputs: swatch 32px circle that opens a popover with a hue/saturation picker and hex field.

## 15. Toasts (Sonner, bottom right, bottom centre on mobile)
| Event | Copy | Tone |
|---|---|---|
| Rewrite done | "Punchier: tightened the headline" with Undo | Neutral |
| Reorder saved | "Order saved" | Neutral, 2 s |
| Export done | "Export ready. PDF and 9 PNGs" with Download | Success |
| Scheduled | "Scheduled for Tue 21 Oct, 08:30" with View on calendar | Success |
| Limit hit | "You have used all 100 rewrites this month" with Upgrade | Warning |
| Save conflict | "This slide changed in another tab. We loaded the latest version." | Warning |
| Network error | "Could not save. Retrying..." then "Saved" | Error then success |

## 16. Microcopy
| Place | Copy |
|---|---|
| Create button | "Write my carousel (12 left this month)" |
| Blog URL placeholder | "https://yourblog.com/how-we-cut-churn" |
| Idea placeholder | "3 mistakes I made hiring my first salesperson, and what I do now" |
| Generate progress | "Reading the page", "Writing your hook", "Writing slides", "Checking lengths", "Ready" |
| Rewrite presets | Punchier · Shorter · Simpler words · Add an example · Turn into a list · Turn into a stat · Match my voice |
| Stale export banner | "Slides changed since the last export. Export again before this posts." |
| Expired account | "LinkedIn disconnected. Reconnect to keep your scheduled posts." |
| Delete slide confirm | "Delete this slide? You can undo for 8 seconds." |
| Archive confirm | "Archive this carousel? It leaves the library but scheduled posts still go out." |
| Paywall title | "Your trial has ended. Your carousels are safe." |

## 17. Public templates gallery (\`/templates\`)
- Marketing layout (landing nav and footer). H1 "8 carousel layouts that people actually read".
- Grid of 8 cards, each showing the layout in 3 example brand kits (violet, forest, graphite) that cycle
  every 3 seconds with a cross-fade (static with reduced motion).
- Each card: layout name, "Best for" line, an example slide, "Use this layout" button to /signup.
- Each layout also has its own page \`/templates/[layout]\` with 3 full example carousels (SEO pages).

## 18. Email design (Resend + React Email)
- 600px wide, \`#F8F7FC\` outer background, white card with 12px radius, 32px padding.
- Logo top left, one heading, 2 to 4 short paragraphs, one primary button in \`--brand\` (#6D4AFF), footer with
  workspace name and "Manage email settings".
- Post published email includes the slide 1 thumbnail (signed URL valid 7 days).
- Plain text version for every email.

## 19. Build order for Claude Code
1. Tokens in \`globals.css\` and \`tailwind.config.ts\`, Inter and Bricolage via \`next/font\`, light and dark.
2. \`AppSidebar\`, \`BrandSwitcher\`, \`UsageMeter\`, mobile Sheet.
3. Auth pages and onboarding.
4. Slide templates and \`SlideCanvas\` (PRD 10.3), then \`/templates\`.
5. Create page with \`SourceTabs\`, voice recorder and \`JobProgress\`.
6. Editor with rail, inspector, AI popover, export and schedule dialogs.
7. Calendar, Library, analytics panel.
8. Billing, Settings, Help, Docs, Paywall.
9. Screenshot every page at 390px and 1440px in light and dark. Fix overflow and contrast.

## 20. Brand kit presets
### 20.1 Colour presets (background, surface, ink, muted, accent, accentInk)
| Preset | background | surface | ink | muted | accent | accentInk |
|---|---|---|---|---|---|---|
| Violet | #F7F4FF | #FFFFFF | #1E1838 | #5B5478 | #6D4AFF | #FFFFFF |
| Ocean | #F1F7FB | #FFFFFF | #0F2233 | #4A6275 | #1C6FD1 | #FFFFFF |
| Forest | #F3F7F2 | #FFFFFF | #142519 | #4E6352 | #23824D | #FFFFFF |
| Ember | #FFF6EF | #FFFFFF | #2A1608 | #6E5442 | #D9561B | #FFFFFF |
| Graphite | #F4F4F6 | #FFFFFF | #18181D | #5C5C66 | #2F2F3A | #FFFFFF |
| Rose | #FFF3F6 | #FFFFFF | #2B1119 | #6E4B57 | #D2386C | #FFFFFF |
Every preset passes 4.5:1 for ink on background and accentInk on accent. "Graphite" is the darkest accent
allowed as a preset; slide backgrounds are always light or brand-chosen, the app never suggests solid black.

### 20.2 Font pairs (heading / body)
| Pair | Heading | Body | Feel |
|---|---|---|---|
| Clean | Inter 700 | Inter 400 | Neutral SaaS |
| Friendly | Manrope 700 | Manrope 400 | Warm founder |
| Editorial | Fraunces 700 | Inter 400 | Coach, thought leader |
| Bold | Bricolage Grotesque 700 | DM Sans 400 | Agency, punchy |
| Technical | Space Grotesk 700 | IBM Plex Sans 400 | Dev tools |
| Classic | Playfair Display 700 | Lora 400 | Finance, consulting |

## 21. Breakpoints
| Name | Width | Layout changes |
|---|---|---|
| Phone | under 768px | Top bar + Sheet nav, single column, editor swipe mode, calendar agenda |
| Tablet | 768 to 1023px | Top bar + Sheet nav, editor rail on top, inspector as bottom Sheet |
| Laptop | 1024 to 1439px | Fixed sidebar, editor three columns with 300px inspector |
| Desktop | 1440px and up | Fixed sidebar, 340px inspector, library 4 columns |

## 22. Analytics chart rules
- One accent colour (\`--brand\`) for the line, \`--line\` for gridlines (horizontal only, 3 lines), axis labels in
  12px \`--muted\`. No legends for single series.
- Tooltip: \`--surface\` card with \`--shadow-2\`, date in Small, value in Section title with tabular numbers.
- Stat tiles show the 7 day change as "+12%" in \`--ok\` or "-8%" in \`--danger\` with an arrow icon and text,
  never colour alone.
- In dark mode the line becomes \`--brand\` dark value (#8B6CFF). Chart backgrounds stay transparent.

## 23. Documentation articles (\`/docs\`)
1. Set up your brand kit (logo, colours, fonts, headshot, handle, voice)
2. Turn a blog post into a carousel
3. Turn a YouTube video into a carousel
4. Record a voice note
5. Edit slides, rewrite with AI and reorder
6. Export PNGs and a LinkedIn PDF
7. Connect LinkedIn and Instagram and schedule posts
8. Plans, limits and what counts as a carousel, a rewrite and an export
Each article: H1, one sentence summary, numbered steps with screenshots, "Common problems" with 3 fixes.

## 24. Dialog and sheet patterns
- Dialogs: max 560px wide (export, schedule, invite), 20px radius, 24px padding, title 18px 600, close button
  top right, primary action bottom right, secondary to its left. Esc closes, focus returns to the trigger.
- Destructive confirms: title states the action ("Delete this brand kit?"), one sentence of consequence,
  destructive button text repeats the verb ("Delete brand kit").
- Sheets: right side on desktop (420px) for calendar post details and job details, bottom on mobile with a
  drag handle and 85vh max height.
- Never stack two dialogs. A dialog that needs another step changes its own content instead.
- Unsaved changes in a dialog: closing asks "Discard changes?" with Keep editing as the default button.
`
