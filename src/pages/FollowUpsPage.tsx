import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Clock } from "lucide-react";

export default function FollowUpsPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Follow-Ups" subtitle="Track responses and automate reminders" />
      <div className="p-6">
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title="No follow-ups yet"
          description="When you mark email threads as 'Waiting on Client' or create follow-up reminders, they'll appear here. I'll draft follow-up emails when responses are overdue."
        />
      </div>
    </div>
  );
}
