// deno test supabase/functions/daily-brief/handler.test.ts
import { acceptableToday, type BriefResponse, createHandler, type Deps } from "./handler.ts";
import { type BriefData, buildBriefFacts, LIST_CAP, parseAiSummary, plainHeadline, rankFocus } from "../_shared/brief.ts";

function eq(actual: unknown, expected: unknown, msg = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const TODAY = "2026-11-18";
const USER = "Bearer user-token";

const empty = (): BriefData => ({ projects: [], tasks: [], sprints: [], blockers: [], risks: [], followUps: [], milestones: [] });

function sample(): BriefData {
  return {
    projects: [
      { id: "p1", name: "Portal", status: "active", health_score: "on-track", end_date: "2027-01-31" },
      { id: "p2", name: "Billing", status: "active", health_score: "blocked", end_date: null },
      { id: "p3", name: "Old", status: "completed", health_score: "on-track", end_date: "2026-01-01" },
      { id: "p4", name: "Late", status: "active", health_score: "on-track", end_date: "2026-11-01" },
    ],
    tasks: [
      { id: "t1", title: "Fix login", status: "todo", priority: "high", due_date: "2026-11-15", project_id: "p1", sprint_id: "s1", story_points: 3 },
      { id: "t2", title: "Write docs", status: "in_progress", priority: "low", due_date: "2026-11-10", project_id: "p1", sprint_id: "s1", story_points: 2 },
      { id: "t3", title: "Ship invoice", status: "todo", priority: "critical", due_date: TODAY, project_id: "p2", sprint_id: null, story_points: null },
      { id: "t4", title: "Plan Q1", status: "todo", priority: "medium", due_date: "2026-11-21", project_id: "p1", sprint_id: "s1", story_points: 5 },
      { id: "t5", title: "Far away", status: "todo", priority: "high", due_date: "2026-12-30", project_id: "p1", sprint_id: null, story_points: null },
      { id: "t6", title: "Done thing", status: "done", priority: "high", due_date: "2026-11-01", project_id: "p1", sprint_id: "s1", story_points: 10 },
    ],
    sprints: [{ id: "s1", name: "Sprint 12", project_id: "p1", start_date: "2026-11-06", end_date: "2026-11-23", goal: "Login v2" }],
    blockers: [{ id: "b1", description: "Waiting on API keys", project_id: "p2", raised_at: "2026-11-12T09:00:00Z" }],
    risks: [
      { id: "r1", title: "Vendor may slip", project_id: "p2", severity_score: "critical", status: "open" },
      { id: "r2", title: "Minor", project_id: "p1", severity_score: "low", status: "open" },
      { id: "r3", title: "Closed one", project_id: "p1", severity_score: "high", status: "closed" },
    ],
    followUps: [
      { id: "f1", project_id: "p1", status: "pending", next_action_date: "2026-11-17", days_waiting: 4, last_action: "Asked client for sign-off", escalated: false },
      { id: "f2", project_id: "p1", status: "pending", next_action_date: "2026-11-25", days_waiting: 1, last_action: "Later", escalated: false },
      { id: "f3", project_id: "p2", status: "escalated", next_action_date: null, days_waiting: 9, last_action: "Contract", escalated: true },
    ],
    milestones: [
      { id: "m1", title: "Beta", project_id: "p1", due_date: "2026-11-20", status: "pending" },
      { id: "m2", title: "GA", project_id: "p1", due_date: "2027-02-01", status: "pending" },
      { id: "m3", title: "Done MS", project_id: "p1", due_date: "2026-11-19", status: "completed" },
    ],
  };
}

// ---------- facts ----------

Deno.test("facts: buckets tasks by due date and ignores done ones", () => {
  const f = buildBriefFacts(sample(), TODAY);
  eq(f.overdue.map((t) => t.id), ["t1", "t2"], "overdue sorted by priority");
  eq(f.overdue[0].daysLate, 3);
  eq(f.dueToday.map((t) => t.id), ["t3"]);
  eq(f.dueThisWeek.map((t) => t.id), ["t4"], "t5 is beyond 7 days");
  eq(f.counts.activeProjects, 3, "completed project not counted");
});

Deno.test("facts: sprint progress uses points and flags a sprint behind", () => {
  const s = buildBriefFacts(sample(), TODAY).sprints[0];
  // 10 of 20 points done, 12 of 17 days elapsed (71%) -> 50 + 15 < 71 -> behind
  eq([s.tasksDone, s.tasksTotal, s.donePct, s.elapsedPct, s.daysLeft, s.behind], [1, 4, 50, 71, 5, true]);
});

Deno.test("facts: sprint with no tasks is never behind", () => {
  const d = sample();
  d.tasks = [];
  eq(buildBriefFacts(d, TODAY).sprints[0].behind, false);
});

Deno.test("facts: blockers aged, high risks only, follow-ups due or escalated, milestones in window", () => {
  const f = buildBriefFacts(sample(), TODAY);
  eq(f.blockers[0].ageDays, 6);
  eq(f.risks.map((r) => r.id), ["r1"]);
  eq(f.followUps.map((u) => u.id), ["f3", "f1"], "escalated first; f2 not due yet");
  eq(f.milestones.map((m) => [m.id, m.daysUntil]), [["m1", 2]]);
  eq(f.projectsAtRisk.map((p) => [p.id, p.reason]), [["p2", "blocked"], ["p4", "past-end-date"]]);
});

Deno.test("facts: lists are capped but counts are not", () => {
  const d = empty();
  d.projects = [{ id: "p", name: "P", status: "active", health_score: null, end_date: null }];
  for (let i = 0; i < 20; i++) {
    d.tasks.push({ id: `t${i}`, title: `T${i}`, status: "todo", priority: "medium", due_date: "2026-11-01", project_id: "p", sprint_id: null, story_points: null });
  }
  const f = buildBriefFacts(d, TODAY);
  eq([f.overdue.length, f.counts.overdueTasks], [LIST_CAP, 20]);
});

Deno.test("focus: behind sprint first, then late high-priority work, escalations and old blockers", () => {
  const focus = rankFocus(buildBriefFacts(sample(), TODAY));
  eq(focus.length, 5);
  eq(focus.map((x) => x.kind), ["sprint", "task", "task", "follow-up", "blocker"]);
  eq(focus.every((x) => x.reason.length > 0), true);
});

Deno.test("focus: same data, same order", () => {
  eq(rankFocus(buildBriefFacts(sample(), TODAY)), rankFocus(buildBriefFacts(sample(), TODAY)));
});

Deno.test("headline: names what is urgent, or says nothing is", () => {
  eq(plainHeadline(buildBriefFacts(sample(), TODAY)),
    "2 overdue tasks, 1 task due today, 1 open blocker, 2 follow-ups to chase, 1 sprint behind across 3 active projects.");
  eq(plainHeadline(buildBriefFacts(empty(), TODAY)), "Nothing urgent across 0 active projects. Good day to get ahead.");
});

Deno.test("parseAiSummary: trims, caps priorities at 3, rejects junk", () => {
  eq(parseAiSummary(null), null);
  eq(parseAiSummary({ headline: "", summary: "x" }), null);
  const p = parseAiSummary({
    headline: "  Busy day ",
    summary: "Two things are late.",
    priorities: [{ title: "a", why: "1" }, { title: "", why: "skip" }, { title: "b", why: "2" }, { title: "c", why: "3" }, { title: "d", why: "4" }],
  });
  eq(p, { headline: "Busy day", summary: "Two things are late.", priorities: [{ title: "a", why: "1" }, { title: "b", why: "2" }, { title: "c", why: "3" }] });
});

Deno.test("acceptableToday: client date within a day of UTC, else UTC", () => {
  eq(acceptableToday("2026-11-17", TODAY), "2026-11-17");
  eq(acceptableToday("2026-11-19", TODAY), "2026-11-19");
  eq(acceptableToday("2026-11-25", TODAY), TODAY);
  eq(acceptableToday("2026-02-30", TODAY), TODAY);
  eq(acceptableToday(undefined, TODAY), TODAY);
});

// ---------- handler ----------

function deps(over: Partial<Deps> = {}) {
  const d = {
    charged: [] as string[],
    modelCalls: 0,
    loadedFor: [] as string[],
    utcToday: () => TODAY,
    getUserId: (h: string) => Promise.resolve(h === USER ? "user-1" : null),
    getWorkspaces: (h: string) =>
      Promise.resolve(h === USER
        ? [
          { id: "ws-other", ownerId: "someone", createdAt: "2025-01-01T00:00:00Z" },
          { id: "ws-1", ownerId: "user-1", createdAt: "2026-01-01T00:00:00Z" },
        ]
        : []),
    loadBriefData: (_h: string, ws: string) => {
      d.loadedFor.push(ws);
      return Promise.resolve(sample());
    },
    consumeAiAction: (_h: string, ws: string) => {
      d.charged.push(ws);
      return Promise.resolve({ allowed: true, reason: null, used: 3, quota: 500 });
    },
    writeSummary: () => {
      d.modelCalls++;
      return Promise.resolve({ status: 200, summary: { headline: "H", summary: "S", priorities: [] } });
    },
    ...over,
  };
  return d as Deps & { charged: string[]; modelCalls: number; loadedFor: string[] };
}

const post = (body: unknown, auth: string | null = USER) =>
  new Request("http://x/daily-brief", {
    method: "POST",
    headers: auth ? { Authorization: auth, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

Deno.test("handler: no token or anon token -> 401, nothing loaded", async () => {
  const d = deps();
  const h = createHandler(d);
  eq((await h(post({}, null))).status, 401);
  eq((await h(post({}, "Bearer anon-key"))).status, 401);
  eq(d.loadedFor.length, 0);
});

Deno.test("handler: GET -> 405, bad JSON -> 400, array body -> 400", async () => {
  const h = createHandler(deps());
  eq((await h(new Request("http://x", { method: "GET", headers: { Authorization: USER } }))).status, 405);
  eq((await h(post("{nope"))).status, 400);
  eq((await h(post("[1]"))).status, 400);
});

Deno.test("handler: empty body -> free brief for the caller's own workspace, no AI spend", async () => {
  const d = deps();
  const res = await createHandler(d)(post(""));
  eq(res.status, 200);
  const b: BriefResponse = await res.json();
  eq([b.workspace_id, b.ai.status, b.facts.date, b.focus.length], ["ws-1", "skipped", TODAY, 5]);
  eq([d.charged.length, d.modelCalls], [0, 0]);
});

Deno.test("handler: workspace the caller is not in -> 403, nothing loaded", async () => {
  const d = deps();
  eq((await createHandler(d)(post({ workspace_id: "ws-stranger" }))).status, 403);
  eq(d.loadedFor.length, 0);
});

Deno.test("handler: named workspace the caller belongs to is used", async () => {
  const d = deps();
  const b = await (await createHandler(d)(post({ workspace_id: "ws-other" }))).json();
  eq([b.workspace_id, d.loadedFor[0]], ["ws-other", "ws-other"]);
});

Deno.test("handler: ai=true spends one action, then calls the model", async () => {
  const d = deps();
  const b: BriefResponse = await (await createHandler(d)(post({ ai: true, today: "2026-11-17" }))).json();
  eq([b.ai.status, b.ai.summary?.headline, b.usage?.used, b.facts.date], ["ok", "H", 3, "2026-11-17"]);
  eq([d.charged, d.modelCalls], [["ws-1"], 1]);
});

Deno.test("handler: ai=\"true\" (string) is not a request for AI", async () => {
  const d = deps();
  await createHandler(d)(post({ ai: "true" }));
  eq(d.charged.length, 0);
});

Deno.test("handler: plan or quota refusal still returns the free brief, model not called", async () => {
  for (const reason of ["plan", "quota"] as const) {
    const d = deps({ consumeAiAction: () => Promise.resolve({ allowed: false, reason, used: 500, quota: 500 }) });
    const res = await createHandler(d)(post({ ai: true }));
    const b: BriefResponse = await res.json();
    eq([res.status, b.ai.status, b.ai.summary, b.focus.length > 0], [200, reason, null, true]);
    eq(d.modelCalls, 0);
  }
});

Deno.test("handler: model errors map to a status, never a 500", async () => {
  for (const [status, expected] of [[429, "rate_limited"], [402, "credits"], [500, "failed"]] as const) {
    const res = await createHandler(deps({ writeSummary: () => Promise.resolve({ status }) }))(post({ ai: true }));
    eq([res.status, (await res.json()).ai.status], [200, expected]);
  }
  const thrown = await createHandler(deps({ writeSummary: () => Promise.reject(new Error("boom")) }))(post({ ai: true }));
  eq((await thrown.json()).ai.status, "failed");
  const unusable = await createHandler(deps({ writeSummary: () => Promise.resolve({ status: 200, summary: null }) }))(post({ ai: true }));
  eq((await unusable.json()).ai.status, "failed");
});

Deno.test("handler: data load failure -> 500 without spending an action", async () => {
  const d = deps({ loadBriefData: () => Promise.reject(new Error("db down")) });
  eq((await createHandler(d)(post({ ai: true }))).status, 500);
  eq(d.charged.length, 0);
});
