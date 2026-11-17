// Workspace and plan rules shared by the UI. The database is the authority
// (supabase/migrations/20261117010000_server_managed_billing.sql); these mirror
// it so the UI shows the same answer before asking the server.

export type TierName = "free" | "starter" | "pro" | "enterprise";
export const TIER_ORDER: TierName[] = ["free", "starter", "pro", "enterprise"];

const AI_QUOTA: Record<TierName, number> = { free: 0, starter: 100, pro: 500, enterprise: 2000 };

export interface WorkspaceLike {
  id: string;
  owner_id: string;
  created_at: string;
}

/** Same rule as analyze-note and public.default_workspace_id(): the workspace you own, then the oldest, then by id. */
export function pickWorkspace<T extends WorkspaceLike>(rows: T[] | null | undefined, userId: string | null | undefined): T | null {
  if (!rows || rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const own = Number(b.owner_id === userId) - Number(a.owner_id === userId);
    if (own !== 0) return own;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  })[0];
}

export function asTier(tier: string | null | undefined): TierName {
  return (TIER_ORDER as string[]).includes(tier ?? "") ? (tier as TierName) : "free";
}

/** Mirrors public.effective_tier(): an ended trial with no subscription counts as free. */
export function effectiveTier(
  ws: { tier: string | null; trial_ends_at: string | null; stripe_subscription_id: string | null } | null | undefined,
  now: Date = new Date(),
): TierName {
  if (!ws) return "free";
  if (!ws.stripe_subscription_id && ws.trial_ends_at && new Date(ws.trial_ends_at) <= now) return "free";
  return asTier(ws.tier);
}

export function aiQuota(tier: TierName): number {
  return AI_QUOTA[tier];
}

/** The counter resets on the server at the first call of a new month; show 0 until then. */
export function aiActionsThisMonth(
  ws: { ai_actions_used: number | null; ai_actions_period_start?: string | null } | null | undefined,
  now: Date = new Date(),
): number {
  if (!ws) return 0;
  if (ws.ai_actions_period_start) {
    const start = new Date(ws.ai_actions_period_start);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    if (start < monthStart) return 0;
  }
  return ws.ai_actions_used ?? 0;
}

/** supabase.functions.invoke puts the Response on error.context for non-2xx replies. */
export async function readFunctionError(err: unknown): Promise<{ status: number | null; code: string | null }> {
  const ctx = (err as { context?: unknown })?.context;
  if (!(ctx instanceof Response)) return { status: null, code: null };
  let code: string | null = null;
  try {
    const body = await ctx.clone().json();
    code = typeof body?.code === "string" ? body.code : null;
  } catch {
    code = null;
  }
  return { status: ctx.status, code };
}

export function tierChangeErrorMessage(err: { message?: string } | null | undefined): string {
  const m = err?.message ?? "";
  if (m.includes("upgrade_requires_billing")) {
    return "Upgrades need billing, which isn't set up yet. Contact us to upgrade.";
  }
  if (m.includes("managed_by_billing")) return "This plan is managed through billing. Contact us to change it.";
  if (m.includes("not_workspace_owner")) return "Only the workspace owner can change the plan.";
  if (m.includes("invalid_tier")) return "That plan doesn't exist.";
  return m || "Could not change the plan.";
}
