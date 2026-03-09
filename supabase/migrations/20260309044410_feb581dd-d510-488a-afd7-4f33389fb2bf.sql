-- Workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  tier text NOT NULL DEFAULT 'pro',
  trial_ends_at timestamp with time zone,
  billing_cycle text DEFAULT 'monthly',
  seats_used integer DEFAULT 1,
  ai_actions_used integer DEFAULT 0,
  storage_used_gb numeric DEFAULT 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage workspace" ON public.workspaces
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR is_owner(auth.uid()));

CREATE POLICY "Members can view workspace" ON public.workspaces
  FOR SELECT TO authenticated
  USING (true);

-- Subscription events table
CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  old_tier text,
  new_tier text,
  triggered_by uuid,
  metadata_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view subscription events" ON public.subscription_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND (w.owner_id = auth.uid() OR is_owner(auth.uid())))
  );

CREATE POLICY "System can create subscription events" ON public.subscription_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Workspace usage table
CREATE TABLE public.workspace_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  ai_actions_count integer DEFAULT 0,
  storage_gb numeric DEFAULT 0,
  seats_active integer DEFAULT 0,
  overage_actions integer DEFAULT 0,
  overage_charged_usd numeric DEFAULT 0
);

ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view usage" ON public.workspace_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND (w.owner_id = auth.uid() OR is_owner(auth.uid())))
  );

CREATE POLICY "System can manage usage" ON public.workspace_usage
  FOR ALL TO authenticated
  USING (is_owner(auth.uid()));