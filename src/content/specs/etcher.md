# Etcher: B2B CRM (an Attio clone, not bloated)
slug `etcher`, category `business`, art `{ motif: 'kanban', tone: 'green' }`, status `full`, difficulty 3, buildHours ~40, price `{ monthly: 149, trialDays: 7 }`, prefix `etc-`.
Plans: Monthly $149/mo unlimited seats, Annual $949/yr unlimited seats.

- Multi-tenant workspaces: invite teammates by email (roles owner/admin/member), workspace switcher.
- People + companies records, custom fields; import leads from CSV (column mapping, dedupe by email/domain, import job with progress); export CSV (emailed signed link from Storage via Resend, expires 24h).
- Pipelines: multiple per workspace, rename, add/rename/reorder/recolour stages, win probability, deal value + currency; kanban + table views; drag deals; close won/lost with reason; pipeline value + weighted forecast.
- Activity timeline (notes, logged emails, calls, stage changes), tasks/reminders, audit log.
- Calling with Twilio: click-to-call in browser (Voice JS SDK, Access Token with Voice grant, TwiML App), buy a number per workspace in-app, or bring your own SIP trunk / client Twilio subaccount; inbound routed to assigned user; recording with consent announcement option; recordings downloaded to Supabase Storage and deleted from Twilio; call logs (duration, outcome, disposition); call analytics. Validate `X-Twilio-Signature`. UK/US regulatory bundles.
- Analytics: pipeline by stage, win rate, cycle time, calls per rep, revenue closed by month.
- Deep onboarding checklist: workspace name, team size, import leads, first pipeline from templates, buy a number, invite team.
- Data protection: RLS on workspace_id via `is_workspace_member()` / `has_workspace_role()` security definer helpers, role checks, soft delete, data export, account deletion.
- Resend emails (full React Email specs): welcome, teammate invite, trial ending (day 5), payment failed, churn win-back (cancelled 3 days ago), reactivation (no login 14 days), export ready, "you closed a deal", weekly pipeline digest.
- Edge functions: twilio-token, twilio-voice (TwiML), twilio-status-callback, twilio-recording-callback, buy-number, import-leads, export-leads, send-email, invite-member.
- SQL tables: workspaces, workspace_members, invitations, profiles, companies, people, custom_field_defs/values, pipelines, stages, deals, activities, tasks, calls, recordings, phone_numbers, import_jobs, export_jobs, audit_log, email_log, subscriptions (workspace-level), stripe_events, usage_ledger. Trigger creates default pipeline + stages per new workspace. Buckets recordings, imports, exports (private, first folder = workspace_id).
- Costs: usage = call minutes per workspace per month (default 600); Twilio per-minute in/out, number rental, recording storage, Supabase Pro + steps, Vercel Pro, Resend.
- Marketing: agencies, recruiters, B2B sales teams of 2 to 20; free HubSpot migration offer; comparison vs Attio, HubSpot, Pipedrive, Close.
