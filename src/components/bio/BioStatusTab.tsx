import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Calendar, Moon, Heart, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import { DateRangeFilter, DateRange, getDateRangeFilter } from "@/components/shared/DateRangeFilter";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";

export function BioStatusTab() {
  const { user, profile } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const hp = profile?.hp ?? 100;
  const maxHp = profile?.max_hp ?? 100;

  // Fetch habit logs with date range
  const { data: habitLogs = [] } = useQuery({
    queryKey: ["habit-logs", user?.id, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("habit_logs")
        .select("*, habit:habits(name)")
        .eq("user_id", user?.id)
        .order("completed_at", { ascending: false });

      const range = getDateRangeFilter(dateRange);
      if (range) {
        query = query
          .gte("completed_at", range.start.toISOString())
          .lte("completed_at", range.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch habits for streaks
  const { data: habits = [] } = useQuery({
    queryKey: ["habits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch daily logs for sleep data
  const { data: dailyLogs = [] } = useQuery({
    queryKey: ["daily-logs-sleep", user?.id, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user?.id)
        .order("log_date", { ascending: false });

      const range = getDateRangeFilter(dateRange);
      if (range) {
        query = query
          .gte("log_date", format(range.start, "yyyy-MM-dd"))
          .lte("log_date", format(range.end, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate HP history based on habit logs with sleep overlay - with sample data
  const hpHistory = useMemo(() => {
    const days = dateRange === "week" ? 7 : dateRange === "month" ? 30 : dateRange === "quarter" ? 90 : 30;
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });

    const hasRealData = habitLogs.length > 0 || dailyLogs.length > 0;

    return interval.map((day, index) => {
      const dayLogs = habitLogs.filter((log) => {
        const logDate = new Date(log.completed_at);
        return logDate >= startOfDay(day) && logDate <= endOfDay(day);
      });

      const hpChange = dayLogs.reduce((sum, log) => sum + log.hp_change, 0);
      const baseHp = 80;
      const variance = Math.min(20, dayLogs.length * 5);

      // Find sleep data for this day
      const dayLog = dailyLogs.find((log) => log.log_date === format(day, "yyyy-MM-dd"));
      const sleepHours = (dayLog?.auto_summary as any)?.hours_slept || null;

      // Sample data if no real data
      if (!hasRealData) {
        const sampleHp = 70 + Math.sin(index * 0.3) * 15 + Math.random() * 10;
        const sampleSleep = 6 + Math.sin(index * 0.5) * 1.5 + Math.random();
        return {
          day: format(day, dateRange === "week" ? "EEE" : "d"),
          hp: Math.round(Math.min(100, Math.max(50, sampleHp))),
          sleep: Math.round(sampleSleep * 10) / 10,
        };
      }

      return {
        day: format(day, dateRange === "week" ? "EEE" : "d"),
        hp: Math.min(100, baseHp + variance + hpChange),
        sleep: sleepHours,
      };
    });
  }, [habitLogs, dailyLogs, dateRange]);

  // Calculate Recovery Score
  const recoveryScore = useMemo(() => {
    const recentLogs = dailyLogs.slice(0, 7);
    if (recentLogs.length === 0) return 50;

    const avgSleep = recentLogs.reduce((sum, log) => {
      const hours = (log.auto_summary as any)?.hours_slept || 7;
      return sum + hours;
    }, 0) / recentLogs.length;

    const avgQuality = recentLogs.reduce((sum, log) => {
      const quality = (log.auto_summary as any)?.sleep_quality || 3;
      return sum + quality;
    }, 0) / recentLogs.length;

    const avgStress = recentLogs.reduce((sum, log) => {
      const stress = (log.auto_summary as any)?.stress_level || 3;
      return sum + stress;
    }, 0) / recentLogs.length;

    // Calculate based on: sleep (40%), quality (30%), low stress (30%)
    const sleepScore = Math.min(100, (avgSleep / 8) * 100) * 0.4;
    const qualityScore = (avgQuality / 5) * 100 * 0.3;
    const stressScore = ((5 - avgStress) / 4) * 100 * 0.3;

    return Math.round(sleepScore + qualityScore + stressScore);
  }, [dailyLogs]);

  // Generate heatmap data from habit logs - with sample data (16 weeks)
  const heatmapData = useMemo(() => {
    const hasRealData = habitLogs.length > 0;
    const weeks = [];
    for (let w = 0; w < 16; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        if (hasRealData) {
          const targetDate = subDays(new Date(), (15 - w) * 7 + (6 - d));
          const dayLogs = habitLogs.filter((log) => {
            const logDate = new Date(log.completed_at);
            return logDate >= startOfDay(targetDate) && logDate <= endOfDay(targetDate);
          });
          days.push(Math.min(4, dayLogs.length));
        } else {
          // Sample data pattern
          const chance = Math.random();
          const weekBonus = w > 8 ? 0.2 : 0; // More activity in recent weeks
          if (chance < 0.15) days.push(0);
          else if (chance < 0.35 - weekBonus) days.push(1);
          else if (chance < 0.55 - weekBonus) days.push(2);
          else if (chance < 0.80 - weekBonus) days.push(3);
          else days.push(4);
        }
      }
      weeks.push(days);
    }
    return weeks;
  }, [habitLogs]);

  const getHeatmapColor = (value: number) => {
    const colors = [
      "bg-muted/30",
      "bg-bio/20",
      "bg-bio/40",
      "bg-bio/60",
      "bg-bio/80",
    ];
    return colors[value] || colors[0];
  };

  // Calculate streaks from habits
  const streaks = habits.map((habit) => ({
    habit: habit.name,
    streak: habit.streak_current,
    best: habit.streak_current, // Would need historical data for best
  }));

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <DateRangeFilter value={dateRange} onChange={setDateRange} variant="bio" />
      </div>

      {/* HP Status Card */}
      <div className="module-card-bio p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-bio" />
            <span className="font-display text-lg">VITALITY TREND</span>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl text-bio text-glow-bio">
              <AnimatedNumber value={hp} formatAsCurrency={false} />/<AnimatedNumber value={maxHp} formatAsCurrency={false} />
            </p>
            <p className="text-xs text-muted-foreground">Current HP</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hpHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis
                dataKey="day"
                stroke="hsl(0 0% 40%)"
                tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                axisLine={{ stroke: "hsl(0 0% 20%)" }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="hsl(0 0% 40%)"
                tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                axisLine={{ stroke: "hsl(0 0% 20%)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 5%)",
                  border: "1px solid hsl(340 100% 50% / 0.3)",
                  borderRadius: "8px",
                  color: "hsl(0 0% 90%)",
                }}
                labelFormatter={(value) => `Day ${value}`}
              />
              <Line
                type="monotone"
                dataKey="hp"
                stroke="hsl(340 100% 50%)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(340 100% 50%)" }}
                name="HP"
              />
              <Line
                type="monotone"
                dataKey="sleep"
                stroke="hsl(260 100% 65%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: "hsl(260 100% 65%)" }}
                name="Sleep (hrs)"
                yAxisId="right"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 12]}
                stroke="hsl(0 0% 40%)"
                tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                axisLine={{ stroke: "hsl(0 0% 20%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recovery Score & Sleep Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Score Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-card p-6 flex flex-col items-center justify-center"
        >
          <h3 className="font-display text-sm flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-bio" />
            RECOVERY SCORE
          </h3>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="hsl(0 0% 15%)"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={recoveryScore >= 70 ? "hsl(150 100% 45%)" : recoveryScore >= 40 ? "hsl(43 100% 50%)" : "hsl(340 100% 50%)"}
                strokeWidth="8"
                strokeDasharray={`${(recoveryScore / 100) * 352} 352`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono text-3xl ${
                recoveryScore >= 70 ? "text-vault" : recoveryScore >= 40 ? "text-ops" : "text-bio"
              }`}>
                <AnimatedNumber value={recoveryScore} formatAsCurrency={false} />
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {recoveryScore >= 70 ? "Fully Charged" : recoveryScore >= 40 ? "Recovering" : "Rest Needed"}
          </p>
        </motion.div>

        {/* Sleep Average */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="space-card p-6"
        >
          <h3 className="font-display text-sm flex items-center gap-2 mb-4">
            <Moon className="w-4 h-4 text-primary" />
            SLEEP STATS (7-day)
          </h3>
          <div className="space-y-4">
            {(() => {
              const recentLogs = dailyLogs.slice(0, 7);
              const avgHours = recentLogs.length > 0 
                ? recentLogs.reduce((sum, log) => sum + ((log.auto_summary as any)?.hours_slept || 0), 0) / recentLogs.length 
                : 0;
              const avgQuality = recentLogs.length > 0
                ? recentLogs.reduce((sum, log) => sum + ((log.auto_summary as any)?.sleep_quality || 0), 0) / recentLogs.length
                : 0;
              
              return (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Avg Hours</span>
                      <span className="font-mono text-primary">
                        <AnimatedNumber value={avgHours} formatAsCurrency={false} decimals={1} suffix="h" />
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill bg-primary" 
                        style={{ width: `${Math.min(100, (avgHours / 9) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Avg Quality</span>
                      <span className="font-mono text-ops">
                        <AnimatedNumber value={avgQuality} formatAsCurrency={false} decimals={1} suffix="/5" />
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill bg-ops" 
                        style={{ width: `${(avgQuality / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </motion.div>

        {/* Weekly Sleep Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="space-card p-6"
        >
          <h3 className="font-display text-sm flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-bio" />
            STRESS LEVEL (7-day)
          </h3>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyLogs.slice(0, 7).reverse().map((log, i) => ({
                day: format(new Date(log.log_date), "EEE"),
                stress: (log.auto_summary as any)?.stress_level || 0
              }))}>
                <Bar dataKey="stress" fill="hsl(340 100% 50%)" radius={[2, 2, 0, 0]} />
                <XAxis dataKey="day" stroke="hsl(0 0% 40%)" tick={{ fill: "hsl(0 0% 50%)", fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Heatmap & Streaks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consistency Heatmap - Enlarged */}
        <div className="space-card p-6 lg:col-span-2">
          <h3 className="font-display text-lg flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-bio" />
            CONSISTENCY MAP
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Last 16 weeks of habit completion
          </p>

          <div className="flex gap-1.5 justify-center">
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1.5">
                {week.map((day, dayIdx) => (
                  <motion.div
                    key={`${weekIdx}-${dayIdx}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (weekIdx * 7 + dayIdx) * 0.003 }}
                    className={`w-5 h-5 rounded-sm ${getHeatmapColor(day)} hover:ring-2 hover:ring-bio/50 transition-all cursor-pointer`}
                    title={`Week ${weekIdx + 1}, Day ${dayIdx + 1}: ${day} habits`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-6 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-sm ${getHeatmapColor(i)}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Streak Table */}
        <div className="space-card p-6">
          <h3 className="font-display text-lg flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-vault" />
            STREAK BOARD
          </h3>

          <div className="space-y-3">
            {streaks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No habits yet</p>
            ) : (
              streaks.slice(0, 5).map((item, index) => (
                <motion.div
                  key={item.habit}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <span className="text-sm font-medium">{item.habit}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-lg text-vault text-glow-vault">
                        🔥 <AnimatedNumber value={item.streak} formatAsCurrency={false} />
                      </p>
                      <p className="text-xs text-muted-foreground">current</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-muted-foreground">
                        {item.best}
                      </p>
                      <p className="text-xs text-muted-foreground">best</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
