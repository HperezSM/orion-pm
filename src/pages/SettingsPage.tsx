import { TopBar } from "@/components/TopBar";

export default function SettingsPage() {
  const sections = [
    {
      title: "Integrations",
      items: [
        { label: "Gmail", desc: "Sync email threads for AI analysis", connected: false },
        { label: "Google Calendar", desc: "Link meetings to projects", connected: false },
        { label: "Slack", desc: "Send reminders and notifications", connected: false },
      ],
    },
    {
      title: "Profile",
      items: [
        { label: "Display Name", desc: "Project Manager" },
        { label: "Email", desc: "pm@company.com" },
        { label: "Role", desc: "PM" },
      ],
    },
    {
      title: "Notifications",
      items: [
        { label: "Email Reports", desc: "Daily and weekly reports via email", toggle: true },
        { label: "AI Action Alerts", desc: "Get notified when AI drafts actions", toggle: true },
        { label: "Escalation Alerts", desc: "Alerts for stagnant or at-risk projects", toggle: true },
      ],
    },
  ];

  return (
    <div className="animate-fade-in">
      <TopBar title="Settings" subtitle="Manage integrations, profile, and preferences" />
      <div className="p-6 max-w-2xl space-y-8">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-sm font-heading font-semibold text-foreground mb-3">{s.title}</h2>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {s.items.map((item, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{item.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                  </div>
                  {"connected" in item && (
                    <button className="px-3 py-1 text-xs font-medium rounded-md border border-border text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors">
                      Connect
                    </button>
                  )}
                  {"toggle" in item && (
                    <div className="h-5 w-9 bg-primary rounded-full relative cursor-pointer">
                      <div className="h-4 w-4 bg-primary-foreground rounded-full absolute top-0.5 right-0.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
