import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ShieldCheck, Users, AlertTriangle, TrendingUp, FolderKanban } from "lucide-react";

const pmScores = [
  { name: "You", projects: 4, score: 92, risk: 1 },
  { name: "Sarah K.", projects: 3, score: 78, risk: 2 },
  { name: "David L.", projects: 2, score: 85, risk: 0 },
];

const stagnant = [
  { project: "NovaTech Platform", days: 6, pm: "You" },
  { project: "Wayne CRM Migration", days: 8, pm: "Sarah K." },
];

export default function ExecutivePage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Executive View" subtitle="Admin · Portfolio health and PM performance" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total PMs" value={3} icon={<Users className="h-4 w-4" />} accent="primary" />
          <StatCard label="Active Projects" value={9} icon={<FolderKanban className="h-4 w-4" />} accent="success" />
          <StatCard label="At Risk" value={3} icon={<AlertTriangle className="h-4 w-4" />} accent="warning" />
          <StatCard label="Avg. Score" value="85%" icon={<TrendingUp className="h-4 w-4" />} accent="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PM scores */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-heading font-semibold text-foreground">PM Activity Scores</h2>
            </div>
            <div className="divide-y divide-border">
              {pmScores.map((pm, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{pm.name}</p>
                    <p className="text-xs text-text-muted">{pm.projects} projects · {pm.risk} at risk</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-heading font-bold text-foreground">{pm.score}</span>
                    <span className="text-xs text-text-muted">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stagnant */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Stagnant Projects</h2>
            </div>
            <div className="divide-y divide-border">
              {stagnant.map((s, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{s.project}</p>
                    <p className="text-xs text-text-muted">PM: {s.pm}</p>
                  </div>
                  <StatusBadge status="high" label={`${s.days} days stale`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
