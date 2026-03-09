import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, CheckCircle2, MessageSquare, Target, Plus, Send, Loader2 } from "lucide-react";

export default function SprintsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [standupData, setStandupData] = useState({ yesterday: "", today: "", blockers: "" });
  const [retroData, setRetroData] = useState({ content: "", category: "went-well" });
  const [submitting, setSubmitting] = useState(false);

  const { data: activeSprint, isLoading } = useQuery({
    queryKey: ["active-sprint"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sprints")
        .select("*")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: standups } = useQuery({
    queryKey: ["standups", activeSprint?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("standup_entries")
        .select("*, profile:profiles!standup_entries_user_id_fkey(display_name)")
        .eq("sprint_id", activeSprint!.id)
        .eq("date", new Date().toISOString().split("T")[0])
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!activeSprint,
  });

  const { data: retroItems } = useQuery({
    queryKey: ["retro-items", activeSprint?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("retro_items")
        .select("*, profile:profiles!retro_items_user_id_fkey(display_name)")
        .eq("sprint_id", activeSprint!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!activeSprint,
  });

  const { data: sprintTasks } = useQuery({
    queryKey: ["sprint-tasks", activeSprint?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, story_points, priority")
        .eq("sprint_id", activeSprint!.id);
      return data ?? [];
    },
    enabled: !!activeSprint,
  });

  const handleStandupSubmit = async () => {
    if (!user || !activeSprint || !standupData.yesterday || !standupData.today) {
      toast({ title: "Missing fields", description: "Please fill in yesterday and today.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("standup_entries").insert({
        sprint_id: activeSprint.id,
        user_id: user.id,
        done_yesterday: standupData.yesterday,
        doing_today: standupData.today,
        blockers: standupData.blockers || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["standups"] });
      toast({ title: "Standup submitted" });
      setStandupData({ yesterday: "", today: "", blockers: "" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetroSubmit = async () => {
    if (!user || !activeSprint || !retroData.content) {
      toast({ title: "Missing content", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("retro_items").insert({
        sprint_id: activeSprint.id,
        user_id: user.id,
        category: retroData.category,
        content: retroData.content,
        anonymous: false,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["retro-items"] });
      toast({ title: "Feedback added" });
      setRetroData({ content: "", category: "went-well" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <TopBar title="Sprint Ceremonies" subtitle="Loading..." />
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!activeSprint) {
    return (
      <div className="animate-fade-in">
        <TopBar title="Sprint Ceremonies" subtitle="No active sprint" />
        <div className="p-6">
          <EmptyState
            icon={<Zap className="h-6 w-6" />}
            title="No active sprint"
            description="Create a sprint from a project's sprint board to get started with ceremonies, standups, and retrospectives."
          />
        </div>
      </div>
    );
  }

  const completedSP = sprintTasks?.filter(t => t.status === "done").reduce((sum, t) => sum + (t.story_points ?? 0), 0) ?? 0;
  const committedSP = sprintTasks?.reduce((sum, t) => sum + (t.story_points ?? 0), 0) ?? 0;
  const doneCount = sprintTasks?.filter(t => t.status === "done").length ?? 0;
  const carryOver = sprintTasks?.filter(t => t.status !== "done").length ?? 0;

  return (
    <div className="animate-fade-in">
      <TopBar title="Sprint Ceremonies" subtitle={`${activeSprint.name} · ${activeSprint.start_date ?? "?"} → ${activeSprint.end_date ?? "?"}`} />
      <div className="p-6">
        <Tabs defaultValue="standup" className="space-y-4">
          <TabsList className="bg-background-secondary border border-border">
            <TabsTrigger value="standup" className="text-xs gap-1.5"><Zap className="h-3 w-3" /> Daily Standup</TabsTrigger>
            <TabsTrigger value="review" className="text-xs gap-1.5"><CheckCircle2 className="h-3 w-3" /> Sprint Review</TabsTrigger>
            <TabsTrigger value="retro" className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" /> Retrospective</TabsTrigger>
            <TabsTrigger value="planning" className="text-xs gap-1.5"><Target className="h-3 w-3" /> Planning</TabsTrigger>
          </TabsList>

          <TabsContent value="standup">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Submit Daily Update</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-text-muted">What did you accomplish yesterday?</Label>
                    <Textarea value={standupData.yesterday} onChange={(e) => setStandupData({ ...standupData, yesterday: e.target.value })} className="mt-1 text-sm" rows={3} />
                  </div>
                  <div>
                    <Label className="text-xs text-text-muted">What are you working on today?</Label>
                    <Textarea value={standupData.today} onChange={(e) => setStandupData({ ...standupData, today: e.target.value })} className="mt-1 text-sm" rows={3} />
                  </div>
                  <div>
                    <Label className="text-xs text-text-muted">Any blockers? (optional)</Label>
                    <Textarea value={standupData.blockers} onChange={(e) => setStandupData({ ...standupData, blockers: e.target.value })} className="mt-1 text-sm" rows={2} />
                  </div>
                  <Button onClick={handleStandupSubmit} disabled={submitting} className="w-full">
                    <Send className="h-3 w-3 mr-2" /> {submitting ? "Submitting..." : "Submit Standup"}
                  </Button>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Team Standups (Today)</h3>
                {standups && standups.length > 0 ? (
                  <div className="space-y-3">
                    {standups.map((s: any) => (
                      <div key={s.id} className="border-l-2 border-primary pl-3 py-2">
                        <p className="text-xs font-medium text-foreground">{s.profile?.display_name ?? "Team member"}</p>
                        <p className="text-xs text-text-muted mt-1">📋 Today: {s.doing_today}</p>
                        <p className="text-xs text-text-muted">✅ Yesterday: {s.done_yesterday}</p>
                        {s.blockers && <p className="text-xs text-destructive">🚫 Blocker: {s.blockers}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted py-4 text-center">No standups submitted today</p>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="review">
            <Card className="p-4">
              <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Sprint Review</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-foreground">{committedSP}</p>
                  <p className="text-[11px] text-text-muted">Committed SP</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-success">{completedSP}</p>
                  <p className="text-[11px] text-text-muted">Completed SP</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-foreground">{doneCount}</p>
                  <p className="text-[11px] text-text-muted">Tasks Done</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-warning">{carryOver}</p>
                  <p className="text-[11px] text-text-muted">Carry Over</p>
                </div>
              </div>
              {sprintTasks?.filter(t => t.status === "done").length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">No completed tasks to review yet</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="retro">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Add Feedback</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-text-muted">Category</Label>
                    <Select value={retroData.category} onValueChange={(val) => setRetroData({ ...retroData, category: val })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="went-well">✅ Went Well</SelectItem>
                        <SelectItem value="to-improve">🔄 To Improve</SelectItem>
                        <SelectItem value="action-item">⚡ Action Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-text-muted">Your Feedback</Label>
                    <Textarea value={retroData.content} onChange={(e) => setRetroData({ ...retroData, content: e.target.value })} className="mt-1 text-sm" rows={4} />
                  </div>
                  <Button onClick={handleRetroSubmit} disabled={submitting} className="w-full">
                    <Plus className="h-3 w-3 mr-2" /> {submitting ? "Adding..." : "Add Feedback"}
                  </Button>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Team Feedback</h3>
                {retroItems && retroItems.length > 0 ? (
                  <div className="space-y-3">
                    {retroItems.map((item: any) => {
                      const borderColor = item.category === "went-well" ? "border-success" : item.category === "to-improve" ? "border-warning" : "border-primary";
                      const label = item.category === "went-well" ? "✅ Went Well" : item.category === "to-improve" ? "🔄 To Improve" : "⚡ Action Item";
                      return (
                        <div key={item.id} className={`border-l-2 ${borderColor} pl-3 py-2`}>
                          <p className="text-xs font-medium text-text-muted">{label}</p>
                          <p className="text-xs text-foreground mt-1">{item.content}</p>
                          <p className="text-xs text-text-muted">— {item.profile?.display_name ?? "Anonymous"}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted py-4 text-center">No feedback submitted yet</p>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="planning">
            <Card className="p-4">
              <h3 className="text-sm font-heading font-semibold text-foreground mb-2">Sprint Planning</h3>
              <p className="text-xs text-text-muted mb-4">Commit tasks and set team capacity for the upcoming sprint</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-foreground">{activeSprint.capacity_points ?? 0}</p>
                  <p className="text-[11px] text-text-muted">Team Capacity (SP)</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-primary">{committedSP}</p>
                  <p className="text-[11px] text-text-muted">Committed (SP)</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-success">{Math.max(0, (activeSprint.capacity_points ?? 0) - committedSP)}</p>
                  <p className="text-[11px] text-text-muted">Available (SP)</p>
                </div>
              </div>
              {sprintTasks?.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">No tasks assigned to this sprint yet. Add tasks from the project board.</p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
