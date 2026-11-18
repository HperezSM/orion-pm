import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, CalendarClock, Flag, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCurrentWorkspace, CURRENT_WORKSPACE_KEY } from "@/hooks/useCurrentWorkspace";
import {
  type AiSummary,
  type BriefResponse,
  aiStatusMessage,
  browserStorage,
  localToday,
  readCachedSummary,
  writeCachedSummary,
} from "@/lib/brief";

const KIND_ICON = {
  task: CalendarClock,
  blocker: AlertTriangle,
  "follow-up": RefreshCw,
  sprint: Zap,
  milestone: Flag,
  risk: AlertTriangle,
  project: AlertTriangle,
} as const;

const storage = browserStorage();

/**
 * The morning brief on the dashboard. The facts and focus list load for free
 * on every visit; the written AI summary is one click and one AI action, and
 * is kept for the rest of the day.
 */
export function DailyBrief() {
  const { data: workspace } = useCurrentWorkspace();
  const queryClient = useQueryClient();
  const today = localToday();
  // Keyed by workspace and day so a workspace switch or midnight never shows a stale summary.
  const [ai, setAi] = useState<{ key: string; summary: AiSummary } | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  const brief = useQuery({
    queryKey: ["daily-brief", workspace?.id, today],
    enabled: !!workspace,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BriefResponse> => {
      const { data, error } = await supabase.functions.invoke("daily-brief", {
        body: { workspace_id: workspace!.id, today },
      });
      if (error) throw error;
      return data as BriefResponse;
    },
  });

  const key = workspace ? `${workspace.id}:${today}` : "";
  const summary = (ai?.key === key ? ai.summary : null) ?? (workspace ? readCachedSummary(storage, workspace.id, today) : null);

  const writeSummary = async () => {
    if (!workspace) return;
    setWriting(true);
    setAiNote(null);
    try {
      const { data, error } = await supabase.functions.invoke("daily-brief", {
        body: { workspace_id: workspace.id, today, ai: true },
      });
      if (error) throw error;
      const res = data as BriefResponse;
      queryClient.setQueryData(["daily-brief", workspace.id, today], res);
      if (res.ai.status === "ok" && res.ai.summary) {
        setAi({ key: `${workspace.id}:${today}`, summary: res.ai.summary });
        writeCachedSummary(storage, workspace.id, today, res.ai.summary);
      } else {
        setAiNote(aiStatusMessage(res.ai.status));
      }
    } catch {
      setAiNote(aiStatusMessage("failed"));
    } finally {
      queryClient.invalidateQueries({ queryKey: CURRENT_WORKSPACE_KEY });
      setWriting(false);
    }
  };

  const data = brief.data;
  const c = data?.facts.counts;

  return (
    <section className="bg-card border border-border rounded-lg" aria-labelledby="daily-brief-title">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 id="daily-brief-title" className="text-sm font-heading font-semibold text-foreground">
            Daily Brief
          </h2>
          <span className="text-xs text-text-muted">
            {new Date(`${today}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => brief.refetch()} disabled={brief.isFetching} aria-label="Refresh brief">
            <RefreshCw className={`h-3.5 w-3.5 ${brief.isFetching ? "animate-spin" : ""}`} />
          </Button>
          {!summary && (
            <Button size="sm" onClick={writeSummary} disabled={writing || !data}>
              {writing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              AI summary
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {brief.isLoading && <p className="text-sm text-text-muted">Putting your brief together...</p>}
        {brief.isError && (
          <p className="text-sm text-destructive">
            Could not load the brief.{" "}
            <button className="underline" onClick={() => brief.refetch()}>
              Try again
            </button>
          </p>
        )}

        {data && (
          <>
            <div>
              <p className="text-base font-heading font-semibold text-foreground">{summary?.headline ?? data.headline}</p>
              {summary && <p className="text-sm text-text-secondary mt-1 leading-relaxed">{summary.summary}</p>}
              {aiNote && <p className="text-xs text-text-muted mt-2">{aiNote}</p>}
            </div>

            {c && (
              <dl className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                {[
                  ["Overdue", c.overdueTasks],
                  ["Due today", c.dueToday],
                  ["This week", c.dueThisWeek],
                  ["Blockers", c.openBlockers],
                  ["High risks", c.highRisks],
                  ["Follow-ups", c.followUpsDue],
                ].map(([label, n]) => (
                  <div key={label} className="rounded-md bg-background-secondary/60 py-2 flex flex-col-reverse">
                    <dt className="text-[11px] text-text-muted">{label}</dt>
                    <dd className="text-lg font-heading font-bold text-foreground">{n}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                {summary?.priorities.length ? "Priorities" : "Focus first"}
              </h3>
              {summary?.priorities.length ? (
                <ol className="space-y-2">
                  {summary.priorities.map((p, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-foreground">{i + 1}. {p.title}</span>
                      <span className="text-text-muted"> · {p.why}</span>
                    </li>
                  ))}
                </ol>
              ) : data.focus.length ? (
                <ul className="space-y-2">
                  {data.focus.map((f) => {
                    const Icon = KIND_ICON[f.kind];
                    return (
                      <li key={`${f.kind}-${f.id}`} className="flex items-start gap-2 text-sm">
                        <Icon className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
                        <span>
                          <span className="font-medium text-foreground">{f.title}</span>
                          <span className="text-text-muted"> · {f.reason}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-text-muted">Nothing needs you first thing today.</p>
              )}
            </div>

            {data.facts.sprints.length > 0 && (
              <div className="space-y-2">
                {data.facts.sprints.map((s) => (
                  <div key={s.id}>
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">
                        {s.name} <span className="text-text-muted">({s.project})</span>
                      </span>
                      <span className={s.behind ? "text-destructive" : "text-text-muted"}>
                        {s.donePct}% done{s.elapsedPct !== null ? ` · ${s.elapsedPct}% of time` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${s.behind ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${s.donePct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
