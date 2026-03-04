import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Building2, Plus } from "lucide-react";

export default function ClientsPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Clients" subtitle="Manage your client portfolio" />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" />
            New Client Onboard
          </button>
        </div>
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No clients yet"
          description="Add your first client to get started. I'll help you generate onboarding artifacts like welcome emails, kickoff decks, and initial sprint templates."
        />
      </div>
    </div>
  );
}
