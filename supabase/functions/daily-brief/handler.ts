// Request handling for daily-brief, kept free of network clients so it can be
// unit tested (handler.test.ts). index.ts wires in the real Supabase + AI calls.
//
// POST { workspace_id?, today?: "YYYY-MM-DD", ai?: boolean }
//   Always returns the facts and the ranked focus list, which cost nothing.
//   With ai: true it also spends one AI action from the workspace quota and
//   asks the model for a short written summary of those same facts.

import { corsHeaders, pickWorkspace, type QuotaResult, type WorkspaceRef } from "../analyze-note/handler.ts";
import {
  type AiSummary,
  type BriefData,
  type BriefFacts,
  buildBriefFacts,
  type FocusItem,
  isIsoDate,
  plainHeadline,
  rankFocus,
} from "../_shared/brief.ts";

export type AiStatus = "ok" | "skipped" | "plan" | "quota" | "rate_limited" | "credits" | "failed";

export interface BriefResponse {
  workspace_id: string;
  facts: BriefFacts;
  focus: FocusItem[];
  headline: string;
  ai: { status: AiStatus; summary: AiSummary | null };
  usage?: { used: number | null; quota: number | null };
}

export interface Deps {
  getUserId(authHeader: string): Promise<string | null>;
  getWorkspaces(authHeader: string): Promise<WorkspaceRef[]>;
  /** Everything the brief needs, read with the caller's token (RLS applies) and filtered to one workspace. */
  loadBriefData(authHeader: string, workspaceId: string, today: string): Promise<BriefData>;
  consumeAiAction(authHeader: string, workspaceId: string): Promise<QuotaResult>;
  /** Call the model with the facts. status mirrors the gateway's HTTP status. */
  writeSummary(facts: BriefFacts, focus: FocusItem[]): Promise<{ status: number; summary?: AiSummary | null }>;
  /** Today's date in UTC, used when the client does not send its local date. */
  utcToday(): string;
}

/** The client's local date may be up to a day either side of UTC (UTC-12 to UTC+14). */
export function acceptableToday(clientToday: unknown, utcToday: string): string {
  if (!isIsoDate(clientToday)) return utcToday;
  const diff = Math.abs(Date.parse(`${clientToday}T00:00:00Z`) - Date.parse(`${utcToday}T00:00:00Z`));
  return diff <= 86_400_000 ? clientToday : utcToday;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export function createHandler(deps: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    // 1. Signed-in user (the anon key is a valid JWT too, so check the user).
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!/^Bearer\s+\S+/i.test(authHeader)) return json({ error: "Unauthorized" }, 401);
    const userId = await deps.getUserId(authHeader).catch(() => null);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    // 2. Body. An empty body is fine: every field is optional.
    let body: { workspace_id?: unknown; today?: unknown; ai?: unknown } = {};
    const text = await req.text();
    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid body" }, 400);
    }

    // 3. Workspace membership, same rule as analyze-note.
    const workspaces = await deps.getWorkspaces(authHeader).catch(() => [] as WorkspaceRef[]);
    const workspace =
      body.workspace_id !== undefined
        ? workspaces.find((w) => w.id === String(body.workspace_id)) ?? null
        : pickWorkspace(workspaces, userId);
    if (!workspace) return json({ error: "Forbidden" }, 403);

    const today = acceptableToday(body.today, deps.utcToday());

    let facts: BriefFacts;
    try {
      facts = buildBriefFacts(await deps.loadBriefData(authHeader, workspace.id, today), today);
    } catch (e) {
      console.error("daily-brief load error:", e);
      return json({ error: "Could not load workspace data" }, 500);
    }
    const focus = rankFocus(facts);
    const out: BriefResponse = {
      workspace_id: workspace.id,
      facts,
      focus,
      headline: plainHeadline(facts),
      ai: { status: "skipped", summary: null },
    };
    if (body.ai !== true) return json(out);

    // 4. AI summary: spend the action first (atomic in SQL), then call the model.
    //    Any AI problem still returns the free brief with a status, never an error page.
    try {
      const q = await deps.consumeAiAction(authHeader, workspace.id);
      out.usage = { used: q.used, quota: q.quota };
      if (!q.allowed) {
        out.ai.status = q.reason === "quota" ? "quota" : q.reason === "plan" ? "plan" : "failed";
        return json(out);
      }
      const r = await deps.writeSummary(facts, focus);
      if (r.status === 429) out.ai.status = "rate_limited";
      else if (r.status === 402) out.ai.status = "credits";
      else if (r.status >= 400 || !r.summary) out.ai.status = "failed";
      else out.ai = { status: "ok", summary: r.summary };
    } catch (e) {
      console.error("daily-brief ai error:", e);
      out.ai.status = "failed";
    }
    return json(out);
  };
}
