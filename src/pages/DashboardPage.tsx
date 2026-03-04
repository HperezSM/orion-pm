import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  CalendarDays,
  Bot,
} from "lucide-react";

const tasks = [
  { title: "Finalize Q1 deliverables doc", project: "Acme Corp", due: "Today", priority: "high" as const },
  { title: "Review sprint backlog", project: "NovaTech", due: "Tomorrow", priority: "medium" as const },
  { title: "Send status update to client", project: "Globex Inc", due: "Wed", priority: "low" as const },
  { title: "Prepare kickoff deck", project: "Initech", due: "Thu", priority: "medium" as const },
];

const aiActions = [
  { action: "Drafted follow-up email for Acme Corp — awaiting your review", time: "12 min ago" },
  { action: "Flagged NovaTech project as At Risk — no updates in 6 days", time: "1 hr ago" },
  { action: "Generated daily report for Jan 15", time: "3 hrs ago" },
];

export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Dashboard" subtitle="Welcome back — here's your command center." />
      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Projects" value={8} icon={<FolderKanban className="h-4 w-4" />} accent="primary" />
          <StatCard label="Tasks Due This Week" value={14} icon={<CheckCircle2 className="h-4 w-4" />} accent="warning" />
          <StatCard label="Waiting on Client" value={5} icon={<Clock className="h-4 w-4" />} accent="purple" />
          <StatCard label="Blocked Tasks" value={2} icon={<AlertTriangle className="h-4 w-4" />} accent="destructive" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks due */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-foreground">Tasks Due This Week</h2>
              <span className="text-xs text-text-muted">4 tasks</span>
            </div>
            <div className="divide-y divide-border">
              {tasks.map((t, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-background-secondary/50 transition-colors">
                  <div>
                    <p className="text-sm text-foreground font-medium">{t.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t.project}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.priority} />
                    <span className="text-xs text-text-secondary">{t.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sprint progress + AI actions */}
          <div className="space-y-4">
            {/* Sprint */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-heading font-semibold text-foreground">Sprint Progress</h2>
              </div>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-3xl font-heading font-bold text-foreground">67%</span>
                <span className="text-xs text-text-muted mb-1">Sprint 14 · 4 days left</span>
              </div>
              <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: "67%" }} />
              </div>
            </div>

            {/* Upcoming */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-heading font-semibold text-foreground">Upcoming</h2>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Acme sync call</span>
                  <span className="text-xs text-text-muted">Today, 2:00 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Sprint review</span>
                  <span className="text-xs text-text-muted">Wed, 10:00 AM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Globex kickoff</span>
                  <span className="text-xs text-text-muted">Fri, 9:00 AM</span>
                </div>
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
            {aiActions.map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-background-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Zap className="h-3.5 w-3.5 text-purple flex-shrink-0" />
                  <p className="text-sm text-foreground">{a.action}</p>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap ml-4">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
