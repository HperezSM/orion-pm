import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Users } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Team Overview" subtitle="Admin · Monitor PM activity and workload" />
      <div className="p-6">
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Team data unavailable"
          description="Connect your database to see PM activity scores, workload distribution, and team performance metrics."
        />
      </div>
    </div>
  );
}
