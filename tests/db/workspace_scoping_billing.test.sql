-- Tests for supabase/migrations/20261117010000_server_managed_billing.sql
-- Runs after workspace_scoping.test.sql, so the tests.* helpers already exist.
--
-- erin   e9000000-...  owns a workspace (signup trigger: Pro trial, 14 days)
-- frank  f9000000-...  member of erin's workspace

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('e9000000-0000-0000-0000-000000000000', 'erin@example.test',  '{"full_name":"Erin"}'),
  ('f9000000-0000-0000-0000-000000000000', 'frank@example.test', '{"full_name":"Frank"}');

CREATE TABLE tests.bws AS
  SELECT u.email, w.id FROM public.workspaces w JOIN auth.users u ON u.id = w.owner_id
  WHERE u.email IN ('erin@example.test', 'frank@example.test');
GRANT USAGE ON SCHEMA tests TO service_role;
GRANT SELECT ON tests.bws TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO service_role;

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT id, 'f9000000-0000-0000-0000-000000000000', 'member' FROM tests.bws WHERE email = 'erin@example.test';

-- Expects _sql to fail with SQLSTATE P0001 and a message containing _needle.
CREATE FUNCTION tests.raises(_sql text, _needle text, _msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN raise_exception OR insufficient_privilege THEN
    IF position(_needle IN SQLERRM) > 0 THEN
      RAISE NOTICE 'ok - %', _msg;
      RETURN;
    END IF;
    RAISE EXCEPTION 'not ok - % (wrong error: %)', _msg, SQLERRM;
  END;
  RAISE EXCEPTION 'not ok - % (statement succeeded)', _msg;
END $$;
GRANT EXECUTE ON FUNCTION tests.raises(text, text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- Schema (as superuser)
-- =============================================================================
SELECT tests.ok(
  (SELECT ai_actions_period_start FROM public.workspaces w JOIN tests.bws b ON b.id = w.id
    WHERE b.email = 'erin@example.test') = date_trunc('month', now()),
  'new workspace starts its AI window this month');

SELECT tests.ok(
  public.workspace_effective_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test')) = 'pro',
  'active trial: effective tier is the trial tier');

SELECT tests.ok(
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscription_events'
              AND cmd IN ('INSERT', 'ALL')),
  'no browser policy can insert subscription events');

-- =============================================================================
-- As erin (workspace owner)
-- =============================================================================
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e9000000-0000-0000-0000-000000000000', false);

SELECT tests.raises(
  $q$UPDATE public.workspaces SET tier = 'enterprise' WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')$q$,
  'billing_fields_are_server_managed', 'owner cannot set tier directly');
SELECT tests.raises(
  $q$UPDATE public.workspaces SET ai_actions_used = 100 WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')$q$,
  'billing_fields_are_server_managed', 'owner cannot change the AI counter');
SELECT tests.raises(
  $q$UPDATE public.workspaces SET trial_ends_at = now() + interval '1 year' WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')$q$,
  'billing_fields_are_server_managed', 'owner cannot extend the trial');
SELECT tests.raises(
  $q$UPDATE public.workspaces SET stripe_subscription_id = 'sub_fake' WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')$q$,
  'billing_fields_are_server_managed', 'owner cannot set a Stripe subscription id');

UPDATE public.workspaces SET name = 'Erin HQ' WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test');
SELECT tests.ok(
  (SELECT name FROM public.workspaces WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')) = 'Erin HQ',
  'owner can still rename the workspace');

-- Browser insert gets safe defaults
INSERT INTO public.workspaces (id, name, owner_id, tier, trial_ends_at, ai_actions_used, stripe_subscription_id)
VALUES ('e9100000-0000-0000-0000-000000000000', 'Side project', 'e9000000-0000-0000-0000-000000000000',
        'enterprise', now() + interval '10 years', -500, 'sub_fake');
SELECT tests.ok(
  (SELECT tier = 'free' AND trial_ends_at IS NULL AND ai_actions_used = 0 AND stripe_subscription_id IS NULL
     FROM public.workspaces WHERE id = 'e9100000-0000-0000-0000-000000000000'),
  'browser insert is forced to free, no trial, zero usage, no Stripe ids');

SELECT tests.denied(
  $q$INSERT INTO public.subscription_events (workspace_id, event_type, old_tier, new_tier)
     SELECT id, 'upgrade', 'pro', 'enterprise' FROM tests.bws WHERE email = 'erin@example.test'$q$,
  'owner cannot write subscription events directly');

-- AI quota while on the Pro trial
SELECT tests.ok(
  (SELECT allowed AND used = 1 AND quota = 500 AND reason IS NULL
     FROM public.consume_ai_action((SELECT id FROM tests.bws WHERE email = 'erin@example.test'))),
  'consume_ai_action takes one action from the Pro quota');

-- Switch plan during the trial: allowed, trial end does not move
CREATE TEMP TABLE before_switch AS
  SELECT trial_ends_at FROM public.workspaces WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test');
SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'enterprise');
SELECT tests.ok(
  (SELECT w.tier = 'enterprise' AND w.trial_ends_at = b.trial_ends_at
     FROM public.workspaces w, before_switch b WHERE w.id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')),
  'owner can switch to Enterprise during the trial; trial end unchanged');
SELECT tests.ok(
  (SELECT count(*) FROM public.subscription_events
    WHERE workspace_id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')
      AND event_type = 'upgrade' AND old_tier = 'pro' AND new_tier = 'enterprise') = 1,
  'plan switch writes one subscription event');

SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'pro');
SELECT tests.ok(
  (SELECT tier FROM public.workspaces WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')) = 'pro',
  'owner can downgrade during the trial');

SELECT tests.raises(
  $q$SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'platinum')$q$,
  'invalid_tier', 'unknown tier is refused');

-- =============================================================================
-- As frank (member, not owner)
-- =============================================================================
SELECT set_config('request.jwt.claim.sub', 'f9000000-0000-0000-0000-000000000000', false);

SELECT tests.raises(
  $q$SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'free')$q$,
  'not_workspace_owner', 'a member cannot change the plan');

