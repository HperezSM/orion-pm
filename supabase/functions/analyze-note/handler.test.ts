// deno test supabase/functions/analyze-note/handler.test.ts
import { createHandler, type Deps, MAX_CONTENT_CHARS } from "./handler.ts";

function assertEquals(actual: unknown, expected: unknown, msg = "") {
  if (actual !== expected) throw new Error(`${msg} expected ${expected}, got ${actual}`);
}

const USER = "Bearer user-token";
const ANON = "Bearer anon-key";

function deps(over: Partial<Deps> = {}): Deps & { calls: number } {
  const d = {
    calls: 0,
    getUserId: (h: string) => Promise.resolve(h === USER ? "user-1" : null),
    getWorkspaceIds: (h: string) => Promise.resolve(h === USER ? ["ws-1"] : []),
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
  const d = deps({ getWorkspaceIds: () => Promise.resolve([]) });
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
