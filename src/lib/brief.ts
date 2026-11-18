// Client side of the daily brief. The rules that build it live in
// supabase/functions/_shared/brief.ts; the browser only shows the result.
import type { AiSummary } from "../../supabase/functions/_shared/brief";
import type { BriefResponse } from "../../supabase/functions/daily-brief/handler";

export type { BriefResponse, AiSummary };

/** The user's own calendar date, YYYY-MM-DD (en-CA formats dates that way). */
export function localToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA");
}

const KEY_PREFIX = "orion:brief-ai:";

export function briefCacheKey(workspaceId: string, today: string): string {
  return `${KEY_PREFIX}${workspaceId}:${today}`;
}

/**
 * The AI summary costs one action, so keep today's copy in the browser and
 * show it again on reload instead of paying twice. Old days are pruned.
 */
export function readCachedSummary(storage: Storage | undefined, workspaceId: string, today: string): AiSummary | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(briefCacheKey(workspaceId, today));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.headline === "string" && typeof v.summary === "string" && Array.isArray(v.priorities) ? v : null;
  } catch {
    return null;
  }
}

export function writeCachedSummary(storage: Storage | undefined, workspaceId: string, today: string, summary: AiSummary): void {
  if (!storage) return;
  try {
    const keep = briefCacheKey(workspaceId, today);
    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i);
      if (k && k.startsWith(KEY_PREFIX) && k !== keep) storage.removeItem(k);
    }
    storage.setItem(keep, JSON.stringify(summary));
  } catch {
    // Storage full or blocked (private mode): the brief still works, it just is not cached.
  }
}

export function aiStatusMessage(status: BriefResponse["ai"]["status"]): string | null {
  switch (status) {
    case "plan":
      return "AI summaries are part of the Pro plan. The brief below is still up to date.";
    case "quota":
      return "You have used this month's AI actions. The brief below is still up to date.";
    case "rate_limited":
      return "The AI is busy. Try again in a minute.";
    case "credits":
    case "failed":
      return "The AI summary did not come through. Nothing else is affected; try again later.";
    default:
      return null;
  }
}
