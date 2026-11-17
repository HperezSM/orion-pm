# DEX-10b: server-managed plan and AI usage

Status: draft, for review. Builds on DEX-10 (same branch). Nothing is applied until the migrations are run through Lovable.

## Goal

The plan (`tier`), trial dates, usage counters and Stripe ids on `workspaces` are changed only by the database or the server. The browser asks for a change; it never writes those columns itself. The AI quota shown on the Pricing page (100 / 500 / 2,000 actions a month) is counted and enforced where the AI call happens.

## Changes

### Database: `supabase/migrations/20261117010000_server_managed_billing.sql`

1. New column `workspaces.ai_actions_period_start` (start of the current monthly window).
2. `workspace_effective_tier(workspace)`: the tier that is in force right now. A trial that has ended without a Stripe subscription counts as `free`, even before the nightly `check-trial-expiry` job has run.
3. Trigger `protect_workspace_billing` on `workspaces`:
   - For browser roles (`anon`, `authenticated`), an UPDATE may not change `tier`, `trial_ends_at`, `billing_cycle`, `seats_used`, `ai_actions_used`, `ai_actions_period_start`, `storage_used_gb`, `stripe_customer_id` or `stripe_subscription_id`. Owners can still rename their workspace.
   - A browser INSERT gets safe defaults: `free`, no trial, zero usage, no Stripe ids.
   - The signup trigger, the functions below and the service role are unaffected.
4. `change_workspace_tier(workspace, tier)` (RPC, owner only):
   - Downgrades and cancelling are always allowed. Moving to `free` ends any trial.
   - During an active trial with no subscription, the owner can switch between plans; the trial end date does not move.
   - Any other upgrade is refused with `upgrade_requires_billing` until Stripe checkout exists.
   - Writes the matching `subscription_events` row itself.
5. `consume_ai_action(workspace)` (RPC): one atomic step that checks membership, checks the plan includes AI analysis (Pro and Enterprise, as in `useTierEnforcement`), resets the counter when a new month starts, and takes one action from the quota. Returns `allowed`, `reason` (`not_member`, `plan`, `quota`), `used`, `quota`.
6. `subscription_events` can no longer be inserted from the browser. Rows come from the RPC above, the trial job or (later) the Stripe webhook.

### analyze-note

- Picks the workspace: the `workspace_id` in the body if the caller belongs to it, else the caller's own workspace, else the first one they belong to.
- Calls `consume_ai_action` with the caller's token before calling the model.
  - `plan` → 403 `{ code: "plan" }`
  - `quota` → 429 `{ code: "quota" }`
- The model call is unchanged. A failed model call still uses the action (refunding would need a service-role path; not worth it yet).

### Frontend

- `src/lib/workspace.ts`: `pickWorkspace()` chooses the workspace the same way as analyze-note. `effectiveTier()` mirrors the SQL function. Both are unit tested.
- `useCurrentWorkspace()` replaces the three `.from("workspaces").limit(1)` queries (Settings, `useTierEnforcement`, NotesEditor). With the DEX-10 policies a platform owner can read every workspace, so `.limit(1)` could show them someone else's plan.
- Settings: plan buttons call `change_workspace_tier` and show a plain message when an upgrade needs billing. The cancel dialog now says Free plan (the code always moved to Free).
- NotesEditor: no more client-side counter. Sends `workspace_id`, reads the function's error code (`plan`, `quota`, rate limit) and refreshes usage after a run.

### check-trial-expiry

- Explicit `verify_jwt = true` in `supabase/config.toml`.
- The notification text says Free plan, which is what the job actually sets.

## Tests

- `npm run test:db`: the DEX-10 checks plus `tests/db/workspace_scoping_billing.test.sql` (trigger, RPCs, quota window, concurrency-safe increment, insert defaults, service role still allowed).
- `npm run test:functions`: analyze-note cases for workspace choice, plan and quota.
- `npm test` (vitest): `pickWorkspace`, `effectiveTier`, function error parsing.

## Rollout

Same as DEX-10, one step later: apply `20261117000000` then `20261117010000`, deploy analyze-note and check-trial-expiry, then the frontend. Smoke test: change plan in Settings during a trial, cancel to Free, run Analyze on a note and watch the usage bar move.

## Needs a decision (not in this PR)

- Paid upgrades need Stripe Checkout plus a webhook that sets `tier` and `stripe_subscription_id` with the service role. Stripe has no monthly fee; it charges per successful card payment. Gio decides when.
- Enterprise "overage at $0.02/action" (Pricing FAQ) is not enforced. Today Enterprise stops at 2,000 like the others.
