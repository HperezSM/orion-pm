import { Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { FolderKanban, Plus } from "lucide-react";

const projects = [
  { name: "Acme Corp Redesign", client: "Acme Corp", health: "on-track" as const, sprint: 72, tasks: 24, pm: "You" },
  { name: "NovaTech Platform", client: "NovaTech", health: "at-risk" as const, sprint: 45, tasks: 31, pm: "You" },
  { name: "Globex Integration", client: "Globex Inc", health: "on-track" as const, sprint: 89, tasks: 12, pm: "You" },
  { name: "Initech Onboarding", client: "Initech", health: "blocked" as const, sprint: 20, tasks: 8, pm: "You" },
  { name: "Umbrella Analytics", client: "Umbrella Co", health: "on-track" as const, sprint: 56, tasks: 18, pm: "Sarah K." },
  { name: "Wayne CRM Migration", client: "Wayne Ent.", health: "at-risk" as const, sprint: 33, tasks: 42, pm: "Sarah K." },
];

export default function ProjectsPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Projects" subtitle="All active projects across your portfolio" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-secondary">{projects.length} projects</span>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" />
            New Project
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-heading font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{p.client}</p>
                </div>
                <StatusBadge status={p.health} />
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                  <span>Sprint progress</span>
                  <span>{p.sprint}%</span>
                </div>
                <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${p.sprint}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{p.tasks} tasks</span>
                <span>PM: {p.pm}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
