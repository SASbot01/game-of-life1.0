import { motion } from "framer-motion";
import { ChevronRight, FolderKanban, Target, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";

interface Area {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  projectCount: number;
  activeProjectCount: number;
  taskCount: number;
  completedTaskCount: number;
}

interface AreaCardProps {
  area: Area;
  index: number;
  onClick: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: FolderKanban,
  target: Target,
  check: CheckCircle2,
};

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  ops: { bg: "bg-ops/10", text: "text-ops", border: "border-ops/30", glow: "text-glow-ops" },
  bio: { bg: "bg-bio/10", text: "text-bio", border: "border-bio/30", glow: "text-glow-bio" },
  vault: { bg: "bg-vault/10", text: "text-vault", border: "border-vault/30", glow: "text-glow-vault" },
  chronos: { bg: "bg-chronos/10", text: "text-chronos", border: "border-chronos/30", glow: "text-glow-chronos" },
  cortex: { bg: "bg-cortex/10", text: "text-cortex", border: "border-cortex/30", glow: "text-glow-cortex" },
};

export function AreaCard({ area, index, onClick }: AreaCardProps) {
  const IconComponent = iconMap[area.icon] || FolderKanban;
  const colors = colorMap[area.color] || colorMap.ops;
  
  const completionPercent = area.taskCount > 0 
    ? Math.round((area.completedTaskCount / area.taskCount) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`relative p-6 rounded-lg border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${colors.bg} ${colors.border} hover:shadow-lg hover:shadow-${area.color}/20`}
    >
      {/* Icon */}
      <div className={`w-14 h-14 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-4`}>
        <IconComponent className={`w-7 h-7 ${colors.text}`} />
      </div>

      {/* Title & Description */}
      <h3 className={`font-display text-xl ${colors.text} ${colors.glow} mb-1`}>
        {area.name}
      </h3>
      {area.description && (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {area.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Projects</span>
          <div className={`font-mono text-lg ${colors.text}`}>
            <AnimatedNumber value={area.activeProjectCount} formatAsCurrency={false} />
            <span className="text-muted-foreground text-sm"> / {area.projectCount}</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Tasks</span>
          <div className={`font-mono text-lg ${colors.text}`}>
            <AnimatedNumber value={area.taskCount - area.completedTaskCount} formatAsCurrency={false} />
            <span className="text-muted-foreground text-sm"> pending</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Completion</span>
          <span className={`font-mono ${colors.text}`}>
            <AnimatedNumber value={completionPercent} formatAsCurrency={false} suffix="%" />
          </span>
        </div>
        <Progress value={completionPercent} className={`h-2 ${colors.bg}`} />
      </div>

      {/* Chevron */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2">
        <ChevronRight className={`w-5 h-5 ${colors.text} opacity-50`} />
      </div>
    </motion.div>
  );
}
