import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, Heart, Crosshair, Gem, Zap, Calendar, CheckCircle2,
  Shield, Sword, Target, TrendingUp, Flame, Star, Activity, Camera
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { CommandCenter } from "./CommandCenter";
import { AreaROIDashboard } from "./AreaROIDashboard";
import { AvatarUploadModal } from "@/components/profile/AvatarUploadModal";

export function CharacterSheet() {
  const { profile, user } = useAuth();
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const hp = profile?.hp ?? 100;
  const maxHp = profile?.max_hp ?? 100;
  const level = profile?.level ?? 1;
  const currentXp = profile?.current_xp ?? 0;
  const maxXp = profile?.max_xp_for_next_level ?? 100;
  const credits = profile?.credits ?? 0;

  // Fetch real data for stats
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: habits = [] } = useQuery({
    queryKey: ["habits-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: todayTasks = [] } = useQuery({
    queryKey: ["today-tasks", user?.id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("tasks")
        .select("*, project:projects(title)")
        .eq("user_id", user?.id)
        .or(`due_date.eq.${today},status.eq.in_progress`)
        .neq("status", "done")
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: xpHistory = [] } = useQuery({
    queryKey: ["xp-history", user?.id],
    queryFn: async () => {
      // Get completed tasks from last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, "EEE"),
          start: startOfDay(date).toISOString(),
          end: endOfDay(date).toISOString(),
        };
      });

      const results = await Promise.all(
        last7Days.map(async (day) => {
          const { data } = await supabase
            .from("tasks")
            .select("xp_reward")
            .eq("user_id", user?.id)
            .eq("status", "done")
            .gte("completed_at", day.start)
            .lte("completed_at", day.end);

          const xp = data?.reduce((sum, t) => sum + (t.xp_reward || 0), 0) || 0;
          return { day: day.date, xp };
        })
      );

      return results;
    },
    enabled: !!user?.id,
  });

  // Calculate real stats
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeStreaks = habits.reduce((sum, h) => sum + (h.streak_current || 0), 0);
  const totalXpEarned = tasks.filter((t) => t.status === "done").reduce((sum, t) => sum + (t.xp_reward || 0), 0);

  // Radar chart data - normalized to 100
  const radarData = [
    { stat: "VIT", value: Math.round((hp / maxHp) * 100), fullMark: 100 },
    { stat: "INT", value: Math.min(completionRate + 20, 100), fullMark: 100 },
    { stat: "WLT", value: Math.min(Math.round(Number(credits) / 100), 100), fullMark: 100 },
    { stat: "STR", value: Math.min(activeStreaks * 10, 100), fullMark: 100 },
    { stat: "DEX", value: Math.min(level * 15, 100), fullMark: 100 },
  ];

  const xpProgress = maxXp > 0 ? (currentXp / maxXp) * 100 : 0;

  // Stat card component
  const StatCard = ({
    icon: Icon,
    label,
    value,
    subValue,
    color,
    glowClass
  }: {
    icon: any;
    label: string;
    value: string | number;
    subValue?: string;
    color: string;
    glowClass: string;
  }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative p-4 rounded-lg border overflow-hidden",
        `bg-${color}/10 border-${color}/30`
      )}
      style={{
        background: `linear-gradient(135deg, hsl(var(--${color}) / 0.1), transparent)`,
        borderColor: `hsl(var(--${color}) / 0.3)`
      }}
    >
      <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
        <Icon className="w-full h-full" />
      </div>
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ background: `hsl(var(--${color}) / 0.2)` }}
        >
          <Icon className="w-5 h-5" style={{ color: `hsl(var(--${color}))` }} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p
            className={cn("font-mono text-xl font-bold", glowClass)}
            style={{ color: `hsl(var(--${color}))` }}
          >
            {typeof value === 'number' ? (
              <AnimatedNumber value={value} formatAsCurrency={false} />
            ) : (
              value
            )}
          </p>
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  // If an area is selected, show the ROI Dashboard
  if (selectedAreaId) {
    return (
      <AreaROIDashboard
        areaId={selectedAreaId}
        onBack={() => setSelectedAreaId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Command Center Section */}
      <CommandCenter onAreaClick={(areaId) => setSelectedAreaId(areaId)} />
      {/* Top Section - Character Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-card p-6"
      >
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div
              className="avatar-frame w-24 h-24 cursor-pointer transition-transform hover:scale-105"
              onClick={() => setAvatarModalOpen(true)}
            >
              <div className="avatar-frame-inner w-full h-full flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            {/* Upload Overlay */}
            <div
              className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => setAvatarModalOpen(true)}
            >
              <div className="text-center">
                <Camera className="w-6 h-6 text-white mx-auto mb-1" />
                <p className="text-xs text-white font-mono">UPLOAD</p>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-mono font-bold px-2 py-1 rounded-full border-2 border-background">
              LV.{level}
            </div>
          </div>

          {/* Character Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl text-foreground">
                {profile?.username || "OPERATOR"}
              </h1>
              <Badge icon={Star} text="ACTIVE" color="primary" />
            </div>

            {/* XP Bar */}
            <div className="space-y-1 max-w-md">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">EXPERIENCE</span>
                <span className="text-primary">
                  <AnimatedNumber value={currentXp} formatAsCurrency={false} /> / <AnimatedNumber value={maxXp} formatAsCurrency={false} /> XP
                </span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
                  style={{ boxShadow: "0 0 10px hsl(var(--primary) / 0.5)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden lg:flex items-center gap-4">
            <QuickStat icon={Flame} value={activeStreaks} label="Streaks" color="bio" />
            <QuickStat icon={Target} value={completedTasks} label="Completed" color="ops" />
            <QuickStat icon={TrendingUp} value={`${completionRate}%`} label="Rate" color="vault" />
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Core Stats */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 space-y-4"
        >
          <h3 className="font-display text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" />
            CORE ATTRIBUTES
          </h3>

          <StatCard
            icon={Heart}
            label="VITALITY"
            value={`${hp}/${maxHp}`}
            subValue="HP"
            color="bio"
            glowClass="text-glow-bio"
          />

          <StatCard
            icon={Crosshair}
            label="RANK"
            value={`LVL ${level}`}
            subValue={`${totalXpEarned} Total XP`}
            color="ops"
            glowClass="text-glow-ops"
          />

          <StatCard
            icon={Gem}
            label="WEALTH"
            value={`¤${Number(credits).toLocaleString()}`}
            subValue="Credits"
            color="vault"
            glowClass="text-glow-vault"
          />

          <StatCard
            icon={Sword}
            label="POWER"
            value={completedTasks}
            subValue="Missions Complete"
            color="primary"
            glowClass=""
          />
        </motion.div>

        {/* Center Column - Radar & XP Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-5 space-y-4"
        >
          {/* Radar Chart */}
          <div className="space-card p-6">
            <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              ATTRIBUTE MATRIX
            </h3>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <PolarAngleAxis
                    dataKey="stat"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "Orbitron" }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Stats"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-4 mt-4 text-xs font-mono flex-wrap">
              <span className="text-bio">VIT = Health</span>
              <span className="text-ops">INT = Tasks</span>
              <span className="text-vault">WLT = Credits</span>
              <span className="text-primary">STR = Streaks</span>
              <span className="text-muted-foreground">DEX = Level</span>
            </div>
          </div>

          {/* XP History Graph */}
          <div className="space-card p-6">
            <h3 className="font-display text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              XP EARNED (7 DAYS)
            </h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={xpHistory}>
                  <defs>
                    <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="xp"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#xpGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Missions & Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-4 space-y-4"
        >
          {/* Active Missions */}
          <div className="space-card p-6">
            <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              ACTIVE MISSIONS
            </h3>

            <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active missions</p>
                </div>
              ) : (
                todayTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02]",
                      "border-ops/30 bg-ops/5 hover:bg-ops/10"
                    )}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-ops/20">
                      <Crosshair className="w-4 h-4 text-ops" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.project?.title || "No project"} • {task.xp_reward} XP
                      </p>
                    </div>
                    <div className="text-xs font-mono text-ops">
                      {task.due_date ? format(new Date(task.due_date), "MMM d") : "No date"}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 border-border/50"
              onClick={() => window.location.href = "/ops"}
            >
              View All Missions
            </Button>
          </div>

          {/* System Status */}
          <div className="space-card p-4">
            <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              SYSTEM STATUS
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <StatusRow label="CONNECTION" value="ONLINE" status="success" />
              <StatusRow label="SYNC STATUS" value="ACTIVE" status="primary" />
              <StatusRow label="MODULES" value="3/3 LOADED" status="success" />
              <StatusRow label="LAST UPDATE" value={new Date().toLocaleTimeString()} status="default" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
      />
    </div>
  );
}

// Helper Components
function Badge({ icon: Icon, text, color }: { icon: any; text: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
      style={{
        background: `hsl(var(--${color}) / 0.2)`,
        color: `hsl(var(--${color}))`
      }}
    >
      <Icon className="w-3 h-3" />
      {text}
    </div>
  );
}

function QuickStat({ icon: Icon, value, label, color }: { icon: any; value: string | number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-1"
        style={{ background: `hsl(var(--${color}) / 0.2)` }}
      >
        <Icon className="w-5 h-5" style={{ color: `hsl(var(--${color}))` }} />
      </div>
      <p className="font-mono text-lg font-bold" style={{ color: `hsl(var(--${color}))` }}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusRow({ label, value, status }: { label: string; value: string; status: "success" | "primary" | "default" }) {
  const statusColors = {
    success: "text-emerald-500",
    primary: "text-primary",
    default: "text-foreground",
  };

  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={statusColors[status]}>
        {status === "success" && "● "}
        {value}
      </span>
    </div>
  );
}
