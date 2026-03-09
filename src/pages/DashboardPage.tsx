import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  CalendarDays,
  Bot,
} from "lucide-react";

export default function DashboardPage() {
  // Fetch stats
  const { data: projectCount } = useQuery({
    queryKey: ["dashboard-projects-count"],
    queryFn: async () => {
      const { count } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active");
      return count ?? 0;
    },
  });

  const { data: tasksData } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const { data } = await supabase
        .from("tasks")
        .select("id, title, due_date, priority, status, project:projects(name)")
        .lte("due_date", weekEnd.toISOString().split("T")[0])
        .neq("status", "done")
        .order("due_date", { ascending: true })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: waitingCount } = useQuery({
    queryKey: ["dashboard-follow-ups-count"],
    queryFn: async () => {
      const { count } = await supabase.from("follow_ups").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count ?? 0;
    },
  });

  const { data: blockedCount } = useQuery({
    queryKey: ["dashboard-blockers-count"],
    queryFn: async () => {
      const { count } = await supabase.from("blockers").select("*", { count: "exact", head: true }).is("resolved_at", null);
      return count ?? 0;
    },
  });

  const { data: currentSprint } = useQuery({
    queryKey: ["dashboard-current-sprint"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sprints")
        .select("id, name, start_date, end_date, capacity_points, velocity_actual")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["dashboard-upcoming-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select("id, title, start_time")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(3);
      return data ?? [];
    },
  });

  const { data: aiActions } = useQuery({
    queryKey: ["dashboard-ai-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pending_ai_actions")
        .select("id, action_type, payload_json, created_at, status")
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  // Calculate sprint progress
  const sprintProgress = currentSprint && currentSprint.capacity_points
    ? Math.round(((currentSprint.velocity_actual ?? 0) / currentSprint.capacity_points) * 100)
    : 0;

  const daysLeft = currentSprint?.end_date
    ? Math.max(0, Math.ceil((new Date(currentSprint.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const formatEventTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (date.toDateString() === today.toDateString()) return `Today, ${timeStr}`;
    if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${timeStr}`;
    return `${date.toLocaleDateString([], { weekday: "short" })}, ${timeStr}`;
  };

  return (
    <div className="animate-fade-in">
      <TopBar title="Dashboard" subtitle="Welcome back — here's your command center." />
      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Projects" value={projectCount ?? 0} icon={<FolderKanban className="h-4 w-4" />} accent="primary" />
          <StatCard label="Tasks Due This Week" value={tasksData?.length ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} accent="warning" />
          <StatCard label="Waiting on Client" value={waitingCount ?? 0} icon={<Clock className="h-4 w-4" />} accent="purple" />
          <StatCard label="Blocked Tasks" value={blockedCount ?? 0} icon={<AlertTriangle className="h-4 w-4" />} accent="destructive" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks due */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-foreground">Tasks Due This Week</h2>
              <span className="text-xs text-text-muted">{tasksData?.length ?? 0} tasks</span>
            </div>
            <div className="divide-y divide-border">
              {tasksData && tasksData.length > 0 ? (
                tasksData.map((t) => (
                  <div key={t.id} className="px-4 py-3 flex items-center justify-between hover:bg-background-secondary/50 transition-colors">
                    <div>
                      <p className="text-sm text-foreground font-medium">{t.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{(t.project as { name: string } | null)?.name ?? "No project"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={(t.priority as "high" | "medium" | "low") ?? "medium"} />
                      <span className="text-xs text-text-secondary">{t.due_date ? new Date(t.due_date).toLocaleDateString([], { weekday: "short" }) : "No date"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-text-muted">No tasks due this week</div>
              )}
            </div>
          </div>

          {/* Sprint progress + Upcoming */}
          <div className="space-y-4">
            {/* Sprint */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-heading font-semibold text-foreground">Sprint Progress</h2>
              </div>
              {currentSprint ? (
                <>
                  <div className="flex items-end gap-3 mb-2">
                    <span className="text-3xl font-heading font-bold text-foreground">{sprintProgress}%</span>
                    <span className="text-xs text-text-muted mb-1">{currentSprint.name} · {daysLeft} days left</span>
                  </div>
                  <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${sprintProgress}%` }} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-muted">No active sprint</p>
              )}
            </div>

            {/* Upcoming */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-heading font-semibold text-foreground">Upcoming</h2>
              </div>
              <div className="space-y-2">
                {upcomingEvents && upcomingEvents.length > 0 ? (
                  upcomingEvents.map((e) => (
                    <div key={e.id} className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate">{e.title}</span>
                      <span className="text-xs text-text-muted whitespace-nowrap ml-2">{formatEventTime(e.start_time)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted">No upcoming events</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent AI Actions */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple" />
            <h2 className="text-sm font-heading font-semibold text-foreground">Recent AI Actions</h2>
          </div>
          <div className="divide-y divide-border">
            {aiActions && aiActions.length > 0 ? (
              aiActions.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-background-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Zap className="h-3.5 w-3.5 text-purple flex-shrink-0" />
                    <p className="text-sm text-foreground">{a.action_type}: {a.status}</p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap ml-4">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-text-muted">No AI actions yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