SELECT tests.ok(
  (SELECT allowed AND used = 2 AND quota = 500
     FROM public.consume_ai_action((SELECT id FROM tests.bws WHERE email = 'erin@example.test'))),
  'members share the workspace quota');

SELECT tests.ok(
  (SELECT NOT allowed AND reason = 'not_member'
     FROM public.consume_ai_action('e9100000-0000-0000-0000-000000000000')),
  'cannot spend another workspace''s quota');

-- =============================================================================
-- Quota edge cases (set state as superuser, then act as erin)
-- =============================================================================
RESET ROLE;
UPDATE public.workspaces SET ai_actions_used = 2000
  WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e9000000-0000-0000-0000-000000000000', false);
SELECT tests.ok(
  (SELECT NOT allowed AND reason = 'quota' AND used = 2000
     FROM public.consume_ai_action((SELECT id FROM tests.bws WHERE email = 'erin@example.test'))),
  'quota exhausted: refused and counter does not move');

RESET ROLE;
UPDATE public.workspaces SET ai_actions_period_start = date_trunc('month', now()) - interval '1 month'
  WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e9000000-0000-0000-0000-000000000000', false);
SELECT tests.ok(
  (SELECT allowed AND used = 1
     FROM public.consume_ai_action((SELECT id FROM tests.bws WHERE email = 'erin@example.test'))),
  'new month resets the counter');

-- Trial ended, no subscription, cron not run yet: treated as free
RESET ROLE;
UPDATE public.workspaces SET trial_ends_at = now() - interval '1 day'
  WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test');
SELECT tests.ok(
  public.workspace_effective_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test')) = 'free',
  'expired trial without a subscription counts as free');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e9000000-0000-0000-0000-000000000000', false);
SELECT tests.ok(
  (SELECT NOT allowed AND reason = 'plan'
     FROM public.consume_ai_action((SELECT id FROM tests.bws WHERE email = 'erin@example.test'))),
  'expired trial: AI analysis refused');
SELECT tests.raises(
  $q$SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'pro')$q$,
  'upgrade_requires_billing', 'after the trial an upgrade needs billing');
SELECT tests.raises(
  $q$SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'starter')$q$,
  'upgrade_requires_billing', 'after the trial even Starter needs billing (effective tier is free)');

-- Cancel stays possible after the trial
SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'free');
SELECT tests.ok(
  (SELECT tier = 'free' AND trial_ends_at IS NULL
     FROM public.workspaces WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')),
  'cancel moves to free and ends the trial');
SELECT tests.ok(
  (SELECT count(*) FROM public.subscription_events
    WHERE workspace_id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')
      AND event_type = 'cancellation' AND new_tier = 'free') = 1,
  'cancel writes a cancellation event');
SELECT tests.raises(
  $q$SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'pro')$q$,
  'upgrade_requires_billing', 'after cancelling, the trial cannot be restarted');

-- =============================================================================
-- Anon and service role
-- =============================================================================
RESET ROLE;
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT tests.denied(
  $q$SELECT public.consume_ai_action((SELECT id FROM tests.bws WHERE email = 'erin@example.test'))$q$,
  'anon cannot call consume_ai_action');
SELECT tests.denied(
  $q$SELECT public.change_workspace_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test'), 'free')$q$,
  'anon cannot call change_workspace_tier');

RESET ROLE;
SET ROLE service_role;
UPDATE public.workspaces SET tier = 'pro', stripe_subscription_id = 'sub_real'
  WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test');
SELECT tests.ok(
  (SELECT tier = 'pro' AND stripe_subscription_id = 'sub_real'
     FROM public.workspaces WHERE id = (SELECT id FROM tests.bws WHERE email = 'erin@example.test')),
  'service role (Stripe webhook, trial job) can still set billing fields');
RESET ROLE;

SELECT tests.ok(
  public.workspace_effective_tier((SELECT id FROM tests.bws WHERE email = 'erin@example.test')) = 'pro',
  'paying workspace keeps its tier');
