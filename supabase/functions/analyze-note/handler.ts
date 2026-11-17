// Request handling for analyze-note, kept free of network clients so it can be
// unit tested (handler.test.ts). index.ts wires in the real Supabase + AI calls.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const MAX_CONTENT_CHARS = 20_000;

export interface WorkspaceRef {
  id: string;
  ownerId: string;
  createdAt: string;
}

export interface QuotaResult {
  allowed: boolean;
  reason: "not_member" | "plan" | "quota" | null;
  used: number | null;
  quota: number | null;
}

export interface Deps {
  /** Resolve the bearer token to a user id, or null if it is not a valid session. */
  getUserId(authHeader: string): Promise<string | null>;
  /** Workspaces the user belongs to (read with the user's own token, so RLS applies). */
  getWorkspaces(authHeader: string): Promise<WorkspaceRef[]>;
  /** consume_ai_action() RPC, called with the user's token. */
  consumeAiAction(authHeader: string, workspaceId: string): Promise<QuotaResult>;
  /** Call the model. Returns the HTTP-ish status and suggestions. */
  analyze(content: string): Promise<{ status: number; suggestions?: unknown[] }>;
}

/** Same rule as src/lib/workspace.ts pickWorkspace and public.default_workspace_id(). */
export function pickWorkspace(workspaces: WorkspaceRef[], userId: string): WorkspaceRef | null {
  if (workspaces.length === 0) return null;
  return [...workspaces].sort((a, b) => {
    const own = Number(b.ownerId === userId) - Number(a.ownerId === userId);
    if (own !== 0) return own;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  })[0];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export function createHandler(deps: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    // 1. Signed-in user. The gateway also checks the JWT (verify_jwt = true);
    //    this second check rejects the anon key, which is a valid JWT too.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!/^Bearer\s+\S+/i.test(authHeader)) return json({ error: "Unauthorized" }, 401);
    const userId = await deps.getUserId(authHeader).catch(() => null);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    // 2. Body
    let body: { content?: unknown; workspace_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const content = typeof body.content === "string" ? body.content : "";
    if (content.length > MAX_CONTENT_CHARS) return json({ error: "Note too long" }, 413);

    // 3. Workspace membership. If the client names a workspace it must be one
    //    of the caller's; otherwise use the caller's own workspace.
    const workspaces: WorkspaceRef[] = await deps.getWorkspaces(authHeader).catch(() => []);
    let workspace: WorkspaceRef | null;
    if (body.workspace_id !== undefined) {
      workspace = workspaces.find((w) => w.id === String(body.workspace_id)) ?? null;
    } else {
      workspace = pickWorkspace(workspaces, userId);
    }
    if (!workspace) return json({ error: "Forbidden" }, 403);

    if (content.length < 10) return json({ suggestions: [] });

    try {
      // 4. Plan and monthly quota, spent before the model is called.
      const q = await deps.consumeAiAction(authHeader, workspace.id);
      const usage = { used: q.used, quota: q.quota };
      if (!q.allowed) {
        if (q.reason === "quota") return json({ error: "AI action limit reached", code: "quota", usage }, 429);
        if (q.reason === "plan") return json({ error: "Upgrade required", code: "plan", usage }, 403);
        return json({ error: "Forbidden" }, 403);
      }

      // 5. Model
      const result = await deps.analyze(content);
      if (result.status === 429) return json({ error: "Rate limited", code: "rate_limited" }, 429);
      if (result.status === 402) return json({ error: "Payment required", code: "credits" }, 402);
      if (result.status >= 400) throw new Error(`AI gateway error: ${result.status}`);
      return json({ suggestions: result.suggestions ?? [], usage });
    } catch (e) {
      console.error("analyze-note error:", e);
      return json({ error: "Analysis failed" }, 500);
    }
  };
}
