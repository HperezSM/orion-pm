import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Loader2, Globe, Mail, User } from "lucide-react";

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get project count per client
  const { data: clientProjectCounts } = useQuery({
    queryKey: ["client-project-counts"],
    queryFn: async () => {
      if (!clients) return {};
      const counts: Record<string, number> = {};
      for (const c of clients) {
        const { count } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("client_id", c.id);
        counts[c.id] = count ?? 0;
      }
      return counts;
    },
    enabled: !!clients,
  });

  const createClient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").insert({
        name,
        industry: industry || null,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        website: website || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client created!" });
      setOpen(false);
      setName("");
      setIndustry("");
      setContactName("");
      setContactEmail("");
      setWebsite("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="animate-fade-in">
      <TopBar title="Clients" subtitle="Manage your client portfolio" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-secondary">{clients?.length ?? 0} clients</span>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Client Onboard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Onboard New Client</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createClient.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-foreground">Company Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Industry</label>
                  <Input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Technology, Finance, Healthcare"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Primary Contact Name</label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Contact Email</label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. john@acme.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Website</label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="e.g. https://acme.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createClient.isPending}>
                  {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Client
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clients && clients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((c) => (
              <div
                key={c.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-heading font-semibold text-foreground">{c.name}</h3>
                    {c.industry && (
                      <p className="text-xs text-text-muted mt-0.5">{c.industry}</p>
                    )}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-text-secondary">
                  {c.contact_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-text-muted" />
                      <span>{c.contact_name}</span>
                    </div>
                  )}
                  {c.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-text-muted" />
                      <span>{c.contact_email}</span>
                    </div>
                  )}
                  {c.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-text-muted" />
                      <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {c.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                  <span>{clientProjectCounts?.[c.id] ?? 0} projects</span>
                  <span>Added {new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No clients yet"
            description="Add your first client to get started. I'll help you generate onboarding artifacts like welcome emails, kickoff decks, and initial sprint templates."
          />
        )}
      </div>
    </div>
  );
}
