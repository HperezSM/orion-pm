import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default function WorkloadPage() {
  const { data: members, isLoading } = useQuery({
    queryKey: ["workload-members"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, capacity_hours_per_day");
      if (!profiles) return [];

      const result = [];
      for (const p of profiles) {
        const { count } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("assignee_id", p.user_id)
          .neq("status", "done");
        
        const { data: tasks } = await supabase
          .from("tasks")
          .select("story_points")
          .eq("assignee_id", p.user_id)
          .neq("status", "done");
        
        const totalPoints = tasks?.reduce((sum, t) => sum + (t.story_points ?? 0), 0) ?? 0;
        const capacity = p.capacity_hours_per_day ?? 8;

        result.push({
          name: p.display_name ?? "Unknown",
          capacity: capacity * 5,
          activeTasks: count ?? 0,
          totalPoints,
          utilization: capacity > 0 ? Math.round(((count ?? 0) / (capacity * 0.6)) * 100) : 0,
        });
      }
      return result;
    },
  });

  const getUtilStatus = (pct: number) => {
    if (pct > 100) return "high" as const;
    if (pct >= 80) return "medium" as const;
    return "low" as const;
  };

  return (
    <div className="animate-fade-in">
      <TopBar title="Workload" subtitle="Team capacity and assignment overview" />
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : members && members.length > 0 ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_100px_100px] border-b border-border">
              <div className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Team Member</div>
              <div className="px-2 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">Tasks</div>
              <div className="px-2 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">Points</div>
              <div className="px-2 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">Load</div>
            </div>
            {members.map((m) => (
              <div key={m.name} className="grid grid-cols-[1fr_100px_100px_100px] border-b border-border last:border-b-0 hover:bg-background-secondary/30 transition-colors">
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                    {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm text-foreground font-medium">{m.name}</span>
                </div>
                <div className="px-2 py-3 text-sm text-foreground text-center font-mono">{m.activeTasks}</div>
                <div className="px-2 py-3 text-sm text-foreground text-center font-mono">{m.totalPoints}</div>
                <div className="px-2 py-3 flex items-center justify-center">
                  <StatusBadge status={getUtilStatus(m.utilization)} label={`${m.utilization}%`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BarChart className="h-6 w-6" />}
            title="No team data"
            description="Workload data will appear once team members have tasks assigned to them."
          />
        )}
      </div>
    </div>
  );
}
