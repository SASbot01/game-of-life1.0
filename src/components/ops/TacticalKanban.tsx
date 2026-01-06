import { useState } from "react";
import { motion } from "framer-motion";
import { GripVertical, MoreVertical, Pencil, Trash2, AlertCircle, Zap, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format, isPast, isToday } from "date-fns";

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
  project?: { title: string; color_theme?: string | null } | null;
}

interface TacticalKanbanProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "backlog", label: "BACKLOG", color: "text-muted-foreground" },
  { id: "todo", label: "TODO", color: "text-chronos" },
  { id: "in_progress", label: "IN PROGRESS", color: "text-vault" },
  { id: "done", label: "DONE", color: "text-green-400" },
];

const difficultyConfig: Record<TaskDifficulty, { color: string; label: string; energy: string }> = {
  easy: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "EASY", energy: "⚡" },
  medium: { color: "bg-ops/20 text-ops border-ops/30", label: "MED", energy: "⚡⚡" },
  hard: { color: "bg-vault/20 text-vault border-vault/30", label: "HARD", energy: "⚡⚡⚡" },
  boss: { color: "bg-bio/20 text-bio border-bio/30", label: "BOSS", energy: "💀" },
};

export function TacticalKanban({ tasks, onStatusChange, onEdit, onDelete }: TacticalKanbanProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== targetStatus) {
      onStatusChange(draggedTask.id, targetStatus);
    }
    setDraggedTask(null);
  };

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter((t) => t.status === status);

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => (
        <div key={column.id} className="space-y-3">
          {/* Column Header */}
          <div className="flex items-center justify-between px-2">
            <h3 className={`font-mono text-sm uppercase tracking-wider ${column.color}`}>
              {column.label}
            </h3>
            <Badge variant="outline" className="text-xs font-mono">
              {getTasksByStatus(column.id).length}
            </Badge>
          </div>

          {/* Column Content */}
          <div
            className={`space-card min-h-[400px] p-2 space-y-2 transition-all ${
              draggedTask && draggedTask.status !== column.id 
                ? "ring-2 ring-ops/50 ring-dashed bg-ops/5" 
                : ""
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {getTasksByStatus(column.id).map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                draggable
                onDragStart={(e) => handleDragStart(e as any, task)}
                onDragEnd={handleDragEnd}
                className={`p-3 rounded-lg bg-background border border-border/50 hover:border-ops/30 transition-all group cursor-grab active:cursor-grabbing ${
                  draggedTask?.id === task.id ? "opacity-50 scale-95" : ""
                } ${task.status === "done" ? "opacity-60" : ""}`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Pencil className="w-3 h-3 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {columns.map((col) => (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={() => onStatusChange(task.id, col.id)}
                          disabled={task.status === col.id}
                        >
                          Move to {col.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(task.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Project Tag */}
                {task.project && (
                  <div className="flex items-center gap-1 mt-2 ml-6">
                    <FolderKanban className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {task.project.title}
                    </span>
                  </div>
                )}

                {/* Card Footer - Badges & Meta */}
                <div className="flex items-center gap-2 mt-2 flex-wrap ml-6">
                  {/* Difficulty Badge */}
                  <Badge variant="outline" className={`text-[10px] ${difficultyConfig[task.difficulty].color}`}>
                    {difficultyConfig[task.difficulty].energy} {task.xp_reward} XP
                  </Badge>

                  {/* Time Estimate */}
                  {task.time_estimate && (
                    <Badge variant="outline" className="text-[10px] bg-muted/30 text-muted-foreground border-muted">
                      {task.time_estimate}
                    </Badge>
                  )}

                  {/* Due Date */}
                  {task.due_date && (
                    <span className={`text-[10px] flex items-center gap-1 ${
                      isOverdue(task.due_date) && task.status !== "done" ? "text-bio" : "text-muted-foreground"
                    }`}>
                      {isOverdue(task.due_date) && task.status !== "done" && (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {format(new Date(task.due_date), "MMM d")}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Empty State */}
            {getTasksByStatus(column.id).length === 0 && (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 font-mono">
                Drop tasks here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
