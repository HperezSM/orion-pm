import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Calendar } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Calendar" subtitle="Google Calendar events linked to your projects" />
      <div className="p-6">
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="Connect Google Calendar"
          description="Link your Google Calendar to see meetings alongside your projects. I'll help you create events from tasks and link existing meetings to projects."
          action={
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
              Connect Calendar
            </button>
          }
        />
      </div>
    </div>
  );
}
