import { motion } from "framer-motion";
import { ChevronRight, Clock, Zap, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { format } from "date-fns";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  taskCount: number;
  completedTaskCount: number;
  totalXp: number;
  timeEstimate: string;
}

interface ProjectCardProps {
  project: Project;
  index: number;
  onClick: () => void;
}

export function ProjectCard({ project, index, onClick }: ProjectCardProps) {
  const completionPercent = project.taskCount > 0 
    ? Math.round((project.completedTaskCount / project.taskCount) * 100) 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-ops/20 text-ops border-ops/30";
      case "on_hold": return "bg-vault/20 text-vault border-vault/30";
      case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "archived": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="relative p-4 rounded-lg border border-border/50 bg-card/50 cursor-pointer transition-all duration-300 hover:bg-card hover:border-ops/30 hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        {/* Main Content */}
        <div className="flex-1 space-y-3">
          {/* Title & Status */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-title text-lg text-foreground">{project.title}</h4>
              {project.description && (
                <p className="text-muted-foreground text-sm line-clamp-1 mt-1">
                  {project.description}
                </p>
              )}
            </div>
            <Badge variant="outline" className={getStatusColor(project.status)}>
              {project.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {project.completedTaskCount}/{project.taskCount} tasks
              </span>
              <span className="text-ops font-mono">
                <AnimatedNumber value={completionPercent} formatAsCurrency={false} suffix="%" />
              </span>
            </div>
            <Progress value={completionPercent} className="h-1.5 bg-ops/10" />
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {project.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(project.deadline), "MMM d")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {project.timeEstimate || "0h"}
            </span>
            <span className="flex items-center gap-1 text-ops">
              <Zap className="w-3 h-3" />
              <AnimatedNumber value={project.totalXp} formatAsCurrency={false} /> XP
            </span>
          </div>
        </div>

        {/* Chevron */}
        <div className="flex items-center h-full">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}
