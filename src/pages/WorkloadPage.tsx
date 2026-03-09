import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";

const teamMembers = [
  { name: "You", role: "PM", avatar: "PM", capacity: 40, allocated: 35 },
  { name: "Sarah K.", role: "PM", avatar: "SK", capacity: 40, allocated: 42 },
  { name: "David L.", role: "PM", avatar: "DL", capacity: 40, allocated: 28 },
  { name: "Ana R.", role: "Developer", avatar: "AR", capacity: 40, allocated: 38 },
  { name: "Marco T.", role: "Designer", avatar: "MT", capacity: 32, allocated: 30 },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Mock allocation data per person per day (hours)
const allocations: Record<string, number[]> = {
  "You": [8, 7, 8, 6, 6],
  "Sarah K.": [9, 8, 9, 8, 8],
  "David L.": [6, 5, 6, 5, 6],
  "Ana R.": [8, 8, 7, 8, 7],
  "Marco T.": [6, 6, 6, 6, 6],
};

function getLoadColor(hours: number, capacity: number) {
  const daily = capacity / 5;
  if (hours > daily) return "bg-destructive/20 text-destructive border-destructive/30";
  if (hours >= daily * 0.8) return "bg-warning/20 text-warning border-warning/30";
  return "bg-success/20 text-success border-success/30";
}

function getUtilization(allocated: number, capacity: number) {
  const pct = Math.round((allocated / capacity) * 100);
  if (pct > 100) return { pct, status: "high" as const };
  if (pct >= 80) return { pct, status: "medium" as const };
  return { pct, status: "low" as const };
}

export default function WorkloadPage() {
  return (
    <div className="animate-fade-in">
      <TopBar title="Workload" subtitle="Team capacity and assignment overview" />
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[200px_80px_repeat(5,1fr)] border-b border-border">
            <div className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Team Member</div>
            <div className="px-2 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">Load</div>
            {days.map(d => (
              <div key={d} className="px-2 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">{d}</div>
            ))}
          </div>

          {/* Rows */}
          {teamMembers.map((member) => {
            const util = getUtilization(member.allocated, member.capacity);
            return (
              <div key={member.name} className="grid grid-cols-[200px_80px_repeat(5,1fr)] border-b border-border last:border-b-0 hover:bg-background-secondary/30 transition-colors">
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                    {member.avatar}
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">{member.name}</p>
                    <p className="text-[11px] text-text-muted">{member.role}</p>
                  </div>
                </div>
                <div className="px-2 py-3 flex items-center justify-center">
                  <StatusBadge status={util.status} label={`${util.pct}%`} />
                </div>
                {allocations[member.name]?.map((hours, i) => (
                  <div key={i} className="px-2 py-3 flex items-center justify-center">
                    <div className={`px-2.5 py-1 rounded border text-xs font-mono font-medium ${getLoadColor(hours, member.capacity)}`}>
                      {hours}h
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-text-muted mt-4">
          Click any cell to see specific tasks assigned. Drag tasks between members to rebalance workload.
        </p>
      </div>
    </div>
  );
}
