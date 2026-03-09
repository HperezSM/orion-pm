import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTierEnforcement } from "@/hooks/useTierEnforcement";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Sparkles, Save, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotesEditorProps {
  noteId: string | null;
  onSaved?: (id: string, title: string) => void;
}

export function NotesEditor({ noteId, onSaved }: NotesEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canUseFeature, hasReachedLimit, getRequiredTierForFeature, tier } = useTierEnforcement();
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [title, setTitle] = useState("Untitled");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"feature" | "limit">("feature");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIdRef = useRef<string | null>(noteId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing… AI will analyze when you're ready." }),
    ],
    editorProps: {
      attributes: { class: "prose prose-invert max-w-none min-h-[300px] focus:outline-none px-1 py-2 text-sm leading-relaxed" },
    },
    onUpdate: () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveNote(), 2000);
    },
  });

  // Load note content when noteId changes
  useEffect(() => {
    currentIdRef.current = noteId;
    if (!noteId) {
      editor?.commands.clearContent();
      setTitle("Untitled");
      setSuggestions(null);
      return;
    }
    (async () => {
      const { data } = await supabase.from("notes").select("*").eq("id", noteId).maybeSingle();
      if (data && currentIdRef.current === noteId) {
        setTitle(data.title);
        if (data.content_json) {
          editor?.commands.setContent(data.content_json as any);
        } else {
          editor?.commands.clearContent();
        }
      }
    })();
  }, [noteId, editor]);

  const saveNote = async () => {
    if (!editor || !user) return;
    setSaving(true);
    const content_json = editor.getJSON();
    const plainText = editor.getText();
    const noteTitle = plainText.slice(0, 60).trim() || "Untitled";

    try {
      if (currentIdRef.current) {
        await supabase.from("notes").update({ title: noteTitle, content_json, updated_at: new Date().toISOString() }).eq("id", currentIdRef.current);
      } else {
        const { data } = await supabase.from("notes").insert({ user_id: user.id, title: noteTitle, content_json }).select("id").single();
        if (data) currentIdRef.current = data.id;
      }
      setTitle(noteTitle);
      onSaved?.(currentIdRef.current!, noteTitle);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const analyzeNote = async () => {
    if (!editor) return;

    // Check feature access
    if (!canUseFeature("aiAnalysis")) {
      setUpgradeReason("feature");
      setShowUpgrade(true);
      return;
    }

    const text = editor.getText();
    if (text.length < 20) {
      toast({ title: "Write more content first", description: "AI needs at least a few sentences to analyze." });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-note", { body: { content: text } });
      if (error) throw error;
      setSuggestions(data?.suggestions ?? []);
      toast({ title: "Analysis complete", description: `Found ${data?.suggestions?.length ?? 0} actionable items.` });

      // Increment AI actions used (fire and forget)
      supabase
        .from("workspaces")
        .select("id, ai_actions_used")
        .limit(1)
        .maybeSingle()
        .then(({ data: ws }) => {
          if (ws) {
            supabase.from("workspaces").update({ ai_actions_used: (ws.ai_actions_used ?? 0) + 1 }).eq("id", ws.id).then(() => {});
          }
        });
    } catch (e: any) {
      if (e?.message?.includes("429") || e?.status === 429) {
        toast({ title: "Rate limited", description: "Please try again in a moment.", variant: "destructive" });
      } else if (e?.message?.includes("402") || e?.status === 402) {
        toast({ title: "Credits required", description: "Please add funds to continue using AI.", variant: "destructive" });
      } else {
        toast({ title: "Analysis failed", description: e?.message || "Unknown error", variant: "destructive" });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  if (!editor) return null;

  const aiDisabled = !canUseFeature("aiAnalysis");

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border flex-wrap">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive("bold")}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={saveNote} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
        <Button
          size="sm"
          className={`h-8 gap-1.5 text-xs ${aiDisabled ? "opacity-60" : ""}`}
          onClick={analyzeNote}
          disabled={analyzing}
        >
          {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          AI Analyze
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* AI Suggestions Panel */}
      {suggestions && suggestions.length > 0 && (
        <div className="border-t border-border px-4 py-3 max-h-52 overflow-y-auto bg-background-secondary">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI Suggestions
          </p>
          <div className="space-y-2">
            {suggestions.map((s: any, i: number) => (
              <div key={i} className="text-xs bg-background rounded-md p-2.5 border border-border">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary mr-2">
                  {s.type}
                </span>
                <span className="text-foreground">{s.title || s.description}</span>
                {s.priority && <span className="ml-2 text-muted-foreground">• {s.priority}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature={upgradeReason === "feature" ? "AI Analysis" : undefined}
        limitType={upgradeReason === "limit" ? "aiActions" : undefined}
        requiredTier={upgradeReason === "feature" ? (getRequiredTierForFeature("aiAnalysis") ?? "pro") : (tier === "starter" ? "pro" : "business")}
      />
    </div>
  );
}
