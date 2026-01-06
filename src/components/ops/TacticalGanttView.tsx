import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, addDays, startOfWeek, differenceInDays, isWithinInterval, parseISO, isBefore, isAfter } from "date-fns";
import { Calendar, Clock, Zap, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type TaskDifficulty = "easy" | "medium" | "hard" | "boss";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "backlog" | "todo" | "in_progress" | "done";
  difficulty: TaskDifficulty;
  due_date: string | null;
  xp_reward: number;
  project_id: string | null;
  completed_at: string | null;
  time_estimate: string | null;
  project?: { title: string; color_theme?: string | null; area_id?: string | null } | null;
}

interface TacticalGanttViewProps {
  tasks: Task[];
}

const difficultyColors: Record<TaskDifficulty, string> = {
  easy: "bg-green-500/60 border-green-500",
  medium: "bg-ops/60 border-ops",
  hard: "bg-vault/60 border-vault",
  boss: "bg-purple-500/60 border-purple-500",
};

const statusColors = {
  backlog: "opacity-40",
  todo: "opacity-70",
  in_progress: "opacity-100 ring-2 ring-ops/50",
  done: "opacity-50 line-through",
};

export function TacticalGanttView({ tasks }: TacticalGanttViewProps) {
  // Calculate date range - 4 weeks starting from current week
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const numDays = 28; // 4 weeks
  
  const days = useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, { projectName: string; tasks: Task[] }> = {};
    const unassigned: Task[] = [];

    tasks.forEach((task) => {
      if (task.project_id && task.project) {
        if (!grouped[task.project_id]) {
          grouped[task.project_id] = {
            projectName: task.project.title,
            tasks: [],
          };
        }
        grouped[task.project_id].tasks.push(task);
      } else {
        unassigned.push(task);
      }
    });

    return { grouped, unassigned };
  }, [tasks]);

  // Filter tasks with due dates for timeline
  const tasksWithDates = tasks.filter((t) => t.due_date);
  const tasksWithoutDates = tasks.filter((t) => !t.due_date);

  // Calculate position of task on timeline
  const getTaskPosition = (task: Task) => {
    if (!task.due_date) return null;
    const dueDate = parseISO(task.due_date);
    const dayOffset = differenceInDays(dueDate, weekStart);
    
    if (dayOffset < 0 || dayOffset >= numDays) return null;
    
    return {
      left: `${(dayOffset / numDays) * 100}%`,
      isOverdue: isBefore(dueDate, today) && task.status !== "done",
    };
  };

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="module-card-ops p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-ops" />
          <h3 className="font-display text-ops">MISSION TIMELINE</h3>
          <Badge variant="outline" className="border-ops/30 text-ops text-xs ml-2">
            {tasksWithDates.length} SCHEDULED
          </Badge>
        </div>

        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            {/* Date Headers */}
            <div className="flex border-b border-border/50 pb-2 mb-2">
              {days.map((day, i) => {
                const isToday = differenceInDays(day, today) === 0;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`flex-1 text-center text-xs font-mono ${
                      isToday
                        ? "text-ops font-bold"
                        : isWeekend
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div>{format(day, "EEE")}</div>
                    <div className={isToday ? "bg-ops/20 rounded px-1" : ""}>
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Today Indicator Line */}
            <div className="relative h-2">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-ops z-10"
                style={{
                  left: `${(differenceInDays(today, weekStart) / numDays) * 100}%`,
                }}
              />
            </div>

            {/* Project Rows */}
            {Object.entries(tasksByProject.grouped).map(([projectId, { projectName, tasks: projectTasks }]) => (
              <div key={projectId} className="mb-4">
                <div className="text-xs font-mono text-muted-foreground mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-ops rounded-full" />
                  {projectName}
                </div>
                <div className="relative h-10 bg-background/30 rounded border border-border/30">
                  <TooltipProvider delayDuration={200}>
                    {projectTasks.map((task) => {
                      const pos = getTaskPosition(task);
                      if (!pos) return null;

                      return (
                        <Tooltip key={task.id}>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`absolute top-1 h-8 px-2 rounded border text-xs flex items-center gap-1 cursor-pointer transition-all hover:scale-105 ${
                                difficultyColors[task.difficulty]
                              } ${statusColors[task.status]} ${pos.isOverdue ? "ring-2 ring-destructive" : ""}`}
                              style={{
                                left: pos.left,
                                transform: "translateX(-50%)",
                                maxWidth: "120px",
                              }}
                            >
                              {pos.isOverdue && <AlertTriangle className="w-3 h-3 text-destructive" />}
                              <span className="truncate text-foreground">{task.title}</span>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-card border-border">
                            <div className="space-y-1">
                              <p className="font-semibold">{task.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {task.due_date && format(parseISO(task.due_date), "MMM d")}
                                <Zap className="w-3 h-3 text-ops" />
                                {task.xp_reward} XP
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {task.status.replace("_", " ").toUpperCase()}
                              </Badge>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </TooltipProvider>
                </div>
              </div>
            ))}

            {/* Unassigned Tasks Row */}
            {tasksByProject.unassigned.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-mono text-muted-foreground mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full" />
                  Unassigned Missions
                </div>
                <div className="relative h-10 bg-background/30 rounded border border-border/30">
                  <TooltipProvider delayDuration={200}>
                    {tasksByProject.unassigned.map((task) => {
                      const pos = getTaskPosition(task);
                      if (!pos) return null;

                      return (
                        <Tooltip key={task.id}>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`absolute top-1 h-8 px-2 rounded border text-xs flex items-center gap-1 cursor-pointer transition-all hover:scale-105 ${
                                difficultyColors[task.difficulty]
                              } ${statusColors[task.status]} ${pos.isOverdue ? "ring-2 ring-destructive" : ""}`}
                              style={{
                                left: pos.left,
                                transform: "translateX(-50%)",
                                maxWidth: "120px",
                              }}
                            >
                              {pos.isOverdue && <AlertTriangle className="w-3 h-3 text-destructive" />}
                              <span className="truncate text-foreground">{task.title}</span>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-card border-border">
                            <div className="space-y-1">
                              <p className="font-semibold">{task.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {task.due_date && format(parseISO(task.due_date), "MMM d")}
                                <Zap className="w-3 h-3 text-ops" />
                                {task.xp_reward} XP
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {task.status.replace("_", " ").toUpperCase()}
                              </Badge>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Unscheduled Tasks */}
      {tasksWithoutDates.length > 0 && (
        <div className="module-card-ops p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-vault" />
            <h4 className="font-mono text-sm text-muted-foreground">
              UNSCHEDULED MISSIONS ({tasksWithoutDates.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {tasksWithoutDates.slice(0, 10).map((task) => (
              <Badge
                key={task.id}
                variant="outline"
                className={`${difficultyColors[task.difficulty]} text-foreground text-xs`}
              >
                {task.title}
              </Badge>
            ))}
            {tasksWithoutDates.length > 10 && (
              <Badge variant="outline" className="text-muted-foreground">
                +{tasksWithoutDates.length - 10} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-mono">DIFFICULTY:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500/60 border border-green-500" />
          Easy
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-ops/60 border border-ops" />
          Medium
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-vault/60 border border-vault" />
          Hard
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-500/60 border border-purple-500" />
          Boss
        </div>
      </div>
    </div>
  );
}
