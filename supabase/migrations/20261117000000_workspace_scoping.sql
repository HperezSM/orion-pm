-- =============================================================================
-- Workspace scoping (DEX-10)
--
-- 1. workspace_members table + helper functions
-- 2. Backfill: every user gets a workspace and an owner membership
-- 3. workspace_id on every tenant data table, filled from parent rows or the
--    caller's default workspace, and kept consistent by a trigger
-- 4. RLS on those tables rewritten to require workspace membership
--
-- Spec: docs/specs/DEX-10-workspace-scoping.md
-- Tests: tests/db/workspace_scoping.test.sql (run: npm run test:db)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Membership
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON public.workspace_members (user_id);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Helpers are SECURITY DEFINER so policies can call them without recursing
-- through workspace_members' own RLS. They are callable over the API, so each
-- one only answers about workspaces the caller belongs to (or about the
-- caller), which stops them being used to probe other tenants' membership.
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  ) AND (
    _user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = _workspace_id AND user_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND role IN ('owner', 'admin')
  ) AND (
    _user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = _workspace_id AND user_id = auth.uid())
  )
$$;

-- Only answers for the caller: _a must be auth.uid().
CREATE OR REPLACE FUNCTION public.shares_workspace(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _a = auth.uid() AND (_a = _b OR EXISTS (
    SELECT 1 FROM public.workspace_members m1
    JOIN public.workspace_members m2 ON m2.workspace_id = m1.workspace_id
    WHERE m1.user_id = _a AND m2.user_id = _b
  ))
$$;

-- The workspace a row lands in when the client does not say: the oldest
-- workspace the user owns, else the oldest one they belong to.
CREATE OR REPLACE FUNCTION public.default_workspace_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.workspace_id
  FROM public.workspace_members m
  WHERE m.user_id = _user_id
  ORDER BY (m.role = 'owner') DESC, m.created_at, m.workspace_id
  LIMIT 1
$$;
-- Internal: used by the migration and the enforce_workspace_id trigger only.
REVOKE EXECUTE ON FUNCTION public.default_workspace_id(uuid) FROM PUBLIC, anon, authenticated;

CREATE POLICY "Members can view workspace members" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Workspace admins can add members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()) AND role <> 'owner');
CREATE POLICY "Workspace admins can change members" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()) AND role <> 'owner')
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()) AND role <> 'owner');
CREATE POLICY "Admins remove members, members can leave" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (role <> 'owner' AND (public.is_workspace_admin(workspace_id, auth.uid()) OR user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. Backfill workspaces and memberships
-- -----------------------------------------------------------------------------
-- Users created before the signup trigger existed have no workspace yet.
INSERT INTO public.workspaces (name, owner_id, tier, billing_cycle, seats_used, ai_actions_used, storage_used_gb)
SELECT COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) || '''s Workspace',
       u.id, 'free', 'monthly', 1, 0, 0
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.owner_id = u.id);

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM public.workspaces w
JOIN auth.users u ON u.id = w.owner_id
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- New signups: workspace + owner membership in one go.
CREATE OR REPLACE FUNCTION public.create_workspace_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _ws uuid;
BEGIN
  INSERT INTO public.workspaces (name, owner_id, tier, trial_ends_at, billing_cycle, seats_used, ai_actions_used, storage_used_gb)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    NEW.id, 'pro', NOW() + INTERVAL '14 days', 'monthly', 1, 0, 0
  )
  RETURNING id INTO _ws;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_ws, NEW.id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. workspace_id columns
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients', 'projects', 'project_members', 'sprints', 'tasks', 'subtasks', 'milestones',
    'email_threads', 'ai_extractions', 'follow_ups', 'risks', 'blockers', 'standup_entries',
    'retro_items', 'retro_action_items', 'reports', 'activity_logs', 'notes', 'note_suggestions',
    'pending_ai_actions', 'approval_requests', 'calendar_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id uuid', t);
  END LOOP;
END $$;

-- Backfill, roots first, then children from their parents.
UPDATE public.clients            SET workspace_id = public.default_workspace_id(created_by) WHERE workspace_id IS NULL;
-- A project follows its PM; the client's workspace is only the fallback.
UPDATE public.projects x         SET workspace_id = COALESCE(public.default_workspace_id(x.pm_id), (SELECT workspace_id FROM public.clients WHERE id = x.client_id)) WHERE x.workspace_id IS NULL;
UPDATE public.email_threads t    SET workspace_id = COALESCE((SELECT workspace_id FROM public.projects WHERE id = t.project_id), public.default_workspace_id(t.user_id)) WHERE workspace_id IS NULL;
UPDATE public.notes              SET workspace_id = public.default_workspace_id(user_id) WHERE workspace_id IS NULL;
UPDATE public.pending_ai_actions SET workspace_id = public.default_workspace_id(created_by) WHERE workspace_id IS NULL;

UPDATE public.project_members x  SET workspace_id = p.workspace_id FROM public.projects p WHERE p.id = x.project_id AND x.workspace_id IS NULL;
UPDATE public.sprints x          SET workspace_id = p.workspace_id FROM public.projects p WHERE p.id = x.project_id AND x.workspace_id IS NULL;
UPDATE public.tasks x            SET workspace_id = p.workspace_id FROM public.projects p WHERE p.id = x.project_id AND x.workspace_id IS NULL;
UPDATE public.milestones x       SET workspace_id = p.workspace_id FROM public.projects p WHERE p.id = x.project_id AND x.workspace_id IS NULL;
UPDATE public.risks x            SET workspace_id = p.workspace_id FROM public.projects p WHERE p.id = x.project_id AND x.workspace_id IS NULL;
UPDATE public.blockers x         SET workspace_id = p.workspace_id FROM public.projects p WHERE p.id = x.project_id AND x.workspace_id IS NULL;
UPDATE public.subtasks x         SET workspace_id = t.workspace_id FROM public.tasks t WHERE t.id = x.parent_task_id AND x.workspace_id IS NULL;
UPDATE public.standup_entries x  SET workspace_id = s.workspace_id FROM public.sprints s WHERE s.id = x.sprint_id AND x.workspace_id IS NULL;
UPDATE public.retro_items x      SET workspace_id = s.workspace_id FROM public.sprints s WHERE s.id = x.sprint_id AND x.workspace_id IS NULL;
UPDATE public.retro_action_items x SET workspace_id = s.workspace_id FROM public.sprints s WHERE s.id = x.sprint_id AND x.workspace_id IS NULL;
UPDATE public.note_suggestions x SET workspace_id = n.workspace_id FROM public.notes n WHERE n.id = x.note_id AND x.workspace_id IS NULL;
UPDATE public.ai_extractions x   SET workspace_id = COALESCE((SELECT workspace_id FROM public.email_threads WHERE id = x.thread_id), public.default_workspace_id(x.reviewed_by)) WHERE x.workspace_id IS NULL;
UPDATE public.follow_ups x       SET workspace_id = COALESCE(
    (SELECT workspace_id FROM public.projects WHERE id = x.project_id),
    (SELECT workspace_id FROM public.tasks WHERE id = x.task_id),
    (SELECT workspace_id FROM public.email_threads WHERE id = x.thread_id),
    public.default_workspace_id(x.created_by)) WHERE x.workspace_id IS NULL;
UPDATE public.reports x          SET workspace_id = (SELECT workspace_id FROM public.projects WHERE id = x.project_id) WHERE x.workspace_id IS NULL;
UPDATE public.activity_logs x    SET workspace_id = COALESCE((SELECT workspace_id FROM public.projects WHERE id = x.project_id), public.default_workspace_id(x.user_id)) WHERE x.workspace_id IS NULL;
UPDATE public.approval_requests x SET workspace_id = COALESCE((SELECT workspace_id FROM public.projects WHERE id = x.project_id), public.default_workspace_id(x.requester_id)) WHERE x.workspace_id IS NULL;
UPDATE public.calendar_events x  SET workspace_id = COALESCE((SELECT workspace_id FROM public.projects WHERE id = x.project_id), public.default_workspace_id(x.user_id)) WHERE x.workspace_id IS NULL;

-- Rows with no owner and no parent (e.g. a report with no project) go to the
-- platform owner's workspace, else the oldest workspace. Counted in a NOTICE.
DO $$
DECLARE
  t text;
  _fallback uuid;
  _n bigint;
BEGIN
  SELECT w.id INTO _fallback
  FROM public.workspaces w
  ORDER BY EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = w.owner_id AND r.role = 'owner') DESC,
           w.created_at, w.id
  LIMIT 1;

  FOREACH t IN ARRAY ARRAY[
    'clients', 'projects', 'project_members', 'sprints', 'tasks', 'subtasks', 'milestones',
    'email_threads', 'ai_extractions', 'follow_ups', 'risks', 'blockers', 'standup_entries',
    'retro_items', 'retro_action_items', 'reports', 'activity_logs', 'notes', 'note_suggestions',
    'pending_ai_actions', 'approval_requests', 'calendar_events'
  ] LOOP
    EXECUTE format('UPDATE public.%I SET workspace_id = $1 WHERE workspace_id IS NULL', t) USING _fallback;
    GET DIAGNOSTICS _n = ROW_COUNT;
    IF _n > 0 THEN
      RAISE NOTICE 'workspace_scoping: % orphan row(s) in % assigned to fallback workspace %', _n, t, _fallback;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id SET NOT NULL', t);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE',
      t, t || '_workspace_id_fkey');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id)', t || '_workspace_id_idx', t);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Fill and guard workspace_id on write.
-- Trigger args are (column, parent_table) pairs. On INSERT a missing
-- workspace_id comes from the first non-null parent, else the caller's default
-- workspace. Every non-null parent must sit in the same workspace as the row,
-- and workspace_id can never change on UPDATE.
-- SECURITY DEFINER so the parent lookup sees rows the caller cannot, which is
-- what lets it reject links into another workspace. Changed parent links are
-- re-checked on UPDATE; unchanged ones are not.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_workspace_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row jsonb := to_jsonb(NEW);
  _i int := 0;
  _col text;
  _tbl text;
  _parent_id uuid;
  _parent_ws uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'workspace_id cannot be changed on %', TG_TABLE_NAME USING ERRCODE = '42501';
  END IF;

  WHILE _i + 1 < TG_NARGS LOOP
    _col := TG_ARGV[_i];
    _tbl := TG_ARGV[_i + 1];
    _i := _i + 2;

    _parent_id := NULLIF(_row ->> _col, '')::uuid;
    CONTINUE WHEN _parent_id IS NULL;
    -- On UPDATE only re-check links that changed, so legacy rows that were
    -- linked across tenants before this migration can still be edited.
    CONTINUE WHEN TG_OP = 'UPDATE' AND (to_jsonb(OLD) ->> _col) IS NOT DISTINCT FROM (_row ->> _col);

    EXECUTE format('SELECT workspace_id FROM public.%I WHERE id = $1', _tbl) INTO _parent_ws USING _parent_id;
    CONTINUE WHEN _parent_ws IS NULL;  -- dangling id; the FK reports it

    IF NEW.workspace_id IS NULL THEN
      NEW.workspace_id := _parent_ws;
    ELSIF NEW.workspace_id <> _parent_ws THEN
      RAISE EXCEPTION '%.% points into a different workspace', TG_TABLE_NAME, _col USING ERRCODE = '42501';
    END IF;
  END LOOP;

  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := public.default_workspace_id(auth.uid());
  END IF;
  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'no workspace for new % row', TG_TABLE_NAME USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.clients            FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id();
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.projects           FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('client_id', 'clients');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.project_members    FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.sprints            FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.tasks              FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects', 'sprint_id', 'sprints');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.subtasks           FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('parent_task_id', 'tasks');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.milestones         FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.email_threads      FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects', 'client_id', 'clients');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.ai_extractions     FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('thread_id', 'email_threads');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.follow_ups         FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects', 'task_id', 'tasks', 'thread_id', 'email_threads');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.risks              FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.blockers           FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects', 'task_id', 'tasks');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.standup_entries    FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('sprint_id', 'sprints');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.retro_items        FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('sprint_id', 'sprints');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.retro_action_items FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('sprint_id', 'sprints', 'retro_item_id', 'retro_items', 'task_id', 'tasks');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.reports            FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.activity_logs      FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.notes              FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('parent_note_id', 'notes');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.note_suggestions   FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('note_id', 'notes');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.pending_ai_actions FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id();
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.approval_requests  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects');
CREATE TRIGGER enforce_workspace_id BEFORE INSERT OR UPDATE ON public.calendar_events    FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_id('project_id', 'projects', 'task_id', 'tasks');

-- -----------------------------------------------------------------------------
-- 4. RLS: drop every existing policy on the scoped tables and rebuild.
-- Global app_role admins no longer see other tenants' data; per-user rules
-- (private notes, own inbox, own calendar) are kept and now also need
-- membership. Workspace owner/admin replaces the old global is_admin().
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'clients', 'projects', 'project_members', 'sprints', 'tasks', 'subtasks', 'milestones',
      'email_threads', 'ai_extractions', 'follow_ups', 'risks', 'blockers', 'standup_entries',
      'retro_items', 'retro_action_items', 'reports', 'activity_logs', 'notes', 'note_suggestions',
      'pending_ai_actions', 'approval_requests', 'calendar_events',
      'workspaces', 'subscription_events', 'profiles', 'notifications'
    )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- Shared team data: any member can read and write.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sprints', 'tasks', 'subtasks', 'milestones', 'risks', 'blockers', 'retro_action_items', 'ai_extractions'
  ] LOOP
    EXECUTE format($f$CREATE POLICY "Members can read" ON public.%I FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()))$f$, t);
    EXECUTE format($f$CREATE POLICY "Members can insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()))$f$, t);
    EXECUTE format($f$CREATE POLICY "Members can update" ON public.%I FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()))$f$, t);
    EXECUTE format($f$CREATE POLICY "Members can delete" ON public.%I FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()))$f$, t);
  END LOOP;
END $$;

-- clients
CREATE POLICY "Members can read" ON public.clients FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can create own" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Creator or workspace admin can update" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (created_by = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Workspace admin can delete" ON public.clients FOR DELETE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

-- projects
CREATE POLICY "Members can read" ON public.projects FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can create as PM" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND pm_id = auth.uid());
CREATE POLICY "PM or workspace admin can update" ON public.projects FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (pm_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "PM or workspace admin can delete" ON public.projects FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (pm_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())));

-- project_members (added user must also belong to the workspace)
CREATE POLICY "Members can read" ON public.project_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can add workspace members" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND added_by = auth.uid()
              AND public.is_workspace_member(workspace_id, user_id));
CREATE POLICY "Adder or workspace admin can remove" ON public.project_members FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (added_by = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())));

-- email_threads: own inbox; workspace admins can read
CREATE POLICY "Owner or workspace admin can read" ON public.email_threads FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (user_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())));
CREATE POLICY "Owner can write" ON public.email_threads FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

-- follow_ups
CREATE POLICY "Creator or workspace admin can read" ON public.follow_ups FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (created_by = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())));
CREATE POLICY "Creator can write" ON public.follow_ups FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

-- standup_entries
CREATE POLICY "Members can read" ON public.standup_entries FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members submit own" ON public.standup_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Author can update" ON public.standup_entries FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

-- retro_items (user_id may be null for anonymous items)
CREATE POLICY "Members can read" ON public.retro_items FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members add own or anonymous" ON public.retro_items FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND (user_id IS NULL OR user_id = auth.uid()));

-- reports
CREATE POLICY "Members can read" ON public.reports FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can create" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- activity_logs
CREATE POLICY "Members can read" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members log as themselves" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND (user_id IS NULL OR user_id = auth.uid()));

-- notes: private to the author; workspace admins can read (same as before, minus cross-tenant)
CREATE POLICY "Author or workspace admin can read" ON public.notes FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (user_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())));
CREATE POLICY "Author can create" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Author can update" ON public.notes FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Author can delete" ON public.notes FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

-- note_suggestions follow the parent note's visibility (the subquery runs under the caller's RLS)
CREATE POLICY "Visible with parent note" ON public.note_suggestions FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND EXISTS (SELECT 1 FROM public.notes n WHERE n.id = note_id))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND EXISTS (SELECT 1 FROM public.notes n WHERE n.id = note_id));

-- pending_ai_actions
CREATE POLICY "Creator or workspace admin" ON public.pending_ai_actions FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (created_by = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND (created_by = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())));

-- approval_requests
CREATE POLICY "Parties or workspace admin can read" ON public.approval_requests FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid())
         AND (requester_id = auth.uid() OR reviewer_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())));
CREATE POLICY "Members request as themselves" ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND requester_id = auth.uid()
              AND (reviewer_id IS NULL OR public.is_workspace_member(workspace_id, reviewer_id)));
CREATE POLICY "Reviewer or workspace admin can decide" ON public.approval_requests FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND (reviewer_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid())))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- calendar_events: own only
CREATE POLICY "Owner only" ON public.calendar_events FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

-- workspaces: members see their own workspaces only.
CREATE POLICY "Members can view workspace" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()) OR public.is_owner(auth.uid()));
CREATE POLICY "Owner can manage workspace" ON public.workspaces FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.is_owner(auth.uid()))
  WITH CHECK (auth.uid() = owner_id OR public.is_owner(auth.uid()));

-- subscription_events: was WITH CHECK (true) for inserts; now only the workspace's owner
CREATE POLICY "Owner can view subscription events" ON public.subscription_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND (w.owner_id = auth.uid() OR public.is_owner(auth.uid()))));
CREATE POLICY "Owner can log subscription events" ON public.subscription_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND (w.owner_id = auth.uid() OR public.is_owner(auth.uid()))));

-- profiles: visible to people you share a workspace with (was every signed-in user)
CREATE POLICY "Workspace peers can view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.shares_workspace(auth.uid(), user_id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- notifications: insert only for yourself or a workspace peer (was WITH CHECK (true))
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Notify yourself or a workspace peer" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.shares_workspace(auth.uid(), user_id));
