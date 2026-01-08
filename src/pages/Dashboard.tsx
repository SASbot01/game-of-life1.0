import { motion } from 'framer-motion';
import { Target, Sparkles, TrendingUp, Plus, CheckCircle2 } from 'lucide-react';
import { StatusHeader } from '@/components/hud/StatusHeader';
import { HudPanel } from '@/components/hud/HudPanel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLevelUp } from '@/hooks/useLevelUp';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { awardXP } = useLevelUp();

  // Fetch active tasks
  const { data: activeTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['dashboard-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['todo', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch today's habits
  const { data: todayHabits, isLoading: habitsLoading } = useQuery({
    queryKey: ['dashboard-habits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch this week's financial summary
  const { data: weekSummary, isLoading: financeLoading } = useQuery({
    queryKey: ['dashboard-finance', user?.id],
    queryFn: async () => {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user?.id)
        .gte('date', startOfWeek.toISOString().split('T')[0]);

      if (error) throw error;

      const income = (data || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = (data || [])
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { income, expenses, net: income - expenses };
    },
    enabled: !!user?.id,
  });

  // Complete task mutation with level-up
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const task = activeTasks?.find(t => t.id === taskId);

      // Update task status
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Award XP (handles level-up automatically)
      if (task) {
        await awardXP(task.xp_reward);
      }

      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      toast.success(`Quest completed! +${task?.xp_reward || 0} XP`);
    },
    onError: () => {
      toast.error('Failed to complete quest');
    },
  });

  const difficultyColors: Record<string, string> = {
    easy: 'bg-accent',
    medium: 'bg-primary',
    hard: 'bg-destructive',
    boss: 'bg-destructive',
  };

  const categoryIcons: Record<string, string> = {
    health: '💪',
    mana: '📚',
    stamina: '💧',
  };

  return (
    <div className="min-h-screen grid-pattern">
      <StatusHeader />

      <main className="pt-28 pb-8 px-4 md:pt-24">
        <div className="container mx-auto max-w-6xl">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-display text-foreground mb-2">
              Welcome back, <span className="text-primary text-glow-cyan">{profile?.username || 'Player'}</span>
            </h1>
            <p className="text-muted-foreground">Ready to conquer today's quests?</p>
          </motion.div>

          {/* HUD Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Active Quests */}
            <HudPanel title="Active Quests" icon={Target} iconColor="text-primary" delay={0.1}>
              <div className="space-y-2">
                {tasksLoading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : activeTasks && activeTasks.length > 0 ? (
                  activeTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <div className={`w-2 h-2 rounded-full ${difficultyColors[task.difficulty] || 'bg-accent'} animate-pulse`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">+{task.xp_reward} XP • {task.difficulty}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary"
                        onClick={() => completeTaskMutation.mutate(task.id)}
                        disabled={completeTaskMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No active quests</p>
                    <p className="text-xs mt-1">Create your first quest in OpsCenter</p>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => navigate('/ops')}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Quest
              </Button>
            </HudPanel>

            {/* Daily Buffs */}
            <HudPanel title="Daily Buffs" icon={Sparkles} iconColor="text-health" delay={0.2}>
              <div className="space-y-2">
                {habitsLoading ? (
                  <>
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </>
                ) : todayHabits && todayHabits.length > 0 ? (
                  todayHabits.map((habit) => (
                    <div
                      key={habit.id}
                      className={`flex items-center justify-between p-3 rounded-lg bg-${habit.category}/10 border border-${habit.category}/30 cursor-pointer hover:bg-${habit.category}/20 transition-colors`}
                      onClick={() => navigate('/bio')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{categoryIcons[habit.category] || '⭐'}</span>
                        <span className="text-sm font-medium">{habit.name}</span>
                      </div>
                      <span className={`text-xs text-${habit.category} font-mono`}>+{habit.xp_reward} XP</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No active habits</p>
                    <p className="text-xs mt-1">Create your first habit in BioDome</p>
                  </div>
                )}
              </div>
            </HudPanel>

            {/* Loot Summary */}
            <HudPanel title="Loot" icon={TrendingUp} iconColor="text-accent" delay={0.3}>
              <div className="space-y-3">
                {financeLoading ? (
                  <>
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">This Week</span>
                      <span className="text-lg font-mono text-health">
                        +${weekSummary?.income.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expenses</span>
                      <span className="text-lg font-mono text-destructive">
                        -${weekSummary?.expenses.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Net</span>
                      <span className={`text-xl font-mono ${(weekSummary?.net || 0) >= 0 ? 'text-accent text-glow-gold' : 'text-destructive'}`}>
                        {(weekSummary?.net || 0) >= 0 ? '+' : ''}${weekSummary?.net.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </HudPanel>
          </div>
        </div>
      </main>
    </div>
  );
}

