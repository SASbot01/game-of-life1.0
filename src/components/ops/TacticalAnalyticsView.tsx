import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { CheckCircle2, Clock, ListTodo, Archive } from "lucide-react";

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
type TaskDifficulty = "easy" | "medium" | "hard" | "boss";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  xp_reward: number;
  project?: { title: string } | null;
}

interface TacticalAnalyticsViewProps {
  tasks: Task[];
}

const statusColors: Record<TaskStatus, string> = {
  backlog: "hsl(var(--muted-foreground))",
  todo: "hsl(var(--chronos, 187 100% 50%))",
  in_progress: "hsl(var(--ops))",
  done: "hsl(142, 71%, 45%)",
};

const difficultyColors: Record<TaskDifficulty, string> = {
  easy: "hsl(142, 71%, 45%)",
  medium: "hsl(var(--ops))",
  hard: "hsl(var(--vault))",
  boss: "hsl(var(--bio))",
};

export function TacticalAnalyticsView({ tasks }: TacticalAnalyticsViewProps) {
  // Status distribution
  const statusData = [
    { name: "Backlog", value: tasks.filter(t => t.status === "backlog").length, color: statusColors.backlog },
    { name: "Todo", value: tasks.filter(t => t.status === "todo").length, color: statusColors.todo },
    { name: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: statusColors.in_progress },
    { name: "Done", value: tasks.filter(t => t.status === "done").length, color: statusColors.done },
  ].filter(d => d.value > 0);

  // Difficulty distribution
  const difficultyData = [
    { name: "Easy", value: tasks.filter(t => t.difficulty === "easy").length, color: difficultyColors.easy },
    { name: "Medium", value: tasks.filter(t => t.difficulty === "medium").length, color: difficultyColors.medium },
    { name: "Hard", value: tasks.filter(t => t.difficulty === "hard").length, color: difficultyColors.hard },
    { name: "Boss", value: tasks.filter(t => t.difficulty === "boss").length, color: difficultyColors.boss },
  ].filter(d => d.value > 0);

  // Project distribution (top 5)
  const projectCounts = tasks.reduce((acc, task) => {
    const projectName = task.project?.title || "No Project";
    acc[projectName] = (acc[projectName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const projectData = Object.entries(projectCounts)
    .map(([name, count]) => ({ name: name.slice(0, 15), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalXP = tasks.filter(t => t.status === "done").reduce((sum, t) => sum + t.xp_reward, 0);
  const pendingXP = tasks.filter(t => t.status !== "done").reduce((sum, t) => sum + t.xp_reward, 0);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-card p-4 text-center"
        >
          <Archive className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono text-foreground">{totalTasks}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Tasks</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-card p-4 text-center"
        >
          <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono text-green-400">{completionRate}%</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Completion</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-card p-4 text-center"
        >
          <Clock className="w-5 h-5 text-vault mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono text-vault">{totalXP}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">XP Earned</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-card p-4 text-center"
        >
          <ListTodo className="w-5 h-5 text-ops mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono text-ops">{pendingXP}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending XP</p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-card p-4"
        >
          <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-4">
            Status Distribution
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
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
                <Legend 
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Difficulty Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="space-card p-4"
        >
          <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-4">
            Energy Levels
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
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
                <Legend 
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Project Bar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="space-card p-4"
        >
          <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-4">
            Tasks by Project
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--ops))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
