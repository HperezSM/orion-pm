import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, AlertTriangle, FileCheck, Users, Loader2 } from "lucide-react";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["admin-approvals-pending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_requests")
        .select("*, project:projects(name)")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["admin-approvals-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_requests")
        .select("*, project:projects(name)")
        .neq("status", "pending")
        .order("decided_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { count: pendingCount } = await supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: profileCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: atRisk } = await supabase.from("projects").select("*", { count: "exact", head: true }).in("health_score", ["at-risk", "blocked"]);
      return {
        pending: pendingCount ?? 0,
        team: profileCount ?? 0,
        atRisk: atRisk ?? 0,
      };
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("approval_requests").update({
        status,
        reviewer_id: user?.id,
        decided_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-approvals-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-approvals-recent"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Decision recorded" });
    },
  });

  return (
    <div className="animate-fade-in">
      <TopBar title="Admin Dashboard" subtitle="Admin · Approval queue and portfolio oversight" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Pending Approvals" value={stats?.pending ?? 0} icon={<FileCheck className="h-4 w-4" />} accent="warning" />
          <StatCard label="Team Members" value={stats?.team ?? 0} icon={<Users className="h-4 w-4" />} accent="primary" />
          <StatCard label="At Risk Projects" value={stats?.atRisk ?? 0} icon={<AlertTriangle className="h-4 w-4" />} accent="destructive" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Approval Queue</h2>
              <span className="ml-auto text-xs text-text-muted">{pending?.length ?? 0} pending</span>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : pending && pending.length > 0 ? (
              <div className="divide-y divide-border">
                {pending.map((item: any) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">{item.type}</p>
                      <p className="text-xs text-text-muted">{item.project?.name ?? "No project"} · {new Date(item.requested_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-success hover:bg-success/15" onClick={() => decide.mutate({ id: item.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/15" onClick={() => decide.mutate({ id: item.id, status: "rejected" })}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-text-muted">No pending approvals</div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Recent Decisions</h2>
            </div>
            {recent && recent.length > 0 ? (
              <div className="divide-y divide-border">
                {recent.map((item: any) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">{item.type}</p>
                      <p className="text-xs text-text-muted">{item.project?.name ?? "No project"} · {item.decided_at ? new Date(item.decided_at).toLocaleDateString() : ""}</p>
                    </div>
                    <StatusBadge status={item.status === "approved" ? "on-track" : "high"} label={item.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-text-muted">No decisions yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
