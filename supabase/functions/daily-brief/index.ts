import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHandler } from "./handler.ts";
import { BRIEF_SYSTEM_PROMPT, briefPromptPayload, parseAiSummary, WRITE_BRIEF_TOOL } from "../_shared/brief.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

// A client that acts as the caller, so every query goes through RLS.
const asCaller = (authHeader: string) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Upper bound on rows read per table. The brief lists at most a handful per section.
const ROW_LIMIT = 500;

function rows<T>(res: { data: T[] | null; error: unknown }): T[] {
  if (res.error) throw res.error;
  return res.data ?? [];
}

const handler = createHandler({
  utcToday: () => new Date().toISOString().slice(0, 10),

  async getUserId(authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data, error } = await asCaller(authHeader).auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  },

  async getWorkspaces(authHeader) {
    const { data, error } = await asCaller(authHeader)
      .from("workspace_members")
      .select("workspace_id, workspaces(owner_id, created_at)");
    if (error) throw error;
    type Ws = { owner_id: string; created_at: string };
    return (data ?? []).map((r: { workspace_id: string; workspaces: Ws | Ws[] | null }) => {
      const w = Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces;
      return { id: r.workspace_id, ownerId: w?.owner_id ?? "", createdAt: w?.created_at ?? "" };
    });
  },

  async loadBriefData(authHeader, ws) {
    const db = asCaller(authHeader);
    const [projects, tasks, sprints, blockers, risks, followUps, milestones] = await Promise.all([
      db.from("projects").select("id, name, status, health_score, end_date").eq("workspace_id", ws).limit(ROW_LIMIT),
      // Open tasks plus every task in an active sprint (done ones count toward sprint progress).
      db.from("tasks")
        .select("id, title, status, priority, due_date, project_id, sprint_id, story_points, sprints!inner(status)")
        .eq("workspace_id", ws)
        .eq("sprints.status", "active")
        .limit(ROW_LIMIT),
      db.from("sprints").select("id, name, project_id, start_date, end_date, goal").eq("workspace_id", ws).eq("status", "active").limit(50),
      db.from("blockers").select("id, description, project_id, raised_at").eq("workspace_id", ws).is("resolved_at", null).limit(ROW_LIMIT),
      db.from("risks").select("id, title, project_id, severity_score, status").eq("workspace_id", ws).eq("status", "open").limit(ROW_LIMIT),
      db.from("follow_ups")
        .select("id, project_id, status, next_action_date, days_waiting, last_action, escalated")
        .eq("workspace_id", ws)
        .in("status", ["pending", "escalated"])
        .limit(ROW_LIMIT),
      db.from("milestones").select("id, title, project_id, due_date, status").eq("workspace_id", ws).eq("status", "pending").limit(ROW_LIMIT),
    ]);
    const openTasks = await db
      .from("tasks")
      .select("id, title, status, priority, due_date, project_id, sprint_id, story_points")
      .eq("workspace_id", ws)
      // status is nullable; neq alone would drop NULL rows.
      .or("status.is.null,status.neq.done")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(ROW_LIMIT);

    // Merge the two task reads by id (a task can be in both).
    const taskById = new Map<string, Record<string, unknown>>();
    for (const t of [...rows(tasks), ...rows(openTasks)] as Record<string, unknown>[]) {
      const { sprints: _s, ...rest } = t;
      taskById.set(rest.id as string, rest);
    }

    return {
      projects: rows(projects),
      tasks: [...taskById.values()],
      sprints: rows(sprints),
      blockers: rows(blockers),
      risks: rows(risks),
      followUps: rows(followUps),
      milestones: rows(milestones),
      // deno-lint-ignore no-explicit-any
    } as any;
  },

  async consumeAiAction(authHeader, workspaceId) {
    const { data, error } = await asCaller(authHeader).rpc("consume_ai_action", { _workspace: workspaceId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("consume_ai_action returned nothing");
    return row;
  },

  async writeSummary(facts, focus) {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: BRIEF_SYSTEM_PROMPT },
          { role: "user", content: briefPromptPayload(facts, focus) },
        ],
        tools: [WRITE_BRIEF_TOOL],
        tool_choice: { type: "function", function: { name: "write_brief" } },
      }),
    });

    if (!response.ok) return { status: response.status };
    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: unknown = null;
    try {
      parsed = toolCall ? JSON.parse(toolCall.function.arguments) : null;
    } catch {
      parsed = null;
    }
    return { status: 200, summary: parseAiSummary(parsed) };
  },
});

Deno.serve(handler);
