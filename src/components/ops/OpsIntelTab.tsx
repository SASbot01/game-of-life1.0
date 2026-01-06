import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Target, PieChart, Crosshair, Activity, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { DateRangeFilter, DateRange, getDateRangeFilter } from "@/components/shared/DateRangeFilter";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay, subWeeks, differenceInDays } from "date-fns";

export function OpsIntelTab() {
  const { user, profile } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const level = profile?.level ?? 1;
  const xp = profile?.current_xp ?? 0;
  const maxXp = profile?.max_xp_for_next_level ?? 100;
  const xpPercent = (xp / maxXp) * 100;

  // Fetch tasks with date range
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-intel", user?.id, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, project:projects(title)")
        .eq("user_id", user?.id);

      const range = getDateRangeFilter(dateRange);
      if (range) {
        query = query
          .gte("created_at", range.start.toISOString())
          .lte("created_at", range.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate XP per day
  const xpHistory = useMemo(() => {
    const days = dateRange === "week" ? 7 : dateRange === "month" ? 30 : 14;
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });

    return interval.map((day) => {
      const dayTasks = tasks.filter((task) => {
        if (!task.completed_at) return false;
        const completedDate = new Date(task.completed_at);
        return completedDate >= startOfDay(day) && completedDate <= endOfDay(day);
      });

      return {
        day: format(day, days <= 7 ? "EEE" : "d"),
        xp: dayTasks.reduce((sum, t) => sum + (t.xp_reward || 0), 0),
      };
    });
  }, [tasks, dateRange]);

  // Project distribution (donut)
  const projectDistribution = useMemo(() => {
    const projectCounts: Record<string, number> = {};
    tasks.forEach((task) => {
      const projectName = (task.project as any)?.title || "No Project";
      projectCounts[projectName] = (projectCounts[projectName] || 0) + 1;
    });

    const colors = [
      "hsl(187 100% 50%)",
      "hsl(340 100% 50%)",
      "hsl(43 100% 50%)",
      "hsl(260 100% 65%)",
      "hsl(150 100% 45%)",
    ];

    return Object.entries(projectCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [tasks]);

  // Burn-down chart (tasks remaining over sprint)
  const burndownData = useMemo(() => {
    const sprintDays = 14;
    const startDate = subDays(new Date(), sprintDays - 1);
    const interval = eachDayOfInterval({
      start: startDate,
      end: new Date(),
    });

    const totalTasks = tasks.filter(t => new Date(t.created_at) <= new Date()).length;
    let remaining = totalTasks;

    return interval.map((day, index) => {
      const completedToday = tasks.filter((task) => {
        if (!task.completed_at) return false;
        const completedDate = new Date(task.completed_at);
        return completedDate >= startOfDay(day) && completedDate <= endOfDay(day);
      }).length;

      remaining -= completedToday;
      const ideal = totalTasks - ((totalTasks / sprintDays) * (index + 1));

      return {
        day: format(day, "d"),
        remaining: Math.max(0, remaining),
        ideal: Math.max(0, Math.round(ideal)),
      };
    });
  }, [tasks]);

  // Focus distribution (radar)
  const focusDistribution = useMemo(() => {
    const categories = ["Design", "Dev", "Marketing", "Strategy", "Admin"];
    const categoryKeywords: Record<string, string[]> = {
      Design: ["design", "ui", "ux", "figma", "mockup", "visual"],
      Dev: ["code", "dev", "build", "fix", "bug", "feature", "api"],
      Marketing: ["marketing", "content", "social", "ads", "campaign"],
      Strategy: ["plan", "strategy", "roadmap", "analysis", "research"],
      Admin: ["meeting", "email", "admin", "call", "organize"],
    };

    const counts = categories.map((cat) => {
      const keywords = categoryKeywords[cat];
      const count = tasks.filter((task) => {
        const title = task.title.toLowerCase();
        const desc = (task.description || "").toLowerCase();
        return keywords.some((kw) => title.includes(kw) || desc.includes(kw));
      }).length;
      return { subject: cat, value: count, fullMark: Math.max(10, tasks.length) };
    });

    return counts;
  }, [tasks]);

  // Productivity heatmap (GitHub style) - 52 weeks x 7 days
  const productivityHeatmap = useMemo(() => {
    const weeks = [];
    for (let w = 0; w < 26; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const targetDate = subDays(new Date(), (25 - w) * 7 + (6 - d));
        const dayTasks = tasks.filter((task) => {
          if (!task.completed_at) return false;
          const completedDate = new Date(task.completed_at);
          return completedDate >= startOfDay(targetDate) && completedDate <= endOfDay(targetDate);
        });
        days.push(dayTasks.length);
      }
      weeks.push(days);
    }
    return weeks;
  }, [tasks]);

  const getHeatmapColor = (value: number) => {
    if (value === 0) return "bg-muted/20";
    if (value === 1) return "bg-ops/20";
    if (value === 2) return "bg-ops/40";
    if (value === 3) return "bg-ops/60";
    return "bg-ops/80";
  };

  // Stats
  const stats = useMemo(() => ({
    tasksCompleted: tasks.filter(t => t.status === "done").length,
    totalXpEarned: tasks.filter(t => t.status === "done").reduce((sum, t) => sum + (t.xp_reward || 0), 0),
    avgTasksPerWeek: Math.round(tasks.filter(t => t.status === "done").length / 4),
    deepWorkHours: tasks.filter(t => t.status === "done").length * 0.75, // Estimate 45min per task
  }), [tasks]);

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <DateRangeFilter value={dateRange} onChange={setDateRange} variant="ops" />
      </div>

      {/* Rank Status */}
      <div className="module-card-ops p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-muted-foreground uppercase tracking-wider">
              Operator Rank
            </span>
            <p className="font-mono text-3xl text-ops text-glow-ops font-bold">
              LEVEL <AnimatedNumber value={level} formatAsCurrency={false} />
            </p>
          </div>
          <span className="font-mono text-lg text-muted-foreground">
            <AnimatedNumber value={xp} formatAsCurrency={false} /> / <AnimatedNumber value={maxXp} formatAsCurrency={false} /> XP
          </span>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-bar-fill progress-bar-glow bg-ops"
            initial={{ width: 0 }}
            animate={{ width: `${xpPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tasks Completed", value: stats.tasksCompleted, color: "text-ops" },
          { label: "Total XP Earned", value: stats.totalXpEarned, color: "text-vault" },
          { label: "Avg/Week", value: stats.avgTasksPerWeek, color: "text-bio" },
          { label: "Deep Work Hrs", value: stats.deepWorkHours.toFixed(1), color: "text-primary" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-card p-4 text-center"
          >
            <p className={`font-mono text-2xl ${stat.color}`}>
              <AnimatedNumber 
                value={typeof stat.value === 'string' ? parseFloat(stat.value) : stat.value} 
                formatAsCurrency={false}
                decimals={stat.label === "Deep Work Hrs" ? 1 : 0}
              />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Productivity Heatmap */}
      <div className="space-card p-6">
        <h3 className="font-display text-lg flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-ops" />
          PRODUCTIVITY HEATMAP
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Last 26 weeks of task completion
        </p>

        <div className="flex gap-0.5 overflow-x-auto pb-2">
          {productivityHeatmap.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-0.5">
              {week.map((day, dayIdx) => (
                <motion.div
                  key={`${weekIdx}-${dayIdx}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (weekIdx * 7 + dayIdx) * 0.002 }}
                  className={`w-3 h-3 rounded-sm ${getHeatmapColor(day)}`}
                  title={`${day} tasks completed`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${getHeatmapColor(i)}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP Velocity Chart */}
        <div className="space-card p-6">
          <h3 className="font-display text-lg flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-ops" />
            XP VELOCITY
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={xpHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(0 0% 40%)"
                  tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                />
                <YAxis
                  stroke="hsl(0 0% 40%)"
                  tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 5%)",
                    border: "1px solid hsl(187 100% 50% / 0.3)",
                    borderRadius: "8px",
                    color: "hsl(0 0% 90%)",
                  }}
                  formatter={(value) => [`${value} XP`, "Earned"]}
                />
                <Bar
                  dataKey="xp"
                  fill="hsl(187 100% 50%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Breakdown Donut */}
        <div className="space-card p-6">
          <h3 className="font-display text-lg flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-ops" />
            PROJECT BREAKDOWN
          </h3>

          {projectDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No tasks yet
            </div>
          ) : (
            <>
              <div className="h-48 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={projectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {projectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 5%)",
                        border: "1px solid hsl(0 0% 20%)",
                        borderRadius: "8px",
                        color: "hsl(0 0% 90%)",
                      }}
                      formatter={(value) => [`${value} tasks`, "Count"]}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {projectDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-20">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Burn-down Chart */}
        <div className="space-card p-6">
          <h3 className="font-display text-lg flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-bio" />
            SPRINT BURN-DOWN
          </h3>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(0 0% 40%)"
                  tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                />
                <YAxis
                  stroke="hsl(0 0% 40%)"
                  tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 5%)",
                    border: "1px solid hsl(0 0% 20%)",
                    borderRadius: "8px",
                    color: "hsl(0 0% 90%)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  stroke="hsl(0 0% 40%)"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Ideal"
                />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  stroke="hsl(340 100% 50%)"
                  strokeWidth={2}
                  dot={false}
                  name="Remaining"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus Distribution Radar */}
        <div className="space-card p-6">
          <h3 className="font-display text-lg flex items-center gap-2 mb-4">
            <Crosshair className="w-5 h-5 text-vault" />
            FOCUS DISTRIBUTION
          </h3>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={focusDistribution}>
                <PolarGrid stroke="hsl(0 0% 20%)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, "auto"]}
                  tick={{ fill: "hsl(0 0% 40%)", fontSize: 8 }}
                />
                <Radar
                  name="Tasks"
                  dataKey="value"
                  stroke="hsl(43 100% 50%)"
                  fill="hsl(43 100% 50%)"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 5%)",
                    border: "1px solid hsl(43 100% 50% / 0.3)",
                    borderRadius: "8px",
                    color: "hsl(0 0% 90%)",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="space-card p-6">
        <h3 className="font-display text-lg flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-vault" />
          RECENT ACHIEVEMENTS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "First Blood", desc: "Complete your first task", unlocked: stats.tasksCompleted >= 1 },
            { title: "Streak Master", desc: "Maintain a 7-day streak", unlocked: stats.tasksCompleted >= 7 },
            { title: "Boss Slayer", desc: "Complete a Boss-level task", unlocked: tasks.some(t => t.difficulty === "boss" && t.status === "done") },
          ].map((achievement, index) => (
            <motion.div
              key={achievement.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${
                achievement.unlocked
                  ? "border-vault/30 bg-vault/5"
                  : "border-border/50 bg-secondary/30 opacity-50"
              }`}
            >
              <p className="font-mono text-sm text-vault">{achievement.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{achievement.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}