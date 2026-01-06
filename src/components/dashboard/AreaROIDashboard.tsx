import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, DollarSign, Target, Activity, TrendingUp, TrendingDown,
  Clock, CheckCircle2, Zap, PieChart, BarChart3
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { AddTaskModal } from "@/components/ops/AddTaskModal";
import { AddTransactionModal } from "@/components/vault/AddTransactionModal";

interface AreaROIDashboardProps {
  areaId: string;
  onBack: () => void;
}

export function AreaROIDashboard({ areaId, onBack }: AreaROIDashboardProps) {
  const { user } = useAuth();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  // Fetch area details
  const { data: area } = useQuery({
    queryKey: ["area-details", areaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("*")
        .eq("id", areaId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!areaId,
  });

  // Fetch projects for this area
  const { data: projects = [] } = useQuery({
    queryKey: ["area-projects", areaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("area_id", areaId)
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!areaId && !!user?.id,
  });

  // Fetch tasks for this area's projects
  const { data: tasks = [] } = useQuery({
    queryKey: ["area-tasks", areaId, projects],
    queryFn: async () => {
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .in("project_id", projectIds)
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && projects.length > 0,
  });

  // Fetch habits for this area
  const { data: habits = [] } = useQuery({
    queryKey: ["area-habits", areaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("area_id", areaId)
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!areaId && !!user?.id,
  });

  // Fetch transactions for this area
  const { data: transactions = [] } = useQuery({
    queryKey: ["area-transactions", areaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("area_id", areaId)
        .eq("user_id", user?.id)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!areaId && !!user?.id,
  });

  // Fetch habit logs for consistency calculation
  const { data: habitLogs = [] } = useQuery({
    queryKey: ["area-habit-logs", areaId, habits],
    queryFn: async () => {
      const habitIds = habits.map(h => h.id);
      if (habitIds.length === 0) return [];

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .in("habit_id", habitIds)
        .gte("completed_at", thirtyDaysAgo);
      if (error) throw error;
      return data;
    },
    enabled: habits.length > 0,
  });

  // Calculate metrics
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netFlow = totalIncome - totalExpense;
  const roi = totalExpense > 0 ? ((totalIncome - totalExpense) / totalExpense) * 100 : 0;

  const completedTasks = tasks.filter(t => t.status === "done").length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalTimeEstimate = tasks.reduce((sum, t) => {
    const match = t.time_estimate?.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  const activeProjects = projects.filter(p => p.status === "active").length;
  const completedProjects = projects.filter(p => p.status === "completed").length;

  // Habit consistency (last 30 days)
  const habitConsistency = habits.length > 0 
    ? Math.round((habitLogs.length / (habits.length * 30)) * 100)
    : 0;

  const totalStreaks = habits.reduce((sum, h) => sum + (h.streak_current || 0), 0);

  // Financial flow over time (last 30 days)
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  const financialChartData = last30Days.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTransactions = transactions.filter(t => t.date === dayStr);
    const income = dayTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = dayTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      date: format(day, "MMM d"),
      income,
      expense,
      net: income - expense
    };
  });

  // Task status distribution for pie chart
  const taskStatusData = [
    { name: "Done", value: tasks.filter(t => t.status === "done").length, color: "hsl(var(--vault))" },
    { name: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: "hsl(var(--ops))" },
    { name: "Backlog", value: tasks.filter(t => t.status === "backlog").length, color: "hsl(var(--muted-foreground))" },
  ].filter(d => d.value > 0);

  // Project status data for bar chart
  const projectStatusData = [
    { status: "Active", count: activeProjects },
    { status: "Completed", count: completedProjects },
    { status: "On Hold", count: projects.filter(p => p.status === "on_hold").length },
  ];

  const colorStyles = {
    ops: { text: "text-ops", bg: "bg-ops/10", border: "border-ops/30" },
    bio: { text: "text-bio", bg: "bg-bio/10", border: "border-bio/30" },
    vault: { text: "text-vault", bg: "bg-vault/10", border: "border-vault/30" },
    primary: { text: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  };

  const colors = colorStyles[(area?.color as keyof typeof colorStyles) || "ops"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className={cn("font-display text-2xl uppercase", colors.text)}>
              {area?.name || "Loading..."}
            </h1>
            <p className="text-sm text-muted-foreground">
              {area?.description || "Area Performance Dashboard"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddTask(true)}
            className="border-ops/30 text-ops hover:bg-ops/10"
          >
            <Target className="w-4 h-4 mr-2" />
            Add Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddTransaction(true)}
            className="border-vault/30 text-vault hover:bg-vault/10"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={DollarSign}
          label="Net Flow"
          value={netFlow}
          prefix={netFlow >= 0 ? "+$" : "-$"}
          valueFormatted={Math.abs(netFlow)}
          variant={netFlow >= 0 ? "vault" : "bio"}
          subtext={`${roi >= 0 ? "+" : ""}${roi.toFixed(1)}% ROI`}
        />
        <KPICard
          icon={Target}
          label="Task Completion"
          value={completionRate}
          suffix="%"
          variant="ops"
          subtext={`${completedTasks}/${totalTasks} tasks`}
        />
        <KPICard
          icon={Clock}
          label="Time Invested"
          value={totalTimeEstimate}
          suffix="h"
          variant="primary"
          subtext={`${projects.length} projects`}
        />
        <KPICard
          icon={Activity}
          label="Habit Consistency"
          value={habitConsistency}
          suffix="%"
          variant="bio"
          subtext={`${totalStreaks} total streak days`}
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Flow Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-card p-6"
        >
          <h3 className="font-display text-lg text-vault mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            FINANCIAL FLOW (30 DAYS)
          </h3>
          
          {transactions.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No transactions linked to this area yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialChartData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--vault))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--vault))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--bio))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--bio))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="hsl(var(--vault))"
                    fill="url(#incomeGradient)"
                    strokeWidth={2}
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="hsl(var(--bio))"
                    fill="url(#expenseGradient)"
                    strokeWidth={2}
                    name="Expense"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Income</p>
              <p className="font-mono text-lg text-vault">
                +$<AnimatedNumber value={totalIncome} formatAsCurrency={false} />
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Expense</p>
              <p className="font-mono text-lg text-bio">
                -$<AnimatedNumber value={totalExpense} formatAsCurrency={false} />
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Net</p>
              <p className={cn("font-mono text-lg font-bold", netFlow >= 0 ? "text-vault" : "text-bio")}>
                {netFlow >= 0 ? "+" : "-"}$<AnimatedNumber value={Math.abs(netFlow)} formatAsCurrency={false} />
              </p>
            </div>
          </div>
        </motion.div>

        {/* Operations Performance */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-card p-6"
        >
          <h3 className="font-display text-lg text-ops mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            OPERATIONS PERFORMANCE
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Task Distribution Pie */}
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-2 text-center">Task Status</p>
              {taskStatusData.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  No tasks
                </div>
              ) : (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Project Status Bar */}
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-2 text-center">Projects</p>
              {projects.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  No projects
                </div>
              ) : (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectStatusData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="status" 
                        width={60}
                        fontSize={10}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--ops))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Ops Summary */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Projects</p>
              <p className="font-mono text-lg text-ops">{projects.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Tasks</p>
              <p className="font-mono text-lg text-foreground">{totalTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Completion</p>
              <p className="font-mono text-lg text-vault">{completionRate}%</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Habits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-card p-6"
      >
        <h3 className="font-display text-lg text-bio mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          HABIT CONSISTENCY
        </h3>

        {habits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No habits linked to this area yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="p-4 rounded-lg border border-bio/20 bg-bio/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{habit.name}</span>
                  <span className="text-xs text-bio font-mono">
                    🔥 {habit.streak_current}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3" />
                  <span>{habit.xp_reward} XP per completion</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase">Total Habits</p>
            <p className="font-mono text-lg text-bio">{habits.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase">30-Day Logs</p>
            <p className="font-mono text-lg text-foreground">{habitLogs.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase">Consistency</p>
            <p className="font-mono text-lg text-vault">{habitConsistency}%</p>
          </div>
        </div>
      </motion.div>

      {/* Add Task Modal - Pre-filled with current area */}
      <AddTaskModal
        defaultAreaId={areaId}
        isOpen={showAddTask}
        onOpenChange={setShowAddTask}
        showTrigger={false}
      />

      {/* Add Transaction Modal - Pre-filled with current area */}
      {showAddTransaction && (
        <AddTransactionModal
          defaultAreaId={areaId}
          onClose={() => setShowAddTransaction(false)}
        />
      )}
    </div>
  );
}

// KPI Card Component
function KPICard({
  icon: Icon,
  label,
  value,
  prefix = "",
  suffix = "",
  valueFormatted,
  variant,
  subtext,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  valueFormatted?: number;
  variant: "ops" | "bio" | "vault" | "primary";
  subtext?: string;
}) {
  const variantStyles = {
    ops: { text: "text-ops", bg: "bg-ops/10", border: "border-ops/30" },
    bio: { text: "text-bio", bg: "bg-bio/10", border: "border-bio/30" },
    vault: { text: "text-vault", bg: "bg-vault/10", border: "border-vault/30" },
    primary: { text: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  };

  const colors = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "p-4 rounded-xl border",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded-lg", colors.bg)}>
          <Icon className={cn("w-4 h-4", colors.text)} />
        </div>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("font-mono text-2xl font-bold", colors.text)}>
        {prefix}
        <AnimatedNumber value={valueFormatted ?? value} formatAsCurrency={false} />
        {suffix}
      </p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </motion.div>
  );
}
