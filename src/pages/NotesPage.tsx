import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { NotesEditor } from "@/components/NotesEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PenLine, Plus, Search, FileText, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface NoteItem {
  id: string;
  title: string;
  updated_at: string;
}

export default function NotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchNotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notes")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setNotes(data ?? []);
  };

  useEffect(() => { fetchNotes(); }, [user]);

  const createNote = () => setActiveId(null);

  const deleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    if (activeId === id) setActiveId(null);
    fetchNotes();
    toast({ title: "Note deleted" });
  };

  const handleSaved = (id: string) => {
    setActiveId(id);
    fetchNotes();
  };

  const filtered = notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()));
  const hasNotes = notes.length > 0 || activeId === null;

  return (
    <div className="animate-fade-in h-[calc(100vh-3rem)]">
      <TopBar title="Notes" subtitle="AI-powered note taking — think, draft, and extract action items" />

      {!hasNotes && notes.length === 0 && activeId !== null ? (
        <div className="p-6">
          <EmptyState
            icon={<PenLine className="h-6 w-6" />}
            title="Start your first note"
            description="Write freely — AI will analyze your notes and suggest projects, tasks, and follow-ups."
            action={
              <Button onClick={createNote} size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Note
              </Button>
            }
          />
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100%-3.5rem)]">
          {/* Sidebar */}
          <ResizablePanel defaultSize={28} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col border-r border-border">
              <div className="p-3 space-y-2 border-b border-border">
                <Button onClick={createNote} size="sm" className="w-full gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> New Note
                </Button>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search notes…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-1.5 space-y-0.5">
                  {filtered.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setActiveId(note.id)}
                      className={`group flex items-start gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors text-sm ${
                        activeId === note.id
                          ? "bg-background-secondary text-foreground"
                          : "text-muted-foreground hover:bg-background-secondary hover:text-foreground"
                      }`}
                    >
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-xs">{note.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(note.updated_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No notes found</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor */}
          <ResizablePanel defaultSize={72}>
            <NotesEditor noteId={activeId} onSaved={handleSaved} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
