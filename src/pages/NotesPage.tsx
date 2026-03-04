import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { PenLine, Plus } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Notes" subtitle="AI-powered note taking — think, draft, and extract action items" />
      <div className="p-6">
        <EmptyState
          icon={<PenLine className="h-6 w-6" />}
          title="Start your first note"
          description="Write freely — I'll analyze your notes and suggest projects, tasks, follow-ups, and sprint goals. Use slash commands for quick formatting."
          action={
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
              <Plus className="h-3.5 w-3.5" />
              New Note
            </button>
          }
        />
      </div>
    </div>
  );
}
