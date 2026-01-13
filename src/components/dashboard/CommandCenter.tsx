import { motion } from "framer-motion";
import { 
  Folder, ChevronRight, Target, DollarSign, 
  Activity, TrendingUp, Clock 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { cn } from "@/lib/utils";

interface AreaWithStats {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  projectCount: number;
  taskCount: number;
  completedTaskCount: number;
  habitCount: number;
  totalIncome: number;
  totalExpense: number;
}

const iconMap: Record<string, React.ElementType> = {
  briefcase: Target,
  heart: Activity,
  users: Target,
  book: Target,
  home: Target,
  folder: Folder,
};

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  ops: { 
    bg: "bg-ops/10", 
    text: "text-ops", 
    border: "border-ops/30",
    glow: "shadow-[0_0_15px_hsl(var(--ops)/0.2)]"
  },
  bio: { 
    bg: "bg-bio/10", 
    text: "text-bio", 
    border: "border-bio/30",
    glow: "shadow-[0_0_15px_hsl(var(--bio)/0.2)]"
  },
  vault: { 
    bg: "bg-vault/10", 
    text: "text-vault", 
    border: "border-vault/30",
    glow: "shadow-[0_0_15px_hsl(var(--vault)/0.2)]"
  },
  primary: { 
    bg: "bg-primary/10", 
    text: "text-primary", 
    border: "border-primary/30",
    glow: "shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
  },
};

interface CommandCenterProps {
  onAreaClick: (areaId: string) => void;
}

export function CommandCenter({ onAreaClick }: CommandCenterProps) {
  const { user } = useAuth();

  // Fetch areas with aggregated stats
  const { data: areasWithStats = [], isLoading } = useQuery({
    queryKey: ["command-center-areas", user?.id],
    queryFn: async () => {
      // Fetch areas
      const { data: areas, error: areasError } = await supabase
        .from("areas")
        .select("*")
        .eq("user_id", user?.id);
      
      if (areasError) throw areasError;

      // Fetch projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, area_id")
        .eq("user_id", user?.id);

      // Fetch tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, project_id, status")
        .eq("user_id", user?.id);

      // Fetch habits
      const { data: habits } = await supabase
        .from("habits")
        .select("id, area_id")
        .eq("user_id", user?.id);

      // Fetch transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("id, area_id, type, amount")
        .eq("user_id", user?.id);

      // Aggregate stats per area
      return areas?.map((area) => {
        const areaProjects = projects?.filter(p => p.area_id === area.id) || [];
        const projectIds = areaProjects.map(p => p.id);
        const areaTasks = tasks?.filter(t => projectIds.includes(t.project_id)) || [];
        const areaHabits = habits?.filter(h => h.area_id === area.id) || [];
        const areaTransactions = transactions?.filter(t => t.area_id === area.id) || [];

        const totalIncome = areaTransactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalExpense = areaTransactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          id: area.id,
          name: area.name,
          description: area.description,
          icon: area.icon || "folder",
          color: area.color || "ops",
          projectCount: areaProjects.length,
          taskCount: areaTasks.length,
          completedTaskCount: areaTasks.filter(t => t.status === "done").length,
          habitCount: areaHabits.length,
          totalIncome,
          totalExpense,
        };
      }) || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-card p-6">
        <div className="animate-pulse text-muted-foreground text-center py-8">
          Loading Command Center...
        </div>
      </div>
    );
  }

  if (areasWithStats.length === 0) {
    return (
      <div className="space-card p-6">
        <div className="text-center py-8">
          <Folder className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-display text-lg text-muted-foreground">No Areas Configured</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Create areas in Ops Center → Config to organize your life domains.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg">COMMAND CENTER</h2>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {areasWithStats.length} AREAS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areasWithStats.map((area, index) => {
          const colors = colorMap[area.color] || colorMap.ops;
          const Icon = iconMap[area.icon] || Folder;
          const completionRate = area.taskCount > 0 
            ? Math.round((area.completedTaskCount / area.taskCount) * 100) 
            : 0;
          const netFlow = area.totalIncome - area.totalExpense;

          return (
            <motion.div
              key={area.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onAreaClick(area.id)}
              className={cn(
                "relative p-5 rounded-xl border cursor-pointer transition-all duration-300",
                colors.bg,
                colors.border,
                "hover:shadow-lg",
                colors.glow
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", colors.bg)}>
                    <Icon className={cn("w-5 h-5", colors.text)} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm uppercase tracking-wider">{area.name}</h3>
                    {area.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {area.description}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Projects/Tasks */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Target className="w-3 h-3" />
                    <span>OPS</span>
                  </div>
                  <p className="font-mono text-sm">
                    {area.projectCount} proj · {completionRate}%
                  </p>
                </div>

                {/* Habits */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    <span>HABITS</span>
                  </div>
                  <p className="font-mono text-sm">
                    {area.habitCount} active
                  </p>
                </div>

                {/* Financial Flow */}
                <div className="col-span-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>NET FLOW</span>
                    </div>
                    <span className={cn(
                      "font-mono text-sm font-bold",
                      netFlow >= 0 ? "text-vault" : "text-bio"
                    )}>
                      {netFlow >= 0 ? "+" : "-"}$
                      <AnimatedNumber value={Math.abs(netFlow)} formatAsCurrency={false} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-1 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                  className={cn("h-full rounded-full", colors.text.replace("text-", "bg-"))}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
