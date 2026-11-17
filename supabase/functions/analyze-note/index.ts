import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHandler } from "./handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

// A client that acts as the caller, so every query goes through RLS.
const asCaller = (authHeader: string) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

const handler = createHandler({
  async getUserId(authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data, error } = await asCaller(authHeader).auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  },

  async getWorkspaceIds(authHeader) {
    const { data, error } = await asCaller(authHeader).from("workspace_members").select("workspace_id");
    if (error) throw error;
    return (data ?? []).map((r: { workspace_id: string }) => r.workspace_id);
  },

  async analyze(content) {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a project management AI. Analyze the user's note and extract actionable items. Use the extract_actionable_items tool to return structured suggestions.",
          },
          { role: "user", content },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_actionable_items",
              description: "Extract actionable items from a note",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["task", "project", "risk", "follow-up", "goal"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      },
                      required: ["type", "title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_actionable_items" } },
      }),
    });

    if (!response.ok) return { status: response.status };
    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const suggestions = toolCall ? JSON.parse(toolCall.function.arguments).suggestions : [];
    return { status: 200, suggestions };
  },
});

Deno.serve(handler);
