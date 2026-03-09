import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  FolderKanban, CheckCircle2, AlertTriangle, Users, Activity, Zap,
  GanttChart, ShieldAlert, Plus, BarChart3, Loader2,
} from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, client:clients(name)")
        .eq("id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: risks } = useQuery({
    queryKey: ["project-risks", id],
    queryFn: async () => {
      const { data } = await supabase.from("risks").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ["project-members", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_members")
        .select("*, profile:profiles!project_members_user_id_fkey(display_name)")
        .eq("project_id", id!);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: activityLogs } = useQuery({
    queryKey: ["project-activity", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("project_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <TopBar title="Loading..." />
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="animate-fade-in">
        <TopBar title="Project Not Found" />
        <div className="p-6">
          <EmptyState icon={<FolderKanban className="h-6 w-6" />} title="Project not found" description="This project may have been deleted or you don't have access." />
        </div>
      </div>
    );
  }

  const completedTasks = tasks?.filter(t => t.status === "done").length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const blockerCount = tasks?.filter(t => t.status === "blocked").length ?? 0;

  const kanbanGroups = [
    { title: "To Do", status: "todo" },
    { title: "In Progress", status: "in_progress" },
    { title: "Blocked", status: "blocked" },
    { title: "Done", status: "done" },
  ];

  return (
    <div className="animate-fade-in">
      <TopBar title={project.name} subtitle={`${(project.client as any)?.name ?? "No client"} · ${project.methodology ?? "Agile"}`} />
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <StatusBadge status={(project.health_score as any) ?? "on-track"} />
          <span className="text-xs text-text-muted">{completedTasks}/{totalTasks} tasks</span>
          {project.start_date && project.end_date && (
            <span className="text-xs text-text-muted">{project.start_date} → {project.end_date}</span>
          )}
          {blockerCount > 0 && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {blockerCount} blocked
            </span>
          )}
        </div>

        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="bg-background-secondary border border-border">
            <TabsTrigger value="tasks" className="text-xs gap-1.5"><CheckCircle2 className="h-3 w-3" /> Tasks</TabsTrigger>
            <TabsTrigger value="risks" className="text-xs gap-1.5"><ShieldAlert className="h-3 w-3" /> Risks</TabsTrigger>
            <TabsTrigger value="team" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Team</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            {totalTasks > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanGroups.map((col) => {
                  const colTasks = tasks?.filter(t => t.status === col.status) ?? [];
                  return (
                    <div key={col.status} className="min-w-[260px] flex-shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{col.title}</span>
                        <span className="text-xs text-text-muted">{colTasks.length}</span>
                      </div>
                      <div className="space-y-2">
                        {colTasks.map((task) => (
                          <div key={task.id} className="bg-card border border-border rounded-lg p-3">
                            <p className="text-sm text-foreground font-medium mb-1">{task.title}</p>
                            <div className="flex items-center justify-between text-xs text-text-muted">
                              <StatusBadge status={(task.priority as any) ?? "medium"} />
                              {task.story_points && <span className="font-mono">{task.story_points}sp</span>}
                            </div>
                          </div>
                        ))}
                        {colTasks.length === 0 && (
                          <p className="text-xs text-text-muted text-center py-4">No tasks</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No tasks yet" description="Create tasks to track work in this project." />
            )}
          </TabsContent>

          <TabsContent value="risks">
            {risks && risks.length > 0 ? (
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {risks.map((risk) => (
                  <div key={risk.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">{risk.title}</p>
                      <p className="text-xs text-text-muted">P: {risk.probability ?? "?"} · I: {risk.impact ?? "?"}</p>
                    </div>
                    <StatusBadge status={risk.severity_score === "critical" || risk.severity_score === "high" ? "high" : "medium"} label={risk.status ?? "open"} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="No risks registered" description="Add risks to track potential issues for this project." />
            )}
          </TabsContent>

          <TabsContent value="team">
            {members && members.length > 0 ? (
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {members.map((m: any) => (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {(m.profile?.display_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">{m.profile?.display_name ?? "Unknown"}</p>
                      <p className="text-xs text-text-muted">{m.role_in_project ?? "Member"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Users className="h-6 w-6" />} title="No team members" description="Add team members to this project." />
            )}
          </TabsContent>

          <TabsContent value="activity">
            {activityLogs && activityLogs.length > 0 ? (
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {activityLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground">{log.action_type}</p>
                      <p className="text-xs text-text-muted">{log.entity_type ?? ""}</p>
                    </div>
                    <span className="text-xs text-text-muted">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity yet" description="Activity will be logged as you work on this project." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
