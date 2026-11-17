-- Tests for supabase/migrations/20261117000000_workspace_scoping.sql
-- Run with: npm run test:db   (fresh PGlite database: stubs, older migrations,
-- tests/db/10_pre_migration_seed.sql, the new migration, then this file)
-- Each check raises an exception on failure and prints "ok - ..." on success.

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO anon, authenticated;

CREATE FUNCTION tests.ok(_cond boolean, _msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _cond IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'not ok - %', _msg;
  END IF;
  RAISE NOTICE 'ok - %', _msg;
END $$;

CREATE FUNCTION tests.n(_sql text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE _c bigint;
BEGIN
  EXECUTE format('SELECT count(*) FROM (%s) q', _sql) INTO _c;
  RETURN _c;
END $$;

-- Passes only if _sql fails with SQLSTATE 42501 (RLS violation or our trigger).
CREATE FUNCTION tests.denied(_sql text, _msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok - %', _msg;
    RETURN;
  END;
  RAISE EXCEPTION 'not ok - % (statement succeeded)', _msg;
END $$;

-- Passes if _sql runs but changes no rows (RLS hides the target).
CREATE FUNCTION tests.no_rows(_sql text, _msg text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE _c bigint;
BEGIN
  EXECUTE _sql;
  GET DIAGNOSTICS _c = ROW_COUNT;
  PERFORM tests.ok(_c = 0, _msg);
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated;

-- Workspace ids for readability
CREATE TABLE tests.ws AS
  SELECT u.email, w.id FROM public.workspaces w JOIN auth.users u ON u.id = w.owner_id;
GRANT SELECT ON tests.ws TO anon, authenticated;

-- =============================================================================
-- Backfill (as superuser)
-- =============================================================================
SELECT tests.ok(
  (SELECT count(*) FROM auth.users u WHERE NOT EXISTS (
     SELECT 1 FROM public.workspace_members m WHERE m.user_id = u.id AND m.role = 'owner')) = 0,
  'every existing user owns a workspace membership');

SELECT tests.ok(
  EXISTS (SELECT 1 FROM tests.ws WHERE email = 'dave@example.test'),
  'user who signed up before workspaces existed got one');

SELECT tests.ok(
  (SELECT workspace_id FROM public.tasks WHERE id = 'a4000000-0000-0000-0000-000000000000')
    = (SELECT id FROM tests.ws WHERE email = 'alice@example.test'),
  'alice''s task backfilled into alice''s workspace');

SELECT tests.ok(
  (SELECT workspace_id FROM public.tasks WHERE id = 'b4000000-0000-0000-0000-000000000000')
    = (SELECT id FROM tests.ws WHERE email = 'bob@example.test'),
  'bob''s task backfilled into bob''s workspace');

SELECT tests.ok(
  (SELECT workspace_id FROM public.subtasks LIMIT 1)
    = (SELECT id FROM tests.ws WHERE email = 'alice@example.test'),
  'subtask inherits workspace from its parent task');

SELECT tests.ok(
  (SELECT workspace_id FROM public.notes WHERE id = 'd5000000-0000-0000-0000-000000000000')
    = (SELECT id FROM tests.ws WHERE email = 'dave@example.test'),
  'dave''s note lands in his new workspace');

SELECT tests.ok(
  (SELECT workspace_id FROM public.reports WHERE id = 'e7000000-0000-0000-0000-000000000000') IS NOT NULL,
  'orphan report got the fallback workspace');

SELECT tests.ok(
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'workspace_id' AND is_nullable = 'NO'
      AND table_name IN ('clients','projects','project_members','sprints','tasks','subtasks','milestones',
        'email_threads','ai_extractions','follow_ups','risks','blockers','standup_entries','retro_items',
        'retro_action_items','reports','activity_logs','notes','note_suggestions','pending_ai_actions',
        'approval_requests','calendar_events')) = 22,
  'workspace_id is NOT NULL on all 22 data tables');

SELECT tests.ok(
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
     AND (qual = 'true' OR with_check = 'true')) = 0,
  'no policy left with USING (true) or WITH CHECK (true)');

-- New signup trigger also writes the membership
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('c0000000-0000-0000-0000-000000000000', 'carol@example.test', '{"full_name":"Carol"}');
SELECT tests.ok(
  EXISTS (SELECT 1 FROM public.workspace_members m JOIN public.workspaces w ON w.id = m.workspace_id
          WHERE m.user_id = 'c0000000-0000-0000-0000-000000000000' AND m.role = 'owner'
            AND w.owner_id = m.user_id),
  'signup creates workspace and owner membership');

-- =============================================================================
-- As alice
-- =============================================================================
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000000', false);

SELECT tests.ok(tests.n('SELECT 1 FROM public.workspaces') = 1, 'alice sees only her own workspace');
SELECT tests.ok(tests.n('SELECT 1 FROM public.projects') = 1, 'alice sees 1 project (not bob''s)');
SELECT tests.ok(tests.n('SELECT 1 FROM public.tasks') = 1, 'alice sees 1 task (not bob''s)');
SELECT tests.ok(tests.n('SELECT 1 FROM public.notes') = 1, 'alice sees only her note');
SELECT tests.ok(tests.n($q$SELECT 1 FROM public.profiles WHERE email = 'bob@example.test'$q$) = 0,
  'alice cannot see bob''s profile');

INSERT INTO public.tasks (title, project_id) VALUES ('new task, no workspace_id', 'a2000000-0000-0000-0000-000000000000');
SELECT tests.ok(
  (SELECT workspace_id FROM public.tasks WHERE title = 'new task, no workspace_id')
    = (SELECT id FROM tests.ws WHERE email = 'alice@example.test'),
  'insert without workspace_id gets it from the project');

INSERT INTO public.notes (user_id, title) VALUES ('a0000000-0000-0000-0000-000000000000', 'new note');
SELECT tests.ok(
  (SELECT workspace_id FROM public.notes WHERE title = 'new note')
    = (SELECT id FROM tests.ws WHERE email = 'alice@example.test'),
  'insert with no parent gets the caller''s default workspace (current frontend keeps working)');

SELECT tests.denied(
  $q$INSERT INTO public.tasks (title, project_id) VALUES ('sneaky', 'b2000000-0000-0000-0000-000000000000')$q$,
  'alice cannot add a task to bob''s project');

SELECT tests.denied(
  format($q$INSERT INTO public.tasks (title, project_id, workspace_id) VALUES ('sneaky', 'a2000000-0000-0000-0000-000000000000', %L)$q$,
         (SELECT id FROM tests.ws WHERE email = 'bob@example.test')),
  'workspace_id must match the parent project');

SELECT tests.denied(
  format($q$INSERT INTO public.notes (user_id, title, workspace_id) VALUES ('a0000000-0000-0000-0000-000000000000', 'x', %L)$q$,
         (SELECT id FROM tests.ws WHERE email = 'bob@example.test')),
  'alice cannot write into bob''s workspace directly');

SELECT tests.denied(
  format($q$UPDATE public.tasks SET workspace_id = %L WHERE id = 'a4000000-0000-0000-0000-000000000000'$q$,
         (SELECT id FROM tests.ws WHERE email = 'bob@example.test')),
  'workspace_id cannot be changed');

SELECT tests.no_rows(
  $q$UPDATE public.tasks SET title = 'hijacked' WHERE id = 'b4000000-0000-0000-0000-000000000000'$q$,
  'alice cannot update bob''s task');

SELECT tests.no_rows(
  $q$DELETE FROM public.notes WHERE id = 'b5000000-0000-0000-0000-000000000000'$q$,
  'alice cannot delete bob''s note');

SELECT tests.denied(
  $q$INSERT INTO public.notifications (user_id, type, title) VALUES ('b0000000-0000-0000-0000-000000000000', 'spam', 'hi')$q$,
  'alice cannot notify a user outside her workspaces');

SELECT tests.denied(
  format($q$INSERT INTO public.subscription_events (workspace_id, event_type) VALUES (%L, 'upgrade')$q$,
         (SELECT id FROM tests.ws WHERE email = 'bob@example.test')),
  'alice cannot log billing events for bob''s workspace');

SELECT tests.denied(
  format($q$INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (%L, 'a0000000-0000-0000-0000-000000000000', 'member')$q$,
         (SELECT id FROM tests.ws WHERE email = 'bob@example.test')),
  'alice cannot add herself to bob''s workspace');

-- Alice invites carol as a member
SELECT tests.denied(
  format($q$INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (%L, 'c0000000-0000-0000-0000-000000000000', 'owner')$q$,
         (SELECT id FROM tests.ws WHERE email = 'alice@example.test')),
  'admins cannot hand out the owner role');

INSERT INTO public.workspace_members (workspace_id, user_id, role, added_by)
SELECT id, 'c0000000-0000-0000-0000-000000000000', 'member', 'a0000000-0000-0000-0000-000000000000'
FROM tests.ws WHERE email = 'alice@example.test';
SELECT tests.ok(true, 'alice (owner) can add carol as a member');

-- =============================================================================
-- As carol (member of alice's workspace, owner of her own)
-- =============================================================================
SELECT set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000000', false);

SELECT tests.ok(tests.n('SELECT 1 FROM public.workspaces') = 2, 'carol sees her workspace and alice''s');
SELECT tests.ok(tests.n($q$SELECT 1 FROM public.projects WHERE id = 'a2000000-0000-0000-0000-000000000000'$q$) = 1,
  'carol sees alice''s project');
SELECT tests.ok(tests.n($q$SELECT 1 FROM public.projects WHERE id = 'b2000000-0000-0000-0000-000000000000'$q$) = 0,
  'carol does not see bob''s project');
SELECT tests.ok(tests.n($q$SELECT 1 FROM public.notes WHERE user_id = 'a0000000-0000-0000-0000-000000000000'$q$) = 0,
  'carol cannot read alice''s private notes');
SELECT tests.ok(tests.n('SELECT 1 FROM public.note_suggestions') = 0,
  'carol cannot read suggestions on alice''s notes');
SELECT tests.ok(tests.n('SELECT 1 FROM public.email_threads') = 0,
  'carol cannot read alice''s inbox');
SELECT tests.ok(tests.n($q$SELECT 1 FROM public.profiles WHERE email = 'alice@example.test'$q$) = 1,
  'carol can see alice''s profile (shared workspace)');

UPDATE public.tasks SET status = 'in_progress' WHERE id = 'a4000000-0000-0000-0000-000000000000';
SELECT tests.ok(true, 'carol can update a shared task');

SELECT tests.no_rows(
  $q$UPDATE public.projects SET name = 'renamed' WHERE id = 'a2000000-0000-0000-0000-000000000000'$q$,
  'carol (plain member) cannot edit a project she does not run');

SELECT tests.denied(
  format($q$INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (%L, 'd0000000-0000-0000-0000-000000000000', 'member')$q$,
         (SELECT id FROM tests.ws WHERE email = 'alice@example.test')),
  'plain members cannot invite');

SELECT tests.no_rows(
  format($q$DELETE FROM public.workspace_members WHERE workspace_id = %L AND user_id = 'a0000000-0000-0000-0000-000000000000'$q$,
         (SELECT id FROM tests.ws WHERE email = 'alice@example.test')),
  'nobody can remove the workspace owner');

-- Helpers can't be used to probe tenants the caller is not in
SELECT tests.ok(
  public.is_workspace_member((SELECT id FROM tests.ws WHERE email = 'bob@example.test'), 'b0000000-0000-0000-0000-000000000000') = false,
  'is_workspace_member will not confirm bob''s membership to carol');
SELECT tests.ok(
  public.shares_workspace('a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000') = false,
  'shares_workspace only answers for the caller');
SELECT tests.denied(
  $q$SELECT public.default_workspace_id('b0000000-0000-0000-0000-000000000000')$q$,
  'default_workspace_id is not callable by users');

-- Carol creates a note in alice's workspace, then is removed from it
INSERT INTO public.notes (user_id, title, workspace_id)
SELECT 'c0000000-0000-0000-0000-000000000000', 'carol note in alice ws', id FROM tests.ws WHERE email = 'alice@example.test';
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000000', false);
DELETE FROM public.workspace_members WHERE user_id = 'c0000000-0000-0000-0000-000000000000'
  AND workspace_id = (SELECT id FROM tests.ws WHERE email = 'alice@example.test');
SELECT set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000000', false);
SELECT tests.ok(tests.n('SELECT 1 FROM public.workspaces') = 1, 'removed member loses access to the workspace');
SELECT tests.no_rows(
  $q$DELETE FROM public.notes WHERE title = 'carol note in alice ws'$q$,
  'removed member cannot delete her old note there');
SELECT tests.ok(tests.n('SELECT 1 FROM public.projects') = 0, 'removed member sees no projects');

-- Alice (PM) can delete her project; bob cannot
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000000', false);
SELECT tests.no_rows(
  $q$DELETE FROM public.projects WHERE id = 'a2000000-0000-0000-0000-000000000000'$q$,
  'bob cannot delete alice''s project');

-- =============================================================================
-- As anon
-- =============================================================================
RESET ROLE;
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT tests.ok(tests.n('SELECT 1 FROM public.tasks') = 0, 'anon sees no tasks');
SELECT tests.ok(tests.n('SELECT 1 FROM public.workspaces') = 0, 'anon sees no workspaces');
RESET ROLE;
