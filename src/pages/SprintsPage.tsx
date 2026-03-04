import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Zap } from "lucide-react";

export default function SprintsPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Sprints" subtitle="Sprint boards and velocity tracking" />
      <div className="p-6">
        <EmptyState
          icon={<Zap className="h-6 w-6" />}
          title="No active sprints"
          description="Create your first sprint from a project to start tracking task velocity and progress. Sprints default to 2-week cycles."
        />
      </div>
    </div>
  );
}
