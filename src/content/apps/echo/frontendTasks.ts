// Echo app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'

export const frontendTasks: Task[] = [
  {
    id: 'ech-fe-shows',
    title: 'Build onboarding, shows and the Voice page',
    outcome: 'A new user creates a workspace, adds a show with artwork and an RSS feed, and teaches Echo their voice.',
    minutes: 75,
    xp: 55,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the voice comes first', text: 'Echo is only worth paying for if the show notes sound like the host, not like a robot. So before the first episode, the host pastes something they wrote. Echo turns it into a short "voice card" (the words they use, how long their sentences are, emojis or not) and every asset follows it.' },
      { type: 'prompt', id: 'ech-fe-shows-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 4, 7, 8, 11.2 and 13.7, @DESIGN_SYSTEM.md, and @DESIGN.md sections 2.2, 6, 7.2, 7.7 and 7.9.

Build:
1. lib/workspace.ts: getCurrentWorkspace() on the server: getClaims, then profiles.current_workspace_id, then the workspace and the user's role. Redirect to /onboarding if none. A workspace switcher in the sidebar calls supabase.rpc('switch_workspace').
2. The app shell sidebar exactly as DESIGN.md section 6: Episodes, Shows, Audiograms, Voice, Public pages, then the bottom group Documentation, Help, Billing, Settings. Billing hidden for non-owners. The usage meter above the bottom group reads supabase.rpc('workspace_usage', { ws }).
3. app/onboarding/page.tsx: the 4-step morphing card from DESIGN.md 7.2. Step 1 calls supabase.rpc('create_workspace', { p_name }). Step 2 inserts shows (name, slug from the name, made unique client-side with -2 on conflict), uploads artwork to show-art/<workspace_id>/<show_id>.<ext> and saves artwork_path, and if a feed URL is given calls supabase.functions.invoke('ech-rss-poll', { body: { mode: 'preview', url } }) and shows the latest episode title. Step 3 saves voice_sample (300 to 3,000 words, live count). Step 4 is the two option cards, then the shared Checkout flow.
4. app/app/shows/page.tsx and app/app/shows/[id]/page.tsx per DESIGN.md 7.7, with the floating save bar. The accent picker suggests 8 swatches from the artwork with a small canvas k-means and applies the 3:1 contrast fix from DESIGN.md 2.2. "Check feed" uses the preview mode. Show the plan count ("1 of 1 shows") and turn the database error "Your plan includes..." into the inline limit message.
5. app/app/voice/page.tsx per DESIGN.md 7.9. Subscribe to the shows row with Realtime so the voice card appears when the worker writes it (live dot "Reading your sample" until then).
Use only design tokens, no raw hex. Run the app and screenshot onboarding steps 2 and 3 at 375px and 1440px.` },
      { type: 'steps', items: [
        'Open http://localhost:3000/signup and create a new account.',
        'Onboarding: name the workspace "Test Studio", add a show "The Test Show" with any square image, paste a real podcast RSS feed (copy one from a show\'s page on Apple Podcasts or its host) and click Check.',
        'Paste 400 words of something you wrote (an old newsletter or LinkedIn post) as your voice sample.',
        'Open Voice: within a minute the voice card appears with 5 tone words.',
        'Open Shows > The Test Show and change the accent colour. Save. Try to add a second show: you see the limit message (Creator plan).',
      ] },
      { type: 'code', id: 'ech-fe-shows-sql', filename: 'check-shows.sql', lang: 'sql', code: `-- Your workspace, you as owner, your show, and the voice card.
select w.name as workspace, m.role, s.name as show, s.slug, s.rss_url is not null as has_feed,
       s.voice_card ->> 'tone_words' as tone_words
from public.workspaces w
join public.workspace_members m on m.workspace_id = w.id
join public.shows s on s.workspace_id = w.id;

-- The voice card job ran once.
select kind, status, attempts, last_error from public.jobs where kind = 'voice_card';` },
      { type: 'mistakes', items: [
        { mistake: 'Onboarding step 1 errors with "new row violates row-level security policy".', fix: 'Claude Code inserted into workspaces directly. Tell it: "Create the workspace with supabase.rpc(\'create_workspace\'), never with an insert."' },
        { mistake: 'Artwork upload fails with a 403.', fix: 'The path must start with the workspace id: show-art/<workspace_id>/<show_id>.png, and only owners and admins may upload. Ask Claude Code to log the path it uploads to.' },
        { mistake: 'The voice card never appears.', fix: 'The worker schedule is not on yet (that is a Backend task), or the sample is under 200 words. Check select * from public.jobs where kind = \'voice_card\'; a queued row means the worker has not run.' },
      ] },
    ],
    checklist: [
      { id: 'ech-fe-shows-c1', label: 'Copy the onboarding and shows prompt', trigger: 'copy:ech-fe-shows-prompt' },
      { id: 'ech-fe-shows-c2', label: 'Finish onboarding with artwork, a feed and a voice sample' },
      { id: 'ech-fe-shows-c3', label: 'Check the sidebar order matches DESIGN.md section 6' },
      { id: 'ech-fe-shows-c4', label: 'Run the check SQL', trigger: 'copy:ech-fe-shows-sql' },
    ],
  },
  {
    id: 'ech-fe-upload',
    title: 'Build upload, the feed picker and live progress',
    outcome: 'Users can upload a 1 GB file or pick episodes from their feed and watch each one move to Ready without refreshing.',
    minutes: 80,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the upload is "resumable"', text: 'An hour of WAV can be 600 MB. On a shaky connection a normal upload fails at 90% and starts again from zero. A resumable upload sends the file in small pieces and remembers which arrived, so a dropped connection only costs one piece.' },
      { type: 'prompt', id: 'ech-fe-upload-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 9.1, 11.1, 11.2, 12.4 and 13.1, @DESIGN_SYSTEM.md, and @DESIGN.md sections 4.10, 7.3, 7.4 and 15.

Build:
1. app/app/episodes/page.tsx: the Episodes table from DESIGN.md 7.3 reading the episode_list view, filter chips (show, status, published), the empty state, and the selection bar with Process (for imported) and Publish/Unpublish.
2. app/app/episodes/new/page.tsx with tabs Upload and From my feed.
3. components/episodes/UploadDrop.tsx: read the duration with a hidden <audio>/<video> element (loadedmetadata), insert the episodes row first (show_id, title, episode_number, audio_path '<ws>/<new uuid>.<ext>', reported_duration_sec, file_size_bytes) with the browser client (the guard trigger forces status 'uploading'), then upload with tus-js-client to NEXT_PUBLIC_SUPABASE_URL/storage/v1/upload/resumable with headers authorization Bearer <session access_token>, x-upsert false, chunkSize 6 MB, metadata bucketName 'episode-audio', objectName, contentType. Show percent and time left (tabular, fixed width). On success call supabase.functions.invoke('ech-start-transcription', { body: { episode_id } }). Map its error codes to the DESIGN.md 15 copy (episode_too_long, limit_reached, too_many_in_flight retries every 60 s).
4. From my feed: for each show with rss_url, call ech-rss-poll preview and list the latest 20 items against existing episodes (by rss_guid). "Process N episodes (X audio hours)" calls app/api/episodes/import/route.ts which inserts the picked items as imported episodes (secret key client, after getClaims + membership check) and then calls /api/episodes/[id]/process for each. Disable the button with "Over your limit by X hours" when workspace_usage says so.
5. app/api/episodes/[id]/process/route.ts: getClaims, membership, status 'imported' or 'failed', then POST ech-start-transcription with header x-internal: CRON_SECRET (server env only).
6. components/episodes/JobProgress.tsx: the 4-step row (Upload, Transcribe, Write, Ready) mapped from episodes.status, Realtime subscription to the episodes row (postgres_changes, filter id=eq.<id>). Failed shows episodes.error and Retry.
All copy from DESIGN.md section 15. Then upload a 3 minute MP3 and show me the status changes in the UI.` },
      { type: 'steps', items: [
        'Record a 3 minute two-person chat on your phone (you and a friend) or download a short Creative Commons podcast MP3.',
        'Open http://localhost:3000/app/episodes/new, pick your show, drop the file. Watch the percent and time left.',
        'Refresh the page halfway through processing: the progress row picks up where it was.',
        'Open From my feed: you see the latest 20 items from your connected feed. Tick one short episode and click Process.',
      ] },
      { type: 'code', id: 'ech-fe-upload-sql', filename: 'check-episodes.sql', lang: 'sql', code: `-- Latest episodes and where each one is in the pipeline.
select title, source, status, reported_duration_sec, duration_sec, file_size_bytes,
       assemblyai_id is not null as sent_to_assemblyai, error
from public.episodes order by created_at desc limit 5;

-- The jobs the worker has for them.
select kind, status, attempts, last_error, run_after
from public.jobs order by created_at desc limit 10;` },
      { type: 'mistakes', items: [
        { mistake: 'Upload stops at 0% with a 413 or "Payload too large".', fix: 'Supabase Free caps uploads at 50 MB per file. Test with a short MP3, or on Pro raise Storage > Settings > Upload file size limit to 1 GB.' },
        { mistake: 'Status stays on Transcribing for ever.', fix: 'The AssemblyAI webhook is not reaching Supabase. Check ech-assemblyai-webhook is deployed with --no-verify-jwt and the secret matches, then look at its Logs.' },
        { mistake: '"These episode fields are set by Echo" when uploading.', fix: 'The browser tried to set status, duration_sec or audio_path after insert. Ask Claude Code to set audio_path and reported_duration_sec in the insert itself, and never update status from the browser.' },
      ] },
    ],
    checklist: [
      { id: 'ech-fe-upload-c1', label: 'Copy the upload and progress prompt', trigger: 'copy:ech-fe-upload-prompt' },
      { id: 'ech-fe-upload-c2', label: 'Upload a 3 minute test episode and watch it progress' },
      { id: 'ech-fe-upload-c3', label: 'Process one episode from your feed' },
      { id: 'ech-fe-upload-c4', label: 'Run the check SQL', trigger: 'copy:ech-fe-upload-sql' },
    ],
  },
  {
    id: 'ech-fe-workspace',
    title: 'Build the episode workspace: transcript and asset tabs',
    outcome: 'Hosts read the transcript with speaker names, copy and edit every asset, and regenerate any one of them with an instruction and Undo.',
    minutes: 110,
    xp: 70,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why every asset keeps a history', text: 'Hosts will press Regenerate and sometimes like the old version better. Echo keeps the last 10 versions of every asset, so Undo is one click and nothing a host wrote by hand is ever lost.' },
      { type: 'prompt', id: 'ech-fe-workspace-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 8.1, 9.2, 13.4 and 14, @DESIGN_SYSTEM.md, and @DESIGN.md sections 4.1 to 4.7, 7.5, 10, 11 and 16.

Build app/app/episodes/[id]/page.tsx with:
1. Toolbar, player bar (native <audio> with a signed URL for uploads or the enclosure URL for RSS, speed menu) and the speech strip (DESIGN.md 4.1) drawn from transcripts.density with chapter ticks.
2. components/transcript/TranscriptView.tsx (DESIGN.md 4.2): virtualised rows (@tanstack/react-virtual), click timestamp to seek, current utterance highlighted while playing, search with "3 of 12", speaker rename (updates transcripts.speakers for the letter; the guard trigger only allows that column), text selection opens the selection bar with Make audiogram, Copy quote, Add to quotes.
3. components/assets/AssetCard.tsx (DESIGN.md 4.3) and a tab per asset: TitlePicker (4.5, choosing one updates episodes.title), ShowNotes (Copy as Markdown or HTML), ChapterList (4.6: inline edit of time and title, editing a time re-sorts, + Add chapter at the playhead; copy as YouTube format "0:00 Title" or the chapters.json URL), Quotes (4.7 with Verified tick, plus Suggested clips from clip_ideas), Newsletter (subject line picker + body), Social (one card per post with its own Copy and Regenerate this post), Blog (SEO title, meta description with character counts, body).
4. Edits: save content with the browser client (the trigger bumps version and writes history). History opens a 400px side panel listing versions with reason and time; Restore writes that content back with last_reason 'restored'.
5. Regenerate popover (4.4): calls supabase.functions.invoke('ech-regenerate', { body: { episode_id, kind, instruction, index } }), shows "Regenerate (12 of 25 left)" from workspace_usage, keeps the card height while running, toast "Rewritten" with Undo for 8 s (Undo restores the previous version).
6. Failed assets show "We could not write this one. Try again (free)" which calls ech-regenerate with no instruction.
7. Realtime: subscribe to episode_assets for this episode so tabs fill in as the worker finishes, rows rising once (DESIGN.md 11).
8. Render all Markdown with react-markdown and NO rehype-raw (model output is never HTML).
9. Fire PostHog events asset_copied, asset_edited, asset_regenerated (PRD 16).
Then open a ready episode and screenshot the workspace at 1440 and 1100 and the Social tab at 375.` },
      { type: 'steps', items: [
        'Open your ready test episode.',
        'Click the speaker name "Speaker A" and rename it to your name. Every row updates.',
        'Click a timestamp: the audio jumps there. Search for a word: matches highlight with a counter.',
        'Pick a different title in Titles. Copy the show notes as Markdown and paste them into a note.',
        'In Social, regenerate post 1 with "more playful", then click Undo in the toast.',
      ] },
      { type: 'code', id: 'ech-fe-workspace-sql', filename: 'check-assets.sql', lang: 'sql', code: `-- Every asset for the newest episode, with its version and whether you edited it.
select a.kind, a.status, a.version, a.edited, a.last_reason,
       (select count(*) from public.asset_history h where h.asset_id = a.id) as versions_kept
from public.episode_assets a
where a.episode_id = (select id from public.episodes order by created_at desc limit 1)
order by a.kind;

-- Speaker names saved once per transcript.
select speakers from public.transcripts order by created_at desc limit 1;` },
      { type: 'mistakes', items: [
        { mistake: 'Saving an edit errors with "Only the asset content can be edited".', fix: 'Claude Code sent the whole row back (status, version and all). Tell it: "Update episode_assets with { content } only."' },
        { mistake: 'The transcript page is slow on a 2 hour episode.', fix: 'Rows are not virtualised, or the page loads transcripts.words. Ask Claude Code to select only utterances, speakers and density for this page and to virtualise rows.' },
        { mistake: 'A post shows raw <b> tags or a link that runs a script.', fix: 'Model output is being rendered as HTML. Remove rehype-raw and dangerouslySetInnerHTML; render Markdown as text only.' },
      ] },
    ],
    checklist: [
      { id: 'ech-fe-workspace-c1', label: 'Copy the workspace prompt', trigger: 'copy:ech-fe-workspace-prompt' },
      { id: 'ech-fe-workspace-c2', label: 'Rename a speaker and seek from a timestamp' },
      { id: 'ech-fe-workspace-c3', label: 'Regenerate a post and undo it' },
      { id: 'ech-fe-workspace-c4', label: 'Run the check SQL and see the history counts', trigger: 'copy:ech-fe-workspace-sql' },
    ],
  },
  {
    id: 'ech-fe-audiograms',
    title: 'Build the audiogram compositions and the clip dialog',
    outcome: 'A remotion/ folder renders Bars, Line and Minimal audiograms, and the dialog previews the real clip before you render.',
    minutes: 120,
    xp: 75,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Two renders, not one', text: 'An episode file is an hour long; an audiogram needs 45 seconds. Echo first asks Remotion to cut those 45 seconds into a small WAV file (fast and cheap). Then it draws the video using that small file, so the waveform can be computed from the actual sound without loading the whole hour.' },
      { type: 'prompt', id: 'ech-fe-audiograms-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 11.5 and 13.5, and @DESIGN.md sections 4.8 and 9.

1. Look at github.com/remotion-dev/template-audiogram for how it draws the waveform and captions, then create a remotion/ folder in this repo (same Remotion version for remotion, @remotion/player, @remotion/media-utils, @remotion/captions, @remotion/google-fonts, @remotion/lambda and @remotion/lambda-client; pin exact versions).
2. remotion/index.ts registers two compositions in remotion/Root.tsx:
   - ClipAudio: audio only. Props { src, startMs, endMs }. Duration = (endMs - startMs) / 1000 * 30 frames, 30 fps. Renders <Audio src={src} /> trimmed to the window (check the current prop names in the Remotion docs: trimBefore/trimAfter or startFrom/endAt) and nothing visual.
   - Audiogram: 1080x1920, 30 fps, duration from props.durationMs (calculateMetadata). Props { audioUrl, captions (Caption[] from @remotion/captions), artworkUrl, title, showName, accentHex, style: 'bars' | 'line' | 'minimal', durationMs }. Layouts exactly as DESIGN.md 9. Use useWindowedAudioData (WAV input) or useAudioData with visualizeAudio for Bars and visualizeAudioWaveform for Line. Captions: createTikTokStyleCaptions with combineTokensWithinMilliseconds ~1200 for 3-word pages, active word in the accent.
   - Validate props with a zod schema on each composition. Add remotion/sample-props.json with a public sample WAV, 3 caption pages and a sample artwork URL.
3. npx remotion studio must show both compositions. Render remotion/sample-props.json locally once to out/local.mp4.
4. components/audiograms/AudiogramDialog.tsx (DESIGN.md 4.8): step 1 the zoomed speech strip with the draggable 30 to 60 s clip window and the transcript excerpt; step 2 the three style tiles and title; step 3 @remotion/player at 270x480 playing the Audiogram composition with the full-episode audio URL and trimBefore/trimAfter equivalents for the preview (the browser can stream the window), then "Render audiogram (4 of 20 left)" which calls supabase.functions.invoke('ech-render-audiogram'). Opens pre-filled from a quote, a clip idea, or a transcript selection.
5. The Audiograms side panel in the episode workspace and app/app/audiograms/page.tsx (DESIGN.md 7.8) with Realtime on audiograms, a live dot with "Cutting audio" / "Rendering video 64%", and Download (signed URL, 7 days) plus the .srt.
Then show me the Studio screenshot of each style and the dialog at 1440 and 375.` },
      { type: 'steps', items: [
        'Run `npx remotion studio` and click through ClipAudio and Audiogram. Change style in the props panel: Bars, Line, Minimal.',
        'Open a ready episode, go to Quotes and click Make audiogram on quote 1. The dialog opens on the right window.',
        'Drag the window to 50 seconds, pick Line, and press play in the preview.',
        'Rendering itself needs the AWS setup in the Backend phase (task: Set up AWS and Remotion Lambda). Leave the Render button for then.',
      ] },
      { type: 'code', id: 'ech-fe-audiograms-check', filename: 'audiogram-check.txt', lang: 'txt', code: `[ ] remotion/ folder with ClipAudio and Audiogram, all @remotion/* packages on the same exact version
[ ] Studio shows Bars, Line and Minimal with the sample props
[ ] Captions are 3 words per page and never cover the waveform
[ ] Frame 0 shows the artwork and the title (it is the thumbnail)
[ ] The clip window cannot be dragged under 30 s or over 60 s
[ ] The dialog keeps its width between steps and the Player is 270x480
[ ] Reduced motion: the dialog steps appear without animation` },
      { type: 'mistakes', items: [
        { mistake: 'Studio errors "Version mismatch" between Remotion packages.', fix: 'Every @remotion/* package and remotion must be the exact same version. Ask Claude Code: "Pin every Remotion package to the same version in package.json and reinstall."' },
        { mistake: 'The waveform is flat in the preview.', fix: 'The audio URL blocks cross-origin reads, so the browser cannot analyse it. For the preview use a short signed Supabase URL (allowed by CORS) or show static bars; the real render uses the WAV from step 1.' },
        { mistake: 'Captions drift a second behind the voice.', fix: 'Caption times must be relative to the clip start: word.start - start_ms. Check ech-render-audiogram subtracts start_ms from every word.' },
      ] },
    ],
    checklist: [
      { id: 'ech-fe-audiograms-c1', label: 'Copy the audiogram prompt', trigger: 'copy:ech-fe-audiograms-prompt' },
      { id: 'ech-fe-audiograms-c2', label: 'See all three styles in Remotion Studio' },
      { id: 'ech-fe-audiograms-c3', label: 'Open the dialog from a quote and preview a clip' },
      { id: 'ech-fe-audiograms-c4', label: 'Tick every line of the audiogram check', trigger: 'copy:ech-fe-audiograms-check' },
    ],
  },
  {
    id: 'ech-fe-public',
    title: 'Build public episode pages, the embed and feed files',
    outcome: 'Published episodes get a fast, indexable page with the full transcript, an embeddable player, chapters.json and transcript files.',
    minutes: 90,
    xp: 60,
    blocks: [
      { type: 'callout', tone: 'eli5', title: 'Why the player streams from the host', text: 'Podcasters care about their download numbers, which their podcast host counts. If Echo copied the audio and played it from its own servers, those plays would vanish from their stats (and Echo would pay for the bandwidth). Playing the host\'s own file keeps both happy.' },
      { type: 'prompt', id: 'ech-fe-public-prompt', title: 'Paste into Claude Code', code: `Read @PRD.md sections 7.3, 12.2 and 17, and @DESIGN.md sections 2.2, 7.6 and 8.

Build:
1. app/s/[show]/page.tsx and app/s/[show]/[episode]/page.tsx as server components that call supabase.rpc('get_public_show') and supabase.rpc('get_public_episode') with a publishable-key client and NO user session (so the pages cache). export const revalidate = 300. notFound() when null.
2. The episode page layout from DESIGN.md 8: header, the player card (native <audio preload="none"> with audio_url, custom controls, chapter ticks, sticky at the bottom once scrolled past), summary, key points, chapters that seek and scroll, quotes, resources, then the transcript as real HTML in sections per chapter with id anchors #t-<seconds>. Speaker names from speakers. Show accent CSS variables from accent_hex with the 3:1 fix.
3. If audio_url is null, show "Listen on" pills only, no player.
4. generateMetadata (title, description, canonical, OG), app/s/[show]/[episode]/opengraph-image.tsx with next/og, and JSON-LD PodcastEpisode + PodcastSeries.
5. Route handlers: chapters.json (application/json+chapters, Podcasting 2.0 JSON chapters with startTime in seconds and title; check the podcast-namespace spec for the version field), transcript.vtt (text/vtt with <v Speaker> voice tags) and transcript.srt (application/x-subrip), all built from get_public_episode and cached for 300 s.
6. app/embed/[episodeId]/page.tsx: the 160px compact player from DESIGN.md 8 using get_public_episode_by_id. In next.config, set Content-Security-Policy frame-ancestors * only for /embed/*, and keep frame-ancestors 'none' everywhere else.
7. app/sitemap.ts from supabase.rpc('public_sitemap'), and robots.ts disallowing /app, /embed, /invite, /onboarding.
8. app/api/episodes/[id]/publish/route.ts: getClaims, membership, update is_published (and slug if given) with the user's client so RLS and the guard trigger apply, then revalidatePath for the episode page and the show page. The Publish dialog from DESIGN.md 7.6 with the four copy rows. app/app/public/page.tsx lists published episodes.
9. The "Made with Echo" badge links to /?ref=<show slug> when badge is true.
Then publish a test episode, open it in a private window, and run Lighthouse mobile. Fix anything under 90 for performance or SEO.` },
      { type: 'steps', items: [
        'Open a ready episode and click Publish. Set the page address, publish, copy the page URL.',
        'Open the URL in a private window. Click a chapter: the player jumps and the transcript scrolls.',
        'Right click > View page source and search for a sentence from the transcript: it is in the HTML.',
        'Open /s/<show>/<episode>/chapters.json and /transcript.vtt: both download.',
        'Paste the embed code into a blank test.html file on your desktop and open it in the browser: the player works.',
      ] },
      { type: 'code', id: 'ech-fe-public-curl', filename: 'check-public.sh', lang: 'bash', code: `SITE=http://localhost:3000
SHOW=the-test-show
EP=your-episode-slug

curl -s -o /dev/null -w "page %{http_code}\\n" "$SITE/s/$SHOW/$EP"
curl -s -I "$SITE/s/$SHOW/$EP/chapters.json" | grep -i content-type    # application/json+chapters
curl -s "$SITE/s/$SHOW/$EP/transcript.vtt" | head -5                       # WEBVTT then cues
curl -s "$SITE/s/$SHOW/$EP" | grep -c 'PodcastEpisode'                      # 1 or more
curl -s -I "$SITE/embed/EPISODE_ID" | grep -i content-security-policy       # frame-ancestors *
curl -s -I "$SITE/app" | grep -i content-security-policy                    # frame-ancestors 'none'` },
      { type: 'mistakes', items: [
        { mistake: 'The page shows old content after editing show notes.', fix: 'Pages are cached for 5 minutes. Ask Claude Code to call revalidatePath for the episode page whenever an asset of a published episode is saved or regenerated.' },
        { mistake: 'The player says "cannot play" on some episodes.', fix: 'Some hosts block hotlinking or send the wrong content type. Open audio_url in a new tab. If it downloads instead of playing, the page should fall back to "Listen on" links when the audio element fires an error.' },
        { mistake: 'The embed is blank on the test page.', fix: 'Your security headers block framing everywhere. The frame-ancestors * header must apply to /embed/:path* only, and X-Frame-Options must not be set on that route.' },
      ] },
    ],
    checklist: [
      { id: 'ech-fe-public-c1', label: 'Copy the public pages prompt', trigger: 'copy:ech-fe-public-prompt' },
      { id: 'ech-fe-public-c2', label: 'Publish an episode and open it in a private window' },
      { id: 'ech-fe-public-c3', label: 'Embed the player on a blank test page' },
      { id: 'ech-fe-public-c4', label: 'Run the public checks', trigger: 'copy:ech-fe-public-curl' },
    ],
  },
]
