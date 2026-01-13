import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderKanban, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { filterVisibleTasks } from "@/lib/taskFilters";

import { AreaCard } from "./AreaCard";
import { ProjectCard } from "./ProjectCard";
import { TaskListItem } from "./TaskListItem";
import { OpsBreadcrumb } from "./OpsBreadcrumb";
import { AddTaskModal } from "./AddTaskModal";

type ViewLevel = "areas" | "projects" | "tasks";
type TaskStatus = "backlog" | "todo" | "in_progress" | "done";

interface Area {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  area_id: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  difficulty: "easy" | "medium" | "hard" | "boss";
  due_date: string | null;
  xp_reward: number;
  time_estimate: string | null;
  assignee: string | null;
  project_id: string | null;
}

export function OpsDrilldownDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentView, setCurrentView] = useState<ViewLevel>("areas");
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [isAreaDialogOpen, setIsAreaDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "task"; id: string } | null>(null);
  
  const [newArea, setNewArea] = useState({ name: "", description: "", icon: "folder", color: "ops" });
  const [newProject, setNewProject] = useState({ title: "", description: "", deadline: "", status: "active" });

  // Fetch areas with stats
  const { data: areasWithStats = [], isLoading: areasLoading } = useQuery({
    queryKey: ["areas-with-stats", user?.id],
    queryFn: async () => {
      const { data: areas, error } = await supabase
        .from("areas")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get stats for each area
      const areasWithStats = await Promise.all(
        (areas || []).map(async (area) => {
          const { data: projects } = await supabase
            .from("projects")
            .select("id, status")
            .eq("area_id", area.id);

          const projectIds = (projects || []).map(p => p.id);
          const activeProjectCount = (projects || []).filter(p => p.status === "active").length;

          let taskCount = 0;
          let completedTaskCount = 0;

          if (projectIds.length > 0) {
            const { data: tasks } = await supabase
              .from("tasks")
              .select("id, status, completed_at")
              .in("project_id", projectIds);

            // Filter out done tasks older than 24h
            const visibleTasks = filterVisibleTasks(tasks || []);
            taskCount = visibleTasks.length;
            completedTaskCount = visibleTasks.filter(t => t.status === "done").length;
          }

          return {
            ...area,
            projectCount: projects?.length || 0,
            activeProjectCount,
            taskCount,
            completedTaskCount,
          };
        })
      );

      return areasWithStats;
    },
    enabled: !!user?.id,
  });

  // Fetch projects for selected area
  const { data: projectsWithStats = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects-with-stats", selectedArea?.id, user?.id],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("area_id", selectedArea?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const projectsWithStats = await Promise.all(
        (projects || []).map(async (project) => {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("id, status, xp_reward, time_estimate, completed_at")
            .eq("project_id", project.id);

          // Filter out done tasks older than 24h
          const visibleTasks = filterVisibleTasks(tasks || []);
          const taskCount = visibleTasks.length;
          const completedTaskCount = visibleTasks.filter(t => t.status === "done").length;
          const totalXp = visibleTasks.filter(t => t.status === "done").reduce((sum, t) => sum + t.xp_reward, 0);
          
          // Calculate time estimate (simplified) - only for visible tasks
          const timeEstimate = visibleTasks.reduce((sum, t) => {
            if (!t.time_estimate) return sum;
            const match = t.time_estimate.match(/(\d+)(m|h)/);
            if (match) {
              const value = parseInt(match[1]);
              return sum + (match[2] === "h" ? value * 60 : value);
            }
            return sum;
          }, 0);

          const hours = Math.floor(timeEstimate / 60);
          const mins = timeEstimate % 60;
          const timeString = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : mins > 0 ? `${mins}m` : "0h";

          return {
            ...project,
            taskCount,
            completedTaskCount,
            totalXp,
            timeEstimate: timeString,
          };
        })
      );

      return projectsWithStats;
    },
    enabled: !!selectedArea?.id && currentView === "projects",
  });

  // Fetch tasks for selected project (filter out done > 24h)
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["project-tasks", selectedProject?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", selectedProject?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Filter out done tasks older than 24h
      return filterVisibleTasks(data || []) as Task[];
    },
    enabled: !!selectedProject?.id && currentView === "tasks",
  });

  // Mutations
  const createAreaMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("areas").insert({
        user_id: user?.id,
        name: newArea.name,
        description: newArea.description || null,
        icon: newArea.icon,
        color: newArea.color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas-with-stats"] });
      setIsAreaDialogOpen(false);
      setNewArea({ name: "", description: "", icon: "folder", color: "ops" });
      toast.success("Area created");
    },
    onError: () => toast.error("Failed to create area"),
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").insert({
        user_id: user?.id,
        title: newProject.title,
        description: newProject.description || null,
        deadline: newProject.deadline || null,
        status: newProject.status,
        area_id: selectedArea?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["areas-with-stats"] });
      setIsProjectDialogOpen(false);
      setNewProject({ title: "", description: "", deadline: "", status: "active" });
      toast.success("Project created");
    },
    onError: () => toast.error("Failed to create project"),
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status, 
          completed_at: status === "done" ? new Date().toISOString() : null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["areas-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["projects-with-stats"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["areas-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["projects-with-stats"] });
      toast.success("Mission deleted");
    },
  });

  // Navigation handlers
  const navigateToArea = (area: Area) => {
    setSelectedArea(area);
    setCurrentView("projects");
  };

  const navigateToProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView("tasks");
  };

  const navigateBack = () => {
    if (currentView === "tasks") {
      setSelectedProject(null);
      setCurrentView("projects");
    } else if (currentView === "projects") {
      setSelectedArea(null);
      setCurrentView("areas");
    }
  };

  const navigateToAreas = () => {
    setSelectedArea(null);
    setSelectedProject(null);
    setCurrentView("areas");
  };

  // Breadcrumb items
  const getBreadcrumbItems = (): { label: string; onClick?: () => void }[] => {
    const items: { label: string; onClick?: () => void }[] = [{ label: "Areas", onClick: navigateToAreas }];
    
    if (selectedArea) {
      items.push({
        label: selectedArea.name,
        onClick: currentView === "tasks" ? () => {
          setSelectedProject(null);
          setCurrentView("projects");
        } : undefined,
      });
    }
    
    if (selectedProject) {
      items.push({ label: selectedProject.title, onClick: undefined });
    }
    
    return items;
  };

  const confirmDelete = () => {
    if (itemToDelete?.type === "task") {
      deleteTaskMutation.mutate(itemToDelete.id);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Loading states
  const isLoading = (currentView === "areas" && areasLoading) ||
    (currentView === "projects" && projectsLoading) ||
    (currentView === "tasks" && tasksLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground font-mono animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      {currentView !== "areas" && (
        <OpsBreadcrumb items={getBreadcrumbItems()} />
      )}

      {/* Header with Back button and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {currentView !== "areas" && (
            <Button variant="ghost" size="icon" onClick={navigateBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="font-display text-lg text-ops text-glow-ops">
              {currentView === "areas" && "OPERATIONS HQ"}
              {currentView === "projects" && selectedArea?.name.toUpperCase()}
              {currentView === "tasks" && selectedProject?.title.toUpperCase()}
            </h2>
            <p className="text-muted-foreground text-sm">
              {currentView === "areas" && `${areasWithStats.length} operational areas`}
              {currentView === "projects" && `${projectsWithStats.length} projects`}
              {currentView === "tasks" && `${tasks.length} missions`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {currentView === "areas" && (
            <Dialog open={isAreaDialogOpen} onOpenChange={setIsAreaDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-ops/20 text-ops border border-ops/30 hover:bg-ops/30">
                  <Plus className="w-4 h-4 mr-2" />
                  NEW AREA
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-ops/30">
                <DialogHeader>
                  <DialogTitle className="font-display text-ops">CREATE AREA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Area name (e.g., Business, Health, Personal)"
                    value={newArea.name}
                    onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                    className="bg-background border-border"
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newArea.description}
                    onChange={(e) => setNewArea({ ...newArea, description: e.target.value })}
                    className="bg-background border-border"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
                      <Select value={newArea.icon} onValueChange={(v) => setNewArea({ ...newArea, icon: v })}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="folder">Folder</SelectItem>
                          <SelectItem value="target">Target</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Color</label>
                      <Select value={newArea.color} onValueChange={(v) => setNewArea({ ...newArea, color: v })}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ops">Orange (Ops)</SelectItem>
                          <SelectItem value="bio">Green (Bio)</SelectItem>
                          <SelectItem value="vault">Yellow (Vault)</SelectItem>
                          <SelectItem value="chronos">Blue (Chronos)</SelectItem>
                          <SelectItem value="cortex">Purple (Cortex)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={() => createAreaMutation.mutate()}
                    disabled={!newArea.name || createAreaMutation.isPending}
                    className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
                  >
                    {createAreaMutation.isPending ? "CREATING..." : "CREATE AREA"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {currentView === "projects" && (
            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
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
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={() => createProjectMutation.mutate()}
                    disabled={!newProject.title || createProjectMutation.isPending}
                    className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
                  >
                    {createProjectMutation.isPending ? "CREATING..." : "CREATE PROJECT"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {currentView === "tasks" && (
            <AddTaskModal 
              defaultAreaId={selectedArea?.id} 
              defaultProjectId={selectedProject?.id} 
            />
          )}
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {/* Level 1: Areas Grid */}
        {currentView === "areas" && (
          <motion.div
            key="areas"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {areasWithStats.length === 0 ? (
              <div className="space-card p-12 text-center">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No areas yet. Create your first operational area!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {areasWithStats.map((area, index) => (
                  <AreaCard
                    key={area.id}
                    area={area}
                    index={index}
                    onClick={() => navigateToArea(area)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Level 2: Projects List */}
        {currentView === "projects" && (
          <motion.div
            key="projects"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {projectsWithStats.length === 0 ? (
              <div className="space-card p-12 text-center">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No projects in this area yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projectsWithStats.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    onClick={() => navigateToProject(project)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Level 3: Tasks List */}
        {currentView === "tasks" && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {tasks.length === 0 ? (
              <div className="space-card p-12 text-center">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No missions in this project yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    index={index}
                    onStatusChange={(id, status) => updateTaskStatusMutation.mutate({ id, status })}
                    onEdit={(task) => toast.info("Edit modal coming soon")}
                    onDelete={(id) => {
                      setItemToDelete({ type: "task", id });
                      setDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-destructive">CONFIRM DELETE</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete this item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
