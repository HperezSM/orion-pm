import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, CheckCircle2, MessageSquare, Target, Plus, Send } from "lucide-react";

export default function SprintsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [standupData, setStandupData] = useState({ yesterday: "", today: "", blockers: "" });
  const [retroData, setRetroData] = useState({ content: "", category: "went-well" });
  const [submitting, setSubmitting] = useState(false);

  // Mock sprint data - replace with real query
  const activeSprint = {
    id: "mock-sprint-id",
    name: "Sprint 14",
    project_id: "mock-project-id",
    start_date: "2026-03-03",
    end_date: "2026-03-17",
    goal: "Complete dashboard MVP",
    capacity_points: 24,
    velocity_actual: 14,
  };

  const handleStandupSubmit = async () => {
    if (!user || !standupData.yesterday || !standupData.today) {
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
      toast({ title: "Standup submitted", description: "Your daily update has been recorded." });
      setStandupData({ yesterday: "", today: "", blockers: "" });
    } catch (err: any) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetroSubmit = async () => {
    if (!user || !retroData.content) {
      toast({ title: "Missing content", description: "Please enter your feedback.", variant: "destructive" });
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
      toast({ title: "Feedback added", description: "Your retrospective item has been submitted." });
      setRetroData({ content: "", category: "went-well" });
    } catch (err: any) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <TopBar title="Sprint Ceremonies" subtitle={`${activeSprint.name} · ${activeSprint.start_date} → ${activeSprint.end_date}`} />
      <div className="p-6">
        <Tabs defaultValue="standup" className="space-y-4">
          <TabsList className="bg-background-secondary border border-border">
            <TabsTrigger value="standup" className="text-xs gap-1.5">
              <Zap className="h-3 w-3" /> Daily Standup
            </TabsTrigger>
            <TabsTrigger value="review" className="text-xs gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> Sprint Review
            </TabsTrigger>
            <TabsTrigger value="retro" className="text-xs gap-1.5">
              <MessageSquare className="h-3 w-3" /> Retrospective
            </TabsTrigger>
            <TabsTrigger value="planning" className="text-xs gap-1.5">
              <Target className="h-3 w-3" /> Planning
            </TabsTrigger>
          </TabsList>

          {/* Daily Standup */}
          <TabsContent value="standup">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Submit Daily Update</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="yesterday" className="text-xs text-text-muted">What did you accomplish yesterday?</Label>
                    <Textarea
                      id="yesterday"
                      value={standupData.yesterday}
                      onChange={(e) => setStandupData({ ...standupData, yesterday: e.target.value })}
                      placeholder="e.g., Completed API integration, reviewed 3 PRs..."
                      className="mt-1 text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="today" className="text-xs text-text-muted">What are you working on today?</Label>
                    <Textarea
                      id="today"
                      value={standupData.today}
                      onChange={(e) => setStandupData({ ...standupData, today: e.target.value })}
                      placeholder="e.g., Build dashboard components, unit tests..."
                      className="mt-1 text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="blockers" className="text-xs text-text-muted">Any blockers? (optional)</Label>
                    <Textarea
                      id="blockers"
                      value={standupData.blockers}
                      onChange={(e) => setStandupData({ ...standupData, blockers: e.target.value })}
                      placeholder="e.g., Waiting on design assets, API rate limit..."
                      className="mt-1 text-sm"
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleStandupSubmit} disabled={submitting} className="w-full">
                    <Send className="h-3 w-3 mr-2" /> {submitting ? "Submitting..." : "Submit Standup"}
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Team Standups (Today)</h3>
                <p className="text-xs text-text-muted mb-4">Recent async updates from the team</p>
                <div className="space-y-3">
                  <div className="border-l-2 border-primary pl-3 py-2">
                    <p className="text-xs font-medium text-foreground">You</p>
                    <p className="text-xs text-text-muted mt-1">📋 Today: Build dashboard components</p>
                    <p className="text-xs text-text-muted">✅ Yesterday: Completed API integration</p>
                  </div>
                  <div className="border-l-2 border-border pl-3 py-2">
                    <p className="text-xs font-medium text-foreground">David L.</p>
                    <p className="text-xs text-text-muted mt-1">📋 Today: Database optimization</p>
                    <p className="text-xs text-text-muted">✅ Yesterday: Fixed performance issues</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Sprint Review */}
          <TabsContent value="review">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-heading font-semibold text-foreground">Sprint Review</h3>
                  <p className="text-xs text-text-muted">Demonstrate completed work and gather stakeholder feedback</p>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-3 w-3 mr-1" /> Add Demo Item
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-foreground">{activeSprint.capacity_points}</p>
                  <p className="text-[11px] text-text-muted">Committed SP</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-success">{activeSprint.velocity_actual}</p>
                  <p className="text-[11px] text-text-muted">Completed SP</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-foreground">10</p>
                  <p className="text-[11px] text-text-muted">Tasks Done</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-warning">4</p>
                  <p className="text-[11px] text-text-muted">Carry Over</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">Dashboard MVP - Core Features</p>
                      <p className="text-xs text-text-muted">8 SP · Demo: Mar 17, 2:00 PM</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">API Authentication Layer</p>
                      <p className="text-xs text-text-muted">5 SP · Demo: Mar 17, 2:15 PM</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Retrospective */}
          <TabsContent value="retro">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Add Feedback</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="category" className="text-xs text-text-muted">Category</Label>
                    <Select value={retroData.category} onValueChange={(val) => setRetroData({ ...retroData, category: val })}>
                      <SelectTrigger id="category" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="went-well">✅ Went Well</SelectItem>
                        <SelectItem value="to-improve">🔄 To Improve</SelectItem>
                        <SelectItem value="action-item">⚡ Action Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="content" className="text-xs text-text-muted">Your Feedback</Label>
                    <Textarea
                      id="content"
                      value={retroData.content}
                      onChange={(e) => setRetroData({ ...retroData, content: e.target.value })}
                      placeholder="Share your thoughts on the sprint..."
                      className="mt-1 text-sm"
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleRetroSubmit} disabled={submitting} className="w-full">
                    <Plus className="h-3 w-3 mr-2" /> {submitting ? "Adding..." : "Add Feedback"}
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Team Feedback</h3>
                <div className="space-y-3">
                  <div className="border-l-2 border-success pl-3 py-2">
                    <p className="text-xs text-success font-medium">✅ Went Well</p>
                    <p className="text-xs text-foreground mt-1">Great collaboration on the dashboard feature</p>
                    <p className="text-xs text-text-muted">— Ana R.</p>
                  </div>
                  <div className="border-l-2 border-warning pl-3 py-2">
                    <p className="text-xs text-warning font-medium">🔄 To Improve</p>
                    <p className="text-xs text-foreground mt-1">Daily standups need better attendance</p>
                    <p className="text-xs text-text-muted">— Marco T.</p>
                  </div>
                  <div className="border-l-2 border-primary pl-3 py-2">
                    <p className="text-xs text-primary font-medium">⚡ Action Item</p>
                    <p className="text-xs text-foreground mt-1">Schedule async standup time slots</p>
                    <p className="text-xs text-text-muted">— David L.</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Sprint Planning */}
          <TabsContent value="planning">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-heading font-semibold text-foreground">Sprint Planning</h3>
                  <p className="text-xs text-text-muted">Commit tasks and set team capacity for the upcoming sprint</p>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-3 w-3 mr-1" /> Add Task to Sprint
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-foreground">24</p>
                  <p className="text-[11px] text-text-muted">Team Capacity (SP)</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-primary">18</p>
                  <p className="text-[11px] text-text-muted">Committed (SP)</p>
                </div>
                <div className="text-center p-3 bg-background-secondary rounded-lg">
                  <p className="text-lg font-heading font-bold text-success">6</p>
                  <p className="text-[11px] text-text-muted">Available (SP)</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted mb-2">Backlog (Ready for Sprint)</p>
                <div className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">Setup CI/CD pipeline</p>
                      <p className="text-xs text-text-muted">Priority: Medium · 3 SP</p>
                    </div>
                    <Button variant="outline" size="sm">Add to Sprint</Button>
                  </div>
                </div>
                <div className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">Design email templates</p>
                      <p className="text-xs text-text-muted">Priority: Low · 2 SP</p>
                    </div>
                    <Button variant="outline" size="sm">Add to Sprint</Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
