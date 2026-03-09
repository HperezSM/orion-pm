import { useParams, Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  BarChart3,
  Activity,
  Zap,
  GanttChart,
  ShieldAlert,
  Plus,
} from "lucide-react";

// Mock project data
const projectData = {
  name: "Acme Corp Redesign",
  client: "Acme Corp",
  pm: "You",
  methodology: "Agile",
  health: "on-track" as const,
  startDate: "Jan 15, 2026",
  endDate: "Apr 30, 2026",
  sprintProgress: 72,
  tasksTotal: 24,
  tasksCompleted: 14,
  blockers: 1,
  risks: 2,
};

const kanbanColumns = [
  {
    title: "To Do",
    status: "todo" as const,
    tasks: [
      { id: 1, title: "Setup CI/CD pipeline", assignee: "DL", priority: "medium" as const, points: 3, due: "Mar 15" },
      { id: 2, title: "Design email templates", assignee: "MT", priority: "low" as const, points: 2, due: "Mar 18" },
    ],
  },
  {
    title: "In Progress",
    status: "in-progress" as const,
    tasks: [
      { id: 3, title: "Build dashboard components", assignee: "AR", priority: "high" as const, points: 8, due: "Mar 12" },
      { id: 4, title: "API authentication layer", assignee: "DL", priority: "high" as const, points: 5, due: "Mar 13" },
    ],
  },
  {
    title: "Waiting on Client",
    status: "waiting" as const,
    tasks: [
      { id: 5, title: "Brand asset approval", assignee: "PM", priority: "medium" as const, points: 1, due: "Mar 10" },
    ],
  },
  {
    title: "Blocked",
    status: "blocked" as const,
    tasks: [
      { id: 6, title: "Third-party API integration", assignee: "AR", priority: "high" as const, points: 5, due: "Mar 11" },
    ],
  },
  {
    title: "Done",
    status: "done" as const,
    tasks: [
      { id: 7, title: "Wireframes v2", assignee: "MT", priority: "medium" as const, points: 3, due: "Mar 5" },
      { id: 8, title: "Database schema design", assignee: "DL", priority: "high" as const, points: 5, due: "Mar 3" },
    ],
  },
];

const risks = [
  { title: "Third-party API unreliable", probability: "High", impact: "High", severity: "Critical", owner: "DL", status: "Open" },
  { title: "Client feedback delays", probability: "Medium", impact: "Medium", severity: "Medium", owner: "PM", status: "Monitoring" },
];

const activityLog = [
  { action: "Task completed", detail: "Wireframes v2 marked as done", user: "Marco T.", time: "2 hours ago" },
  { action: "Risk flagged", detail: "Third-party API unreliable added to risk register", user: "AI", time: "4 hours ago" },
  { action: "Sprint started", detail: "Sprint 14 kicked off with 24 story points", user: "You", time: "1 day ago" },
  { action: "Task created", detail: "Build dashboard components assigned to Ana R.", user: "You", time: "1 day ago" },
  { action: "Comment added", detail: "Reviewed brand guidelines doc on Brand asset approval", user: "Client", time: "2 days ago" },
];

const teamMembers = [
  { name: "You", role: "PM", tasks: 4, points: 12, avatar: "PM" },
  { name: "David L.", role: "Developer", tasks: 6, points: 18, avatar: "DL" },
  { name: "Ana R.", role: "Developer", tasks: 5, points: 16, avatar: "AR" },
  { name: "Marco T.", role: "Designer", tasks: 3, points: 8, avatar: "MT" },
];

