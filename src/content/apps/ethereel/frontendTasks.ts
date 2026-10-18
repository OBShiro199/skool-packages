// Ethereel app-specific frontend tasks (appended to the Foundations phase).
import type { Task } from '../../types'
import { eli5, tip, warn, steps, prompt, code, mistakes, table, task } from './helpers'
import { taskText as T } from './taskText'

export const frontendTasks: Task[] = [
  task({
    id: 'eth-fe-shell',
    title: 'Build the app shell, onboarding and settings',
    outcome: 'Creators can sign up, set their brand in four steps and tune every setting, with a live colour preview.',
    minutes: 120,
    xp: 70,
    blocks: [
      eli5('Why settings come first', 'Ethereel edits like a person who knows you: your series name, your handle, the words people always misspell. All of that lives in one row called creator_settings. The pipeline reads it at the start of every video, so if settings are wrong, every reel is wrong.'),
      prompt('eth-fe-shell-prompt', 'Paste into Claude Code (plan mode first: Shift + Tab)', T['fe-shell']),
      steps(
        'Sign up with a new email. You should land on /onboarding, step 1 of 4.',
        'Type a series title like `Build in public, day 12`, your TikTok handle and a hashtag line. Press Continue.',
        'On step 2, click each look card. The preview face should change colour instantly.',
        'Skip steps 3 and 4 for now. Open Settings > Look and drag Warmth to the right. The preview warms up as you drag, with no lag.',
        'Shrink the browser under 1100px wide. The sidebar collapses to icons and nothing else jumps.',
      ),
      code('eth-fe-shell-sql', 'Check in Supabase > SQL Editor', 'sql', `select series_title, handle_tiktok, hashtag_line, filter_preset_id, posting_slots, timezone
from public.creator_settings
where user_id = (select id from auth.users order by created_at desc limit 1);`),
      tip('The bottom of the sidebar is fixed', 'Documentation, Help, Billing, Settings, always in that order, then the plan meter. If Claude Code adds anything else to the sidebar, ask it to remove it.'),
      mistakes([
        { mistake: 'Settings save but the SQL shows the old value.', fix: 'The update is hitting RLS with the wrong user. Ask Claude Code: "Log the result of the creator_settings update. It must filter by user_id = the signed-in user and check the returned row count is 1."' },
        { mistake: 'The colour preview and the final reel look different.', fix: 'Both must come from lib/grade.ts. Ask Claude Code: "Make the preview use gradeToCss from lib/grade.ts only, in the order warmth, brightness, contrast, saturation, sharpness, as in PRD 9.7."' },
        { mistake: 'Saving a hashtag line over 200 characters shows a database error.', fix: 'Add the same limits to the zod schema as the SQL check constraints so the form shows "Keep it under 200 characters" before saving.' },
      ]),
    ],
    checklist: [
      ['Copy the shell, onboarding and settings prompt', 'copy:eth-fe-shell-prompt'],
      'Finish onboarding step 1 with your own brand',
      'Drag a Look slider and watch the preview change',
      ['Run the check SQL and see your settings', 'copy:eth-fe-shell-sql'],
    ],
  }),
  task({
    id: 'eth-fe-upload',
    title: 'Build resumable uploads and the "Add assets?" page',
    outcome: 'Creators drop up to 5 large iPhone clips; uploads survive a dropped connection and hand over to the pipeline.',
    minutes: 100,
    xp: 70,
    blocks: [
      eli5('What TUS means', 'A normal upload is one long phone call: if it drops at 90%, you start again. TUS cuts the file into 6 MB pieces and remembers which pieces arrived. If your Wi-Fi drops, it carries on from the last piece. That matters when a 4K iPhone clip is 400 MB.'),
      warn('Free Supabase caps uploads at 50 MB', 'On the Free plan every upload stops at 50 MB. Test with short clips until you upgrade to Pro, then go to Supabase > Storage > Settings and raise the global file size limit to 2 GB.'),
      prompt('eth-fe-upload-prompt', 'Paste into Claude Code', T['fe-upload']),
      steps(
        'Open /app/videos and press Upload clips. The side panel slides over the page.',
        'Drop one short clip (under 50 MB on Free). The row shows "Uploading 12%" and the bar moves.',
        'Turn Wi-Fi off for 10 seconds mid-upload. The row says "Paused, will resume". Turn it back on: it continues, it does not restart from 0.',
        'Tick Motion graphics, upload a clip, then drop a screenshot named `monday-hero-project-management.png`. You see the tags monday, hero, project, management.',
        'Press Continue. The video row moves to "Waiting for a slot" or a pipeline step.',
      ),
      code('eth-fe-upload-sql', 'Check the rows', 'sql', `select v.title, v.status, v.raw_path, v.raw_size_bytes, b.assets_decision,
       (select count(*) from public.video_assets a where a.video_id = v.id) as screenshots
from public.videos v left join public.upload_batches b on b.id = v.batch_id
order by v.created_at desc limit 5;`),
      mistakes([
        { mistake: 'The upload fails at once with 403 or "signature verification failed".', fix: 'The x-signature token is for a different object name, or it expired (signed upload tokens last 2 hours). Ask Claude Code to call create-upload again for that file and use the returned objectName exactly. If it still fails, switch to the Bearer token fallback from PRD 9.1 step 3.' },
        { mistake: 'Uploads restart from 0 after a reload.', fix: 'The fingerprint is not stored. Ask Claude Code: "Call upload.findPreviousUploads() and resumeFromPreviousUpload(previous[0]) before upload.start(), and keep storeFingerprintForResuming on."' },
        { mistake: '413 "Payload too large" on bigger files.', fix: 'Raise the global limit in Supabase > Storage > Settings (Pro plan) and check the raw-videos bucket limit is 2 GB. Also check chunkSize is exactly 6 MB.' },
      ]),
    ],
    checklist: [
      ['Copy the upload prompt', 'copy:eth-fe-upload-prompt'],
      'Upload one clip and watch the percentage',
      'Turn Wi-Fi off and on mid-upload and see it resume',
      'Add one named screenshot on the assets page',
      ['Run the check SQL', 'copy:eth-fe-upload-sql'],
    ],
  }),
  task({
    id: 'eth-fe-library',
    title: 'Build the Videos library and the live processing view',
    outcome: 'Every video shows its status live, and a running video shows each pipeline step ticking off.',
    minutes: 90,
    xp: 60,
    blocks: [
      eli5('How the page updates by itself', 'The pipeline writes a short line into a table called job_events after every step. Supabase Realtime pushes each new line to your browser, like a group chat message. The page adds it to the step list without reloading.'),
      prompt('eth-fe-library-prompt', 'Paste into Claude Code', T['fe-library']),
      table(['Step row', 'Detail it shows when done'], [
        ['Prepare', 'HDR → SDR · 0:58'],
        ['Transcribe', '142 words'],
        ['Cut pauses', '15 cuts, -11 s'],
        ['Find your face', '98% of frames'],
        ['Plan cutaways', '2 diagrams'],
        ['Render', '62% while running'],
        ['Check the file', '12 of 12 checks'],
      ]),
      steps(
        'Insert a fake event to test without running the pipeline: run the SQL below with your video id.',
        'Watch the processing page: the Transcribe row ticks within a second, without a reload.',
        'Open /app/videos in a second tab. The status tag on that row changed too, in place.',
      ),
      code('eth-fe-library-sql', 'Fake a pipeline event (SQL Editor)', 'sql', `insert into public.job_events (video_id, user_id, step, status, message, meta)
select id, user_id, 'transcribing', 'done', 'Transcribed 142 words', '{"words":142}'::jsonb
from public.videos order by created_at desc limit 1;`),
      mistakes([
        { mistake: 'Nothing updates until you refresh.', fix: 'Realtime is not on for the table or the filter is wrong. The migration adds job_events and videos to supabase_realtime; check Database > Publications. Ask Claude Code to log the channel status and use filter video_id=eq.<id>.' },
        { mistake: 'Rows jump around or re-animate when a status changes.', fix: 'Ask Claude Code: "Patch the changed row in place by id, keep the sort order, and only play the rise animation once per session (Quiet Precision 06)."' },
        { mistake: 'Covers show broken images.', fix: 'The renders bucket is private. Use createSignedUrls for the whole page of rows in one call and refresh them when they expire after an hour.' },
      ]),
    ],
    checklist: [
      ['Copy the library prompt', 'copy:eth-fe-library-prompt'],
      ['Insert the fake event', 'copy:eth-fe-library-sql'],
      'See the step tick without a reload',
      'Check the status tag widths never jump',
    ],
  }),
  task({
    id: 'eth-fe-review',
    title: 'Build Review: phone preview, caption, Pass, revisions and Undo',
    outcome: 'Creators watch each reel inside a TikTok or Instagram overlay, fix the caption, and Pass, Reject or ask for a change in plain words.',
    minutes: 150,
    xp: 80,
    blocks: [
      eli5('Why the overlay matters', 'On TikTok, the like and share buttons sit on the right and the caption sits at the bottom. A diagram or subtitle under those buttons is wasted. The overlay is a see-through picture of those buttons laid over the reel so the creator sees exactly what will be covered.'),
      prompt('eth-fe-review-prompt', 'Paste into Claude Code (plan mode first)', T['fe-review']),
      steps(
        'Open /app/review. Click a reel. It plays in the phone frame.',
        'Switch between TikTok, Instagram and Clean. The video never restarts.',
        'Change the hook line and press Save. Refresh: your text is still there.',
        'Press P. The Pass dialog opens with the next slot and the TikTok consent box. Tick it and pass.',
        'On another reel press R, type "remove the second diagram", and submit. The dialog shows "Planning your changes".',
      ),
      code('eth-fe-review-sql', 'Check captions, decisions and revisions', 'sql', `select v.title, v.status, v.review_decision, pc.version as caption_v, pc.source,
       sp.slot_at, sp.tiktok_consent_at is not null as consent
from public.videos v
left join public.post_captions pc on pc.video_id = v.id and pc.is_current
left join public.scheduled_posts sp on sp.video_id = v.id
order by v.updated_at desc limit 5;`),
      tip('TikTok requires the consent box', 'TikTok only allows third-party posting if the creator sees their nickname, chooses a privacy level from the allowed list and ticks the music usage confirmation. The Pass dialog is where that happens. pass-video refuses without it.'),
      mistakes([
        { mistake: 'Save gives "new row violates row-level security policy".', fix: 'The browser may only insert captions with source "user". Make sure the insert sends source: "user" and the video_id of a video you own.' },
        { mistake: 'Pass says socials_missing.', fix: 'Connect TikTok or Instagram first (Settings > Socials, built with connect-social). For a quick test, insert a social_accounts row with SQL using a made-up zernio_account_id.' },
        { mistake: 'After a revision the phone still plays the old version.', fix: 'Signed URLs are cached. Ask Claude Code to fetch a new signed URL whenever current_render_id changes, and key the video element on the render id.' },
      ]),
    ],
    checklist: [
      ['Copy the review prompt', 'copy:eth-fe-review-prompt'],
      'Save a caption edit and see it after refresh',
      'Pass one reel with the TikTok consent ticked',
      'Request one revision in plain words',
      ['Run the check SQL', 'copy:eth-fe-review-sql'],
    ],
  }),
  task({
    id: 'eth-fe-queue',
    title: 'Build the Queue week view and the Assets page',
    outcome: 'Creators see a week of posting slots with covers, drag to move a post, and manage avatar, music and screenshots.',
    minutes: 90,
    xp: 55,
    blocks: [
      eli5('What a slot is', 'A slot is a time of day you like to post, like 9am. Ethereel keeps five a day by default (09:00, 11:00, 14:00, 17:00, 19:00) in your own time zone. Passing a reel drops it into the next empty one, like a train seat.'),
      prompt('eth-fe-queue-prompt', 'Paste into Claude Code', T['fe-queue']),
      steps(
        'Pass two reels. Open /app/queue. They sit in the next two free slots.',
        'Drag one to an empty slot tomorrow at 17:00. It moves; nothing else shifts.',
        'Try to drag one into a slot 10 minutes from now. You see "Pick a slot at least 30 minutes away".',
        'Open Assets > Music, upload an MP3 and press play. Press play on another track: the first stops.',
      ),
      code('eth-fe-queue-sql', 'See the queue in your time zone', 'sql', `select sp.slot_at at time zone cs.timezone as local_slot, sp.status, v.title
from public.scheduled_posts sp
join public.videos v on v.id = sp.video_id
join public.creator_settings cs on cs.user_id = sp.user_id
where sp.status <> 'cancelled'
order by sp.slot_at;`),
      mistakes([
        { mistake: 'Slots show an hour off.', fix: 'The grid is using the browser time zone. Ask Claude Code: "Build every slot with date-fns-tz fromZonedTime(day + slot, creator_settings.timezone) and format with formatInTimeZone."' },
        { mistake: 'Two quick drags give two posts in one slot.', fix: 'Moves must go through pass-video → move_slot (it takes a lock and checks the slot is free). Never update scheduled_posts.slot_at from the browser: RLS blocks it anyway.' },
        { mistake: 'The music upload is rejected.', fix: 'The music bucket allows MP3, M4A and WAV up to 50 MB, inside your own folder music/<your user id>/. Check the path starts with your user id.' },
      ]),
    ],
    checklist: [
      ['Copy the queue and assets prompt', 'copy:eth-fe-queue-prompt'],
      'Drag a post to a new slot',
      'Upload one music track and play it',
      ['Run the queue SQL', 'copy:eth-fe-queue-sql'],
    ],
  }),
]
