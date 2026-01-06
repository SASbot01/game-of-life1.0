import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { isToday, isPast, isThisWeek } from "date-fns";
import { filterVisibleTasks } from "@/lib/taskFilters";

// New modular components
import { TacticalMetricsBar } from "./TacticalMetricsBar";
import { TacticalFilters, ViewMode, EnergyFilter, TimeFilter } from "./TacticalFilters";
import { TacticalKanban } from "./TacticalKanban";
import { TacticalAnalyticsView } from "./TacticalAnalyticsView";
import { TacticalGanttView } from "./TacticalGanttView";

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
type TaskDifficulty = "easy" | "medium" | "hard" | "boss";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  due_date: string | null;
  xp_reward: number;
  project_id: string | null;
  completed_at: string | null;
  time_estimate: string | null;
  project?: { title: string; color_theme?: string | null; area_id?: string | null } | null;
}

interface Project {
  id: string;
  title: string;
  area_id: string | null;
}

const xpMap: Record<TaskDifficulty, number> = { easy: 10, medium: 25, hard: 50, boss: 100 };

export function OpsTacticalTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Filter states
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [energyFilter, setEnergyFilter] = useState<EnergyFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  
  // Form states
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    difficulty: "medium" as TaskDifficulty,
    due_date: "",
    project_id: "",
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    difficulty: "medium" as TaskDifficulty,
    due_date: "",
    project_id: "",
  });

  // Fetch tasks with project info
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, project:projects(title, color_theme, area_id)")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user?.id,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, area_id")
        .eq("user_id", user?.id);

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user?.id,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: typeof newTask) => {
      const { error } = await supabase.from("tasks").insert({
        user_id: user?.id,
        title: task.title,
        description: task.description || null,
        difficulty: task.difficulty,
        due_date: task.due_date || null,
        project_id: task.project_id && task.project_id !== "none" ? task.project_id : null,
        xp_reward: xpMap[task.difficulty],
        status: "todo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tactical-metrics"] });
      setIsDialogOpen(false);
      setNewTask({ title: "", description: "", difficulty: "medium", due_date: "", project_id: "" });
      toast.success("Mission created");
    },
    onError: () => toast.error("Failed to create mission"),
  });

  // Update task mutation (for status changes)
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const task = tasks.find(t => t.id === id);
      const isCompletion = status === 'done' && task?.status !== 'done';
      
      const { error } = await supabase.from("tasks").update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null
      }).eq("id", id);
      
      if (error) throw error;
      return { task, isCompletion };
    },
    onSuccess: async ({ task, isCompletion }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tactical-metrics"] });
      
      if (isCompletion && task) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('current_xp')
          .eq('id', user?.id)
          .single();
        
        if (profileData) {
          await supabase
            .from('profiles')
            .update({ current_xp: profileData.current_xp + task.xp_reward })
            .eq('id', user?.id);
          
          queryClient.invalidateQueries({ queryKey: ['profiles'] });
          
          import('canvas-confetti').then(({ default: confetti }) => {
            const particleCount = task.xp_reward >= 100 ? 100 : task.xp_reward >= 50 ? 60 : 30;
            confetti({
              particleCount,
              spread: 70,
              origin: { y: 0.4 },
              colors: ['#00d4ff', '#ff0080', '#ffd700'],
            });
          });
          
          toast.success(`🎮 Mission Complete! +${task.xp_reward} XP`, { duration: 3000 });
        }
      } else {
        toast.success("Task updated");
      }
    },
  });

  // Edit task mutation
  const editTaskMutation = useMutation({
    mutationFn: async () => {
      if (!editingTask) return;
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editForm.title,
          description: editForm.description || null,
          difficulty: editForm.difficulty,
          due_date: editForm.due_date || null,
          project_id: editForm.project_id && editForm.project_id !== "none" ? editForm.project_id : null,
          xp_reward: xpMap[editForm.difficulty],
        })
        .eq("id", editingTask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsEditDialogOpen(false);
      setEditingTask(null);
      toast.success("Mission updated");
    },
    onError: () => toast.error("Failed to update mission"),
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tactical-metrics"] });
      toast.success("Mission deleted");
    },
  });

  // Handlers
  const handleStatusChange = (id: string, status: TaskStatus) => {
    updateTaskMutation.mutate({ id, status });
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      difficulty: task.difficulty,
      due_date: task.due_date || "",
      project_id: task.project_id || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  // Filter tasks
  const visibleTasks = filterVisibleTasks(tasks);
  
  const filteredTasks = visibleTasks.filter((task) => {
    // Area filter (via project)
    if (areaFilter !== "all") {
      const project = projects.find(p => p.id === task.project_id);
      if (!project || project.area_id !== areaFilter) return false;
    }
    
    // Project filter
    if (projectFilter !== "all" && task.project_id !== projectFilter) return false;
    
    // Energy filter
    if (energyFilter !== "all") {
      if (energyFilter === "low" && task.difficulty !== "easy") return false;
      if (energyFilter === "medium" && task.difficulty !== "medium") return false;
      if (energyFilter === "high" && task.difficulty !== "hard" && task.difficulty !== "boss") return false;
    }
    
    // Time filter
    if (timeFilter !== "all" && task.due_date) {
      const dueDate = new Date(task.due_date);
      if (timeFilter === "today" && !isToday(dueDate)) return false;
      if (timeFilter === "week" && !isThisWeek(dueDate)) return false;
      if (timeFilter === "overdue" && (!isPast(dueDate) || isToday(dueDate))) return false;
    }
    if (timeFilter === "overdue" && !task.due_date) return false;

    return true;
  });

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground font-mono animate-pulse">LOADING MISSIONS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tactical HUD Metrics Bar */}
      <TacticalMetricsBar />

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center gap-4">
        <TacticalFilters
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          areaFilter={areaFilter}
          setAreaFilter={setAreaFilter}
          energyFilter={energyFilter}
          setEnergyFilter={setEnergyFilter}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
        
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-ops/20 text-ops border border-ops/30 hover:bg-ops/30"
        >
          <Plus className="w-4 h-4 mr-2" />
          NEW MISSION
        </Button>
      </div>

      {/* View Content */}
      {viewMode === "kanban" ? (
        <TacticalKanban
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
        />
      ) : viewMode === "timeline" ? (
        <TacticalGanttView tasks={filteredTasks} />
      ) : (
        <TacticalAnalyticsView tasks={filteredTasks} />
      )}

      {/* Create Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-ops/30">
          <DialogHeader>
            <DialogTitle className="font-display text-ops">CREATE MISSION</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Mission title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="bg-background border-border"
            />
            <Textarea
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="bg-background border-border"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Project</label>
                <Select value={newTask.project_id} onValueChange={(v) => setNewTask({ ...newTask, project_id: v })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
                <Select value={newTask.difficulty} onValueChange={(v) => setNewTask({ ...newTask, difficulty: v as TaskDifficulty })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (10 XP)</SelectItem>
                    <SelectItem value="medium">Medium (25 XP)</SelectItem>
                    <SelectItem value="hard">Hard (50 XP)</SelectItem>
                    <SelectItem value="boss">Boss (100 XP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
              <Input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <Button
              onClick={() => createTaskMutation.mutate(newTask)}
              disabled={!newTask.title || createTaskMutation.isPending}
              className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
            >
              {createTaskMutation.isPending ? "CREATING..." : "CREATE MISSION"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-ops/30">
          <DialogHeader>
            <DialogTitle className="font-display text-ops">EDIT MISSION</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Mission title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="bg-background border-border"
            />
            <Textarea
              placeholder="Description (optional)"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="bg-background border-border"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Project</label>
                <Select value={editForm.project_id || "none"} onValueChange={(v) => setEditForm({ ...editForm, project_id: v })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
                <Select value={editForm.difficulty} onValueChange={(v) => setEditForm({ ...editForm, difficulty: v as TaskDifficulty })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (10 XP)</SelectItem>
                    <SelectItem value="medium">Medium (25 XP)</SelectItem>
                    <SelectItem value="hard">Hard (50 XP)</SelectItem>
                    <SelectItem value="boss">Boss (100 XP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
              <Input
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <Button
              onClick={() => editTaskMutation.mutate()}
              disabled={!editForm.title || editTaskMutation.isPending}
              className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
            >
              {editTaskMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mission?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the mission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
