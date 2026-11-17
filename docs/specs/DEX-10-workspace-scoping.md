# DEX-10: lock down analyze-note and scope data to workspaces

Status: draft, for review. Nothing here is applied. Gio applies the migration through Lovable.

## Problem

1. `analyze-note` runs with `verify_jwt = false` and never checks the caller. Anyone with the project URL can call it and spend the Lovable AI credits.
2. The app has a `workspaces` table but no membership and no `workspace_id` on the data. Most RLS policies are `USING (true)` / `WITH CHECK (true)`, so every signed-in user of any workspace can read and write every other tenant's tasks, projects, risks, sprints, and more.
3. Related leaks the same change closes:
   - `workspaces` SELECT is `USING (true)`: every user can read every workspace's Stripe customer and subscription ids. `useTierEnforcement` and `NotesEditor` call `.from("workspaces").limit(1)`, so they can pick up a stranger's tier.
   - `profiles` SELECT is `USING (true)`: every user's email is visible to every other user.
   - `notifications` and `subscription_events` INSERT are `WITH CHECK (true)`: anyone can notify anyone, or write fake billing events for any workspace.
   - The global `admin` / `super_admin` app roles see notes, inboxes and follow-ups across all tenants.

## Changes

### analyze-note

- `supabase/config.toml`: `verify_jwt = true`.
- `handler.ts` (new, pure, unit tested) and `index.ts` (wires the real clients):
  - Requires `Authorization: Bearer <user JWT>` and resolves it with `auth.getUser()`. The anon key is a valid JWT, so the gateway check alone is not enough; the in-code check rejects it with 401.
  - Reads the caller's `workspace_members` rows with the caller's own token, so RLS applies. No membership means 403. An optional `workspace_id` in the body must be one of them.
  - Rejects notes over 20,000 characters (413) before calling the model.
  - Returns a generic `"Analysis failed"` on 500 instead of the raw error message.
- The frontend needs no change. `supabase.functions.invoke` already sends the session token.

If Lovable Cloud's newer signing keys make the gateway reject valid user tokens with `verify_jwt = true`, set it back to `false`. The in-code `getUser()` check still blocks anonymous callers.

### Database: `supabase/migrations/20261117000000_workspace_scoping.sql`

1. `workspace_members (workspace_id, user_id, role owner|admin|member)`, plus SECURITY DEFINER helpers `is_workspace_member`, `is_workspace_admin`, `shares_workspace`, `default_workspace_id`. The helpers only answer about workspaces the caller is in, so they can't be used to probe other tenants. `default_workspace_id` isn't callable over the API.
2. Backfill:
   - Users with no workspace (signed up before the signup trigger) get a `free` one.
   - Every workspace owner gets an `owner` membership.
   - `create_workspace_on_signup` now also writes the membership.
3. `workspace_id uuid NOT NULL` with FK `ON DELETE CASCADE` and an index on the 22 data tables: clients, projects, project_members, sprints, tasks, subtasks, milestones, email_threads, ai_extractions, follow_ups, risks, blockers, standup_entries, retro_items, retro_action_items, reports, activity_logs, notes, note_suggestions, pending_ai_actions, approval_requests, calendar_events.
   - Backfill order: a project follows its PM's workspace; other roots use their user column; children use their parent.
   - Rows with no owner and no parent go to the platform owner's workspace. The migration prints a NOTICE with the count per table.
4. Trigger `enforce_workspace_id` (BEFORE INSERT OR UPDATE):
   - A missing `workspace_id` is filled from the parent row, else from the caller's default workspace. The current frontend never sends `workspace_id` and keeps working unchanged.
   - Every parent link (project, sprint, task, thread, note...) must be in the same workspace as the row, so a member of A can't attach a task to B's project.
   - `workspace_id` can't change on UPDATE.
5. RLS: all policies on these tables, plus `workspaces`, `subscription_events`, `profiles` and `notifications`, are dropped and rebuilt.
   - Team data (sprints, tasks, subtasks, milestones, risks, blockers, retro actions, AI extractions): any member can read and write.
   - Per-user rules carry over and now also require membership: private notes, own inbox, own follow-ups, own calendar, standups as yourself.
   - Workspace `owner`/`admin` replaces the global `is_admin()` wherever it granted extra access.
   - Projects: PM or workspace admin edits and deletes. Clients: creator or workspace admin.
   - `workspaces`: members only, plus the platform `owner` role as before. `profiles`: people you share a workspace with. `notifications`: only yourself or a workspace peer. `subscription_events`: only the workspace owner.
   - `workspace_members`: owners and admins add or change members, but can't grant `owner`. Members can leave. Nobody can remove the owner.

## Tests

- `npm i --no-save @electric-sql/pglite@0.5.16 && npm run test:db`: 48 checks. It builds a fresh in-memory Postgres (PGlite) with Supabase stubs, runs the existing migrations, seeds legacy data, runs the new migration, then checks backfill, isolation between two tenants, a shared-workspace member, trigger guards, removed members, helper probing and anon access. One check fails if any `USING (true)` / `WITH CHECK (true)` policy is left; putting the old workspaces policy back makes it fail.
- `npm run test:functions` (Deno): 12 cases for analyze-note. No header, anon key, no membership, foreign workspace, oversize, bad JSON, rate limit passthrough, no error leak.
- `pg_cron` and `pg_net` don't exist in PGlite, so the runner skips that one-line extension migration.

## Rollout

1. Review this PR. Merge only after step 2 succeeds.
2. In Lovable, apply the migration. Read the NOTICE lines for orphan rows.
3. Deploy analyze-note (config + code).
4. Smoke test: sign in, open Notes, run "Analyze". Then load Projects, Inbox and Sprints, and create a task and a note.
5. Rollback: the migration has no automatic down. Restore from the Lovable/Supabase backup, or reapply the old policies by hand. The old migration file has them.

## Follow-ups (not in this PR)

- The frontend should pass `workspace_id` once users can belong to more than one workspace. Today `.limit(1)` on `workspaces` picks an arbitrary one for invited members.
- Workspace owners can still set their own `tier` and `ai_actions_used` from the browser (Settings page, NotesEditor). Billing fields should only change server side, through Stripe webhooks and an AI-usage counter inside analyze-note.
- `user_roles`: the global `admin`/`super_admin` roles no longer reach tenant data. Decide whether to keep them.
- `check-trial-expiry` uses the service role key and has no `verify_jwt` entry. Confirm it is only called by pg_cron.
