import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { FeatureGate } from "@/components/FeatureGate";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Users, AlertTriangle, TrendingUp, FolderKanban, Loader2 } from "lucide-react";

function ExecutiveContent() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["executive-stats"],
    queryFn: async () => {
      const { count: projectCount } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active");
      const { count: atRiskCount } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("health_score", "at-risk");
      const { count: blockedCount } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("health_score", "blocked");
      const { data: profiles } = await supabase.from("profiles").select("user_id");

      return {
        totalProjects: projectCount ?? 0,
        atRisk: (atRiskCount ?? 0) + (blockedCount ?? 0),
        teamSize: profiles?.length ?? 0,
      };
    },
  });

  const { data: stagnantProjects } = useQuery({
    queryKey: ["executive-stagnant"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from("projects")
        .select("id, name, last_updated")
        .eq("status", "active")
        .lt("last_updated", sevenDaysAgo.toISOString())
        .order("last_updated", { ascending: true })
        .limit(10);
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <TopBar title="Executive View" subtitle="Admin · Portfolio health" />
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <TopBar title="Executive View" subtitle="Admin · Portfolio health and oversight" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Team Members" value={stats?.teamSize ?? 0} icon={<Users className="h-4 w-4" />} accent="primary" />
          <StatCard label="Active Projects" value={stats?.totalProjects ?? 0} icon={<FolderKanban className="h-4 w-4" />} accent="success" />
          <StatCard label="At Risk" value={stats?.atRisk ?? 0} icon={<AlertTriangle className="h-4 w-4" />} accent="warning" />
          <StatCard label="Stagnant" value={stagnantProjects?.length ?? 0} icon={<TrendingUp className="h-4 w-4" />} accent="destructive" />
        </div>

        {stagnantProjects && stagnantProjects.length > 0 ? (
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Stagnant Projects (7+ days without updates)</h2>
            </div>
            <div className="divide-y divide-border">
              {stagnantProjects.map((p) => {
                const daysStale = Math.ceil((Date.now() - new Date(p.last_updated ?? "").getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-foreground font-medium">{p.name}</span>
                    <span className="text-xs text-destructive font-medium">{daysStale} days stale</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-text-muted">All projects are actively maintained. No stagnant projects detected.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExecutivePage() {
  return (
    <FeatureGate feature="executiveView" featureLabel="Executive View">
      <ExecutiveContent />
    </FeatureGate>
  );
}
