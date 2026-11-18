import { describe, expect, it, beforeEach } from "vitest";
import { aiStatusMessage, briefCacheKey, browserStorage, localToday, readCachedSummary, writeCachedSummary } from "./brief";

const summary = { headline: "Busy day", summary: "Two late tasks.", priorities: [{ title: "Fix login", why: "Overdue" }] };

describe("localToday", () => {
  it("formats the local date as YYYY-MM-DD", () => {
    expect(localToday(new Date(2026, 10, 18, 23, 30))).toBe("2026-11-18");
  });
});

// An in-memory Storage, so the tests don't depend on the runtime's global
// localStorage (Node 22+ ships its own, which is undefined without
// --localstorage-file and shadows jsdom's).
class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
}

let localStorage: Storage;

describe("AI summary cache", () => {
  beforeEach(() => { localStorage = new MemoryStorage(); });

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

  it("survives a storage that throws (private mode, quota)", () => {
    const broken = new MemoryStorage();
    broken.setItem = () => { throw new Error("QuotaExceededError"); };
    broken.getItem = () => { throw new Error("SecurityError"); };
    expect(() => writeCachedSummary(broken, "ws-1", "2026-11-18", summary)).not.toThrow();
    expect(readCachedSummary(broken, "ws-1", "2026-11-18")).toBeNull();
  });

  it("works without storage", () => {
    expect(readCachedSummary(undefined, "ws-1", "2026-11-18")).toBeNull();
    expect(() => writeCachedSummary(undefined, "ws-1", "2026-11-18", summary)).not.toThrow();
  });
});

describe("browserStorage", () => {
  it("returns undefined instead of throwing when site data is blocked", () => {
    const blocked = {} as { localStorage: Storage };
    Object.defineProperty(blocked, "localStorage", { get() { throw new DOMException("denied", "SecurityError"); } });
    expect(browserStorage(blocked)).toBeUndefined();
  });
  it("returns the storage when it is there", () => {
    const s = new MemoryStorage();
    expect(browserStorage({ localStorage: s })).toBe(s);
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
