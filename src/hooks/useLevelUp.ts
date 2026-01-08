import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useQueryClient } from '@tanstack/react-query';

export function useLevelUp() {
    const { profile, user, refreshProfile } = useAuth();
    const queryClient = useQueryClient();

    const awardXP = async (xpAmount: number) => {
        console.log('🎮 [XP] Starting XP award process');
        console.log('🎮 [XP] Profile before:', {
            current_xp: profile?.current_xp,
            level: profile?.level,
            max_xp: profile?.max_xp_for_next_level
        });
        console.log('🎮 [XP] Award amount:', xpAmount);

        if (!profile || !user) {
            console.error('🎮 [XP] ERROR: No profile or user');
            throw new Error('User not authenticated');
        }

        const newXp = profile.current_xp + xpAmount;
        let updates: any = {};
        let didLevelUp = false;
        let newLevel = profile.level;

        console.log('🎮 [XP] Calculated new XP:', newXp);

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
            console.log('🎮 [XP] 🎉 LEVEL UP! Updates:', updates);
        } else {
            updates = { current_xp: newXp };
            console.log('🎮 [XP] Regular XP update:', updates);
        }

        console.log('🎮 [XP] Updating database...');
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            console.error('🎮 [XP] DATABASE ERROR:', error);
            throw error;
        }

        console.log('🎮 [XP] ✅ Database updated successfully');
        console.log('🎮 [XP] Refreshing profile...');

        // Refresh profile in useAuth to update UI
        await refreshProfile();

        console.log('🎮 [XP] ✅ Profile refreshed');

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

        console.log('🎮 [XP] ✅ XP award process complete');
        return { ...updates, didLevelUp, newLevel };
    };

    return { awardXP };
}
