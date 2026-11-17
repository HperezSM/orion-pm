-- DEX-10b: plan, trial, usage and Stripe fields on workspaces are managed by
-- the server. The browser asks through change_workspace_tier() and the
-- analyze-note function spends quota through consume_ai_action().
-- Spec: docs/specs/DEX-10b-server-managed-billing.md
-- Requires 20261117000000_workspace_scoping.sql (workspace_members, helpers).

-- -----------------------------------------------------------------------------
-- 1. Monthly AI window
-- -----------------------------------------------------------------------------
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS ai_actions_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now());

-- ai_actions_used was a lifetime count kept by the browser. Start every
-- workspace on a clean monthly window so nobody is locked out by old totals.
UPDATE public.workspaces SET ai_actions_used = 0, ai_actions_period_start = date_trunc('month', now());

-- seats_used follows membership.
UPDATE public.workspaces w
SET seats_used = GREATEST(1, (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = w.id));

CREATE OR REPLACE FUNCTION public.sync_workspace_seats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _ws uuid := COALESCE(NEW.workspace_id, OLD.workspace_id);
BEGIN
  UPDATE public.workspaces
  SET seats_used = GREATEST(1, (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = _ws))
  WHERE id = _ws;
  IF TG_OP = 'UPDATE' AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    UPDATE public.workspaces
    SET seats_used = GREATEST(1, (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = OLD.workspace_id))
    WHERE id = OLD.workspace_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_workspace_seats() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_workspace_seats ON public.workspace_members;
CREATE TRIGGER sync_workspace_seats AFTER INSERT OR UPDATE OR DELETE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_seats();

