import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Loader2, AlertTriangle, Mail } from "lucide-react";

export default function FollowUpsPage() {
  const { data: followUps, isLoading } = useQuery({
    queryKey: ["follow-ups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_ups")
        .select(`
          id, status, days_waiting, escalated, escalation_level, last_action, next_action_date, created_at,
          project:projects(id, name),
          task:tasks(id, title),
          thread:email_threads(id, subject, from_email)
        `)
        .order("days_waiting", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getDaysColor = (days: number | null) => {
    if (!days) return "text-text-muted";
    if (days >= 7) return "text-destructive";
    if (days >= 3) return "text-warning";
    return "text-green";
  };

  const getEscalationBadge = (level: number | null, escalated: boolean | null) => {
    if (!escalated) return null;
    if (level === 3) return <StatusBadge status="blocked" />;
    if (level === 2) return <StatusBadge status="at-risk" />;
    return <StatusBadge status="medium" />;
  };

  return (
    <div className="animate-fade-in">
      <TopBar title="Follow-Ups" subtitle="Track responses and automate reminders" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-4 w-4 text-text-muted" />
          <span className="text-sm text-text-secondary">{followUps?.length ?? 0} follow-ups</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : followUps && followUps.length > 0 ? (
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {followUps.map((f) => (
              <div key={f.id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {(f.thread as { subject: string } | null)?.subject ? (
                        <>
                          <Mail className="h-3.5 w-3.5 text-text-muted" />
                          <span className="text-sm font-medium text-foreground">
                            {(f.thread as { subject: string }).subject}
                          </span>
                        </>
                      ) : (f.task as { title: string } | null)?.title ? (
                        <span className="text-sm font-medium text-foreground">
                          {(f.task as { title: string }).title}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-foreground">Follow-up</span>
                      )}
                      {getEscalationBadge(f.escalation_level, f.escalated)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      {(f.thread as { from_email: string } | null)?.from_email && (
                        <span>From: {(f.thread as { from_email: string }).from_email}</span>
                      )}
                      {(f.project as { name: string } | null)?.name && (
                        <span>• {(f.project as { name: string }).name}</span>
                      )}
                      {f.last_action && <span>• Last: {f.last_action}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className={`text-lg font-heading font-bold ${getDaysColor(f.days_waiting)}`}>
                        {f.days_waiting ?? 0}
                      </div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide">days</div>
                    </div>
                    {f.escalated && (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                </div>
                {f.next_action_date && (
                  <div className="mt-2 text-xs text-text-secondary">
                    Next action: {new Date(f.next_action_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Clock className="h-6 w-6" />}
            title="No follow-ups yet"
            description="When you mark email threads as 'Waiting on Client' or create follow-up reminders, they'll appear here. I'll draft follow-up emails when responses are overdue."
          />
        )}
      </div>
    </div>
  );
}
