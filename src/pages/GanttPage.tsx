import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { FeatureGate } from "@/components/FeatureGate";
import { supabase } from "@/integrations/supabase/client";
import { GanttChart, Loader2 } from "lucide-react";

function GanttContent() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["gantt-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, status, health_score, start_date, end_date, client:clients(name)")
        .eq("status", "active")
        .order("start_date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: milestones } = useQuery({
    queryKey: ["gantt-milestones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("milestones")
        .select("id, title, due_date, status, project_id")
        .order("due_date", { ascending: true });
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <TopBar title="Gantt — Cross-Project" subtitle="Global timeline view" />
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="animate-fade-in">
        <TopBar title="Gantt — Cross-Project" subtitle="Global timeline view across all projects" />
        <div className="p-6">
          <EmptyState
            icon={<GanttChart className="h-6 w-6" />}
            title="No projects to display"
            description="Create projects with start and end dates to see them on the Gantt timeline."
          />
        </div>
      </div>
    );
  }

  // Calculate timeline bounds
  const allDates = projects.flatMap(p => [p.start_date, p.end_date].filter(Boolean)).map(d => new Date(d!).getTime());
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));

  const getPosition = (date: string | null) => {
    if (!date) return 0;
    return Math.max(0, (new Date(date).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays * 100);
  };

  const getWidth = (start: string | null, end: string | null) => {
    if (!start || !end) return 10;
    const days = Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
    return (days / totalDays) * 100;
  };

  const healthColor = (health: string | null) => {
    if (health === "blocked") return "bg-destructive/60";
    if (health === "at-risk") return "bg-warning/60";
    return "bg-primary/60";
  };

  return (
    <div className="animate-fade-in">
      <TopBar title="Gantt — Cross-Project" subtitle="Global timeline view across all projects" />
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          {projects.map((project) => {
            const projectMilestones = milestones?.filter(m => m.project_id === project.id) ?? [];
            return (
              <div key={project.id} className="border-b border-border last:border-b-0">
                <div className="flex items-center min-w-[700px]">
                  <div className="w-56 flex-shrink-0 px-4 py-3">
                    <p className="text-sm font-heading font-semibold text-foreground">{project.name}</p>
                    <p className="text-xs text-text-muted">{(project.client as any)?.name ?? "No client"}</p>
                  </div>
                  <div className="flex-1 relative h-10 flex items-center">
                    <div
                      className={`absolute h-5 rounded-sm ${healthColor(project.health_score)}`}
                      style={{ left: `${getPosition(project.start_date)}%`, width: `${getWidth(project.start_date, project.end_date)}%` }}
                    />
                    {projectMilestones.map((m) => (
                      <div
                        key={m.id}
                        className="absolute w-3 h-3 bg-warning rotate-45"
                        style={{ left: `${getPosition(m.due_date)}%`, top: "50%", transform: "translateY(-50%) rotate(45deg)" }}
                        title={m.title}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-2.5 w-6 rounded-sm bg-primary/60" /> On Track
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-2.5 w-6 rounded-sm bg-warning/60" /> At Risk
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-2.5 w-6 rounded-sm bg-destructive/60" /> Blocked
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-2.5 w-2.5 bg-warning rotate-45" /> Milestone
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GanttPage() {
  return (
    <FeatureGate feature="ganttChart" featureLabel="Gantt Chart">
      <GanttContent />
    </FeatureGate>
  );
}
