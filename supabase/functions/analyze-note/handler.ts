// Request handling for analyze-note, kept free of network clients so it can be
// unit tested (handler.test.ts). index.ts wires in the real Supabase + AI calls.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const MAX_CONTENT_CHARS = 20_000;

export interface Deps {
  /** Resolve the bearer token to a user id, or null if it is not a valid session. */
  getUserId(authHeader: string): Promise<string | null>;
  /** Workspaces the user belongs to (read with the user's own token, so RLS applies). */
  getWorkspaceIds(authHeader: string): Promise<string[]>;
  /** Call the model. Returns the HTTP-ish status and suggestions. */
  analyze(content: string): Promise<{ status: number; suggestions?: unknown[] }>;
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
    //    of the caller's; otherwise any membership is enough.
    const workspaces: string[] = await deps.getWorkspaceIds(authHeader).catch(() => []);
    if (workspaces.length === 0) return json({ error: "Forbidden" }, 403);
    if (body.workspace_id !== undefined && !workspaces.includes(String(body.workspace_id))) {
      return json({ error: "Forbidden" }, 403);
    }

    if (content.length < 10) return json({ suggestions: [] });

    try {
      const result = await deps.analyze(content);
      if (result.status === 429) return json({ error: "Rate limited" }, 429);
      if (result.status === 402) return json({ error: "Payment required" }, 402);
      if (result.status >= 400) throw new Error(`AI gateway error: ${result.status}`);
      return json({ suggestions: result.suggestions ?? [] });
    } catch (e) {
      console.error("analyze-note error:", e);
      return json({ error: "Analysis failed" }, 500);
    }
  };
}
