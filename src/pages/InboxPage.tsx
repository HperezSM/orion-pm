import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Mail } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Inbox" subtitle="Gmail threads with AI-powered extraction" />
      <div className="p-6">
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="Connect your Gmail"
          description="Link your Google account to start syncing email threads. I'll analyze them and extract action items, deadlines, and risks automatically."
          action={
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
              Connect Gmail
            </button>
          }
        />
      </div>
    </div>
  );
}
