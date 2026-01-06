import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Zap, CheckCircle2, Heart, DollarSign, Smile, Meh, Frown, ThumbsUp, ThumbsDown, Moon, Brain, BatteryLow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, subDays, addDays, startOfDay, endOfDay, isToday } from "date-fns";

interface DailyLog {
  id: string;
  log_date: string;
  content: string | null;
  auto_summary: {
    tasks_completed?: number;
    xp_earned?: number;
    habits_done?: number;
    money_spent?: number;
    money_earned?: number;
    hours_slept?: number;
    sleep_quality?: number;
    stress_level?: number;
  };
  mood: string | null;
}

const moodOptions = [
  { value: "great", icon: ThumbsUp, label: "Great", color: "text-green-400" },
  { value: "good", icon: Smile, label: "Good", color: "text-ops" },
  { value: "neutral", icon: Meh, label: "Neutral", color: "text-muted-foreground" },
  { value: "bad", icon: Frown, label: "Bad", color: "text-vault" },
  { value: "terrible", icon: ThumbsDown, label: "Terrible", color: "text-bio" },
];

export function CortexLogTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [hoursSlept, setHoursSlept] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [stressLevel, setStressLevel] = useState<number>(3);

  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Fetch daily log for selected date
  const { data: dailyLog, isLoading: logLoading } = useQuery({
    queryKey: ["daily-log", user?.id, formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user?.id)
        .eq("log_date", formattedDate)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setContent(data.content || "");
        setSelectedMood(data.mood);
        const summary = data.auto_summary as DailyLog["auto_summary"];
        setHoursSlept(summary?.hours_slept ?? 7);
        setSleepQuality(summary?.sleep_quality ?? 3);
        setStressLevel(summary?.stress_level ?? 3);
      } else {
        setContent("");
        setSelectedMood(null);
        setHoursSlept(7);
        setSleepQuality(3);
        setStressLevel(3);
      }
      
      return data as DailyLog | null;
    },
    enabled: !!user?.id,
  });

  // Fetch auto-summary data
  const { data: summaryData } = useQuery({
    queryKey: ["daily-summary", user?.id, formattedDate],
    queryFn: async () => {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      // Get completed tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("xp_reward")
        .eq("user_id", user?.id)
        .eq("status", "done")
        .gte("completed_at", dayStart)
        .lte("completed_at", dayEnd);

      // Get habit logs
      const { data: habits } = await supabase
        .from("habit_logs")
        .select("xp_earned")
        .eq("user_id", user?.id)
        .gte("completed_at", dayStart)
        .lte("completed_at", dayEnd);

      // Get transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", user?.id)
        .eq("date", formattedDate);

      const tasksCompleted = tasks?.length || 0;
      const taskXp = tasks?.reduce((sum, t) => sum + t.xp_reward, 0) || 0;
      const habitsDone = habits?.length || 0;
      const habitXp = habits?.reduce((sum, h) => sum + h.xp_earned, 0) || 0;
      const moneySpent = transactions?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const moneyEarned = transactions?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      return {
        tasks_completed: tasksCompleted,
        xp_earned: taskXp + habitXp,
        habits_done: habitsDone,
        money_spent: moneySpent,
        money_earned: moneyEarned,
      };
    },
    enabled: !!user?.id,
  });

  const saveLogMutation = useMutation({
    mutationFn: async () => {
      const logData = {
        user_id: user?.id,
        log_date: formattedDate,
        content: content || null,
        mood: selectedMood,
        auto_summary: {
          ...(summaryData || {}),
          hours_slept: hoursSlept,
          sleep_quality: sleepQuality,
          stress_level: stressLevel,
        },
      };

      if (dailyLog) {
        const { error } = await supabase
          .from("daily_logs")
          .update(logData)
          .eq("id", dailyLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_logs").insert(logData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-log"] });
      toast.success("Log saved");
    },
    onError: () => toast.error("Failed to save log"),
  });

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => {
    if (!isToday(selectedDate)) {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="text-center">
          <h2 className="font-display text-xl text-foreground">
            {format(selectedDate, "EEEE")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {format(selectedDate, "MMMM d, yyyy")}
            {isToday(selectedDate) && (
              <Badge variant="outline" className="ml-2 bg-ops/10 text-ops border-ops/30">
                TODAY
              </Badge>
            )}
          </p>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToNextDay}
          disabled={isToday(selectedDate)}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Auto Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-card p-6"
      >
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">
          // AUTO-GENERATED SUMMARY
        </h3>
        
        {logLoading ? (
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-ops/5 border border-ops/20">
              <CheckCircle2 className="w-5 h-5 text-ops mx-auto mb-1" />
              <p className="font-mono text-lg text-ops">{summaryData?.tasks_completed || 0}</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </div>

            <div className="text-center p-3 rounded-lg bg-ops/5 border border-ops/20">
              <Zap className="w-5 h-5 text-ops mx-auto mb-1" />
              <p className="font-mono text-lg text-ops">{summaryData?.xp_earned || 0}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>

            <div className="text-center p-3 rounded-lg bg-bio/5 border border-bio/20">
              <Heart className="w-5 h-5 text-bio mx-auto mb-1" />
              <p className="font-mono text-lg text-bio">{summaryData?.habits_done || 0}</p>
              <p className="text-xs text-muted-foreground">Habits</p>
            </div>

            <div className="text-center p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="font-mono text-lg text-green-400">+${summaryData?.money_earned || 0}</p>
              <p className="text-xs text-muted-foreground">Earned</p>
            </div>

            <div className="text-center p-3 rounded-lg bg-vault/5 border border-vault/20">
              <DollarSign className="w-5 h-5 text-vault mx-auto mb-1" />
              <p className="font-mono text-lg text-vault">-${summaryData?.money_spent || 0}</p>
              <p className="text-xs text-muted-foreground">Spent</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Mood & Vitals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-card p-6"
      >
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">
          // VITALS & MOOD
        </h3>
        
        {/* Sleep & Stress Trackers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Hours Slept */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-ops" />
              <Label className="text-sm">Hours Slept</Label>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={hoursSlept}
                onChange={(e) => setHoursSlept(parseFloat(e.target.value) || 0)}
                className="w-20 bg-secondary border-border font-mono text-center"
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
          </div>

          {/* Sleep Quality */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-bio" />
                <Label className="text-sm">Sleep Quality</Label>
              </div>
              <span className="font-mono text-sm text-bio">{sleepQuality}/5</span>
            </div>
            <Slider
              value={[sleepQuality]}
              onValueChange={(v) => setSleepQuality(v[0])}
              min={1}
              max={5}
              step={1}
              className="[&_[role=slider]]:bg-bio"
            />
          </div>

          {/* Stress Level */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BatteryLow className="w-4 h-4 text-vault" />
                <Label className="text-sm">Stress Level</Label>
              </div>
              <span className="font-mono text-sm text-vault">{stressLevel}/5</span>
            </div>
            <Slider
              value={[stressLevel]}
              onValueChange={(v) => setStressLevel(v[0])}
              min={1}
              max={5}
              step={1}
              className="[&_[role=slider]]:bg-vault"
            />
          </div>
        </div>

        {/* Mood Selector */}
        <div className="pt-4 border-t border-border">
          <h4 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
            // HOW ARE YOU FEELING?
          </h4>
          <div className="flex items-center justify-center gap-4">
            {moodOptions.map((mood) => (
              <Button
                key={mood.value}
                variant="ghost"
                className={`flex-col gap-1 h-auto py-3 px-4 ${
                  selectedMood === mood.value ? "bg-secondary border border-ops/30" : ""
                }`}
                onClick={() => setSelectedMood(mood.value)}
              >
                <mood.icon className={`w-6 h-6 ${mood.color}`} />
                <span className="text-xs text-muted-foreground">{mood.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Journal Entry */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-card p-6"
      >
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">
          // CAPTAIN'S NOTES
        </h3>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your thoughts, reflections, and observations for today..."
          className="min-h-[200px] bg-background border-border resize-none"
        />
        <div className="flex justify-end mt-4">
          <Button
            onClick={() => saveLogMutation.mutate()}
            disabled={saveLogMutation.isPending}
            className="bg-ops/20 text-ops border border-ops/30 hover:bg-ops/30"
          >
            {saveLogMutation.isPending ? "SAVING..." : "SAVE LOG"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
