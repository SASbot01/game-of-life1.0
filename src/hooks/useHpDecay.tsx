import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { startOfDay, subDays, isAfter, isSameDay } from 'date-fns';

interface Habit {
  id: string;
  name: string;
  hp_impact: number;
  last_completed_at: string | null;
  is_active: boolean;
}

interface GameRules {
  hp_penalty_rate: number;
}

export function useHpDecay() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const hasCheckedToday = useRef(false);

  // Fetch active habits
  const { data: habits } = useQuery({
    queryKey: ['habits-decay', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('id, name, hp_impact, last_completed_at, is_active')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      return data as Habit[];
    },
    enabled: !!user?.id,
  });

  // Fetch game rules
  const { data: gameRules } = useQuery({
    queryKey: ['game-rules-decay', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_rules')
        .select('hp_penalty_rate')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as GameRules | null;
    },
    enabled: !!user?.id,
  });

  // Apply HP decay mutation
  const applyDecayMutation = useMutation({
    mutationFn: async ({ newHp, missedCount }: { newHp: number; missedCount: number }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ hp: Math.max(0, newHp) })
        .eq('id', user?.id);

      if (error) throw error;
      return { newHp, missedCount };
    },
    onSuccess: ({ newHp, missedCount }) => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      
      toast.error(`⚠️ HP DECAY: -${profile!.hp - newHp} HP`, {
        description: `${missedCount} habit${missedCount > 1 ? 's' : ''} missed yesterday. Complete your habits to stay healthy!`,
        duration: 6000,
      });
    },
  });

  useEffect(() => {
    if (!user || !profile || !habits || !gameRules || hasCheckedToday.current) return;

    // Check localStorage for last decay check
    const lastDecayCheck = localStorage.getItem(`hp_decay_check_${user.id}`);
    const today = startOfDay(new Date());
    
    if (lastDecayCheck && isSameDay(new Date(lastDecayCheck), today)) {
      hasCheckedToday.current = true;
      return; // Already checked today
    }

    // Calculate missed habits from yesterday
    const yesterday = subDays(today, 1);
    const missedHabits = habits.filter(habit => {
      if (!habit.last_completed_at) {
        // Never completed - only penalize if habit existed before yesterday
        return true;
      }
      
      const lastCompleted = new Date(habit.last_completed_at);
      // If last completed before yesterday, it's missed
      return !isAfter(lastCompleted, yesterday) && !isSameDay(lastCompleted, yesterday);
    });

    if (missedHabits.length > 0 && habits.length > 0) {
      // Calculate total penalty
      const penaltyRate = gameRules.hp_penalty_rate || 5;
      const totalPenalty = missedHabits.length * penaltyRate;
      const newHp = Math.max(0, profile.hp - totalPenalty);

      // Apply decay
      applyDecayMutation.mutate({ newHp, missedCount: missedHabits.length });
    }

    // Mark as checked for today
    localStorage.setItem(`hp_decay_check_${user.id}`, today.toISOString());
    hasCheckedToday.current = true;

  }, [user, profile, habits, gameRules, applyDecayMutation]);

  return null;
}