export default function ProjectDetailPage() {
  const { id } = useParams();

  return (
    <div className="animate-fade-in">
      <TopBar title={projectData.name} subtitle={`${projectData.client} · ${projectData.methodology}`} />
      <div className="p-6">
        {/* Quick stats */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <StatusBadge status={projectData.health} />
          <span className="text-xs text-text-muted">PM: {projectData.pm}</span>
          <span className="text-xs text-text-muted">Sprint: {projectData.sprintProgress}%</span>
          <span className="text-xs text-text-muted">{projectData.tasksCompleted}/{projectData.tasksTotal} tasks</span>
          <span className="text-xs text-text-muted">{projectData.startDate} → {projectData.endDate}</span>
          {projectData.blockers > 0 && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {projectData.blockers} blocker
            </span>
          )}
        </div>

        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="bg-background-secondary border border-border">
            <TabsTrigger value="overview" className="text-xs gap-1.5"><FolderKanban className="h-3 w-3" /> Overview</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1.5"><CheckCircle2 className="h-3 w-3" /> Tasks</TabsTrigger>
            <TabsTrigger value="sprints" className="text-xs gap-1.5"><Zap className="h-3 w-3" /> Sprints</TabsTrigger>
            <TabsTrigger value="gantt" className="text-xs gap-1.5"><GanttChart className="h-3 w-3" /> Gantt</TabsTrigger>
            <TabsTrigger value="risks" className="text-xs gap-1.5"><ShieldAlert className="h-3 w-3" /> Risks</TabsTrigger>
            <TabsTrigger value="team" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Team</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" /> Reports</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Project Health</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Sprint Progress</span>
                      <span>{projectData.sprintProgress}%</span>
                    </div>
                    <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${projectData.sprintProgress}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Task Completion</span>
                      <span>{Math.round((projectData.tasksCompleted / projectData.tasksTotal) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${(projectData.tasksCompleted / projectData.tasksTotal) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Quick Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">Open Blockers</span><span className="text-foreground font-medium">{projectData.blockers}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Risks</span><span className="text-foreground font-medium">{projectData.risks}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Team Size</span><span className="text-foreground font-medium">4</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Methodology</span><span className="text-foreground font-medium">{projectData.methodology}</span></div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tasks Tab - Kanban */}
          <TabsContent value="tasks">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-text-muted">{projectData.tasksTotal} tasks · Kanban view</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 transition-opacity">
                <Plus className="h-3 w-3" /> New Task
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {kanbanColumns.map((col) => (
                <div key={col.title} className="min-w-[260px] flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusBadge status={col.status} label={col.title} />
                    <span className="text-xs text-text-muted">{col.tasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.tasks.map((task) => (
                      <div key={task.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer">
                        <p className="text-sm text-foreground font-medium mb-2">{task.title}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                              {task.assignee}
                            </div>
                            <StatusBadge status={task.priority} />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span className="font-mono">{task.points}sp</span>
                            <span>{task.due}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Sprints Tab */}
          <TabsContent value="sprints">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-heading font-semibold text-foreground">Sprint 14</h3>
                  <p className="text-xs text-text-muted">Mar 3 – Mar 17 · Goal: Complete dashboard MVP</p>
                </div>
                <StatusBadge status="in-progress" label="Active" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-foreground">24</p>
                  <p className="text-[11px] text-text-muted">Committed SP</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-success">14</p>
                  <p className="text-[11px] text-text-muted">Completed SP</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-primary">22</p>
                  <p className="text-[11px] text-text-muted">Velocity (avg)</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-warning">4</p>
                  <p className="text-[11px] text-text-muted">Days Left</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <button className="px-3 py-2 text-xs font-medium rounded-md border border-border text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors">
                  📋 Daily Standup
                </button>
                <button className="px-3 py-2 text-xs font-medium rounded-md border border-border text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors">
                  🔍 Sprint Review
                </button>
                <button className="px-3 py-2 text-xs font-medium rounded-md border border-border text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors">
                  🔄 Retrospective
                </button>
                <button className="px-3 py-2 text-xs font-medium rounded-md border border-border text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors">
                  📝 Sprint Planning
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Gantt Tab */}
          <TabsContent value="gantt">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary mb-4">Project-level Gantt timeline with task dependencies and milestones.</p>
              <div className="space-y-2">
                {["Discovery Phase", "UI Design", "Frontend Dev", "QA Testing", "Launch"].map((task, i) => {
                  const widths = [20, 25, 35, 20, 8];
                  const offsets = [0, 20, 32, 65, 85];
                  const colors = ["bg-success/60", "bg-success/60", "bg-primary/60", "bg-muted", "bg-warning"];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-32 text-xs text-text-secondary flex-shrink-0">{task}</span>
                      <div className="flex-1 relative h-6 bg-background-secondary/50 rounded">
                        {task === "Launch" ? (
                          <div className="absolute w-3 h-3 bg-warning rotate-45" style={{ left: `${offsets[i]}%`, top: "50%", transform: "translateY(-50%) rotate(45deg)" }} />
                        ) : (
                          <div className={`absolute h-4 rounded-sm top-1 ${colors[i]}`} style={{ left: `${offsets[i]}%`, width: `${widths[i]}%` }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-heading font-semibold text-foreground">Risk Register</h3>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-text-secondary hover:text-foreground transition-colors">
                  <Plus className="h-3 w-3" /> Add Risk
                </button>
              </div>
              <div className="divide-y divide-border">
                {risks.map((risk, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">{risk.title}</p>
                      <p className="text-xs text-text-muted">Owner: {risk.owner} · P: {risk.probability} · I: {risk.impact}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={risk.severity === "Critical" ? "high" : "medium"} label={risk.severity} />
                      <StatusBadge status={risk.status === "Open" ? "at-risk" : "medium"} label={risk.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-heading font-semibold text-foreground">Project Team</h3>
              </div>
              <div className="divide-y divide-border">
                {teamMembers.map((member, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="text-sm text-foreground font-medium">{member.name}</p>
                        <p className="text-xs text-text-muted">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground font-medium font-mono">{member.points} SP</p>
                      <p className="text-xs text-text-muted">{member.tasks} tasks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-heading font-semibold text-foreground mb-2">Project Reports</h3>
              <p className="text-sm text-text-secondary mb-4">Generate project-level reports with PDF export.</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
                  Generate Status Report
                </button>
                <button className="px-4 py-2 border border-border text-text-secondary text-sm font-medium rounded-md hover:text-foreground hover:bg-background-secondary transition-colors">
                  Export as PDF
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-heading font-semibold text-foreground">Activity Log</h3>
              </div>
              <div className="divide-y divide-border">
                {activityLog.map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-background-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${entry.user === "AI" ? "bg-purple" : "bg-primary"}`} />
                      <div>
                        <p className="text-sm text-foreground"><span className="font-medium">{entry.action}</span> — {entry.detail}</p>
                        <p className="text-xs text-text-muted">by {entry.user}</p>
                      </div>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap ml-4">{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
