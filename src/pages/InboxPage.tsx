import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Plus,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Bot,
  ChevronRight,
  Flag,
} from "lucide-react";

type RiskLevel = "low" | "medium" | "high" | "critical";

interface Thread {
  id: string;
  subject: string | null;
  from_email: string | null;
  risk_level: string | null;
  status: string | null;
  ai_summary: string | null;
  last_message_at: string | null;
  created_at: string;
  project: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
}

interface Extraction {
  id: string;
  extracted_action: string | null;
  extracted_owner: string | null;
  extracted_deadline: string | null;
  confidence_score: number | null;
  risk_level: string | null;
  reviewed_by: string | null;
}

const riskColors: Record<string, string> = {
  low: "text-green",
  medium: "text-warning",
  high: "text-destructive",
  critical: "text-destructive font-bold",
};

const riskBg: Record<string, string> = {
  low: "bg-green/10 border-green/30",
  medium: "bg-warning/10 border-warning/30",
  high: "bg-destructive/10 border-destructive/30",
  critical: "bg-destructive/20 border-destructive/50",
};

export default function InboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [selectedExtraction, setSelectedExtraction] = useState<Extraction | null>(null);
  const [actionModal, setActionModal] = useState<"task" | "follow-up" | "compose" | null>(null);

  // Editable task fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDue, setTaskDue] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");

  // Editable follow-up email draft
  const [emailDraft, setEmailDraft] = useState("");

  // New thread form
  const [newSubject, setNewSubject] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newRisk, setNewRisk] = useState<RiskLevel>("low");
  const [newProjectId, setNewProjectId] = useState("");
  const [addThreadOpen, setAddThreadOpen] = useState(false);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["inbox-threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_threads")
        .select(`
          id, subject, from_email, risk_level, status, ai_summary, last_message_at, created_at,
          project:projects(id, name),
          client:clients(id, name)
        `)
        .eq("user_id", user?.id ?? "")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Thread[];
    },
    enabled: !!user,
  });

  const { data: extraction } = useQuery({
    queryKey: ["extraction", selectedThread?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_extractions")
        .select("*")
        .eq("thread_id", selectedThread!.id)
        .maybeSingle();
      return data as Extraction | null;
    },
    enabled: !!selectedThread,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects-dropdown"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("status", "active").order("name");
      return data ?? [];
    },
  });

  const addThread = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_threads").insert({
        user_id: user!.id,
        subject: newSubject,
        from_email: newFrom,
        ai_summary: newSummary || null,
        risk_level: newRisk,
        status: "unread",
        project_id: newProjectId || null,
        last_message_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-threads"] });
      toast({ title: "Thread added" });
      setAddThreadOpen(false);
      setNewSubject(""); setNewFrom(""); setNewSummary(""); setNewRisk("low"); setNewProjectId("");
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      if (!taskProjectId) throw new Error("Please select a project");
      const { error } = await supabase.from("tasks").insert({
        title: taskTitle,
        priority: taskPriority,
        due_date: taskDue || null,
        project_id: taskProjectId,
        status: "todo",
        linked_thread_id: selectedThread?.id ?? null,
      });
      if (error) throw error;
      // Mark thread as actioned
      await supabase.from("email_threads").update({ status: "actioned" }).eq("id", selectedThread!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-threads"] });
      toast({ title: "Task created!", description: `"${taskTitle}" added to project.` });
      setActionModal(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markWaiting = useMutation({
    mutationFn: async () => {
      await supabase.from("email_threads").update({ status: "waiting" }).eq("id", selectedThread!.id);
      await supabase.from("follow_ups").insert({
        thread_id: selectedThread!.id,
        project_id: selectedThread?.project?.id ?? null,
        status: "pending",
        days_waiting: 0,
        created_by: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-threads"] });
      toast({ title: "Marked as Waiting on Client", description: "Added to Follow-Ups queue." });
      setSelectedThread(null);
    },
  });

  const dismissThread = useMutation({
    mutationFn: async (threadId: string) => {
      await supabase.from("email_threads").update({ status: "dismissed" }).eq("id", threadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-threads"] });
      setSelectedThread(null);
    },
  });

  const openTaskModal = () => {
    setTaskTitle(extraction?.extracted_action ?? selectedThread?.subject ?? "");
    setTaskDue(extraction?.extracted_deadline ?? "");
    setTaskPriority(
      selectedThread?.risk_level === "high" || selectedThread?.risk_level === "critical" ? "high"
        : selectedThread?.risk_level === "medium" ? "medium" : "low"
    );
    setTaskProjectId(selectedThread?.project?.id ?? "");
    setActionModal("task");
  };

  const openFollowUpModal = () => {
    setEmailDraft(
      `Hi,\n\nI wanted to follow up on the thread regarding "${selectedThread?.subject ?? "our recent conversation"}". Could you please provide an update at your earliest convenience?\n\nThank you,\n${user?.email}`
    );
    setActionModal("follow-up");
  };

  const getRiskBadge = (risk: string | null) => {
    const label = (risk ?? "low").toUpperCase();
    const cls = riskColors[risk ?? "low"] ?? "text-text-muted";
    return <span className={`text-[10px] font-bold ${cls}`}>{label}</span>;
  };

  const activeThreads = threads?.filter(t => t.status !== "dismissed") ?? [];
  const unread = activeThreads.filter(t => t.status === "unread").length;

  return (
    <div className="animate-fade-in h-[calc(100vh-56px)] flex flex-col">
      <TopBar title="Inbox" subtitle="Gmail threads with AI-powered extraction" />

      <div className="flex flex-1 overflow-hidden">
        {/* Thread list */}
        <div className="w-80 border-r border-border flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{activeThreads.length} threads</span>
              {unread > 0 && (
                <Badge className="h-5 px-1.5 bg-primary text-primary-foreground text-[10px]">{unread} new</Badge>
              )}
            </div>
            <button
              onClick={() => setAddThreadOpen(true)}
              className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-text-muted hover:text-foreground hover:bg-background-secondary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activeThreads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Mail className="h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-secondary">No threads yet</p>
              <Button size="sm" onClick={() => setAddThreadOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Thread
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {activeThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThread(t)}
                  className={`w-full text-left px-4 py-3 hover:bg-background-secondary transition-colors ${
                    selectedThread?.id === t.id ? "bg-background-secondary border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-sm font-medium truncate flex-1 ${t.status === "unread" ? "text-foreground" : "text-text-secondary"}`}>
                      {t.subject ?? "(No subject)"}
                    </span>
                    {getRiskBadge(t.risk_level)}
                  </div>
                  <p className="text-xs text-text-muted truncate">{t.from_email ?? "Unknown sender"}</p>
                  {t.ai_summary && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{t.ai_summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    {t.status === "waiting" && <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded">Waiting</span>}
                    {t.status === "actioned" && <span className="text-[10px] bg-green/10 text-green px-1.5 py-0.5 rounded">Actioned</span>}
                    {t.project && <span className="text-[10px] text-text-muted truncate">{(t.project as { name: string }).name}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedThread ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Thread header */}
            <div className="px-6 py-4 border-b border-border flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-base font-heading font-semibold text-foreground truncate">
                    {selectedThread.subject ?? "(No subject)"}
                  </h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${riskBg[selectedThread.risk_level ?? "low"] ?? ""} ${riskColors[selectedThread.risk_level ?? "low"] ?? ""}`}>
                    {(selectedThread.risk_level ?? "low").toUpperCase()} RISK
                  </span>
                </div>
                <p className="text-sm text-text-muted">From: {selectedThread.from_email}</p>
                {selectedThread.project && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    Project: {(selectedThread.project as { name: string }).name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedThread(null)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:text-foreground hover:bg-background-secondary ml-3"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* AI Summary */}
              {selectedThread.ai_summary && (
                <div className="bg-purple/10 border border-purple/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-purple" />
                    <span className="text-xs font-medium text-purple uppercase tracking-wide">AI Summary</span>
                  </div>
                  <p className="text-sm text-foreground">{selectedThread.ai_summary}</p>
                </div>
              )}

              {/* AI Extraction */}
              {extraction && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm font-heading font-semibold text-foreground">AI Extraction</span>
                    {extraction.confidence_score != null && (
                      <span className="ml-auto text-xs text-text-muted">
                        {Math.round(extraction.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    {extraction.extracted_action && (
                      <div className="flex items-start gap-3">
                        <span className="text-text-muted w-20 flex-shrink-0 text-xs pt-0.5">Action</span>
                        <span className="text-foreground">{extraction.extracted_action}</span>
                      </div>
                    )}
                    {extraction.extracted_owner && (
                      <div className="flex items-start gap-3">
                        <span className="text-text-muted w-20 flex-shrink-0 text-xs pt-0.5">Owner</span>
                        <span className="text-foreground">{extraction.extracted_owner}</span>
                      </div>
                    )}
                    {extraction.extracted_deadline && (
                      <div className="flex items-start gap-3">
                        <span className="text-text-muted w-20 flex-shrink-0 text-xs pt-0.5">Deadline</span>
                        <span className="text-foreground">{extraction.extracted_deadline}</span>
                      </div>
                    )}
                    {extraction.risk_level && (
                      <div className="flex items-start gap-3">
                        <span className="text-text-muted w-20 flex-shrink-0 text-xs pt-0.5">Risk</span>
                        <span className={riskColors[extraction.risk_level] ?? ""}>{extraction.risk_level.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="border-t border-border px-6 py-4 flex items-center gap-3 flex-wrap bg-background">
              <Button size="sm" onClick={openTaskModal}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Task
              </Button>
              <Button size="sm" variant="outline" onClick={openFollowUpModal}>
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Draft Follow-Up
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markWaiting.mutate()}
                disabled={markWaiting.isPending || selectedThread.status === "waiting"}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Waiting on Client
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dismissThread.mutate(selectedThread.id)}
                className="text-text-muted hover:text-destructive ml-auto"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Dismiss
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <Mail className="h-12 w-12 text-text-muted" />
            <p className="text-sm text-text-secondary">Select a thread to view details and take action</p>
          </div>
        )}
      </div>

      {/* ── Create Task Confirmation Modal ── */}
      <Dialog open={actionModal === "task"} onOpenChange={(o) => !o && setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Review and edit all details before confirming. This task will be created in your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Task Title</label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Priority</label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Due Date</label>
                <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Project *</label>
              <Select value={taskProjectId} onValueChange={setTaskProjectId}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createTask.mutate()} disabled={createTask.isPending}>
                {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirm & Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Follow-Up Email Draft Modal ── */}
      <Dialog open={actionModal === "follow-up"} onOpenChange={(o) => !o && setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draft Follow-Up Email</DialogTitle>
            <DialogDescription>
              Review and edit this AI-generated draft before sending. No email will be sent without your confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Re: {selectedThread?.subject}</label>
              <p className="text-xs text-text-muted mb-2">To: {selectedThread?.from_email}</p>
              <Textarea
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="bg-warning/10 border border-warning/20 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">Gmail sending requires OAuth integration. This draft will be saved to Follow-Ups for manual sending.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={async () => {
                await supabase.from("follow_ups").insert({
                  thread_id: selectedThread!.id,
                  project_id: selectedThread?.project?.id ?? null,
                  status: "pending",
                  days_waiting: 0,
                  last_action: `Draft saved: ${emailDraft.slice(0, 100)}`,
                  created_by: user!.id,
                });
                queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
                toast({ title: "Draft saved to Follow-Ups" });
                setActionModal(null);
              }}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save to Follow-Ups
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Thread Modal ── */}
      <Dialog open={addThreadOpen} onOpenChange={setAddThreadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Email Thread</DialogTitle>
            <DialogDescription>Manually add a thread to track. Gmail sync coming soon.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); addThread.mutate(); }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-sm font-medium text-foreground">Subject *</label>
              <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Email subject" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">From Email *</label>
              <Input type="email" value={newFrom} onChange={(e) => setNewFrom(e.target.value)} placeholder="sender@client.com" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">AI Summary / Notes</label>
              <Textarea value={newSummary} onChange={(e) => setNewSummary(e.target.value)} placeholder="Brief description of the thread…" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Risk Level</label>
                <Select value={newRisk} onValueChange={(v) => setNewRisk(v as RiskLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Project</label>
                <Select value={newProjectId} onValueChange={setNewProjectId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddThreadOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={addThread.isPending}>
                {addThread.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Thread
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
