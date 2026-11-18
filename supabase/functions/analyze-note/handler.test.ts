// deno test supabase/functions/analyze-note/handler.test.ts
import { createHandler, type Deps, MAX_CONTENT_CHARS } from "./handler.ts";

function assertEquals(actual: unknown, expected: unknown, msg = "") {
  if (actual !== expected) throw new Error(`${msg} expected ${expected}, got ${actual}`);
}

const USER = "Bearer user-token";
const ANON = "Bearer anon-key";

function deps(over: Partial<Deps> = {}): Deps & { calls: number; charged: string[] } {
  const d = {
    calls: 0,
    charged: [] as string[],
    getUserId: (h: string) => Promise.resolve(h === USER ? "user-1" : null),
    getWorkspaces: (h: string) =>
      Promise.resolve(h === USER ? [{ id: "ws-1", ownerId: "user-1", createdAt: "2026-01-01T00:00:00Z" }] : []),
    consumeAiAction: (_h: string, ws: string) => {
      d.charged.push(ws);
      return Promise.resolve({ allowed: true, reason: null, used: 1, quota: 500 });
    },
    analyze: () => {
      d.calls++;
      return Promise.resolve({ status: 200, suggestions: [{ type: "task", title: "t" }] });
    },
    ...over,
  };
  return d;
}

const post = (body: unknown, auth?: string) =>
  new Request("http://x/analyze-note", {
    method: "POST",
    headers: auth ? { Authorization: auth, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const note = { content: "Call the vendor on Friday about the delayed shipment." };

Deno.test("no Authorization header -> 401, model not called", async () => {
  const d = deps();
  const res = await createHandler(d)(post(note));
  assertEquals(res.status, 401);
  assertEquals(d.calls, 0);
});

Deno.test("anon key (valid JWT, no user) -> 401", async () => {
  const d = deps();
  const res = await createHandler(d)(post(note, ANON));
  assertEquals(res.status, 401);
  assertEquals(d.calls, 0);
});

Deno.test("auth lookup throwing -> 401", async () => {
  const d = deps({ getUserId: () => Promise.reject(new Error("boom")) });
  assertEquals((await createHandler(d)(post(note, USER))).status, 401);
});

Deno.test("signed-in user with no workspace -> 403", async () => {
  const d = deps({ getWorkspaces: () => Promise.resolve([]) });
  const res = await createHandler(d)(post(note, USER));
  assertEquals(res.status, 403);
  assertEquals(d.calls, 0);
});

Deno.test("workspace_id the user is not in -> 403", async () => {
  const d = deps();
  const res = await createHandler(d)(post({ ...note, workspace_id: "ws-other" }, USER));
  assertEquals(res.status, 403);
  assertEquals(d.calls, 0);
});

Deno.test("own workspace_id -> 200", async () => {
  const res = await createHandler(deps())(post({ ...note, workspace_id: "ws-1" }, USER));
  assertEquals(res.status, 200);
});

Deno.test("member without workspace_id -> 200 with suggestions", async () => {
  const d = deps();
  const res = await createHandler(d)(post(note, USER));
  assertEquals(res.status, 200);
  assertEquals((await res.json()).suggestions.length, 1);
  assertEquals(d.calls, 1);
});

Deno.test("oversized note -> 413, model not called", async () => {
  const d = deps();
  const res = await createHandler(d)(post({ content: "x".repeat(MAX_CONTENT_CHARS + 1) }, USER));
  assertEquals(res.status, 413);
  assertEquals(d.calls, 0);
});

Deno.test("short note -> empty suggestions, model not called", async () => {
  const d = deps();
  const res = await createHandler(d)(post({ content: "hi" }, USER));
  assertEquals(res.status, 200);
  assertEquals(d.calls, 0);
});

Deno.test("bad JSON -> 400", async () => {
  assertEquals((await createHandler(deps())(post("{nope", USER))).status, 400);
});

Deno.test("GET -> 405, OPTIONS -> 200", async () => {
  const h = createHandler(deps());
  assertEquals((await h(new Request("http://x", { method: "GET" }))).status, 405);
  assertEquals((await h(new Request("http://x", { method: "OPTIONS" }))).status, 200);
});

Deno.test("model 429 passes through; internal errors are not leaked", async () => {
  const rl = await createHandler(deps({ analyze: () => Promise.resolve({ status: 429 }) }))(post(note, USER));
  assertEquals(rl.status, 429);
  const boom = await createHandler(deps({ analyze: () => Promise.reject(new Error("secret detail")) }))(post(note, USER));
  assertEquals(boom.status, 500);
  assertEquals((await boom.json()).error, "Analysis failed");
});

// --- DEX-10b: workspace choice and quota -----------------------------------

const two = () =>
  Promise.resolve([
    { id: "ws-invited", ownerId: "someone-else", createdAt: "2025-01-01T00:00:00Z" },
    { id: "ws-own", ownerId: "user-1", createdAt: "2026-06-01T00:00:00Z" },
  ]);

Deno.test("no workspace_id: charges the caller's own workspace, not the first one", async () => {
  const d = deps({ getWorkspaces: two });
  const res = await createHandler(d)(post(note, USER));
  assertEquals(res.status, 200);
  assertEquals(d.charged.join(","), "ws-own");
});

Deno.test("workspace_id given: charges that workspace", async () => {
  const d = deps({ getWorkspaces: two });
  await createHandler(d)(post({ ...note, workspace_id: "ws-invited" }, USER));
  assertEquals(d.charged.join(","), "ws-invited");
});

Deno.test("plan without AI analysis -> 403 code plan, model not called", async () => {
  const d = deps({ consumeAiAction: () => Promise.resolve({ allowed: false, reason: "plan", used: 0, quota: 0 }) });
  const res = await createHandler(d)(post(note, USER));
  assertEquals(res.status, 403);
  assertEquals((await res.json()).code, "plan");
  assertEquals(d.calls, 0);
});

Deno.test("quota used up -> 429 code quota, model not called", async () => {
  const d = deps({ consumeAiAction: () => Promise.resolve({ allowed: false, reason: "quota", used: 500, quota: 500 }) });
  const res = await createHandler(d)(post(note, USER));
  assertEquals(res.status, 429);
  const body = await res.json();
  assertEquals(body.code, "quota");
  assertEquals(body.usage.quota, 500);
  assertEquals(d.calls, 0);
});

Deno.test("quota check failing -> 500, model not called (fails closed)", async () => {
  const d = deps({ consumeAiAction: () => Promise.reject(new Error("db down")) });
  const res = await createHandler(d)(post(note, USER));
  assertEquals(res.status, 500);
  assertEquals((await res.json()).error, "Analysis failed");
  assertEquals(d.calls, 0);
});

Deno.test("short note is not charged", async () => {
  const d = deps();
  await createHandler(d)(post({ content: "hi" }, USER));
  assertEquals(d.charged.length, 0);
});

Deno.test("success returns usage so the UI can update", async () => {
  const res = await createHandler(deps())(post(note, USER));
  const body = await res.json();
  assertEquals(body.usage.used, 1);
  assertEquals(body.usage.quota, 500);
});

Deno.test("model rate limit keeps code rate_limited (distinct from quota)", async () => {
  const res = await createHandler(deps({ analyze: () => Promise.resolve({ status: 429 }) }))(post(note, USER));
  assertEquals((await res.json()).code, "rate_limited");
});
