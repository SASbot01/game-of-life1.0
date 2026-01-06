import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Target, TrendingUp, Activity } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

interface TimeBreakdown {
  module: string;
  hours: number;
  color: string;
  label: string;
}

export function TimeAnalytics() {
  const { user } = useAuth();
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  // Fetch tasks completed this week
  const { data: thisWeekTasks = [] } = useQuery({
    queryKey: ["tasks-this-week", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, project:projects(title)")
        .eq("user_id", user?.id)
        .eq("status", "done")
        .gte("completed_at", thisWeekStart.toISOString())
        .lte("completed_at", thisWeekEnd.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch tasks completed last week
  const { data: lastWeekTasks = [] } = useQuery({
    queryKey: ["tasks-last-week", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id")
        .eq("user_id", user?.id)
        .eq("status", "done")
        .gte("completed_at", lastWeekStart.toISOString())
        .lte("completed_at", lastWeekEnd.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch habit logs this week
  const { data: thisWeekHabits = [] } = useQuery({
    queryKey: ["habits-this-week", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_logs")
        .select("id")
        .eq("user_id", user?.id)
        .gte("completed_at", thisWeekStart.toISOString())
        .lte("completed_at", thisWeekEnd.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch transactions this week
  const { data: thisWeekTransactions = [] } = useQuery({
    queryKey: ["transactions-this-week", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user?.id)
        .gte("date", format(thisWeekStart, "yyyy-MM-dd"))
        .lte("date", format(thisWeekEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate time breakdown
  const weeklyData: TimeBreakdown[] = useMemo(() => {
    // Estimate hours based on activities (rough approximation)
    const bioHours = thisWeekHabits.length * 0.25; // 15 min per habit
    const opsHours = thisWeekTasks.length * 0.75; // 45 min per task
    const vaultHours = thisWeekTransactions.length * 0.1; // 6 min per transaction

    return [
      { module: "bio", hours: Math.round(bioHours * 10) / 10, color: "hsl(var(--bio))", label: "Bio-Dome" },
      { module: "ops", hours: Math.round(opsHours * 10) / 10, color: "hsl(var(--ops))", label: "Ops Center" },
      { module: "vault", hours: Math.round(vaultHours * 10) / 10, color: "hsl(var(--vault))", label: "The Vault" },
    ].filter(d => d.hours > 0);
  }, [thisWeekHabits, thisWeekTasks, thisWeekTransactions]);

  // Calculate totals
  const totalHoursThisWeek = weeklyData.reduce((sum, d) => sum + d.hours, 0) || 1;
  const totalHoursLastWeek = lastWeekTasks.length * 0.75; // Rough estimate
  const hoursDiff = totalHoursThisWeek - totalHoursLastWeek;
  const percentChange = totalHoursLastWeek > 0 ? ((hoursDiff / totalHoursLastWeek) * 100).toFixed(0) : 0;

  const displayData = weeklyData.length > 0 ? weeklyData : [
    { module: "none", hours: 1, color: "hsl(var(--muted))", label: "No activity" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-card p-4 space-y-4"
    >
      <div className="flex items-center gap-2 text-ops">
        <Activity className="w-5 h-5" />
        <h3 className="font-title text-sm uppercase tracking-wider">TIME STATS</h3>
      </div>

      {/* Pie Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="hours"
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value}h (${((value / totalHoursThisWeek) * 100).toFixed(0)}%)`,
                props.payload.label,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {weeklyData.map((item) => (
          <div key={item.module} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
            <span className="font-mono">{item.hours}h</span>
          </div>
        ))}
        {weeklyData.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">No activity this week</p>
        )}
      </div>

      {/* KPIs */}
      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Focus Hours</span>
          </div>
          <span className="font-mono text-lg text-ops">{totalHoursThisWeek.toFixed(1)}h</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">vs Last Week</span>
          </div>
          <span
            className={`font-mono text-sm ${
              hoursDiff >= 0 ? "text-green-500" : "text-bio"
            }`}
          >
            {hoursDiff >= 0 ? "+" : ""}
            {hoursDiff.toFixed(1)}h ({percentChange}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="w-4 h-4" />
            <span className="text-sm">Daily Average</span>
          </div>
          <span className="font-mono text-sm">{(totalHoursThisWeek / 7).toFixed(1)}h</span>
        </div>
      </div>
    </motion.div>
  );
}