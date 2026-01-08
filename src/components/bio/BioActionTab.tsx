import { motion } from "framer-motion";
import { Heart, Droplets, Zap, CheckCircle2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLevelUp } from "@/hooks/useLevelUp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { isToday } from "date-fns";

interface Habit {
  id: string;
  name: string;
  category: "health" | "mana" | "stamina";
  type: "positive" | "negative";
  xp_reward: number;
  hp_impact: number;
  streak_current: number;
  last_completed_at: string | null;
  is_active: boolean;
  area_id: string | null;
  scheduled_time?: string | null; // Optional time in HH:mm format
}

interface Area {
  id: string;
  name: string;
}

const categoryIcons = {
  health: Heart,
  mana: Droplets,
  stamina: Zap,
};

const categoryStyles = {
  health: "text-bio border-bio/30 bg-bio/10",
  mana: "text-ops border-ops/30 bg-ops/10",
  stamina: "text-vault border-vault/30 bg-vault/10",
};

export function BioActionTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { awardXP } = useLevelUp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: "",
    category: "health" as "health" | "mana" | "stamina",
    xp_reward: 10,
    area_id: "",
    scheduled_time: "", // Add time field
  });

  const hp = profile?.hp ?? 100;
  const maxHp = profile?.max_hp ?? 100;
  const hpPercent = (hp / maxHp) * 100;

  // Fetch habits
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ["habits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Habit[];
    },
    enabled: !!user?.id,
  });

  // Fetch today's habit logs
  const { data: todayLogs = [] } = useQuery({
    queryKey: ["habit-logs-today", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", user?.id)
        .gte("completed_at", today.toISOString());

      if (error) throw error;
      return data.map((log) => log.habit_id);
    },
    enabled: !!user?.id,
  });

  const isHabitCompletedToday = (habitId: string) => todayLogs.includes(habitId);

  // Fetch areas
  const { data: areas = [] } = useQuery({
    queryKey: ["areas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data as Area[];
    },
    enabled: !!user?.id,
  });

  // Create habit mutation
  const createHabitMutation = useMutation({
    mutationFn: async (habit: typeof newHabit) => {
      const { error } = await supabase.from("habits").insert({
        user_id: user?.id,
        name: habit.name,
        category: habit.category,
        type: "positive",
        xp_reward: habit.xp_reward,
        hp_impact: 5,
        area_id: habit.area_id || null,
        scheduled_time: habit.scheduled_time || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["area-habits"] });
      setDialogOpen(false);
      setNewHabit({ name: "", category: "health", xp_reward: 10, area_id: "", scheduled_time: "" });
      toast.success("Habit created");
    },
    onError: () => toast.error("Failed to create habit"),
  });

  // Complete habit mutation with level-up
  const completeHabitMutation = useMutation({
    mutationFn: async (habit: Habit) => {
      // Create habit log
      const { error: logError } = await supabase.from("habit_logs").insert({
        user_id: user?.id,
        habit_id: habit.id,
        xp_earned: habit.xp_reward,
        hp_change: habit.hp_impact,
      });

      if (logError) throw logError;

      // Update habit streak
      const newStreak = habit.streak_current + 1;
      const { error: habitError } = await supabase
        .from("habits")
        .update({
          streak_current: newStreak,
          last_completed_at: new Date().toISOString(),
        })
        .eq("id", habit.id);

      if (habitError) throw habitError;

      // Update HP
      if (profile) {
        const newHp = Math.min((profile.hp || 100) + habit.hp_impact, profile.max_hp || 100);
        await supabase
          .from("profiles")
          .update({ hp: newHp })
          .eq("id", user?.id);
      }

      // Award XP (handles level-up automatically)
      await awardXP(habit.xp_reward);

      return habit;
    },
    onSuccess: (habit) => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-logs-today"] });

      toast.success(`🎮 +${habit.xp_reward} XP earned!`, {
        description: `Streak: ${habit.streak_current + 1} days 🔥`,
        duration: 3000,
      });
    },
    onError: () => toast.error("Failed to complete habit"),
  });

  const completedCount = habits.filter((h) => isHabitCompletedToday(h.id)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground font-mono animate-pulse">LOADING HABITS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HP Status Bar */}
      <div className="module-card-bio p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-muted-foreground uppercase tracking-wider">Health Points</span>
            <p className="text-xs text-muted-foreground mt-1">
              {completedCount}/{habits.length} habits completed today
            </p>
          </div>
          <span className="font-mono text-2xl text-bio text-glow-bio font-bold">
            {hp} / {maxHp}
          </span>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-bar-fill progress-bar-glow bg-bio"
            initial={{ width: 0 }}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">TODAY'S HABITS</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-bio/20 text-bio border border-bio/30 hover:bg-bio/30">
              <Plus className="w-4 h-4 mr-2" />
              NEW HABIT
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-bio/30">
            <DialogHeader>
              <DialogTitle className="font-display text-bio">CREATE HABIT</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Habit name"
                value={newHabit.name}
                onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                className="bg-background border-border"
              />
              {/* Area Selection */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Area</label>
                <Select
                  value={newHabit.area_id}
                  onValueChange={(v) => setNewHabit({ ...newHabit, area_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select area (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No area</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <Select
                    value={newHabit.category}
                    onValueChange={(v) => setNewHabit({ ...newHabit, category: v as typeof newHabit.category })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="mana">Mana (Mind)</SelectItem>
                      <SelectItem value="stamina">Stamina (Energy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">XP Reward</label>
                  <Select
                    value={newHabit.xp_reward.toString()}
                    onValueChange={(v) => setNewHabit({ ...newHabit, xp_reward: parseInt(v) })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 XP (Easy)</SelectItem>
                      <SelectItem value="10">10 XP (Normal)</SelectItem>
                      <SelectItem value="20">20 XP (Challenge)</SelectItem>
                      <SelectItem value="30">30 XP (Hard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Scheduled Time (optional)</label>
                <Input
                  type="time"
                  value={newHabit.scheduled_time}
                  onChange={(e) => setNewHabit({ ...newHabit, scheduled_time: e.target.value })}
                  className="bg-background border-border font-mono"
                  placeholder="HH:MM"
                />
              </div>
              <Button
                onClick={() => createHabitMutation.mutate(newHabit)}
                disabled={!newHabit.name || createHabitMutation.isPending}
                className="w-full bg-bio text-bio-foreground hover:bg-bio/90"
              >
                {createHabitMutation.isPending ? "CREATING..." : "CREATE HABIT"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No habits yet. Create your first habit to start building healthy routines!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {habits.map((habit, index) => {
            const Icon = categoryIcons[habit.category];
            const completed = isHabitCompletedToday(habit.id);
            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "space-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:border-white/20",
                  completed && "opacity-60"
                )}
                onClick={() => !completed && completeHabitMutation.mutate(habit)}
              >
                <div className={cn("p-2 rounded border", categoryStyles[habit.category])}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <span className={cn("font-medium", completed && "line-through")}>{habit.name}</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">+{habit.xp_reward} XP</span>
                    <span className="text-xs text-vault">🔥 {habit.streak_current} streak</span>
                  </div>
                </div>

                <div
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    completed ? "bg-bio border-bio" : "border-muted-foreground hover:border-bio/50"
                  )}
                >
                  {completed && <CheckCircle2 className="w-5 h-5 text-bio-foreground" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}