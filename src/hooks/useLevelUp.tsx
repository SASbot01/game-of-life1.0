import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { globalSoundPlayer } from './useSoundEffects';

export function useLevelUp() {
  const { profile, user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const hasTriggered = useRef(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);

  const triggerEpicCelebration = (level: number) => {
    // Play level up sound
    globalSoundPlayer.play('levelUp');

    // Epic confetti burst
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ['#00d4ff', '#ff0080', '#ffd700', '#00ff88', '#ff6600'];

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5 },
      colors,
      scalar: 1.2,
    });

    frame();

    // Set modal state
    setNewLevel(level);
    setShowLevelUpModal(true);
  };

  const levelUpMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !user) return;

      const nextLevel = profile.level + 1;
      const remainingXp = profile.current_xp - profile.max_xp_for_next_level;
      const newMaxXp = nextLevel * 100;

      const { error } = await supabase
        .from('profiles')
        .update({
          level: nextLevel,
          current_xp: Math.max(0, remainingXp),
          max_xp_for_next_level: newMaxXp,
        })
        .eq('id', user.id);

      if (error) throw error;
      return nextLevel;
    },
    onSuccess: (level) => {
      if (level) {
        refreshProfile();
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
        
        // Trigger epic celebration
        triggerEpicCelebration(level);

        toast.success(`🎉 LEVEL UP! You are now Level ${level}!`, {
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--ops)))',
            color: 'white',
            border: '2px solid hsl(var(--vault))',
            fontWeight: 'bold',
          },
        });
      }
      hasTriggered.current = false;
    },
    onError: () => {
      hasTriggered.current = false;
    },
  });

  useEffect(() => {
    if (
      profile &&
      profile.current_xp >= profile.max_xp_for_next_level &&
      !levelUpMutation.isPending &&
      !hasTriggered.current
    ) {
      hasTriggered.current = true;
      levelUpMutation.mutate();
    }
  }, [profile, levelUpMutation]);

  return { 
    levelUpMutation, 
    showLevelUpModal, 
    setShowLevelUpModal,
    newLevel 
  };
}