-- -----------------------------------------------------------------------------
-- 2. Plan rules (one place, mirrored in src/lib/workspace.ts)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tier_rank(_tier text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _tier WHEN 'free' THEN 0 WHEN 'starter' THEN 1 WHEN 'pro' THEN 2 WHEN 'enterprise' THEN 3 END
$$;

-- AI actions a month, as on the Pricing page.
CREATE OR REPLACE FUNCTION public.tier_ai_quota(_tier text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _tier WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 2000 ELSE 0 END
$$;

-- Note analysis is a Pro feature (useTierEnforcement: aiAnalysis).
CREATE OR REPLACE FUNCTION public.tier_has_ai_analysis(_tier text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _tier IN ('pro', 'enterprise')
$$;

-- The tier in force now: an ended trial with no subscription counts as free,
-- even before check-trial-expiry has run.
CREATE OR REPLACE FUNCTION public.effective_tier(_tier text, _trial_ends_at timestamptz, _stripe_subscription_id text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN _stripe_subscription_id IS NULL AND _trial_ends_at IS NOT NULL AND _trial_ends_at <= now() THEN 'free'
    ELSE _tier
  END
$$;

-- Invoker rights: callers only get an answer for workspaces RLS lets them see.
CREATE OR REPLACE FUNCTION public.workspace_effective_tier(_workspace uuid)
RETURNS text LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT public.effective_tier(w.tier, w.trial_ends_at, w.stripe_subscription_id)
  FROM public.workspaces w WHERE w.id = _workspace
$$;

-- -----------------------------------------------------------------------------
-- 3. Browser roles cannot write billing fields
-- -----------------------------------------------------------------------------
-- current_user is 'authenticated' / 'anon' for API requests. Inside a SECURITY
-- DEFINER function (signup trigger, RPCs below) it is the function owner, and
-- the service role is 'service_role', so those paths are not affected.
CREATE OR REPLACE FUNCTION public.protect_workspace_billing()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.tier := 'free';
    NEW.trial_ends_at := NULL;
    NEW.billing_cycle := 'monthly';
    NEW.seats_used := 1;
    NEW.ai_actions_used := 0;
    NEW.ai_actions_period_start := date_trunc('month', now());
    NEW.storage_used_gb := 0;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.billing_cycle IS DISTINCT FROM OLD.billing_cycle
     OR NEW.seats_used IS DISTINCT FROM OLD.seats_used
     OR NEW.ai_actions_used IS DISTINCT FROM OLD.ai_actions_used
     OR NEW.ai_actions_period_start IS DISTINCT FROM OLD.ai_actions_period_start
     OR NEW.storage_used_gb IS DISTINCT FROM OLD.storage_used_gb
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
  THEN
    RAISE EXCEPTION 'billing_fields_are_server_managed'
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'Use change_workspace_tier() to change the plan.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_workspace_billing ON public.workspaces;
CREATE TRIGGER protect_workspace_billing BEFORE INSERT OR UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.protect_workspace_billing();

-- -----------------------------------------------------------------------------
-- 4. Plan changes (owner only)
-- -----------------------------------------------------------------------------
-- Downgrades and cancel: always. Switching plans: only during an active trial
-- with no subscription; the trial end date stays where it is. Anything else
-- waits for Stripe checkout ('upgrade_requires_billing').
CREATE OR REPLACE FUNCTION public.change_workspace_tier(_workspace uuid, _tier text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _w public.workspaces%ROWTYPE;
  _current text;
  _trial_active boolean;
  _event text;
BEGIN
  IF public.tier_rank(_tier) IS NULL THEN
    RAISE EXCEPTION 'invalid_tier';
  END IF;

  SELECT * INTO _w FROM public.workspaces WHERE id = _workspace FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR _w.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_workspace_owner' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _w.stripe_subscription_id IS NOT NULL THEN
    RAISE EXCEPTION 'managed_by_billing';
  END IF;

  _current := public.effective_tier(_w.tier, _w.trial_ends_at, _w.stripe_subscription_id);
  _trial_active := _w.trial_ends_at IS NOT NULL AND _w.trial_ends_at > now();

  IF _tier = _w.tier AND _tier = _current THEN
    RETURN _tier;
  END IF;

  IF public.tier_rank(_tier) > public.tier_rank(_current) AND NOT _trial_active THEN
    RAISE EXCEPTION 'upgrade_requires_billing';
  END IF;

  _event := CASE
    WHEN _tier = 'free' THEN 'cancellation'
    WHEN public.tier_rank(_tier) > public.tier_rank(_w.tier) THEN 'upgrade'
    ELSE 'downgrade'
  END;

  UPDATE public.workspaces
  SET tier = _tier,
      trial_ends_at = CASE WHEN _tier = 'free' THEN NULL ELSE trial_ends_at END
  WHERE id = _workspace;

  INSERT INTO public.subscription_events (workspace_id, event_type, old_tier, new_tier, triggered_by)
  VALUES (_workspace, _event, _w.tier, _tier, auth.uid());

  RETURN _tier;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. AI quota (called by analyze-note with the caller's token)
-- -----------------------------------------------------------------------------
-- The row lock makes check-and-increment atomic, so parallel calls cannot
-- go past the quota.
CREATE OR REPLACE FUNCTION public.consume_ai_action(_workspace uuid)
RETURNS TABLE (allowed boolean, reason text, used integer, quota integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _w public.workspaces%ROWTYPE;
  _tier text;
  _quota integer;
  _used integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_member(_workspace, auth.uid()) THEN
    RETURN QUERY SELECT false, 'not_member'::text, NULL::integer, NULL::integer;
    RETURN;
  END IF;

  SELECT * INTO _w FROM public.workspaces WHERE id = _workspace FOR UPDATE;
  _tier := public.effective_tier(_w.tier, _w.trial_ends_at, _w.stripe_subscription_id);
  _quota := public.tier_ai_quota(_tier);

  IF NOT public.tier_has_ai_analysis(_tier) THEN
    RETURN QUERY SELECT false, 'plan'::text, COALESCE(_w.ai_actions_used, 0), _quota;
    RETURN;
  END IF;

  _used := CASE
    WHEN _w.ai_actions_period_start < date_trunc('month', now()) THEN 0
    ELSE COALESCE(_w.ai_actions_used, 0)
  END;

  IF _used >= _quota THEN
    RETURN QUERY SELECT false, 'quota'::text, _used, _quota;
    RETURN;
  END IF;

  UPDATE public.workspaces
  SET ai_actions_used = _used + 1,
      ai_actions_period_start = date_trunc('month', now())
  WHERE id = _workspace;

  RETURN QUERY SELECT true, NULL::text, _used + 1, _quota;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Grants and the subscription_events insert policy
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.change_workspace_tier(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_ai_action(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_workspace_tier(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_action(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.protect_workspace_billing() FROM PUBLIC, anon, authenticated;

-- Events now come only from change_workspace_tier(), the trial job and the
-- Stripe webhook (service role).
DROP POLICY IF EXISTS "Owner can log subscription events" ON public.subscription_events;
