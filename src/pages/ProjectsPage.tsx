import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FolderKanban, Plus, Loader2 } from "lucide-react";

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [methodology, setMethodology] = useState("agile");
  const [clientId, setClientId] = useState<string>("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, name, description, status, health_score, methodology,
          client:clients(id, name),
          pm_id, created_at
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-dropdown"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data ?? [];
    },
  });

  // Get task counts and sprint progress per project
  const { data: projectStats } = useQuery({
    queryKey: ["project-stats"],
    queryFn: async () => {
      if (!projects) return {};
      const stats: Record<string, { tasks: number; sprintProgress: number }> = {};
      for (const p of projects) {
        const { count: taskCount } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("project_id", p.id);
        
        const { data: activeSprint } = await supabase
          .from("sprints")
          .select("capacity_points, velocity_actual")
          .eq("project_id", p.id)
          .eq("status", "active")
          .maybeSingle();
        
        const progress = activeSprint?.capacity_points
          ? Math.round(((activeSprint.velocity_actual ?? 0) / activeSprint.capacity_points) * 100)
          : 0;
        
        stats[p.id] = { tasks: taskCount ?? 0, sprintProgress: progress };
      }
      return stats;
    },
    enabled: !!projects,
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").insert({
        name,
        description,
        methodology,
        client_id: clientId || null,
        pm_id: user?.id,
        status: "active",
        health_score: "on-track",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project created!" });
      setOpen(false);
      setName("");
      setDescription("");
      setMethodology("agile");
      setClientId("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getHealthStatus = (health: string | null) => {
    switch (health) {
      case "on-track": return "on-track" as const;
      case "at-risk": return "at-risk" as const;
      case "blocked": return "blocked" as const;
      default: return "on-track" as const;
    }
  };

  return (
    <div className="animate-fade-in">
      <TopBar title="Projects" subtitle="All active projects across your portfolio" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-secondary">{projects?.length ?? 0} projects</span>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createProject.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-foreground">Project Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corp Redesign"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Client</label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Methodology</label>
                  <Select value={methodology} onValueChange={setMethodology}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agile">Agile</SelectItem>
                      <SelectItem value="waterfall">Waterfall</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createProject.isPending}>
                  {createProject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Project
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => {
              const stats = projectStats?.[p.id];
              return (
                <Link
                  to={`/projects/${p.id}`}
                  key={p.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer group block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {(p.client as { name: string } | null)?.name ?? "No client"}
                      </p>
                    </div>
                    <StatusBadge status={getHealthStatus(p.health_score)} />
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Sprint progress</span>
                      <span>{stats?.sprintProgress ?? 0}%</span>
                    </div>
                    <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${stats?.sprintProgress ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{stats?.tasks ?? 0} tasks</span>
                    <span className="capitalize">{p.methodology}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderKanban className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <p className="text-sm text-text-secondary">No projects yet. Create your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
