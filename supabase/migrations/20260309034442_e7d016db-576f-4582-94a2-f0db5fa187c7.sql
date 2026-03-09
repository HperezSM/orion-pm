
-- =============================================
-- PM Command Center AI — V2 Database Schema
-- =============================================

-- Role enum for 4-tier RBAC
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'pm', 'team_member');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  capacity_hours_per_day NUMERIC DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles table (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'pm',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin role check (super_admin or admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT,
  contact_email TEXT,
  website TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and PMs can create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR auth.uid() = created_by);

-- Projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  pm_id UUID REFERENCES auth.users(id),
  methodology TEXT DEFAULT 'agile' CHECK (methodology IN ('agile', 'waterfall', 'hybrid')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on-hold', 'completed', 'cancelled')),
  health_score TEXT DEFAULT 'on-track' CHECK (health_score IN ('on-track', 'at-risk', 'blocked')),
  start_date DATE,
  end_date DATE,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "PMs can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = pm_id);
CREATE POLICY "PMs and admins can update projects" ON public.projects FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR auth.uid() = pm_id);

-- Project Members
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_in_project TEXT DEFAULT 'member',
  access_level TEXT DEFAULT 'full',
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view project members" ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "PMs can manage project members" ON public.project_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);

-- Sprints
CREATE TABLE public.sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  start_date DATE,
  end_date DATE,
  goal TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  capacity_points INTEGER,
  velocity_actual INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view sprints" ON public.sprints FOR SELECT TO authenticated USING (true);
CREATE POLICY "PMs can manage sprints" ON public.sprints FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "PMs can update sprints" ON public.sprints FOR UPDATE TO authenticated USING (true);

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'waiting', 'blocked', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  type TEXT DEFAULT 'task' CHECK (type IN ('story', 'task', 'bug', 'epic', 'feature', 'milestone')),
  story_points INTEGER,
  due_date DATE,
  linked_thread_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (true);

-- Subtasks
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assignee_id UUID REFERENCES auth.users(id),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view subtasks" ON public.subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage subtasks" ON public.subtasks FOR ALL TO authenticated USING (true);

-- Milestones
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view milestones" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage milestones" ON public.milestones FOR ALL TO authenticated USING (true);

-- Email Threads
CREATE TABLE public.email_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_thread_id TEXT,
  subject TEXT,
  from_email TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'unread',
  ai_summary TEXT,
  last_message_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own threads" ON public.email_threads FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can manage own threads" ON public.email_threads FOR ALL TO authenticated USING (auth.uid() = user_id);

-- AI Extractions
CREATE TABLE public.ai_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.email_threads(id) ON DELETE CASCADE,
  extracted_action TEXT,
  extracted_owner TEXT,
  extracted_deadline DATE,
  risk_level TEXT,
  confidence_score NUMERIC,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view extractions" ON public.ai_extractions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage extractions" ON public.ai_extractions FOR ALL TO authenticated USING (true);

-- Follow-ups
CREATE TABLE public.follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.email_threads(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'resolved', 'escalated')),
  days_waiting INTEGER DEFAULT 0,
  last_action TEXT,
  next_action_date DATE,
  escalated BOOLEAN DEFAULT false,
  escalation_level INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view follow-ups" ON public.follow_ups FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "Users can manage follow-ups" ON public.follow_ups FOR ALL TO authenticated USING (auth.uid() = created_by);

-- Risks
CREATE TABLE public.risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  probability TEXT CHECK (probability IN ('low', 'medium', 'high')),
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
  severity_score TEXT CHECK (severity_score IN ('low', 'medium', 'high', 'critical')),
  owner_id UUID REFERENCES auth.users(id),
  mitigation TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'monitoring', 'mitigated', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view risks" ON public.risks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage risks" ON public.risks FOR ALL TO authenticated USING (true);

-- Blockers
CREATE TABLE public.blockers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  raised_by UUID REFERENCES auth.users(id),
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view blockers" ON public.blockers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage blockers" ON public.blockers FOR ALL TO authenticated USING (true);

-- Standup Entries
CREATE TABLE public.standup_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  done_yesterday TEXT,
  doing_today TEXT,
  blockers TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.standup_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view standup entries" ON public.standup_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can submit standups" ON public.standup_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Retro Items
CREATE TABLE public.retro_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('went_well', 'didnt_go_well', 'improve')),
  content TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.retro_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view retro items" ON public.retro_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add retro items" ON public.retro_items FOR INSERT TO authenticated WITH CHECK (true);

-- Retro Action Items
CREATE TABLE public.retro_action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retro_item_id UUID REFERENCES public.retro_items(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.retro_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view retro actions" ON public.retro_action_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage retro actions" ON public.retro_action_items FOR ALL TO authenticated USING (true);

-- Reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'sprint', 'executive')),
  recipient_ids UUID[],
  content_json JSONB,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reports" ON public.reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (true);

-- Activity Logs
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can create logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Notes
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_json JSONB,
  tags TEXT[],
  parent_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  linked_project_ids UUID[],
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'project', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can create own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Note Suggestions
CREATE TABLE public.note_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  suggestion_type TEXT NOT NULL,
  suggested_entity_json JSONB,
  confidence_score NUMERIC,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.note_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view note suggestions" ON public.note_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage note suggestions" ON public.note_suggestions FOR ALL TO authenticated USING (true);

-- Pending AI Actions
CREATE TABLE public.pending_ai_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  payload_json JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed', 'executed')),
  created_by UUID REFERENCES auth.users(id),
  triggered_by_rule TEXT,
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_ai_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view pending actions" ON public.pending_ai_actions FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "Users can manage pending actions" ON public.pending_ai_actions FOR ALL TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- Prompt Templates
CREATE TABLE public.prompt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  use_case TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  template_text TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage templates" ON public.prompt_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view active templates" ON public.prompt_templates FOR SELECT TO authenticated USING (active = true);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Approval Requests
CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id) NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('sprint_completion', 'status_change', 'timeline_extension', 'scope_change', 'risk_escalation')),
  payload_json JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  comment TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requesters can view own requests" ON public.approval_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = reviewer_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can create requests" ON public.approval_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Reviewers can update requests" ON public.approval_requests FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id OR public.is_admin(auth.uid()));

-- Calendar Events
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  google_event_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON public.calendar_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own events" ON public.calendar_events FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'pm');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
