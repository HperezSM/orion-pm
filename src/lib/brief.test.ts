import { describe, expect, it, beforeEach } from "vitest";
import { aiStatusMessage, briefCacheKey, localToday, readCachedSummary, writeCachedSummary } from "./brief";

const summary = { headline: "Busy day", summary: "Two late tasks.", priorities: [{ title: "Fix login", why: "Overdue" }] };

describe("localToday", () => {
  it("formats the local date as YYYY-MM-DD", () => {
    expect(localToday(new Date(2026, 10, 18, 23, 30))).toBe("2026-11-18");
  });
});

describe("AI summary cache", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips today's summary for one workspace", () => {
    writeCachedSummary(localStorage, "ws-1", "2026-11-18", summary);
    expect(readCachedSummary(localStorage, "ws-1", "2026-11-18")).toEqual(summary);
    expect(readCachedSummary(localStorage, "ws-2", "2026-11-18")).toBeNull();
    expect(readCachedSummary(localStorage, "ws-1", "2026-11-19")).toBeNull();
  });

  it("drops older days when a new one is written, and leaves other keys alone", () => {
    localStorage.setItem("unrelated", "x");
    writeCachedSummary(localStorage, "ws-1", "2026-11-17", summary);
    writeCachedSummary(localStorage, "ws-1", "2026-11-18", summary);
    expect(localStorage.getItem(briefCacheKey("ws-1", "2026-11-17"))).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("x");
  });

  it("ignores corrupt entries", () => {
    localStorage.setItem(briefCacheKey("ws-1", "2026-11-18"), "{not json");
    expect(readCachedSummary(localStorage, "ws-1", "2026-11-18")).toBeNull();
    localStorage.setItem(briefCacheKey("ws-1", "2026-11-18"), JSON.stringify({ headline: 1 }));
    expect(readCachedSummary(localStorage, "ws-1", "2026-11-18")).toBeNull();
  });

  it("works without storage", () => {
    expect(readCachedSummary(undefined, "ws-1", "2026-11-18")).toBeNull();
    expect(() => writeCachedSummary(undefined, "ws-1", "2026-11-18", summary)).not.toThrow();
  });
});

describe("aiStatusMessage", () => {
  it("is silent when there is nothing to say", () => {
    expect(aiStatusMessage("ok")).toBeNull();
    expect(aiStatusMessage("skipped")).toBeNull();
  });
  it("explains plan and quota without hiding the brief", () => {
    expect(aiStatusMessage("plan")).toMatch(/Pro plan/);
    expect(aiStatusMessage("quota")).toMatch(/this month/);
  });
});
