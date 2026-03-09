import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  User, CreditCard, Plug, Bell, Save, Loader2, Crown,
  ArrowUpRight, ArrowDownRight, XCircle, Zap, HardDrive, Users,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const TIER_LIMITS: Record<string, { users: number; projects: number; threads: number; price: number }> = {
  free: { users: 0, projects: 0, threads: 0, price: 0 },
  starter: { users: 3, projects: 5, threads: 50, price: 19 },
  pro: { users: 15, projects: 999, threads: 99999, price: 29 },
  enterprise: { users: 999, projects: 999, threads: 99999, price: 49 },
};

const TIER_ORDER = ["free", "starter", "pro", "enterprise"];

export default function SettingsPage() {
  const { user, profile, roles, isOwner } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({
    display_name: profile?.display_name ?? "",
    timezone: profile?.timezone ?? "UTC",
  });
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Fetch workspace
  const { data: workspace, isLoading: wsLoading } = useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("*")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const tier = workspace?.tier ?? "free";
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

  const handleProfileSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profileForm.display_name,
          timezone: profileForm.timezone,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTierChange = async (newTier: string) => {
    if (!workspace) return;
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ tier: newTier })
        .eq("id", workspace.id);
      if (error) throw error;

      await supabase.from("subscription_events").insert({
        workspace_id: workspace.id,
        event_type: TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(tier) ? "upgrade" : "downgrade",
        old_tier: tier,
        new_tier: newTier,
        triggered_by: user?.id,
      });

      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast({ title: `Plan changed to ${newTier}` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    if (!workspace) return;
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ tier: "starter" })
        .eq("id", workspace.id);
      if (error) throw error;

      await supabase.from("subscription_events").insert({
        workspace_id: workspace.id,
        event_type: "cancellation",
        old_tier: tier,
        new_tier: "starter",
        triggered_by: user?.id,
      });

      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      setCancelOpen(false);
      toast({ title: "Subscription cancelled", description: "Downgraded to Starter plan." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const usagePct = (used: number, limit: number) => Math.min(100, Math.round((used / limit) * 100));

  const integrations = [
    { label: "Gmail", desc: "Sync email threads for AI analysis", connected: false },
    { label: "Google Calendar", desc: "Link meetings to projects", connected: false },
    { label: "Slack", desc: "Send reminders and notifications", connected: false },
  ];

  return (
    <div className="animate-fade-in">
      <TopBar title="Settings" subtitle="Manage your profile, billing, integrations, and preferences" />
      <div className="p-6 max-w-3xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-background-secondary border border-border">
            <TabsTrigger value="profile" className="text-xs gap-1.5"><User className="h-3 w-3" /> Profile</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs gap-1.5"><CreditCard className="h-3 w-3" /> Billing</TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs gap-1.5"><Plug className="h-3 w-3" /> Integrations</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1.5"><Bell className="h-3 w-3" /> Notifications</TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-heading font-semibold text-foreground">Profile Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-text-muted">Display Name</Label>
                  <Input
                    value={profileForm.display_name}
                    onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-text-muted">Email</Label>
                  <Input value={profile?.email ?? ""} disabled className="mt-1 opacity-60" />
                </div>
                <div>
                  <Label className="text-xs text-text-muted">Timezone</Label>
                  <Input
                    value={profileForm.timezone}
                    onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                    className="mt-1"
                    placeholder="e.g. America/New_York"
                  />
                </div>
                <div>
                  <Label className="text-xs text-text-muted">Role</Label>
                  <Input value={roles.join(", ") || "pm"} disabled className="mt-1 opacity-60" />
                </div>
              </div>
              <Button onClick={handleProfileSave} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Save className="h-3 w-3 mr-2" />}
                Save Changes
              </Button>
            </Card>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing">
            <div className="space-y-6">
              {/* Current plan */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-warning" />
                    <div>
                      <h3 className="text-sm font-heading font-semibold text-foreground capitalize">{tier} Plan</h3>
                      <p className="text-xs text-text-muted">
                        {workspace?.billing_cycle === "yearly" ? "Billed annually" : "Billed monthly"} · ${limits.price}/user/mo
                      </p>
                    </div>
                  </div>
                  {workspace?.trial_ends_at && new Date(workspace.trial_ends_at) > new Date() && (
                    <StatusBadge status="medium" label={`Trial ends ${new Date(workspace.trial_ends_at).toLocaleDateString()}`} />
                  )}
                </div>

                {/* Usage bars */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-secondary flex items-center gap-1.5"><Users className="h-3 w-3" /> Users</span>
                      <span className="text-xs font-mono text-text-muted">{workspace?.seats_used ?? 0}/{limits.users === 999 ? "∞" : limits.users}</span>
                    </div>
                    <Progress value={limits.users === 999 ? 5 : usagePct(workspace?.seats_used ?? 0, limits.users)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-secondary flex items-center gap-1.5"><Zap className="h-3 w-3" /> Active Projects</span>
                      <span className="text-xs font-mono text-text-muted">{limits.projects === 999 ? "Unlimited" : `${limits.projects} max`}</span>
                    </div>
                    <Progress value={limits.projects === 999 ? 5 : 20} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-secondary flex items-center gap-1.5"><HardDrive className="h-3 w-3" /> Gmail Threads/mo</span>
                      <span className="text-xs font-mono text-text-muted">{limits.threads === 99999 ? "Unlimited" : `${limits.threads} max`}</span>
                    </div>
                    <Progress value={limits.threads === 99999 ? 5 : 10} className="h-2" />
                  </div>
                </div>
              </Card>

              {/* Tier selection */}
              {isOwner && (
                <Card className="p-6">
                  <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Change Plan</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {TIER_ORDER.map((t) => {
                      const l = TIER_LIMITS[t];
                      const isCurrent = t === tier;
                      const isUpgrade = TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(tier);
                      return (
                        <div
                          key={t}
                          className={`rounded-lg border p-4 text-center transition-all ${
                            isCurrent
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <p className="text-sm font-heading font-semibold text-foreground capitalize">{t}</p>
                          <p className="text-2xl font-heading font-bold text-foreground mt-1">${l.price}</p>
                          <p className="text-[10px] text-text-muted">/month</p>
                          <div className="text-[11px] text-text-muted mt-2 space-y-0.5">
                            <p>{l.seats} seats</p>
                            <p>{l.ai.toLocaleString()} AI actions</p>
                            <p>{l.storage} GB</p>
                          </div>
                          {isCurrent ? (
                            <p className="mt-3 text-xs text-primary font-medium">Current</p>
                          ) : (
                            <Button
                              size="sm"
                              variant={isUpgrade ? "default" : "outline"}
                              className="mt-3 w-full text-xs h-7"
                              onClick={() => handleTierChange(t)}
                            >
                              {isUpgrade ? (
                                <><ArrowUpRight className="h-3 w-3 mr-1" /> Upgrade</>
                              ) : (
                                <><ArrowDownRight className="h-3 w-3 mr-1" /> Downgrade</>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Cancel */}
              {isOwner && tier !== "starter" && (
                <Card className="p-6 border-destructive/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-heading font-semibold text-destructive">Cancel Subscription</h3>
                      <p className="text-xs text-text-muted mt-1">Downgrade to Starter (free). You'll lose access to premium features.</p>
                    </div>
                    <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                          <XCircle className="h-3 w-3 mr-2" /> Cancel Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel your subscription?</DialogTitle>
                          <DialogDescription>
                            Your workspace will be downgraded to the Starter plan immediately. You'll lose access to premium features including extra seats, AI actions, and storage.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Plan</Button>
                          <Button variant="destructive" onClick={handleCancel}>Confirm Cancellation</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations">
            <Card className="divide-y divide-border">
              {integrations.map((item, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{item.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7">Connect</Button>
                </div>
              ))}
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card className="divide-y divide-border">
              {[
                { label: "Email Reports", desc: "Daily and weekly reports via email" },
                { label: "AI Action Alerts", desc: "Get notified when AI drafts actions" },
                { label: "Escalation Alerts", desc: "Alerts for stagnant or at-risk projects" },
              ].map((item, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{item.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
