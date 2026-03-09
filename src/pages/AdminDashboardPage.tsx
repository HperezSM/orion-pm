import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CheckCircle2, Clock, AlertTriangle, FileCheck, Users } from "lucide-react";

const approvalQueue = [
  { type: "Sprint Completion", project: "Acme Corp Redesign", requestedBy: "You", date: "Mar 7", status: "pending" },
  { type: "Timeline Extension", project: "NovaTech Platform", requestedBy: "You", date: "Mar 6", status: "pending" },
  { type: "Scope Change", project: "Wayne CRM Migration", requestedBy: "Sarah K.", date: "Mar 5", status: "pending" },
];

const recentDecisions = [
  { type: "Sprint Completion", project: "Globex Integration", decision: "Approved", reviewer: "Admin", date: "Mar 4" },
  { type: "Risk Escalation", project: "Initech Onboarding", decision: "Acknowledged", reviewer: "Admin", date: "Mar 3" },
];

export default function AdminDashboardPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Admin Dashboard" subtitle="Admin · Approval queue and portfolio oversight" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Approvals" value={3} icon={<FileCheck className="h-4 w-4" />} accent="warning" />
          <StatCard label="Active PMs" value={3} icon={<Users className="h-4 w-4" />} accent="primary" />
          <StatCard label="At Risk Projects" value={2} icon={<AlertTriangle className="h-4 w-4" />} accent="destructive" />
          <StatCard label="Avg Response Time" value="1.2d" icon={<Clock className="h-4 w-4" />} accent="success" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Approval Queue */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Approval Queue</h2>
              <span className="ml-auto text-xs text-text-muted">{approvalQueue.length} pending</span>
            </div>
            <div className="divide-y divide-border">
              {approvalQueue.map((item, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{item.type}</p>
                    <p className="text-xs text-text-muted">{item.project} · by {item.requestedBy} · {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2.5 py-1 text-xs font-medium rounded-md bg-success/15 text-success hover:bg-success/25 transition-colors">
                      Approve
                    </button>
                    <button className="px-2.5 py-1 text-xs font-medium rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Decisions */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Recent Decisions</h2>
            </div>
            <div className="divide-y divide-border">
              {recentDecisions.map((item, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{item.type}</p>
                    <p className="text-xs text-text-muted">{item.project} · {item.date}</p>
                  </div>
                  <StatusBadge status={item.decision === "Approved" ? "on-track" : "medium"} label={item.decision} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
