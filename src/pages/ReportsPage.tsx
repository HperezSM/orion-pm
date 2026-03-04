import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Reports" subtitle="Auto-generated daily and weekly reports" />
      <div className="p-6">
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No reports generated yet"
          description="Reports are auto-generated daily at 6 PM and weekly on Fridays at 4 PM. You can also trigger a report manually at any time."
          action={
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
              Generate Report Now
            </button>
          }
        />
      </div>
    </div>
  );
}
