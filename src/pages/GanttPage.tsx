import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";

const projects = [
  {
    name: "Acme Corp Redesign",
    client: "Acme Corp",
    status: "on-track" as const,
    tasks: [
      { name: "Discovery Phase", start: 0, duration: 3, status: "done" as const },
      { name: "UI Design", start: 3, duration: 4, status: "done" as const },
      { name: "Frontend Dev", start: 5, duration: 6, status: "in-progress" as const },
      { name: "QA Testing", start: 10, duration: 3, status: "todo" as const },
      { name: "Launch", start: 13, duration: 1, status: "todo" as const, milestone: true },
    ],
  },
  {
    name: "NovaTech Platform",
    client: "NovaTech",
    status: "at-risk" as const,
    tasks: [
      { name: "Architecture", start: 1, duration: 4, status: "done" as const },
      { name: "Backend API", start: 4, duration: 5, status: "in-progress" as const },
      { name: "Integration", start: 8, duration: 4, status: "todo" as const },
      { name: "UAT", start: 11, duration: 3, status: "todo" as const },
    ],
  },
  {
    name: "Globex Integration",
    client: "Globex Inc",
    status: "on-track" as const,
    tasks: [
      { name: "Requirements", start: 0, duration: 2, status: "done" as const },
      { name: "API Integration", start: 2, duration: 5, status: "in-progress" as const },
      { name: "Testing", start: 7, duration: 3, status: "todo" as const },
      { name: "Go-Live", start: 10, duration: 1, status: "todo" as const, milestone: true },
    ],
  },
];

const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12", "W13", "W14"];
const totalCols = 14;

const barColors = {
  done: "bg-success/60",
  "in-progress": "bg-primary/60",
  todo: "bg-muted",
};

export default function GanttPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Gantt — Cross-Project" subtitle="Global timeline view across all projects" />
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          {/* Week headers */}
          <div className="flex border-b border-border min-w-[900px]">
            <div className="w-56 flex-shrink-0 px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">Task</div>
            <div className="flex-1 flex">
              {weeks.map(w => (
                <div key={w} className="flex-1 px-1 py-2 text-[10px] text-text-muted text-center border-l border-border/50">{w}</div>
              ))}
            </div>
          </div>

          {projects.map((project) => (
            <div key={project.name}>
              {/* Project header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-background-secondary/50 border-b border-border min-w-[900px]">
                <span className="text-sm font-heading font-semibold text-foreground">{project.name}</span>
                <span className="text-xs text-text-muted">· {project.client}</span>
                <StatusBadge status={project.status} />
              </div>

              {/* Tasks */}
              {project.tasks.map((task, i) => (
                <div key={i} className="flex border-b border-border/50 min-w-[900px] hover:bg-background-secondary/20 transition-colors">
                  <div className="w-56 flex-shrink-0 px-4 py-2 flex items-center gap-2">
                    <span className="text-xs text-text-secondary">{task.name}</span>
                  </div>
                  <div className="flex-1 relative flex items-center" style={{ minHeight: 32 }}>
                    {/* Grid lines */}
                    {weeks.map((_, idx) => (
                      <div key={idx} className="absolute top-0 bottom-0 border-l border-border/20" style={{ left: `${(idx / totalCols) * 100}%` }} />
                    ))}
                    {/* Bar */}
                    {task.milestone ? (
                      <div
                        className="absolute w-3 h-3 bg-warning rotate-45"
                        style={{ left: `${(task.start / totalCols) * 100}%`, top: "50%", transform: "translateY(-50%) rotate(45deg)" }}
                      />
                    ) : (
                      <div
                        className={`absolute h-5 rounded-sm ${barColors[task.status]}`}
                        style={{
                          left: `${(task.start / totalCols) * 100}%`,
                          width: `${(task.duration / totalCols) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-2.5 w-6 rounded-sm bg-success/60" /> Done
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-2.5 w-6 rounded-sm bg-primary/60" /> In Progress
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-2.5 w-6 rounded-sm bg-muted" /> Planned
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-2.5 w-2.5 bg-warning rotate-45" /> Milestone
          </div>
        </div>
      </div>
    </div>
  );
}
