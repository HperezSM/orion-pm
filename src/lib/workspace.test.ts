import { describe, it, expect } from "vitest";
import {
  pickWorkspace,
  effectiveTier,
  aiQuota,
  aiActionsThisMonth,
  readFunctionError,
  tierChangeErrorMessage,
} from "./workspace";

const ws = (id: string, owner_id: string, created_at: string) => ({ id, owner_id, created_at });

describe("pickWorkspace", () => {
  it("returns null when there is none", () => {
    expect(pickWorkspace([], "u1")).toBeNull();
    expect(pickWorkspace(null, "u1")).toBeNull();
  });

  it("prefers the workspace the user owns over older ones", () => {
    const rows = [ws("other", "u2", "2025-01-01T00:00:00Z"), ws("mine", "u1", "2026-05-01T00:00:00Z")];
    expect(pickWorkspace(rows, "u1")?.id).toBe("mine");
  });

  it("falls back to the oldest membership", () => {
    const rows = [ws("b", "u3", "2026-02-01T00:00:00Z"), ws("a", "u2", "2026-01-01T00:00:00Z")];
    expect(pickWorkspace(rows, "u1")?.id).toBe("a");
  });

  it("does not depend on input order", () => {
    const rows = [ws("x", "u2", "2026-01-01T00:00:00Z"), ws("mine", "u1", "2026-03-01T00:00:00Z")];
    expect(pickWorkspace([...rows].reverse(), "u1")?.id).toBe("mine");
  });
});

describe("effectiveTier", () => {
  const now = new Date("2026-11-17T12:00:00Z");

  it("keeps the tier during an active trial", () => {
    expect(effectiveTier({ tier: "pro", trial_ends_at: "2026-11-20T00:00:00Z", stripe_subscription_id: null }, now)).toBe("pro");
  });

  it("treats an ended trial without a subscription as free", () => {
    expect(effectiveTier({ tier: "pro", trial_ends_at: "2026-11-10T00:00:00Z", stripe_subscription_id: null }, now)).toBe("free");
  });

  it("keeps a paying workspace on its tier", () => {
    expect(effectiveTier({ tier: "pro", trial_ends_at: "2026-11-10T00:00:00Z", stripe_subscription_id: "sub_1" }, now)).toBe("pro");
  });

  it("defaults unknown or missing tiers to free", () => {
    expect(effectiveTier(null, now)).toBe("free");
    expect(effectiveTier({ tier: "platinum", trial_ends_at: null, stripe_subscription_id: null }, now)).toBe("free");
  });
});

describe("AI quota", () => {
  it("matches the Pricing page", () => {
    expect(aiQuota("free")).toBe(0);
    expect(aiQuota("starter")).toBe(100);
    expect(aiQuota("pro")).toBe(500);
    expect(aiQuota("enterprise")).toBe(2000);
  });

  it("shows 0 used when the stored window is from an earlier month", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(aiActionsThisMonth({ ai_actions_used: 42, ai_actions_period_start: "2026-10-01T00:00:00Z" }, now)).toBe(0);
    expect(aiActionsThisMonth({ ai_actions_used: 42, ai_actions_period_start: "2026-11-01T00:00:00Z" }, now)).toBe(42);
    expect(aiActionsThisMonth({ ai_actions_used: 7 }, now)).toBe(7);
  });
});

describe("readFunctionError", () => {
  it("reads status and code from a FunctionsHttpError-like object", async () => {
    const err = { context: new Response(JSON.stringify({ error: "x", code: "quota" }), { status: 429 }) };
    expect(await readFunctionError(err)).toEqual({ status: 429, code: "quota" });
  });

  it("copes with a non-JSON body or no context", async () => {
    expect(await readFunctionError({ context: new Response("oops", { status: 500 }) })).toEqual({ status: 500, code: null });
    expect(await readFunctionError(new Error("network"))).toEqual({ status: null, code: null });
  });
});

describe("tierChangeErrorMessage", () => {
  it("explains the server's refusal codes in plain words", () => {
    expect(tierChangeErrorMessage({ message: "upgrade_requires_billing" })).toMatch(/billing/i);
    expect(tierChangeErrorMessage({ message: "not_workspace_owner" })).toMatch(/owner/i);
    expect(tierChangeErrorMessage({ message: "something else" })).toBe("something else");
  });
});
