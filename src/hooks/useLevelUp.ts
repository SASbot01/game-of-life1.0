import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useQueryClient } from '@tanstack/react-query';

export function useLevelUp() {
    const { profile, user, refreshProfile } = useAuth();
    const queryClient = useQueryClient();

    const awardXP = async (xpAmount: number) => {
        if (!profile || !user) {
            throw new Error('User not authenticated');
        }

        const newXp = profile.current_xp + xpAmount;
        let updates: any = {};
        let didLevelUp = false;
        let newLevel = profile.level;

        if (newXp >= profile.max_xp_for_next_level) {
            // Level up!
            const remainingXp = newXp - profile.max_xp_for_next_level;
            newLevel = profile.level + 1;
            const newMaxXp = Math.floor(profile.max_xp_for_next_level * 1.5);

            updates = {
                current_xp: remainingXp,
                level: newLevel,
                max_xp_for_next_level: newMaxXp,
            };

            didLevelUp = true;
        } else {
            updates = { current_xp: newXp };
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;

        // Refresh profile in useAuth to update UI
        await refreshProfile();

        // Invalidate profile query to refresh UI (for components using React Query)
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['profiles'] });

        // Celebration if leveled up
        if (didLevelUp) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00f5ff', '#ffd700', '#ff00ff']
            });

            toast.success(`🎉 LEVEL UP! You are now level ${newLevel}!`, {
                duration: 5000,
                className: 'text-lg font-bold'
            });
        }

        return { ...updates, didLevelUp, newLevel };
    };

    return { awardXP };
}
