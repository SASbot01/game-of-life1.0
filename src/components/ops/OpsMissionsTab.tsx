import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Plus, CheckCircle2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  category: string;
  duration: number;
  dueDate: string;
  dueTime?: string; // Optional time in HH:mm format
  status: "backlog" | "todo" | "in_progress" | "done";
  difficulty: "easy" | "medium" | "hard" | "boss";
}

const initialTasks: Task[] = [
  { id: "1", title: "Design new landing page", category: "Design", duration: 120, dueDate: "2025-12-26", status: "in_progress", difficulty: "medium" },
  { id: "2", title: "Fix authentication bug", category: "Dev", duration: 60, dueDate: "2025-12-25", status: "todo", difficulty: "hard" },
  { id: "3", title: "Review Q4 metrics", category: "Business", duration: 45, dueDate: "2025-12-27", status: "backlog", difficulty: "easy" },
  { id: "4", title: "Update API documentation", category: "Dev", duration: 90, dueDate: "2025-12-28", status: "todo", difficulty: "medium" },
  { id: "5", title: "Client presentation", category: "Business", duration: 60, dueDate: "2025-12-26", status: "done", difficulty: "boss" },
];

const difficultyColors = {
  easy: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  medium: "text-ops border-ops/30 bg-ops/10",
  hard: "text-vault border-vault/30 bg-vault/10",
  boss: "text-bio border-bio/30 bg-bio/10",
};

const difficultyXP = {
  easy: 10,
  medium: 25,
  hard: 50,
  boss: 100,
};

const statusColumns: { id: Task["status"]; label: string }[] = [
  { id: "backlog", label: "BACKLOG" },
  { id: "todo", label: "TODO" },
  { id: "in_progress", label: "IN PROGRESS" },
  { id: "done", label: "DONE" },
];

export function OpsMissionsTab() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    category: "",
    duration: "60",
    dueDate: "",
    dueTime: "", // Add time field
    difficulty: "medium" as Task["difficulty"],
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast({ title: "Error", description: "Task title is required", variant: "destructive" });
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title.trim(),
      category: newTask.category || "General",
      duration: parseInt(newTask.duration) || 60,
      dueDate: newTask.dueDate || new Date().toISOString().split("T")[0],
      dueTime: newTask.dueTime || undefined,
      status: "backlog",
      difficulty: newTask.difficulty,
    };

    setTasks([...tasks, task]);
    setNewTask({ title: "", category: "", duration: "60", dueDate: "", dueTime: "", difficulty: "medium" });
    setDialogOpen(false);
    toast({ title: "Mission Created", description: `"${task.title}" added to backlog` });
  };

  const moveTask = (taskId: string, newStatus: Task["status"]) => {
    const task = tasks.find(t => t.id === taskId);
    const wasNotDone = task?.status !== "done";

    setTasks(tasks.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)));

    if (newStatus === "done" && wasNotDone && task) {
      // Trigger celebration effect
      import('canvas-confetti').then(({ default: confetti }) => {
        const particleCount = task.difficulty === 'boss' ? 100 :
          task.difficulty === 'hard' ? 60 :
            task.difficulty === 'medium' ? 40 : 25;
        confetti({
          particleCount,
          spread: 70,
          origin: { y: 0.4 },
          colors: ['#00d4ff', '#ff0080', '#ffd700'],
        });
      });

      toast({
        title: "🎮 Mission Complete!",
        description: `+${difficultyXP[task.difficulty]} XP earned`,
      });
    }
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    toast({ title: "Task Deleted" });
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">TACTICAL BOARD</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.filter(t => t.status !== "done").length} active missions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-ops hover:bg-ops/80 text-ops-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Mission
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-ops">
                CREATE MISSION
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task name..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                  placeholder="e.g., Design, Dev, Business"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (mins)</Label>
                  <Input
                    type="number"
                    value={newTask.duration}
                    onChange={(e) => setNewTask({ ...newTask, duration: e.target.value })}
                    className="bg-secondary border-border font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={newTask.difficulty}
                    onValueChange={(v) => setNewTask({ ...newTask, difficulty: v as Task["difficulty"] })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy (+10 XP)</SelectItem>
                      <SelectItem value="medium">Medium (+25 XP)</SelectItem>
                      <SelectItem value="hard">Hard (+50 XP)</SelectItem>
                      <SelectItem value="boss">Boss (+100 XP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Time (optional)</Label>
                <Input
                  type="time"
                  value={newTask.dueTime}
                  onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                  className="bg-secondary border-border font-mono"
                  placeholder="HH:MM"
                />
              </div>
              <Button
                onClick={handleCreateTask}
                className="w-full bg-ops hover:bg-ops/80 text-ops-foreground"
              >
                Create Mission
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusColumns.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);
          return (
            <div key={column.id} className="space-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  {column.label}
                </h4>
                <span className="text-xs font-mono text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {columnTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "p-3 rounded-lg border bg-secondary/30 hover:bg-secondary/50 transition-all",
                      column.id === "done" && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium", column.id === "done" && "line-through")}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn("text-xs px-1.5 py-0.5 rounded", difficultyColors[task.difficulty])}>
                            {task.difficulty.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.duration}m
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-6 w-6">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          {statusColumns
                            .filter((s) => s.id !== task.status)
                            .map((s) => (
                              <DropdownMenuItem
                                key={s.id}
                                onClick={() => moveTask(task.id, s.id)}
                              >
                                Move to {s.label}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuItem
                            onClick={() => deleteTask(task.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {column.id !== "done" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full mt-2 h-7 text-xs text-muted-foreground hover:text-ops"
                        onClick={() =>
                          moveTask(task.id, column.id === "in_progress" ? "done" : "in_progress")
                        }
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {column.id === "in_progress" ? "Complete" : "Start"}
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
