-- Data as it exists before 20261117000000_workspace_scoping.sql, so the test
-- can check the backfill. Runs as the superuser (no RLS).
--
-- alice  a0000000-...  has a client, project, sprint, task, note, inbox thread
-- bob    b0000000-...  has a project, task, note
-- dave   d0000000-...  signed up before workspaces existed (no workspace)
-- plus one report with no project and no user (an orphan)

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'alice@example.test', '{"full_name":"Alice"}'),
  ('b0000000-0000-0000-0000-000000000000', 'bob@example.test',   '{"full_name":"Bob"}'),
  ('d0000000-0000-0000-0000-000000000000', 'dave@example.test',  '{"full_name":"Dave"}');

-- Dave predates the signup trigger.
DELETE FROM public.workspaces WHERE owner_id = 'd0000000-0000-0000-0000-000000000000';

INSERT INTO public.clients (id, name, created_by) VALUES
  ('a1000000-0000-0000-0000-000000000000', 'Alice Client', 'a0000000-0000-0000-0000-000000000000');

INSERT INTO public.projects (id, name, client_id, pm_id) VALUES
  ('a2000000-0000-0000-0000-000000000000', 'Alice Project', 'a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000'),
  ('b2000000-0000-0000-0000-000000000000', 'Bob Project',   NULL,                                   'b0000000-0000-0000-0000-000000000000');

INSERT INTO public.sprints (id, name, project_id) VALUES
  ('a3000000-0000-0000-0000-000000000000', 'Alice Sprint 1', 'a2000000-0000-0000-0000-000000000000');

INSERT INTO public.tasks (id, title, project_id, sprint_id) VALUES
  ('a4000000-0000-0000-0000-000000000000', 'Alice task', 'a2000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000000'),
  ('b4000000-0000-0000-0000-000000000000', 'Bob task',   'b2000000-0000-0000-0000-000000000000', NULL);

INSERT INTO public.subtasks (title, parent_task_id) VALUES
  ('Alice subtask', 'a4000000-0000-0000-0000-000000000000');

INSERT INTO public.notes (id, user_id, title) VALUES
  ('a5000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Alice private note'),
  ('b5000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Bob private note'),
  ('d5000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 'Dave note');

INSERT INTO public.note_suggestions (note_id, suggestion_type) VALUES
  ('a5000000-0000-0000-0000-000000000000', 'task');

INSERT INTO public.email_threads (id, subject, user_id, project_id) VALUES
  ('a6000000-0000-0000-0000-000000000000', 'Alice inbox', 'a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000');

INSERT INTO public.reports (id, type) VALUES
  ('e7000000-0000-0000-0000-000000000000', 'weekly');

-- A lifetime AI counter from the old browser-side increment.
UPDATE public.workspaces SET ai_actions_used = 9999 WHERE owner_id = 'a0000000-0000-0000-0000-000000000000';
