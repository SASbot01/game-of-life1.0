import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, Zap, Calendar, User, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
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
  time_estimate: string | null;
  assignee: string | null;
}

interface TaskListItemProps {
  task: Task;
  index: number;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskListItem({ task, index, onStatusChange, onEdit, onDelete }: TaskListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDifficultyColor = (difficulty: TaskDifficulty) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium": return "bg-ops/20 text-ops border-ops/30";
      case "hard": return "bg-vault/20 text-vault border-vault/30";
      case "boss": return "bg-bio/20 text-bio border-bio/30";
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "backlog": return "bg-muted text-muted-foreground";
      case "todo": return "bg-chronos/20 text-chronos";
      case "in_progress": return "bg-ops/20 text-ops";
      case "done": return "bg-green-500/20 text-green-400";
    }
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== "done";

  const handleCheckboxChange = () => {
    if (task.status === "done") {
      onStatusChange(task.id, "todo");
    } else {
      onStatusChange(task.id, "done");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`border rounded-lg transition-all ${task.status === "done" ? "border-border/30 opacity-60" : "border-border/50"} ${isOverdue ? "border-destructive/50" : ""}`}
    >
      {/* Main Row */}
      <div className="p-3 flex items-center gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={task.status === "done"}
          onCheckedChange={handleCheckboxChange}
          className="border-muted-foreground data-[state=checked]:bg-ops data-[state=checked]:border-ops"
        />

        {/* Title & Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </span>
            <Badge variant="outline" className={`text-[10px] ${getDifficultyColor(task.difficulty)}`}>
              {task.difficulty.toUpperCase()}
            </Badge>
            {isOverdue && (
              <Badge variant="outline" className="text-[10px] bg-destructive/20 text-destructive border-destructive/30">
                OVERDUE
              </Badge>
            )}
          </div>
          
          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {task.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
            {task.time_estimate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.time_estimate}
              </span>
            )}
            <span className="flex items-center gap-1 text-ops">
              <Zap className="w-3 h-3" />
              {task.xp_reward} XP
            </span>
            {task.assignee && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assignee}
              </span>
            )}
          </div>
        </div>

        {/* Expand Button */}
        {task.description && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </Button>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "backlog")}>
              Move to Backlog
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "todo")}>
              Move to Todo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "in_progress")}>
              Move to In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "done")}>
              Mark Complete
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded Description */}
      <AnimatePresence>
        {isExpanded && task.description && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-border/30">
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
