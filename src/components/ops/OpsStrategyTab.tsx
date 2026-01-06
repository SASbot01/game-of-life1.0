import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, FolderKanban, Calendar, MoreVertical, Clock, Zap, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { filterVisibleTasks } from "@/lib/taskFilters";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  color_theme: string;
  created_at: string;
  task_count?: number;
  completed_count?: number;
  total_xp?: number;
}

export function OpsStrategyTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playSound } = useSoundEffects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    deadline: "",
    status: "active",
    color_theme: "ops",
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data: projectsData, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const projectsWithStats = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("id, status, xp_reward, completed_at")
            .eq("project_id", project.id);

          // Filter out done tasks older than 24h
          const visibleTasks = filterVisibleTasks(tasks || []);
          const taskCount = visibleTasks.length;
          const completedCount = visibleTasks.filter((t) => t.status === "done").length;
          const totalXp = visibleTasks.filter((t) => t.status === "done").reduce((sum, t) => sum + t.xp_reward, 0);

          return {
            ...project,
            task_count: taskCount,
            completed_count: completedCount,
            total_xp: totalXp,
          };
        })
      );

      return projectsWithStats as Project[];
    },
    enabled: !!user?.id,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (project: typeof newProject) => {
      const { error } = await supabase.from("projects").insert({
        user_id: user?.id,
        title: project.title,
        description: project.description || null,
        deadline: project.deadline || null,
        status: project.status,
        color_theme: project.color_theme,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsDialogOpen(false);
      setNewProject({ title: "", description: "", deadline: "", status: "active", color_theme: "ops" });
      toast.success("Project created");
    },
    onError: () => toast.error("Failed to create project"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated");
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      playSound('complete');
      toast.success("Project deleted");
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (project: Project) => {
      const { error } = await supabase
        .from("projects")
        .update({
          title: project.title,
          description: project.description,
          deadline: project.deadline,
          status: project.status,
        })
        .eq("id", project.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      playSound('success');
      toast.success("Project updated");
      setIsEditDialogOpen(false);
      setEditingProject(null);
    },
    onError: () => toast.error("Failed to update project"),
  });

  const handleEditProject = (project: Project) => {
    playSound('menuOpen');
    setEditingProject({ ...project });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    playSound('select');
    setDeleteProjectId(id);
  };

  const confirmDelete = () => {
    if (deleteProjectId) {
      deleteProjectMutation.mutate(deleteProjectId);
      setDeleteProjectId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-ops/20 text-ops border-ops/30";
      case "on_hold": return "bg-vault/20 text-vault border-vault/30";
      case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "archived": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getProgressPercent = (project: Project) => {
    if (!project.task_count || project.task_count === 0) return 0;
    return Math.round((project.completed_count! / project.task_count) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground font-mono animate-pulse">LOADING PROJECTS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-ops text-glow-ops">PROJECT DECK</h2>
          <p className="text-muted-foreground text-sm">{projects.length} active operations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-ops/20 text-ops border border-ops/30 hover:bg-ops/30">
              <Plus className="w-4 h-4 mr-2" />
              NEW PROJECT
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-ops/30">
            <DialogHeader>
              <DialogTitle className="font-display text-ops">CREATE PROJECT</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Project title"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                className="bg-background border-border"
              />
              <Textarea
                placeholder="Description (optional)"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="bg-background border-border"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
                  <Input
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <Select value={newProject.status} onValueChange={(v) => setNewProject({ ...newProject, status: v })}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => createProjectMutation.mutate(newProject)}
                disabled={!newProject.title || createProjectMutation.isPending}
                className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
              >
                {createProjectMutation.isPending ? "CREATING..." : "CREATE PROJECT"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Grid */}
      {projects.length === 0 ? (
        <div className="space-card p-12 text-center">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No projects yet. Create your first project!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="module-card-ops p-4 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-title text-lg text-foreground">{project.title}</h3>
                  {project.description && (
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditProject(project)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Project
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "active" })}>
                      Set Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "on_hold" })}>
                      Put On Hold
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: project.id, status: "completed" })}>
                      Mark Complete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(project.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status & Deadline */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={getStatusColor(project.status || "active")}>
                  {(project.status || "active").replace("_", " ").toUpperCase()}
                </Badge>
                {project.deadline && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(project.deadline), "MMM d, yyyy")}
                  </span>
                )}
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {project.completed_count}/{project.task_count} tasks
                  </span>
                  <span className="text-ops font-mono">
                    <AnimatedNumber value={getProgressPercent(project)} formatAsCurrency={false} suffix="%" />
                  </span>
                <Progress value={getProgressPercent(project)} className="h-2 bg-ops/10" />
              </div>

              {/* KPIs */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>0h invested</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-ops">
                  <Zap className="w-3 h-3" />
                  <span className="font-mono">
                    <AnimatedNumber value={project.total_xp || 0} formatAsCurrency={false} /> XP
                  </span>
                </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-ops/30">
          <DialogHeader>
            <DialogTitle className="font-display text-ops">EDIT PROJECT</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Project title"
                value={editingProject.title}
                onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                className="bg-background border-border"
              />
              <Textarea
                placeholder="Description (optional)"
                value={editingProject.description || ""}
                onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                className="bg-background border-border"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
                  <Input
                    type="date"
                    value={editingProject.deadline || ""}
                    onChange={(e) => setEditingProject({ ...editingProject, deadline: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <Select 
                    value={editingProject.status} 
                    onValueChange={(v) => setEditingProject({ ...editingProject, status: v })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => updateProjectMutation.mutate(editingProject)}
                disabled={!editingProject.title || updateProjectMutation.isPending}
                className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
              >
                {updateProjectMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent className="bg-card border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and cannot be undone. Tasks associated with this project will remain but will no longer be linked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
