import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Folder, FileText, ChevronRight, MoreVertical, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string | null;
  tags: string[];
  is_folder: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export function CortexDatabaseTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", is_folder: false });
  const [editContent, setEditContent] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user?.id)
        .order("is_folder", { ascending: false })
        .order("title", { ascending: true });

      if (error) throw error;
      return data as Note[];
    },
    enabled: !!user?.id,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (note: typeof newNote) => {
      const { error } = await supabase.from("notes").insert({
        user_id: user?.id,
        title: note.title,
        is_folder: note.is_folder,
        parent_id: currentFolderId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setIsCreateDialogOpen(false);
      setNewNote({ title: "", is_folder: false });
      toast.success(newNote.is_folder ? "Folder created" : "Note created");
    },
    onError: () => toast.error("Failed to create"),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("notes").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note saved");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setSelectedNote(null);
      toast.success("Deleted");
    },
  });

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = note.parent_id === currentFolderId;
    return matchesSearch && matchesFolder;
  });

  const handleNoteClick = (note: Note) => {
    if (note.is_folder) {
      setCurrentFolderId(note.id);
      setSelectedNote(null);
    } else {
      setSelectedNote(note);
      setEditContent(note.content || "");
    }
  };

  const goToParent = () => {
    if (currentFolderId) {
      const currentFolder = notes.find((n) => n.id === currentFolderId);
      setCurrentFolderId(currentFolder?.parent_id || null);
    }
  };

  const getBreadcrumb = () => {
    const path: Note[] = [];
    let current = currentFolderId;
    while (current) {
      const folder = notes.find((n) => n.id === current);
      if (folder) {
        path.unshift(folder);
        current = folder.parent_id;
      } else {
        break;
      }
    }
    return path;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground font-mono animate-pulse">LOADING DATABASE...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
      {/* Sidebar - Note List */}
      <div className="space-card p-4 flex flex-col">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>

        {/* Breadcrumb */}
        {currentFolderId && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 flex-wrap">
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setCurrentFolderId(null)}>
              Root
            </Button>
            {getBreadcrumb().map((folder) => (
              <span key={folder.id} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  {folder.title}
                </Button>
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-ops/20 text-ops border border-ops/30 hover:bg-ops/30 flex-1">
                <Plus className="w-4 h-4 mr-1" />
                Note
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-ops/30">
              <DialogHeader>
                <DialogTitle className="font-display text-ops">CREATE</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="bg-background border-border"
                />
                <div className="flex gap-2">
                  <Button
                    variant={newNote.is_folder ? "outline" : "default"}
                    className={!newNote.is_folder ? "bg-ops text-ops-foreground" : ""}
                    onClick={() => setNewNote({ ...newNote, is_folder: false })}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Note
                  </Button>
                  <Button
                    variant={!newNote.is_folder ? "outline" : "default"}
                    className={newNote.is_folder ? "bg-ops text-ops-foreground" : ""}
                    onClick={() => setNewNote({ ...newNote, is_folder: true })}
                  >
                    <Folder className="w-4 h-4 mr-2" />
                    Folder
                  </Button>
                </div>
                <Button
                  onClick={() => createNoteMutation.mutate(newNote)}
                  disabled={!newNote.title || createNoteMutation.isPending}
                  className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
                >
                  CREATE
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {currentFolderId && (
            <Button size="sm" variant="outline" onClick={goToParent}>
              ← Back
            </Button>
          )}
        </div>

        {/* Note List */}
        <div className="flex-1 overflow-auto space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? "No notes found" : "No notes yet"}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group ${
                  selectedNote?.id === note.id ? "bg-ops/10 border border-ops/30" : "hover:bg-secondary"
                }`}
                onClick={() => handleNoteClick(note)}
              >
                {note.is_folder ? (
                  <Folder className="w-4 h-4 text-vault" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="flex-1 truncate text-sm">{note.title}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNoteMutation.mutate(note.id);
                      }}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Main - Note Editor */}
      <div className="lg:col-span-2 space-card p-6 flex flex-col">
        {selectedNote ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-foreground">{selectedNote.title}</h2>
              <span className="text-xs text-muted-foreground">
                Updated {format(new Date(selectedNote.updated_at), "MMM d, yyyy")}
              </span>
            </div>

            {selectedNote.tags.length > 0 && (
              <div className="flex gap-2 mb-4">
                {selectedNote.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Start writing..."
              className="flex-1 bg-background border-border resize-none min-h-[400px]"
            />

            <div className="flex justify-end mt-4">
              <Button
                onClick={() => updateNoteMutation.mutate({ id: selectedNote.id, content: editContent })}
                disabled={updateNoteMutation.isPending}
                className="bg-ops/20 text-ops border border-ops/30 hover:bg-ops/30"
              >
                {updateNoteMutation.isPending ? "SAVING..." : "SAVE"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a note to view and edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
